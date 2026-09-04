import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPanelServer } from "../../src/api/server.js";
import { createPanel, getPanel } from "../../src/panels/registry.js";
import type { UsageSnapshot } from "../../src/models.js";
import { UsagePoller } from "../../src/poller.js";

let dataDir: string;

const snapshot: UsageSnapshot = {
  accountId: "claude_abc",
  ownerUserId: "user1",
  provider: "claude",
  label: "Claude Pro",
  status: "ok",
  authMethod: "oauth",
  updatedAt: new Date().toISOString(),
  windows: [
    { id: "session", usedPct: 40, resetsAt: null },
    { id: "weekly", usedPct: 55, resetsAt: null },
  ],
  thresholds: { warnPct: 70, criticalPct: 90 },
};

class MockPoller extends UsagePoller {
  constructor(private snapshots: UsageSnapshot[]) {
    super(async () => ({
      pollIntervalSeconds: 300,
      warnPct: 70,
      criticalPct: 90,
      mqtt: { host: "localhost", port: 1883, username: "", password: "", topicPrefix: "maxxmeter" },
      ha: { url: "http://localhost", token: "" },
    }));
  }

  override getSnapshotsForUser(userId: string): UsageSnapshot[] {
    return this.snapshots.filter((s) => s.ownerUserId === userId);
  }

  override getSnapshotsForAccounts(accountIds: string[]): UsageSnapshot[] {
    const set = new Set(accountIds);
    return this.snapshots.filter((s) => set.has(s.accountId));
  }
}

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "maxxmeter-panel-api-"));
  process.env.MAXXMETER_DATA_DIR = dataDir;
});

afterEach(async () => {
  delete process.env.MAXXMETER_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("panel API", () => {
  it("returns 401 without valid API key", async () => {
    const poller = new MockPoller([snapshot]);
    const panel = await createPanel({
      label: "Office",
      deviceProfile: "nspanel-eu",
      ownerUserId: "user1",
      accountIds: [snapshot.accountId],
    });
    const app = createPanelServer(poller);
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/panels/${panel.id}/usage`,
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("returns filtered usage for authorized panel", async () => {
    const poller = new MockPoller([snapshot]);
    const panel = await createPanel({
      label: "Office",
      deviceProfile: "nspanel-eu",
      ownerUserId: "user1",
      accountIds: [snapshot.accountId],
    });
    const app = createPanelServer(poller);
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/panels/${panel.id}/usage`,
      headers: { authorization: `Bearer ${panel.apiKey}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      panel: { id: string };
      accounts: UsageSnapshot[];
      thresholds: { warnPct: number };
    };
    expect(body.panel.id).toBe(panel.id);
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0]?.label).toBe("Claude Pro");
    expect(body.thresholds.warnPct).toBe(70);
    await app.close();
  });

  it("records lastSeenAt on panel health", async () => {
    const poller = new MockPoller([]);
    const panel = await createPanel({
      label: "Office",
      deviceProfile: "nspanel-eu",
      ownerUserId: "user1",
      accountIds: [],
    });
    const app = createPanelServer(poller);
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/panels/${panel.id}/health`,
      headers: { authorization: `Bearer ${panel.apiKey}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { lastSeenAt: string };
    expect(body.lastSeenAt).toBeTruthy();

    const stored = await getPanel(panel.id);
    expect(stored?.lastSeenAt).toBe(body.lastSeenAt);
    await app.close();
  });

  it("health endpoint responds without auth", async () => {
    const poller = new MockPoller([]);
    const app = createPanelServer(poller);
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, service: "maxxmeter" });
    await app.close();
  });
});
