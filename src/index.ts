import type { UsageSnapshot } from "./models.js";
import { ingressPort, loadSettings, panelApiPort } from "./config.js";
import { syncSettingsFromHaOptions } from "./config-sync.js";
import { createDashboardServer } from "./api/dashboard.js";
import { createPanelServer } from "./api/server.js";
import { notifyAuthExpiredBatch } from "./ha/notify.js";
import { MqttPublisher } from "./mqtt/publisher.js";
import { UsagePoller } from "./poller.js";
import { ensureDir, dataRoot } from "./storage.js";

async function main(): Promise<void> {
  await ensureDir(dataRoot());
  await syncSettingsFromHaOptions();

  const getSettings = loadSettings;
  const poller = new UsagePoller(getSettings);
  const mqtt = new MqttPublisher();

  let previousSnapshots: UsageSnapshot[] = [];

  const settings = await loadSettings();
  mqtt.connect(settings);

  poller.setOnPoll(async (snapshots) => {
    const s = await loadSettings();
    mqtt.publishSnapshots(s, snapshots);
    await notifyAuthExpiredBatch(s, previousSnapshots, snapshots);
    previousSnapshots = snapshots;
  });

  poller.start();

  const panelApp = createPanelServer(poller);
  const dashboardApp = await createDashboardServer(poller);

  await panelApp.listen({ port: panelApiPort(), host: "0.0.0.0" });
  await dashboardApp.listen({ port: ingressPort(), host: "0.0.0.0" });

  console.log(`MaxxMeter panel API on :${panelApiPort()}`);
  console.log(`MaxxMeter ingress dashboard on :${ingressPort()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
