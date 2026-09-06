import Fastify from "fastify";
import type { UsagePoller } from "../poller.js";
import {
  createPanel,
  getPanel,
  listPanels,
  panelAuthOk,
  UNASSIGNED_PANEL_OWNER,
  updatePanel,
} from "../panels/registry.js";
import { loadHaOptionsFile, loadSettings } from "../config.js";
import type { PanelUsageResponse } from "../models.js";

export function createPanelServer(poller: UsagePoller) {
  const app = Fastify({ logger: false });

  app.get("/api/v1/health", async () => ({
    ok: true,
    service: "maxxmeter",
    snapshots: poller.getSnapshots().length,
  }));

  /** LAN first-run helper: create or return the bootstrapped office panel credentials. */
  app.post("/api/v1/setup/office-panel", async (req, reply) => {
    const options = await loadHaOptionsFile();
    if (options.bootstrap_office_panel !== true) {
      return reply.code(403).send({ error: "bootstrap_office_panel is disabled" });
    }

    const existing = await listPanels();
    const office =
      existing.find((p) => p.label === "Office panel" && p.deviceProfile === "nspanel-us-portrait") ??
      existing.find((p) => p.deviceProfile === "nspanel-us-portrait") ??
      existing[0];

    if (office) {
      return {
        created: false,
        panel_id: office.id,
        panel_api_key: office.apiKey,
        label: office.label,
        deviceProfile: office.deviceProfile,
      };
    }

    const panel = await createPanel({
      label: "Office panel",
      deviceProfile: "nspanel-us-portrait",
      ownerUserId: UNASSIGNED_PANEL_OWNER,
      accountIds: [],
    });
    return {
      created: true,
      panel_id: panel.id,
      panel_api_key: panel.apiKey,
      label: panel.label,
      deviceProfile: panel.deviceProfile,
    };
  });

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
