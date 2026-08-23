import { join } from "node:path";
import type { StoredCredential } from "../models.js";
import { StoredCredentialSchema } from "../models.js";
import { dataRoot, deleteFile, readJsonFile, writeJsonFile } from "../storage.js";

const CREDENTIALS_DIR = () => join(dataRoot(), "credentials");

export async function getCredential(accountId: string): Promise<StoredCredential | null> {
  return readJsonFile<StoredCredential>(join(CREDENTIALS_DIR(), `${accountId}.json`));
}

export async function saveCredential(credential: StoredCredential): Promise<void> {
  const parsed = StoredCredentialSchema.parse(credential);
  await writeJsonFile(join(CREDENTIALS_DIR(), `${parsed.accountId}.json`), parsed);
}

export async function deleteCredential(accountId: string): Promise<void> {
  await deleteFile(join(CREDENTIALS_DIR(), `${accountId}.json`));
}
