import type { Account, StoredCredential } from "../models.js";
import { claudeExpiresAt, refreshClaudeOAuthToken } from "./claude-oauth.js";
import { saveCredential } from "./vault.js";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

function claudeOAuthCredential(credential: StoredCredential): boolean {
  return credential.provider === "claude" && credential.authMethod === "oauth";
}

function isExpiringSoon(credential: StoredCredential): boolean {
  if (!credential.expiresAt) return true;
  return Date.now() >= new Date(credential.expiresAt).getTime() - REFRESH_BUFFER_MS;
}

async function refreshClaudeCredential(
  credential: StoredCredential,
): Promise<StoredCredential> {
  if (!credential.refreshToken) return credential;

  const tokens = await refreshClaudeOAuthToken(credential.refreshToken);
  const updated: StoredCredential = {
    ...credential,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? credential.refreshToken,
    expiresAt: claudeExpiresAt(tokens.expires_in) ?? credential.expiresAt,
  };
  await saveCredential(updated);
  return updated;
}

/** Refresh Claude OAuth tokens proactively before they expire. */
export async function resolveCredential(
  account: Account,
  credential: StoredCredential,
): Promise<StoredCredential> {
  if (!claudeOAuthCredential(credential) || !credential.refreshToken) return credential;
  if (!isExpiringSoon(credential)) return credential;
  return refreshClaudeCredential(credential);
}

/** Force refresh after auth_expired (one retry). */
export async function retryCredentialAfterAuthExpired(
  account: Account,
  credential: StoredCredential,
): Promise<StoredCredential | null> {
  if (!claudeOAuthCredential(credential) || !credential.refreshToken) return null;
  try {
    return await refreshClaudeCredential(credential);
  } catch {
    return null;
  }
}
