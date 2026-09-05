import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GlobalSettings, GlobalSettingsSchema } from "./models.js";
import { dataRoot, readJsonFile, writeJsonFile } from "./storage.js";

const DEFAULTS: GlobalSettings = GlobalSettingsSchema.parse({ mqtt: {}, ha: {} });

export function settingsFilePath(): string {
  return process.env.MAXXMETER_SETTINGS_PATH ?? join(dataRoot(), "settings.json");
}

export function haOptionsFilePath(): string {
  return process.env.OPTIONS_PATH ?? join(dataRoot(), "options.json");
}

export function isHaAddOnOptions(raw: Record<string, unknown>): boolean {
  return (
    "poll_interval_seconds" in raw ||
    "mqtt_host" in raw ||
    "mqtt_port" in raw ||
    "mqtt_tls" in raw ||
    "ha_url" in raw ||
    "ha_token" in raw ||
    "bootstrap_office_panel" in raw
  );
}

export function isLegacyAppSettings(raw: Record<string, unknown>): boolean {
  if (isHaAddOnOptions(raw)) return false;
  return (
    typeof raw.pollIntervalSeconds === "number" ||
    (typeof raw.mqtt === "object" && raw.mqtt !== null)
  );
}

export async function loadSettings(): Promise<GlobalSettings> {
  let fromFile = await readJsonFile<Partial<GlobalSettings>>(settingsFilePath());
  if (!fromFile) {
    const legacy = await readJsonFile<Record<string, unknown>>(haOptionsFilePath());
    if (legacy && isLegacyAppSettings(legacy)) {
      fromFile = legacy as Partial<GlobalSettings>;
      const migrated = mergeSettings(fromFile, {});
      await writeJsonFile(settingsFilePath(), migrated);
      fromFile = migrated;
    }
  }
  return applySupervisorHaFallback(mergeSettings(fromFile ?? {}, settingsFromEnv()));
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  const toStore: GlobalSettings = {
    ...settings,
    ha: { ...settings.ha },
  };
  if (process.env.SUPERVISOR_TOKEN && toStore.ha.token === process.env.SUPERVISOR_TOKEN) {
    toStore.ha.token = "";
  }
  await writeJsonFile(settingsFilePath(), toStore);
}

export function applySupervisorHaFallback(settings: GlobalSettings): GlobalSettings {
  if (settings.ha.token) return settings;
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) return settings;
  return {
    ...settings,
    ha: {
      url: settings.ha.url || "http://supervisor/core",
      token,
    },
  };
}

function mergeSettings(
  fromFile: Partial<GlobalSettings>,
  fromEnv: Record<string, unknown>,
): GlobalSettings {
  const envMqtt = (fromEnv.mqtt as object) ?? {};
  const envHa = (fromEnv.ha as object) ?? {};
  return GlobalSettingsSchema.parse({
    ...DEFAULTS,
    ...fromFile,
    ...fromEnv,
    mqtt: { ...DEFAULTS.mqtt, ...fromFile.mqtt, ...envMqtt },
    ha: { ...DEFAULTS.ha, ...fromFile.ha, ...envHa },
  });
}

function settingsFromEnv(): Record<string, unknown> {
  const mqtt: Partial<GlobalSettings["mqtt"]> = {};
  if (process.env.MQTT_HOST) mqtt.host = process.env.MQTT_HOST;
  if (process.env.MQTT_PORT) {
    const port = envInt("MQTT_PORT");
    if (port !== undefined) mqtt.port = port;
  }
  if (process.env.MQTT_USERNAME) mqtt.username = process.env.MQTT_USERNAME;
  if (process.env.MQTT_PASSWORD) mqtt.password = process.env.MQTT_PASSWORD;
  if (process.env.MQTT_TOPIC_PREFIX) mqtt.topicPrefix = process.env.MQTT_TOPIC_PREFIX;
  if (process.env.MQTT_TLS === "true") mqtt.tls = true;
  if (process.env.MQTT_TLS === "false") mqtt.tls = false;

  const ha: Partial<GlobalSettings["ha"]> = {};
  if (process.env.HA_URL) ha.url = process.env.HA_URL;
  if (process.env.HA_TOKEN) ha.token = process.env.HA_TOKEN;

  const fromEnv: Record<string, unknown> = {};
  const poll = envInt("POLL_INTERVAL_SECONDS");
  if (poll !== undefined) fromEnv.pollIntervalSeconds = poll;
  const warn = envInt("WARN_PCT");
  if (warn !== undefined) fromEnv.warnPct = warn;
  const critical = envInt("CRITICAL_PCT");
  if (critical !== undefined) fromEnv.criticalPct = critical;
  if (Object.keys(mqtt).length) fromEnv.mqtt = mqtt;
  if (Object.keys(ha).length) fromEnv.ha = ha;
  return fromEnv;
}

function envInt(key: string): number | undefined {
  const v = process.env[key];
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function loadHaOptionsFile(): Promise<Record<string, unknown>> {
  const path = haOptionsFilePath();
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function panelApiPort(): number {
  return Number.parseInt(process.env.PANEL_API_PORT ?? "8765", 10);
}

export function ingressPort(): number {
  return Number.parseInt(process.env.INGRESS_PORT ?? "8099", 10);
}
