import mqtt from "mqtt";
import type { GlobalSettings, UsageSnapshot } from "../models.js";
import {
  availabilityTopic,
  mqttMessagesForSnapshots,
  mqttOfflinePayload,
} from "./messages.js";

export class MqttPublisher {
  private client: mqtt.MqttClient | null = null;
  private lastSettings: GlobalSettings | null = null;
  private lastSnapshots: UsageSnapshot[] = [];

  connect(settings: GlobalSettings): void {
    if (this.client) return;
    this.lastSettings = settings;
    this.openClient(settings);
  }

  reconnect(settings: GlobalSettings): void {
    this.disconnect();
    this.lastSettings = settings;
    this.openClient(settings);
  }

  disconnect(): void {
    this.client?.end(true);
    this.client = null;
  }

  private openClient(settings: GlobalSettings): void {
    const url = `mqtt://${settings.mqtt.host}:${settings.mqtt.port}`;
    const prefix = settings.mqtt.topicPrefix;
    this.client = mqtt.connect(url, {
      username: settings.mqtt.username || undefined,
      password: settings.mqtt.password || undefined,
      reconnectPeriod: 5000,
      will: {
        topic: availabilityTopic(prefix),
        payload: mqttOfflinePayload(),
        retain: true,
        qos: 0,
      },
    });
    this.client.on("connect", () => {
      this.flush();
    });
  }

  publishSnapshots(settings: GlobalSettings, snapshots: UsageSnapshot[]): void {
    this.lastSettings = settings;
    this.lastSnapshots = snapshots;
    this.flush();
  }

  private flush(): void {
    if (!this.client?.connected || !this.lastSettings) return;
    for (const message of mqttMessagesForSnapshots(this.lastSettings, this.lastSnapshots)) {
      this.client.publish(message.topic, message.payload, { retain: message.retain });
    }
  }
}
