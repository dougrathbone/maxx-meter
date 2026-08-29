import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { resolveCredential } from "../../src/auth/credential-fresh.js";
import type { Account, StoredCredential } from "../../src/models.js";

let dataDir: string;

const account: Account = {
  id: "claude_test",
  provider: "claude",
  label: "Claude",
  ownerUserId: "user1",
  createdAt: new Date().toISOString(),
};

const baseCredential: StoredCredential = {
  accountId: account.id,
  ownerUserId: account.ownerUserId,
  provider: "claude",
  authMethod: "oauth",
  accessToken: "old-token",
  refreshToken: "refresh-token",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  connectedAt: new Date().toISOString(),
};

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "maxxmeter-cred-"));
  process.env.MAXXMETER_DATA_DIR = dataDir;
});

afterEach(async () => {
  vi.restoreAllMocks();
  delete process.env.MAXXMETER_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("resolveCredential", () => {
  it("returns credential unchanged when not expiring soon", async () => {
    const cred = {
      ...baseCredential,
      expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    };
    const result = await resolveCredential(account, cred);
    expect(result.accessToken).toBe("old-token");
  });

  it("refreshes Claude OAuth token when expiring soon", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          refresh_token: "new-refresh",
          expires_in: 3600,
        }),
      }),
    );

    const result = await resolveCredential(account, baseCredential);
    expect(result.accessToken).toBe("new-token");
    expect(result.refreshToken).toBe("new-refresh");
  });
});
