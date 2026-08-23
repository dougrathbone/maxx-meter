import { join } from "node:path";
import type { Account } from "../models.js";
import { AccountSchema } from "../models.js";
import {
  dataRoot,
  deleteFile,
  generateId,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "../storage.js";

const ACCOUNTS_DIR = () => join(dataRoot(), "accounts");

export async function listAccounts(): Promise<Account[]> {
  const files = await listJsonFiles(ACCOUNTS_DIR());
  const accounts: Account[] = [];
  for (const file of files) {
    const raw = await readJsonFile<unknown>(join(ACCOUNTS_DIR(), file));
    const parsed = AccountSchema.safeParse(raw);
    if (parsed.success) accounts.push(parsed.data);
  }
  return accounts.sort((a, b) => a.label.localeCompare(b.label));
}

export async function listAccountsForUser(userId: string): Promise<Account[]> {
  const all = await listAccounts();
  return all.filter((a) => a.ownerUserId === userId);
}

export async function getAccount(id: string): Promise<Account | null> {
  return readJsonFile<Account>(join(ACCOUNTS_DIR(), `${id}.json`));
}

export async function createAccount(input: {
  provider: Account["provider"];
  label: string;
  ownerUserId: string;
  ownerUserName?: string;
}): Promise<Account> {
  const account: Account = AccountSchema.parse({
    id: generateId(input.provider),
    provider: input.provider,
    label: input.label,
    ownerUserId: input.ownerUserId,
    ownerUserName: input.ownerUserName,
    createdAt: new Date().toISOString(),
  });
  await writeJsonFile(join(ACCOUNTS_DIR(), `${account.id}.json`), account);
  return account;
}

export async function deleteAccount(id: string): Promise<void> {
  await deleteFile(join(ACCOUNTS_DIR(), `${id}.json`));
}
