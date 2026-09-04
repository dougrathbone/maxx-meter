import { describe, expect, it } from "vitest";
import { parseResetAt, parseUtilization } from "../../src/providers/base.js";

describe("parseUtilization", () => {
  it("clamps 0-100", () => {
    expect(parseUtilization(47)).toBe(47);
    expect(parseUtilization(150)).toBe(100);
    expect(parseUtilization(-5)).toBe(0);
  });

  it("returns null for invalid", () => {
    expect(parseUtilization("x")).toBeNull();
  });
});

describe("parseResetAt", () => {
  it("parses ISO dates", () => {
    expect(parseResetAt("2026-08-23T12:00:00Z")).toBe("2026-08-23T12:00:00.000Z");
  });

  it("parses epoch milliseconds and seconds", () => {
    expect(parseResetAt("1785957659000")).toBe("2026-08-05T19:20:59.000Z");
    expect(parseResetAt(1785957659)).toBe("2026-08-05T19:20:59.000Z");
  });
});
