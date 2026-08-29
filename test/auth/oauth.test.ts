import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildQuery, generatePkce, generateState } from "../../src/auth/oauth.js";

describe("oauth PKCE", () => {
  it("generates verifier/challenge pair where challenge is S256 of verifier", () => {
    const { verifier, challenge } = generatePkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toBe(
      createHash("sha256").update(verifier).digest("base64url"),
    );
  });

  it("generates URL-safe state", () => {
    const state = generateState();
    expect(state.length).toBeGreaterThan(10);
    expect(state).not.toMatch(/[+/=]/);
  });

  it("buildQuery encodes params", () => {
    expect(buildQuery({ client_id: "abc", scope: "a b" })).toBe(
      "client_id=abc&scope=a+b",
    );
  });
});
