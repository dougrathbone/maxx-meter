import { describe, expect, it } from "vitest";
import { MIN_POLL_INTERVAL_SECONDS, pollIntervalMs, UsagePoller } from "../src/poller.js";
import type { UsageSnapshot } from "../src/models.js";

describe("pollIntervalMs", () => {
  it("honors the settings minimum of 60 seconds", () => {
    expect(MIN_POLL_INTERVAL_SECONDS).toBe(60);
    expect(pollIntervalMs(60)).toBe(60_000);
    expect(pollIntervalMs(300)).toBe(300_000);
  });

  it("does not clamp 60s up to five minutes", () => {
    expect(pollIntervalMs(60)).toBeLessThan(300_000);
  });
});

describe("pollOnce serialization", () => {
  it("runs overlapping pollOnce calls back-to-back instead of skipping", async () => {
    const order: number[] = [];
    class SlowPoller extends UsagePoller {
      runs = 0;
      protected override async collectSnapshots(): Promise<UsageSnapshot[]> {
        const n = ++this.runs;
        order.push(n);
        await new Promise((r) => setTimeout(r, 40));
        return [];
      }
    }
    const poller = new SlowPoller(async () => ({
      pollIntervalSeconds: 300,
      warnPct: 70,
      criticalPct: 90,
      mqtt: { host: "localhost", port: 1883, username: "", password: "", topicPrefix: "maxxmeter" },
      ha: { url: "http://localhost", token: "" },
    }));

    const first = poller.pollOnce();
    const second = poller.pollOnce();
    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
    expect(poller.runs).toBe(2);
  });
});
