import { loadHaOptionsFile, loadSettings, saveSettings } from "./config.js";
import type { GlobalSettings } from "./models.js";

/** Map Home Assistant add-on options.json into app settings on startup. */
export async function syncSettingsFromHaOptions(): Promise<void> {
  const options = await loadHaOptionsFile();
  if (!options || Object.keys(options).length === 0) return;

  const current = await loadSettings();
  const next: GlobalSettings = {
    pollIntervalSeconds:
      (options.poll_interval_seconds as number) ?? current.pollIntervalSeconds,
    warnPct: (options.warn_pct as number) ?? current.warnPct,
    criticalPct: (options.critical_pct as number) ?? current.criticalPct,
    mqtt: {
      host: (options.mqtt_host as string) ?? current.mqtt.host,
      port: (options.mqtt_port as number) ?? current.mqtt.port,
      username: (options.mqtt_username as string) ?? current.mqtt.username,
      password: (options.mqtt_password as string) ?? current.mqtt.password,
      topicPrefix: (options.mqtt_topic_prefix as string) ?? current.mqtt.topicPrefix,
    },
    ha: {
      url: (options.ha_url as string) ?? current.ha.url,
      token: (options.ha_token as string) ?? current.ha.token,
    },
  };
  await saveSettings(next);
}
