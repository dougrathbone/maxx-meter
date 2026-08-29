import { join } from "node:path";
import { deleteFile, ensureDir, readJsonFile, writeJsonFile } from "../storage.js";
import { dataRoot } from "../storage.js";

export interface OAuthPendingState {
  provider: "claude" | "cursor" | "kimi";
  accountId: string;
  ownerUserId: string;
  codeVerifier: string;
  createdAt: string;
}

const STATE_DIR = () => join(dataRoot(), "oauth-state");

export async function saveOAuthState(stateId: string, state: OAuthPendingState): Promise<void> {
  await ensureDir(STATE_DIR());
  await writeJsonFile(join(STATE_DIR(), `${stateId}.json`), state);
}

export async function consumeOAuthState(stateId: string): Promise<OAuthPendingState | null> {
  const path = join(STATE_DIR(), `${stateId}.json`);
  const state = await readJsonFile<OAuthPendingState>(path);
  if (state) await deleteFile(path);
  return state;
}

export async function getOAuthState(stateId: string): Promise<OAuthPendingState | null> {
  return readJsonFile<OAuthPendingState>(join(STATE_DIR(), `${stateId}.json`));
}
