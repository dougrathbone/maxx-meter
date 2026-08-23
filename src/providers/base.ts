import type { StoredCredential, UsageSnapshot } from "../models.js";
import type { GlobalSettings } from "../models.js";
import type { Account } from "../models.js";

export interface Provider {
  readonly id: StoredCredential["provider"];
  fetchUsage(
    account: Account,
    credential: StoredCredential,
    settings: GlobalSettings,
  ): Promise<UsageSnapshot>;
}

export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}

export function disconnectedSnapshot(
  account: Account,
  settings: GlobalSettings,
): UsageSnapshot {
  return {
    accountId: account.id,
    ownerUserId: account.ownerUserId,
    provider: account.provider,
    label: account.label,
    status: "disconnected",
    updatedAt: new Date().toISOString(),
    windows: [],
    thresholds: { warnPct: settings.warnPct, criticalPct: settings.criticalPct },
    errorMessage: "Not connected — add credentials in MaxxMeter dashboard",
  };
}

export function errorSnapshot(
  account: Account,
  settings: GlobalSettings,
  status: UsageSnapshot["status"],
  message: string,
  authMethod?: UsageSnapshot["authMethod"],
): UsageSnapshot {
  return {
    accountId: account.id,
    ownerUserId: account.ownerUserId,
    provider: account.provider,
    label: account.label,
    status,
    authMethod,
    updatedAt: new Date().toISOString(),
    windows: [],
    thresholds: { warnPct: settings.warnPct, criticalPct: settings.criticalPct },
    errorMessage: message,
  };
}

export function mapHttpError(status: number): UsageSnapshot["status"] {
  if (status === 401 || status === 403) return "auth_expired";
  if (status === 429) return "rate_limited";
  return "error";
}

export function parseUtilization(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.min(100, Math.max(0, value));
  return null;
}

export function parseResetAt(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
