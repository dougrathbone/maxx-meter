import {
  isHaAddOnOptions,
  loadHaOptionsFile,
  loadSettings,
  saveSettings,
} from "./config.js";
import type { GlobalSettings } from "./models.js";

/** Map Home Assistant add-on options.json into app settings on startup.
 * Supervisor owns `/data/options.json`; MaxxMeter persists its own copy in settings.json.
 */
export async function syncSettingsFromHaOptions(): Promise<void> {
  const options = await loadHaOptionsFile();
  if (!options || Object.keys(options).length === 0) return;
  if (!isHaAddOnOptions(options)) return;

  const current = await loadSettings();
  await saveSettings(overlayHaOptions(current, options));
}

export function overlayHaOptions(
  current: GlobalSettings,
  options: Record<string, unknown>,
): GlobalSettings {
  return {
    pollIntervalSeconds: numberOr(options.poll_interval_seconds, current.pollIntervalSeconds),
    warnPct: numberOr(options.warn_pct, current.warnPct),
    criticalPct: numberOr(options.critical_pct, current.criticalPct),
    mqtt: {
      host: nonEmptyString(options.mqtt_host) ?? current.mqtt.host,
      port: numberOr(options.mqtt_port, current.mqtt.port),
      username: nonEmptyString(options.mqtt_username) ?? current.mqtt.username,
      password: nonEmptyString(options.mqtt_password) ?? current.mqtt.password,
      topicPrefix: nonEmptyString(options.mqtt_topic_prefix) ?? current.mqtt.topicPrefix,
      tls: typeof options.mqtt_tls === "boolean" ? options.mqtt_tls : current.mqtt.tls,
    },
    ha: {
      url: nonEmptyString(options.ha_url) ?? current.ha.url,
      token: nonEmptyString(options.ha_token) ?? current.ha.token,
    },
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
