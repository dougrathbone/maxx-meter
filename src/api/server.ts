import Fastify from "fastify";
import type { UsagePoller } from "../poller.js";
import { getPanel, panelAuthOk, updatePanel } from "../panels/registry.js";
import { loadSettings } from "../config.js";
import type { PanelUsageResponse } from "../models.js";

export function createPanelServer(poller: UsagePoller) {
  const app = Fastify({ logger: false });

  app.get("/api/v1/health", async () => ({
    ok: true,
    service: "maxxmeter",
    snapshots: poller.getSnapshots().length,
  }));

  app.get<{ Params: { panelId: string } }>(
    "/api/v1/panels/:panelId/health",
    async (req, reply) => {
      const panel = await getPanel(req.params.panelId);
      if (!panel || !panelAuthOk(panel, req.headers.authorization)) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const lastSeenAt = new Date().toISOString();
      await updatePanel(panel.id, { lastSeenAt });
      return {
        ok: true,
        panel: { id: panel.id, label: panel.label, deviceProfile: panel.deviceProfile },
        lastSeenAt,
      };
    },
  );

  app.get<{ Params: { panelId: string } }>(
    "/api/v1/panels/:panelId/usage",
    async (req, reply) => {
      const panel = await getPanel(req.params.panelId);
      if (!panel || !panelAuthOk(panel, req.headers.authorization)) {
        return reply.code(401).send({ error: "unauthorized" });
      }

      await updatePanel(panel.id, { lastSeenAt: new Date().toISOString() });
      const settings = await loadSettings();
      const accountIds =
        panel.accountIds.length > 0
          ? panel.accountIds
          : poller
              .getSnapshotsForUser(panel.ownerUserId)
              .map((s) => s.accountId);

      const accounts = poller.getSnapshotsForAccounts(accountIds);
      const body: PanelUsageResponse = {
        panel: {
          id: panel.id,
          label: panel.label,
          deviceProfile: panel.deviceProfile,
        },
        accounts,
        thresholds: { warnPct: settings.warnPct, criticalPct: settings.criticalPct },
      };
      return body;
    },
  );

  return app;
}
