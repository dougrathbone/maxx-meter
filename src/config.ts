import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GlobalSettings, GlobalSettingsSchema } from "./models.js";
import { dataRoot, readJsonFile, writeJsonFile } from "./storage.js";

const OPTIONS_PATH = join(dataRoot(), "options.json");

const DEFAULTS: GlobalSettings = GlobalSettingsSchema.parse({ mqtt: {}, ha: {} });

export async function loadSettings(): Promise<GlobalSettings> {
  const fromFile = await readJsonFile<Partial<GlobalSettings>>(OPTIONS_PATH);
  const fromEnv = settingsFromEnv();
  return GlobalSettingsSchema.parse({
    ...DEFAULTS,
    ...fromFile,
    ...fromEnv,
    mqtt: { ...DEFAULTS.mqtt, ...fromFile?.mqtt, ...((fromEnv.mqtt as object) ?? {}) },
    ha: { ...DEFAULTS.ha, ...fromFile?.ha, ...((fromEnv.ha as object) ?? {}) },
  });
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  await writeJsonFile(OPTIONS_PATH, settings);
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

  const ha: Partial<GlobalSettings["ha"]> = {};
  if (process.env.HA_URL) ha.url = process.env.HA_URL;
  if (process.env.HA_TOKEN) ha.token = process.env.HA_TOKEN;

  return {
    pollIntervalSeconds: envInt("POLL_INTERVAL_SECONDS"),
    warnPct: envInt("WARN_PCT"),
    criticalPct: envInt("CRITICAL_PCT"),
    ...(Object.keys(mqtt).length ? { mqtt } : {}),
    ...(Object.keys(ha).length ? { ha } : {}),
  };
}

function envInt(key: string): number | undefined {
  const v = process.env[key];
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function loadHaOptionsFile(): Promise<Record<string, unknown>> {
  const path = process.env.OPTIONS_PATH ?? "/data/options.json";
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
