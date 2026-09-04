import type { GlobalSettings, UsageSnapshot } from "../models.js";
import { slugify } from "../storage.js";

export type MqttMessage = {
  topic: string;
  payload: string;
  retain: boolean;
};

export function availabilityTopic(prefix: string): string {
  return `${prefix}/status`;
}

export function mqttOnlineMessage(prefix: string): MqttMessage {
  return { topic: availabilityTopic(prefix), payload: "online", retain: true };
}

export function mqttOfflinePayload(): string {
  return "offline";
}

/** Clear the old sensor-typed auth_ok discovery topic after migrating to binary_sensor. */
export function staleAuthOkSensorDiscoveryTopic(
  prefix: string,
  userSlug: string,
  accountId: string,
): string {
  return `homeassistant/sensor/${prefix}/${userSlug}_${accountId}_auth_ok/config`;
}

export function mqttMessagesForSnapshots(
  settings: GlobalSettings,
  snapshots: UsageSnapshot[],
): MqttMessage[] {
  const prefix = settings.mqtt.topicPrefix;
  const messages: MqttMessage[] = [mqttOnlineMessage(prefix)];

  for (const snap of snapshots) {
    const userSlug = slugify(snap.ownerUserId);
    const base = `${prefix}/users/${userSlug}/${snap.accountId}`;
    const session = snap.windows.find((w) => w.id === "session");
    const weekly = snap.windows.find((w) => w.id === "weekly");

    if (session) {
      messages.push({
        topic: `${base}/session_usage/state`,
        payload: String(session.usedPct),
        retain: true,
      });
    }
    if (weekly) {
      messages.push({
        topic: `${base}/weekly_usage/state`,
        payload: String(weekly.usedPct),
        retain: true,
      });
    }
    messages.push({
      topic: `${base}/auth_ok/state`,
      payload: snap.status === "ok" ? "ON" : "OFF",
      retain: true,
    });
    messages.push(...discoveryMessages(prefix, userSlug, snap));
  }

  return messages;
}

function discoveryMessages(
  prefix: string,
  userSlug: string,
  snap: UsageSnapshot,
): MqttMessage[] {
  const entityBase = `${userSlug}_${snap.accountId}`;
  const availability = availabilityTopic(prefix);
  const device = {
    identifiers: [`maxxmeter_${userSlug}`],
    name: `MaxxMeter ${userSlug}`,
    manufacturer: "MaxxMeter",
    model: "Token Dashboard",
  };

  const sensors = [
    { suffix: "session_usage", name: `${snap.label} Session Usage` },
    { suffix: "weekly_usage", name: `${snap.label} Weekly Usage` },
  ];

  const messages: MqttMessage[] = sensors.map((cfg) => ({
    topic: `homeassistant/sensor/${prefix}/${entityBase}_${cfg.suffix}/config`,
    payload: JSON.stringify({
      name: cfg.name,
      state_topic: `${prefix}/users/${userSlug}/${snap.accountId}/${cfg.suffix}/state`,
      unique_id: `maxxmeter_${entityBase}_${cfg.suffix}`,
      availability_topic: availability,
      payload_available: "online",
      payload_not_available: "offline",
      unit_of_measurement: "%",
      state_class: "measurement",
      device,
    }),
    retain: true,
  }));

  messages.push({
    topic: staleAuthOkSensorDiscoveryTopic(prefix, userSlug, snap.accountId),
    payload: "",
    retain: true,
  });

  messages.push({
    topic: `homeassistant/binary_sensor/${prefix}/${entityBase}_auth_ok/config`,
    payload: JSON.stringify({
      name: `${snap.label} Auth OK`,
      state_topic: `${prefix}/users/${userSlug}/${snap.accountId}/auth_ok/state`,
      unique_id: `maxxmeter_${entityBase}_auth_ok`,
      availability_topic: availability,
      payload_available: "online",
      payload_not_available: "offline",
      payload_on: "ON",
      payload_off: "OFF",
      device_class: "connectivity",
      device,
    }),
    retain: true,
  });

  return messages;
}
