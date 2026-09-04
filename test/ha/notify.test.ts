import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyAuthExpiredBatch } from "../../src/ha/notify.js";
import type { GlobalSettings, UsageSnapshot } from "../../src/models.js";

const settings: GlobalSettings = {
  pollIntervalSeconds: 300,
  warnPct: 70,
  criticalPct: 90,
  mqtt: { host: "localhost", port: 1883, username: "", password: "", topicPrefix: "maxxmeter" },
  ha: { url: "http://homeassistant.local:8123/", token: "ha-token" },
};

function snap(status: UsageSnapshot["status"], accountId = "claude_1"): UsageSnapshot {
  return {
    accountId,
    ownerUserId: "user1",
    provider: "claude",
    label: "Claude Pro",
    status,
    updatedAt: new Date().toISOString(),
    windows: [],
    thresholds: { warnPct: 70, criticalPct: 90 },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notifyAuthExpiredBatch", () => {
  it("notifies once when an account newly expires", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await notifyAuthExpiredBatch(settings, [snap("ok")], [snap("auth_expired")]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://homeassistant.local:8123/api/services/persistent_notification/create",
    );
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as { title: string };
    expect(body.title).toContain("Claude Pro");
  });

  it("does not re-notify an already expired account", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await notifyAuthExpiredBatch(settings, [snap("auth_expired")], [snap("auth_expired")]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips when no HA token is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await notifyAuthExpiredBatch(
      { ...settings, ha: { ...settings.ha, token: "" } },
      [snap("ok")],
      [snap("auth_expired")],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
