import type { Account, GlobalSettings, StoredCredential, UsageSnapshot } from "../models.js";
import {
  ProviderHttpError,
  errorSnapshot,
  mapHttpError,
  parseResetAt,
  parseUtilization,
  type Provider,
} from "./base.js";

interface KimiLimit {
  type?: string;
  unit?: number;
  percentage?: number;
  reset_at?: string;
  resets_at?: string;
}

interface KimiUsagesResponse {
  limits?: KimiLimit[];
  data?: { limits?: KimiLimit[] };
}

export const kimiProvider: Provider = {
  id: "kimi",
  async fetchUsage(
    account: Account,
    credential: StoredCredential,
    settings: GlobalSettings,
  ): Promise<UsageSnapshot> {
    try {
      const res = await fetch("https://api.kimi.com/coding/v1/usages", {
        headers: {
          Authorization: `Bearer ${credential.accessToken}`,
          "User-Agent": "MaxxMeter/0.1",
        },
      });

      if (!res.ok) {
        throw new ProviderHttpError(`Kimi API ${res.status}`, res.status);
      }

      const body = (await res.json()) as KimiUsagesResponse;
      const limits = body.limits ?? body.data?.limits ?? [];
      const windows = mapKimiLimits(limits);

      return {
        accountId: account.id,
        ownerUserId: account.ownerUserId,
        provider: account.provider,
        label: account.label,
        status: "ok",
        authMethod: credential.authMethod,
        updatedAt: new Date().toISOString(),
        windows,
        thresholds: { warnPct: settings.warnPct, criticalPct: settings.criticalPct },
      };
    } catch (err) {
      if (err instanceof ProviderHttpError) {
        return errorSnapshot(
          account,
          settings,
          mapHttpError(err.status),
          err.message,
          credential.authMethod,
        );
      }
      return errorSnapshot(
        account,
        settings,
        "error",
        err instanceof Error ? err.message : "Kimi fetch failed",
        credential.authMethod,
      );
    }
  },
};

function mapKimiLimits(limits: KimiLimit[]): UsageSnapshot["windows"] {
  const windows: UsageSnapshot["windows"] = [];

  const session = limits.find(
    (l) => l.unit === 3 || l.type?.toLowerCase().includes("5") || l.type === "TOKENS_LIMIT_5H",
  );
  const weekly = limits.find(
    (l) => l.unit === 6 || l.type?.toLowerCase().includes("week") || l.type === "TOKENS_LIMIT_WEEK",
  );

  const sessionPct = parseUtilization(session?.percentage);
  if (sessionPct !== null) {
    windows.push({
      id: "session",
      usedPct: sessionPct,
      resetsAt: parseResetAt(session?.reset_at ?? session?.resets_at),
    });
  }

  const weeklyPct = parseUtilization(weekly?.percentage);
  if (weeklyPct !== null) {
    windows.push({
      id: "weekly",
      usedPct: weeklyPct,
      resetsAt: parseResetAt(weekly?.reset_at ?? weekly?.resets_at),
    });
  }

  if (windows.length === 0 && limits.length >= 2) {
    const sorted = [...limits].filter((l) => parseUtilization(l.percentage) !== null);
    if (sorted[0]) {
      windows.push({
        id: "session",
        usedPct: parseUtilization(sorted[0].percentage)!,
        resetsAt: parseResetAt(sorted[0].reset_at ?? sorted[0].resets_at),
      });
    }
    if (sorted[1]) {
      windows.push({
        id: "weekly",
        usedPct: parseUtilization(sorted[1].percentage)!,
        resetsAt: parseResetAt(sorted[1].reset_at ?? sorted[1].resets_at),
      });
    }
  }

  return windows;
}
