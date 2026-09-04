import { describe, expect, it } from "vitest";
import type { GlobalSettings, UsageSnapshot } from "../../src/models.js";
import {
  availabilityTopic,
  mqttMessagesForSnapshots,
  staleAuthOkSensorDiscoveryTopic,
} from "../../src/mqtt/messages.js";

const settings: GlobalSettings = {
  pollIntervalSeconds: 60,
  warnPct: 70,
  criticalPct: 90,
  mqtt: { host: "core-mosquitto", port: 1883, username: "", password: "", topicPrefix: "maxxmeter" },
  ha: { url: "http://supervisor/core", token: "" },
};

const snapshot: UsageSnapshot = {
  accountId: "claude_abc",
  ownerUserId: "Doug Admin",
  provider: "claude",
  label: "Claude Pro",
  status: "ok",
  authMethod: "oauth",
  updatedAt: new Date().toISOString(),
  windows: [
    { id: "session", usedPct: 12, resetsAt: null },
    { id: "weekly", usedPct: 40, resetsAt: null },
  ],
  thresholds: { warnPct: 70, criticalPct: 90 },
};

describe("mqtt discovery and state topics", () => {
  it("publishes state, availability, binary_sensor auth_ok, and clears the old sensor discovery", () => {
    const messages = mqttMessagesForSnapshots(settings, [snapshot]);
    const userSlug = "doug_admin";
    const topics = messages.map((m) => m.topic);

    expect(topics).toContain(availabilityTopic("maxxmeter"));
    expect(topics).toContain("maxxmeter/users/doug_admin/claude_abc/session_usage/state");
    expect(topics).toContain("maxxmeter/users/doug_admin/claude_abc/weekly_usage/state");
    expect(topics).toContain("maxxmeter/users/doug_admin/claude_abc/auth_ok/state");
    expect(topics).toContain(
      "homeassistant/binary_sensor/maxxmeter/doug_admin_claude_abc_auth_ok/config",
    );
    expect(topics).toContain(staleAuthOkSensorDiscoveryTopic("maxxmeter", userSlug, "claude_abc"));

    const session = messages.find(
      (m) => m.topic === "maxxmeter/users/doug_admin/claude_abc/session_usage/state",
    );
    expect(session?.payload).toBe("12");

    const authState = messages.find(
      (m) => m.topic === "maxxmeter/users/doug_admin/claude_abc/auth_ok/state",
    );
    expect(authState?.payload).toBe("ON");

    const stale = messages.find(
      (m) => m.topic === staleAuthOkSensorDiscoveryTopic("maxxmeter", userSlug, "claude_abc"),
    );
    expect(stale?.payload).toBe("");
    expect(stale?.retain).toBe(true);

    const discovery = messages.find(
      (m) =>
        m.topic === "homeassistant/binary_sensor/maxxmeter/doug_admin_claude_abc_auth_ok/config",
    );
    const payload = JSON.parse(discovery!.payload) as {
      device_class: string;
      availability_topic: string;
      payload_on: string;
    };
    expect(payload.device_class).toBe("connectivity");
    expect(payload.availability_topic).toBe("maxxmeter/status");
    expect(payload.payload_on).toBe("ON");
  });

  it("marks auth_ok OFF when the snapshot is not ok", () => {
    const messages = mqttMessagesForSnapshots(settings, [
      { ...snapshot, status: "auth_expired" },
    ]);
    const authState = messages.find(
      (m) => m.topic === "maxxmeter/users/doug_admin/claude_abc/auth_ok/state",
    );
    expect(authState?.payload).toBe("OFF");
  });
});
