import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION, USER_AGENT } from "../src/version.js";

describe("USER_AGENT", () => {
  it("matches package.json version", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
    expect(USER_AGENT).toBe(`MaxxMeter/${pkg.version}`);
  });
});
