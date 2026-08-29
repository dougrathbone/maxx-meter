import { buildQuery, generatePkce, generateState } from "./oauth.js";
import type { OAuthPendingState } from "./oauth-state.js";
import { saveOAuthState } from "./oauth-state.js";

const CLAUDE_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const CLAUDE_AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
const CLAUDE_TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const CLAUDE_REDIRECT_URI = "https://platform.claude.com/oauth/code/callback";
const CLAUDE_SCOPES =
  "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers";

export interface ClaudeOAuthStartResult {
  stateId: string;
  authorizationUrl: string;
  instructions: string;
}

export async function startClaudeOAuth(input: {
  accountId: string;
  ownerUserId: string;
}): Promise<ClaudeOAuthStartResult> {
  const pkce = generatePkce();
  const stateId = generateState();

  const pending: OAuthPendingState = {
    provider: "claude",
    accountId: input.accountId,
    ownerUserId: input.ownerUserId,
    codeVerifier: pkce.verifier,
    createdAt: new Date().toISOString(),
  };
  await saveOAuthState(stateId, pending);

  const query = buildQuery({
    code: "true",
    client_id: CLAUDE_CLIENT_ID,
    response_type: "code",
    redirect_uri: CLAUDE_REDIRECT_URI,
    scope: CLAUDE_SCOPES,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    state: pkce.verifier,
  });

  return {
    stateId,
    authorizationUrl: `${CLAUDE_AUTHORIZE_URL}?${query}`,
    instructions:
      "Sign in with Anthropic, then copy the authorization code from the callback page and paste it below.",
  };
}

export interface ClaudeTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function exchangeClaudeOAuthCode(input: {
  stateId: string;
  code: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  accountId: string;
  ownerUserId: string;
}> {
  const { consumeOAuthState } = await import("./oauth-state.js");
  const pending = await consumeOAuthState(input.stateId);
  if (!pending || pending.provider !== "claude") {
    throw new Error("Invalid or expired OAuth state");
  }

  const res = await fetch(CLAUDE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: input.code.trim(),
      redirect_uri: CLAUDE_REDIRECT_URI,
      client_id: CLAUDE_CLIENT_ID,
      code_verifier: pending.codeVerifier,
      state: pending.codeVerifier,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude token exchange failed (${res.status}): ${text}`);
  }

  const tokens = (await res.json()) as ClaudeTokenResponse;
  return {
    ...tokens,
    accountId: pending.accountId,
    ownerUserId: pending.ownerUserId,
  };
}

export function claudeExpiresAt(expiresIn?: number): string | undefined {
  if (!expiresIn) return undefined;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}
