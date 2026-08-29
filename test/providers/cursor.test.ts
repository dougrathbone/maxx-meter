import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import { cursorProvider } from "../../src/providers/cursor.js";
import type { Account } from "../../src/models.js";

const account: Account = {
  id: "cursor_test",
  provider: "cursor",
  label: "Cursor Test",
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

describe("cursorProvider", () => {
  it("maps period usage to session and weekly windows", async () => {
    const period = JSON.parse(
      readFileSync(join(import.meta.dirname, "../fixtures/cursor/period-usage.json"), "utf8"),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => period }),
    );

    const snap = await cursorProvider.fetchUsage(account, {
      accountId: account.id,
      ownerUserId: account.ownerUserId,
      provider: "cursor",
      authMethod: "cookie",
      accessToken: "session-token",
      connectedAt: new Date().toISOString(),
    }, settings);

    expect(snap.status).toBe("ok");
    expect(snap.windows).toHaveLength(2);
    expect(snap.windows[0]?.id).toBe("session");
    expect(snap.windows[0]?.usedPct).toBe(42.5);
    expect(snap.windows[1]?.usedPct).toBe(67);
  });
});
