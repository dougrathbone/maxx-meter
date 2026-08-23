import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import { claudeProvider } from "../../src/providers/claude.js";
import type { Account } from "../../src/models.js";

const account: Account = {
  id: "claude_test",
  provider: "claude",
  label: "Claude Test",
  ownerUserId: "user1",
  createdAt: new Date().toISOString(),
};

const settings = {
  pollIntervalSeconds: 300,
  warnPct: 70,
  criticalPct: 90,
  mqtt: { host: "localhost", port: 1883, username: "", password: "", topicPrefix: "maxxmeter" },
  ha: { url: "http://localhost", token: "" },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("claudeProvider", () => {
  it("maps usage response to snapshots", async () => {
    const fixture = JSON.parse(
      readFileSync(join(import.meta.dirname, "../fixtures/claude/usage.json"), "utf8"),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => fixture,
      }),
    );

    const snap = await claudeProvider.fetchUsage(account, {
      accountId: account.id,
      ownerUserId: account.ownerUserId,
      provider: "claude",
      authMethod: "oauth",
      accessToken: "test-token",
      connectedAt: new Date().toISOString(),
    }, settings);

    expect(snap.status).toBe("ok");
    expect(snap.windows).toHaveLength(2);
    expect(snap.windows[0]?.usedPct).toBe(47);
    expect(snap.windows[1]?.usedPct).toBe(31);
  });

  it("maps 401 to auth_expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    const snap = await claudeProvider.fetchUsage(account, {
      accountId: account.id,
      ownerUserId: account.ownerUserId,
      provider: "claude",
      authMethod: "oauth",
      accessToken: "bad",
      connectedAt: new Date().toISOString(),
    }, settings);

    expect(snap.status).toBe("auth_expired");
  });
});
