import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "../../src/config.js";
import { overlayHaOptions, syncSettingsFromHaOptions } from "../../src/config-sync.js";
import { GlobalSettingsSchema } from "../../src/models.js";

let dataDir: string;
const savedEnv: Record<string, string | undefined> = {};

function snapshotEnv(keys: string[]): void {
  for (const key of keys) savedEnv[key] = process.env[key];
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "maxxmeter-settings-"));
  snapshotEnv([
    "MAXXMETER_DATA_DIR",
    "MQTT_HOST",
    "POLL_INTERVAL_SECONDS",
    "OPTIONS_PATH",
    "MAXXMETER_SETTINGS_PATH",
    "SUPERVISOR_TOKEN",
    "MQTT_TLS",
  ]);
  process.env.MAXXMETER_DATA_DIR = dataDir;
  delete process.env.MQTT_HOST;
  delete process.env.POLL_INTERVAL_SECONDS;
  delete process.env.OPTIONS_PATH;
  delete process.env.MAXXMETER_SETTINGS_PATH;
  delete process.env.SUPERVISOR_TOKEN;
  delete process.env.MQTT_TLS;
});

afterEach(async () => {
  restoreEnv();
  await rm(dataDir, { recursive: true, force: true });
});

const base = GlobalSettingsSchema.parse({
  pollIntervalSeconds: 120,
  mqtt: { host: "broker.local", port: 1883, username: "user", password: "secret", topicPrefix: "maxxmeter" },
  ha: { url: "http://ha", token: "token" },
});

describe("overlayHaOptions", () => {
  it("applies HA option values without wiping secrets that are blank in options", () => {
    const next = overlayHaOptions(base, {
      poll_interval_seconds: 90,
      mqtt_host: "core-mosquitto",
      mqtt_password: "",
      ha_token: "",
    });
    expect(next.pollIntervalSeconds).toBe(90);
    expect(next.mqtt.host).toBe("core-mosquitto");
    expect(next.mqtt.password).toBe("secret");
    expect(next.ha.token).toBe("token");
    expect(next.mqtt.tls).toBe(false);
  });

  it("applies mqtt_tls from add-on options", () => {
    const next = overlayHaOptions(
      { ...base, mqtt: { ...base.mqtt, tls: false } },
      { mqtt_tls: true },
    );
    expect(next.mqtt.tls).toBe(true);
    expect(next.mqtt.host).toBe("broker.local");
  });
});

describe("loadSettings / saveSettings", () => {
  it("persists to settings.json, not options.json", async () => {
    await saveSettings(base);
    const settingsRaw = JSON.parse(await readFile(join(dataDir, "settings.json"), "utf8")) as {
      mqtt: { host: string };
    };
    expect(settingsRaw.mqtt.host).toBe("broker.local");

    await expect(readFile(join(dataDir, "options.json"), "utf8")).rejects.toThrow();
  });

  it("does not let default env MQTT_HOST override saved settings when unset", async () => {
    await saveSettings(base);
    const loaded = await loadSettings();
    expect(loaded.mqtt.host).toBe("broker.local");
    expect(loaded.pollIntervalSeconds).toBe(120);
  });

  it("migrates nested settings that were previously written to options.json", async () => {
    await writeFile(
      join(dataDir, "options.json"),
      JSON.stringify({
        pollIntervalSeconds: 180,
        warnPct: 70,
        criticalPct: 90,
        mqtt: { host: "legacy-broker", port: 1883, username: "", password: "", topicPrefix: "maxxmeter" },
        ha: { url: "http://supervisor/core", token: "" },
      }),
    );
    const loaded = await loadSettings();
    expect(loaded.mqtt.host).toBe("legacy-broker");
    expect(loaded.pollIntervalSeconds).toBe(180);
    const migrated = JSON.parse(await readFile(join(dataDir, "settings.json"), "utf8")) as {
      mqtt: { host: string };
    };
    expect(migrated.mqtt.host).toBe("legacy-broker");
  });
});

describe("syncSettingsFromHaOptions", () => {
  it("copies Supervisor options into settings.json without rewriting options.json", async () => {
    const haOptions = {
      poll_interval_seconds: 60,
      warn_pct: 70,
      critical_pct: 90,
      mqtt_host: "core-mosquitto",
      mqtt_port: 1883,
      mqtt_username: "",
      mqtt_password: "broker-pass",
      mqtt_topic_prefix: "maxxmeter",
      ha_url: "http://supervisor/core",
      ha_token: "ha-token",
      bootstrap_office_panel: false,
    };
    await writeFile(join(dataDir, "options.json"), JSON.stringify(haOptions));
    await syncSettingsFromHaOptions();

    const loaded = await loadSettings();
    expect(loaded.pollIntervalSeconds).toBe(60);
    expect(loaded.mqtt.host).toBe("core-mosquitto");
    expect(loaded.mqtt.password).toBe("broker-pass");
    expect(loaded.ha.token).toBe("ha-token");

    const optionsOnDisk = JSON.parse(await readFile(join(dataDir, "options.json"), "utf8"));
    expect(optionsOnDisk).toEqual(haOptions);
  });

  it("ignores nested leftover options.json that is not Supervisor-shaped", async () => {
    await saveSettings(base);
    await writeFile(
      join(dataDir, "options.json"),
      JSON.stringify({ pollIntervalSeconds: 999, mqtt: { host: "should-not-apply" } }),
    );
    await syncSettingsFromHaOptions();
    const loaded = await loadSettings();
    expect(loaded.pollIntervalSeconds).toBe(120);
    expect(loaded.mqtt.host).toBe("broker.local");
  });
});

describe("SUPERVISOR_TOKEN", () => {
  it("fills an empty HA token at load time and does not persist it", async () => {
    process.env.SUPERVISOR_TOKEN = "supervisor-secret";
    await saveSettings({
      ...base,
      ha: { url: "http://supervisor/core", token: "" },
    });
    const loaded = await loadSettings();
    expect(loaded.ha.token).toBe("supervisor-secret");

    await saveSettings(loaded);
    const onDisk = JSON.parse(await readFile(join(dataDir, "settings.json"), "utf8")) as {
      ha: { token: string };
    };
    expect(onDisk.ha.token).toBe("");
  });
});

describe("MQTT_TLS env", () => {
  it("enables TLS from MQTT_TLS=true", async () => {
    process.env.MQTT_TLS = "true";
    const loaded = await loadSettings();
    expect(loaded.mqtt.tls).toBe(true);
  });
});
