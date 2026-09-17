import { describe, expect, it } from "vitest";
import { mqttBrokerUrl } from "../../src/mqtt/publisher.js";

const mqtt = {
  host: "core-mosquitto",
  port: 1883,
  username: "",
  password: "",
  topicPrefix: "maxxmeter",
  tls: false,
};

describe("mqttBrokerUrl", () => {
  it("uses mqtt:// when TLS is off", () => {
    expect(mqttBrokerUrl(mqtt)).toBe("mqtt://core-mosquitto:1883");
  });

  it("uses mqtts:// when TLS is on", () => {
    expect(mqttBrokerUrl({ ...mqtt, tls: true, port: 8883 })).toBe("mqtts://core-mosquitto:8883");
  });
});
