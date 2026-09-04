import { loadHaOptionsFile } from "./config.js";
import { createPanel, listPanels, UNASSIGNED_PANEL_OWNER } from "./panels/registry.js";

/** Create default office panel when add-on option bootstrap_office_panel is enabled. */
export async function bootstrapOfficePanelIfNeeded(): Promise<void> {
  const options = await loadHaOptionsFile();
  if (options.bootstrap_office_panel !== true) return;

  const existing = await listPanels();
  if (existing.length > 0) return;

  const panel = await createPanel({
    label: "Office panel",
    deviceProfile: "nspanel-us-portrait",
    ownerUserId: UNASSIGNED_PANEL_OWNER,
    accountIds: [],
  });

  console.log("MaxxMeter bootstrap: created Office panel (US portrait)");
  console.log(`MaxxMeter bootstrap: panel_id=${panel.id}`);
  console.log(`MaxxMeter bootstrap: panel_api_key=${panel.apiKey}`);
}
