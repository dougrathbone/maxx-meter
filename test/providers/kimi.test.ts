import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import { kimiProvider } from "../../src/providers/kimi.js";
import type { Account } from "../../src/models.js";

const account: Account = {
  id: "kimi_test",
  provider: "kimi",
  label: "Kimi Test",
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

describe("kimiProvider", () => {
  it("maps limits to session and weekly windows", async () => {
    const fixture = JSON.parse(
      readFileSync(join(import.meta.dirname, "../fixtures/kimi/usages.json"), "utf8"),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => fixture,
      }),
    );

    const snap = await kimiProvider.fetchUsage(account, {
      accountId: account.id,
      ownerUserId: account.ownerUserId,
      provider: "kimi",
      authMethod: "api_key",
      accessToken: "sk-kimi-test",
      connectedAt: new Date().toISOString(),
    }, settings);

    expect(snap.status).toBe("ok");
    expect(snap.windows).toHaveLength(2);
    expect(snap.windows[0]?.usedPct).toBe(55);
    expect(snap.windows[1]?.usedPct).toBe(22);
    expect(snap.windows[0]?.resetsAt).toBe("2026-08-29T08:00:00.000Z");
  });
});
