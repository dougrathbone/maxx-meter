import mqtt from "mqtt";
import type { GlobalSettings, UsageSnapshot } from "../models.js";
import { slugify } from "../storage.js";

export class MqttPublisher {
  private client: mqtt.MqttClient | null = null;

  connect(settings: GlobalSettings): void {
    if (this.client) return;
    this.openClient(settings);
  }

  reconnect(settings: GlobalSettings): void {
    this.disconnect();
    this.openClient(settings);
  }

  disconnect(): void {
    this.client?.end(true);
    this.client = null;
  }

  private openClient(settings: GlobalSettings): void {
    const url = `mqtt://${settings.mqtt.host}:${settings.mqtt.port}`;
    this.client = mqtt.connect(url, {
      username: settings.mqtt.username || undefined,
      password: settings.mqtt.password || undefined,
      reconnectPeriod: 5000,
    });
  }

  publishSnapshots(settings: GlobalSettings, snapshots: UsageSnapshot[]): void {
    if (!this.client?.connected) return;
    const prefix = settings.mqtt.topicPrefix;

    for (const snap of snapshots) {
      const userSlug = slugify(snap.ownerUserId);
      const base = `${prefix}/users/${userSlug}/${snap.accountId}`;
      const session = snap.windows.find((w) => w.id === "session");
      const weekly = snap.windows.find((w) => w.id === "weekly");

      if (session) {
        this.client.publish(`${base}/session_usage/state`, String(session.usedPct), { retain: true });
      }
      if (weekly) {
        this.client.publish(`${base}/weekly_usage/state`, String(weekly.usedPct), { retain: true });
      }
      this.client.publish(
        `${base}/auth_ok/state`,
        snap.status === "ok" ? "ON" : "OFF",
        { retain: true },
      );

      publishDiscovery(this.client, prefix, userSlug, snap.accountId, snap.label);
    }
  }
}

function publishDiscovery(
  client: mqtt.MqttClient,
  prefix: string,
  userSlug: string,
  accountId: string,
  label: string,
): void {
  const entityBase = `${userSlug}_${accountId}`;
  const configs = [
    {
      suffix: "session_usage",
      name: `${label} Session Usage`,
      unit: "%",
    },
    {
      suffix: "weekly_usage",
      name: `${label} Weekly Usage`,
      unit: "%",
    },
    {
      suffix: "auth_ok",
      name: `${label} Auth OK`,
      unit: undefined,
    },
  ];

  for (const cfg of configs) {
    const topic = `homeassistant/sensor/${prefix}/${entityBase}_${cfg.suffix}/config`;
    const stateTopic = `${prefix}/users/${userSlug}/${accountId}/${cfg.suffix}/state`;
    const payload = {
      name: cfg.name,
      state_topic: stateTopic,
      unique_id: `maxxmeter_${entityBase}_${cfg.suffix}`,
      device: {
        identifiers: [`maxxmeter_${userSlug}`],
        name: `MaxxMeter ${userSlug}`,
        manufacturer: "MaxxMeter",
        model: "Token Dashboard",
      },
      ...(cfg.unit ? { unit_of_measurement: cfg.unit } : {}),
    };
    client.publish(topic, JSON.stringify(payload), { retain: true });
  }
}
