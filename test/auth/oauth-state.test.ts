import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  consumeOAuthState,
  getOAuthState,
  saveOAuthState,
} from "../../src/auth/oauth-state.js";

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "maxxmeter-oauth-"));
  process.env.MAXXMETER_DATA_DIR = dataDir;
});

afterEach(async () => {
  delete process.env.MAXXMETER_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("oauth-state", () => {
  it("saves and consumes pending state once", async () => {
    await saveOAuthState("state123", {
      provider: "claude",
      accountId: "acc1",
      ownerUserId: "user1",
      codeVerifier: "verifier",
      createdAt: new Date().toISOString(),
    });

    const pending = await getOAuthState("state123");
    expect(pending?.accountId).toBe("acc1");

    const consumed = await consumeOAuthState("state123");
    expect(consumed?.codeVerifier).toBe("verifier");

    const again = await consumeOAuthState("state123");
    expect(again).toBeNull();
  });
});
