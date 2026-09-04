import { describe, expect, it } from "vitest";
import { MIN_POLL_INTERVAL_SECONDS, pollIntervalMs } from "../src/poller.js";

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
