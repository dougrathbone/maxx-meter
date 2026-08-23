import type { Account, GlobalSettings, StoredCredential, UsageSnapshot } from "../models.js";
import {
  ProviderHttpError,
  errorSnapshot,
  mapHttpError,
  parseResetAt,
  parseUtilization,
  type Provider,
} from "./base.js";

interface ClaudeUsageBucket {
  utilization?: number;
  resets_at?: string | null;
}

interface ClaudeUsageResponse {
  five_hour?: ClaudeUsageBucket | null;
  seven_day?: ClaudeUsageBucket | null;
}

export const claudeProvider: Provider = {
  id: "claude",
  async fetchUsage(
    account: Account,
    credential: StoredCredential,
    settings: GlobalSettings,
  ): Promise<UsageSnapshot> {
    try {
      const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
        headers: {
          Authorization: `Bearer ${credential.accessToken}`,
          "anthropic-beta": "oauth-2025-04-20",
          "User-Agent": "MaxxMeter/0.1",
        },
      });

      if (!res.ok) {
        throw new ProviderHttpError(`Claude API ${res.status}`, res.status);
      }

      const body = (await res.json()) as ClaudeUsageResponse;
      const windows = [];

      const sessionPct = parseUtilization(body.five_hour?.utilization);
      if (sessionPct !== null) {
        windows.push({
          id: "session" as const,
          usedPct: sessionPct,
          resetsAt: parseResetAt(body.five_hour?.resets_at),
        });
      }

      const weeklyPct = parseUtilization(body.seven_day?.utilization);
      if (weeklyPct !== null) {
        windows.push({
          id: "weekly" as const,
          usedPct: weeklyPct,
          resetsAt: parseResetAt(body.seven_day?.resets_at),
        });
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
        err instanceof Error ? err.message : "Claude fetch failed",
        credential.authMethod,
      );
    }
  },
};
