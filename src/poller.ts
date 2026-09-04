import { listAccounts } from "./accounts/registry.js";
import { resolveCredential, retryCredentialAfterAuthExpired } from "./auth/credential-fresh.js";
import { getCredential } from "./auth/vault.js";
import type { GlobalSettings, UsageSnapshot } from "./models.js";
import { getProvider } from "./providers/index.js";
import { disconnectedSnapshot } from "./providers/base.js";

export const MIN_POLL_INTERVAL_SECONDS = 60;

export function pollIntervalMs(pollIntervalSeconds: number): number {
  return Math.max(MIN_POLL_INTERVAL_SECONDS, pollIntervalSeconds) * 1000;
}

export class UsagePoller {
  private cache: UsageSnapshot[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private onPoll: ((snapshots: UsageSnapshot[]) => void | Promise<void>) | null = null;

  constructor(private getSettings: () => Promise<GlobalSettings>) {}

  setOnPoll(handler: (snapshots: UsageSnapshot[]) => void | Promise<void>): void {
    this.onPoll = handler;
  }

  getSnapshots(): UsageSnapshot[] {
    return [...this.cache];
  }

  getSnapshotsForUser(userId: string): UsageSnapshot[] {
    return this.cache.filter((s) => s.ownerUserId === userId);
  }

  getSnapshotsForAccounts(accountIds: string[]): UsageSnapshot[] {
    const set = new Set(accountIds);
    return this.cache.filter((s) => set.has(s.accountId));
  }

  async pollOnce(): Promise<UsageSnapshot[]> {
    if (this.running) return this.cache;
    this.running = true;
    try {
      const settings = await this.getSettings();
      const accounts = await listAccounts();
      const results: UsageSnapshot[] = [];

      for (const account of accounts) {
        let credential = await getCredential(account.id);
        if (!credential) {
          results.push(disconnectedSnapshot(account, settings));
          continue;
        }
        credential = await resolveCredential(account, credential);
        const provider = getProvider(account.provider);
        let snap = await provider.fetchUsage(account, credential, settings);
        if (snap.status === "auth_expired") {
          const refreshed = await retryCredentialAfterAuthExpired(account, credential);
          if (refreshed) {
            snap = await provider.fetchUsage(account, refreshed, settings);
          }
        }
        results.push(snap);
      }

      this.cache = results;
      if (this.onPoll) await this.onPoll(results);
      return results;
    } finally {
      this.running = false;
    }
  }

  start(): void {
    if (this.timer) return;
    void this.pollOnce();
    void this.scheduleInterval();
  }

  restart(): void {
    this.stop();
    this.start();
  }

  private async scheduleInterval(): Promise<void> {
    const s = await this.getSettings();
    const intervalMs = pollIntervalMs(s.pollIntervalSeconds);
    this.timer = setInterval(() => void this.pollOnce(), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
