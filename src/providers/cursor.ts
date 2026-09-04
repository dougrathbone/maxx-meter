import type { Account, GlobalSettings, StoredCredential, UsageSnapshot } from "../models.js";
import {
  ProviderHttpError,
  errorSnapshot,
  mapHttpError,
  parseUtilization,
  type Provider,
} from "./base.js";

interface CursorPeriodUsage {
  autoPercentUsed?: number;
  apiPercentUsed?: number;
}

export const cursorProvider: Provider = {
  id: "cursor",
  async fetchUsage(
    account: Account,
    credential: StoredCredential,
    settings: GlobalSettings,
  ): Promise<UsageSnapshot> {
    try {
      const cookie = formatCursorCookie(credential.accessToken);
      const periodRes = await fetch("https://cursor.com/api/dashboard/get-current-period-usage", {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "https://cursor.com",
          "Content-Type": "application/json",
          "User-Agent": "MaxxMeter/0.1",
        },
        body: "{}",
      });

      if (!periodRes.ok) {
        throw new ProviderHttpError(`Cursor period ${periodRes.status}`, periodRes.status);
      }

      const period = (await periodRes.json()) as CursorPeriodUsage;
      const windows = [];

      const autoPct = parseUtilization(period.autoPercentUsed);
      if (autoPct !== null) {
        windows.push({ id: "session" as const, usedPct: autoPct, resetsAt: null });
      }

      const apiPct = parseUtilization(period.apiPercentUsed);
      if (apiPct !== null) {
        windows.push({ id: "weekly" as const, usedPct: apiPct, resetsAt: null });
      }

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
        err instanceof Error ? err.message : "Cursor fetch failed",
        credential.authMethod,
      );
    }
  },
};

function formatCursorCookie(token: string): string {
  if (token.includes("WorkosCursorSessionToken=")) return token;
  return `WorkosCursorSessionToken=${token}`;
}
