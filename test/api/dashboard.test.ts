import { mkdtemp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDashboardServer } from "../../src/api/dashboard.js";
import { UsagePoller } from "../../src/poller.js";
import { createAccount } from "../../src/accounts/registry.js";
import { createPanel } from "../../src/panels/registry.js";

const dashboardDist = fileURLToPath(new URL("../../dashboard/dist", import.meta.url));

let dataDir: string;

class MockPoller extends UsagePoller {
  constructor() {
    super(async () => ({
      pollIntervalSeconds: 300,
      warnPct: 70,
      criticalPct: 90,
      mqtt: { host: "localhost", port: 1883, username: "", password: "", topicPrefix: "maxxmeter" },
      ha: { url: "http://localhost", token: "" },
    }));
  }
}

async function buildApp() {
  const app = await createDashboardServer(new MockPoller());
  await app.ready();
  return app;
}

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "maxxmeter-dashboard-api-"));
  process.env.MAXXMETER_DATA_DIR = dataDir;
});

afterEach(async () => {
  delete process.env.MAXXMETER_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("dashboard ingress shell", () => {
  it("serves the shell with a root base when not behind ingress", async () => {
    const app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain('<base href="/" />');
    await app.close();
  });

  it("rewrites the base to the ingress prefix", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/",
      headers: { "x-ingress-path": "/api/hassio_ingress/abc123" },
    });

    expect(res.body).toContain('<base href="/api/hassio_ingress/abc123/" />');
    expect(res.body).not.toContain('<base href="/" />');
    await app.close();
  });

  it("ignores a trailing slash and unsafe ingress paths", async () => {
    const app = await buildApp();

    const slashed = await app.inject({
      method: "GET",
      url: "/index.html",
      headers: { "x-ingress-path": "/api/hassio_ingress/abc123/" },
    });
    expect(slashed.body).toContain('<base href="/api/hassio_ingress/abc123/" />');

    const unsafe = await app.inject({
      method: "GET",
      url: "/",
      headers: { "x-ingress-path": '/x"><script>alert(1)</script>' },
    });
    expect(unsafe.body).toContain('<base href="/" />');
    expect(unsafe.body).not.toContain("<script>alert(1)</script>");
    await app.close();
  });

  it("serves the built assets that the shell references", async () => {
    const app = await buildApp();

    const shell = await app.inject({ method: "GET", url: "/" });
    const refs = [...shell.body.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);

    for (const ref of refs) {
      const res = await app.inject({ method: "GET", url: `/${ref}` });
      expect(res.statusCode, `expected 200 for /${ref}`).toBe(200);
    }
    await app.close();
  });

  it("references assets relatively so they resolve under the ingress prefix", async () => {
    const assets = await readdir(join(dashboardDist, "assets"));
    expect(assets.length).toBeGreaterThan(0);

    const app = await buildApp();
    const shell = await app.inject({ method: "GET", url: "/" });

    expect(shell.body).not.toMatch(/(?:src|href)="\/assets\//);
    await app.close();
  });

  it("falls back to the shell for unknown paths but 404s unknown api routes", async () => {
    const app = await buildApp();

    const spa = await app.inject({ method: "GET", url: "/panels" });
    expect(spa.statusCode).toBe(200);
    expect(spa.headers["content-type"]).toContain("text/html");

    const missingApi = await app.inject({ method: "GET", url: "/api/dashboard/nope" });
    expect(missingApi.statusCode).toBe(404);
    expect(missingApi.json()).toMatchObject({ error: "not found" });
    await app.close();
  });

  it("keeps oauth fallback redirects inside the ingress prefix", async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/cursor/start",
      headers: { "x-ingress-path": "/api/hassio_ingress/abc123" },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(
      "/api/hassio_ingress/abc123/accounts?oauth=manual&provider=cursor",
    );
    await app.close();
  });
});

describe("dashboard users", () => {
  it("lists account owners and panel-only owners for admins", async () => {
    await createAccount({
      provider: "claude",
      label: "Ada Claude",
      ownerUserId: "ada",
      ownerUserName: "Ada",
    });
    await createPanel({
      label: "Office",
      deviceProfile: "nspanel-us-portrait",
      ownerUserId: "panel-only",
      accountIds: [],
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/dashboard/users",
      headers: {
        "x-remote-user-id": "admin",
        "x-remote-user-name": "Admin",
        "x-remote-user-is-admin": "true",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { userId: "ada", userName: "Ada" },
      { userId: "panel-only", userName: "panel-only" },
    ]);
    await app.close();
  });

  it("forbids non-admins from listing users", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/dashboard/users",
      headers: {
        "x-remote-user-id": "ada",
        "x-remote-user-is-admin": "false",
      },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
