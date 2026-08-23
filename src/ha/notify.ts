import type { GlobalSettings, UsageSnapshot } from "../models.js";

export async function notifyAuthExpired(
  settings: GlobalSettings,
  snapshot: UsageSnapshot,
): Promise<void> {
  if (!settings.ha.token) return;

  const url = `${settings.ha.url.replace(/\/$/, "")}/api/services/persistent_notification/create`;
  const title = `MaxxMeter: ${snapshot.label} needs re-auth`;
  const message = `${snapshot.provider} account "${snapshot.label}" credentials expired. Open MaxxMeter in Home Assistant to reconnect.`;

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.ha.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, message }),
  }).catch(() => {
    // non-fatal
  });
}

export async function notifyAuthExpiredBatch(
  settings: GlobalSettings,
  previous: UsageSnapshot[],
  current: UsageSnapshot[],
): Promise<void> {
  for (const snap of current) {
    if (snap.status !== "auth_expired") continue;
    const prev = previous.find((p) => p.accountId === snap.accountId);
    if (prev?.status === "auth_expired") continue;
    await notifyAuthExpired(settings, snap);
  }
}
