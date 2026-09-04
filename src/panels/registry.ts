import { join } from "node:path";
import type { DeviceProfile, Panel } from "../models.js";
import { PanelSchema } from "../models.js";
import {
  dataRoot,
  deleteFile,
  generateApiKey,
  generateId,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "../storage.js";

const PANELS_DIR = () => join(dataRoot(), "panels");

export async function listPanels(): Promise<Panel[]> {
  const files = await listJsonFiles(PANELS_DIR());
  const panels: Panel[] = [];
  for (const file of files) {
    const raw = await readJsonFile<unknown>(join(PANELS_DIR(), file));
    const parsed = PanelSchema.safeParse(raw);
    if (parsed.success) panels.push(parsed.data);
  }
  return panels.sort((a, b) => a.label.localeCompare(b.label));
}

export async function listPanelsForUser(userId: string): Promise<Panel[]> {
  return (await listPanels()).filter((p) => p.ownerUserId === userId);
}

export async function getPanel(id: string): Promise<Panel | null> {
  return readJsonFile<Panel>(join(PANELS_DIR(), `${id}.json`));
}

export async function createPanel(input: {
  label: string;
  deviceProfile: DeviceProfile;
  ownerUserId: string;
  accountIds: string[];
}): Promise<Panel> {
  const panel: Panel = PanelSchema.parse({
    id: generateId("panel"),
    label: input.label,
    deviceProfile: input.deviceProfile,
    ownerUserId: input.ownerUserId,
    accountIds: input.accountIds,
    apiKey: generateApiKey(),
    createdAt: new Date().toISOString(),
  });
  await writeJsonFile(join(PANELS_DIR(), `${panel.id}.json`), panel);
  return panel;
}

export async function updatePanel(
  id: string,
  patch: Partial<Pick<Panel, "label" | "accountIds" | "deviceProfile" | "lastSeenAt" | "ownerUserId">>,
): Promise<Panel | null> {
  const existing = await getPanel(id);
  if (!existing) return null;
  const updated = PanelSchema.parse({ ...existing, ...patch });
  await writeJsonFile(join(PANELS_DIR(), `${id}.json`), updated);
  return updated;
}

export async function regeneratePanelApiKey(id: string): Promise<Panel | null> {
  const existing = await getPanel(id);
  if (!existing) return null;
  const updated = { ...existing, apiKey: generateApiKey() };
  await writeJsonFile(join(PANELS_DIR(), `${id}.json`), updated);
  return updated;
}

export async function deletePanel(id: string): Promise<void> {
  await deleteFile(join(PANELS_DIR(), `${id}.json`));
}

export const UNASSIGNED_PANEL_OWNER = "unassigned";
const LEGACY_BOOTSTRAP_OWNERS = new Set(["default", UNASSIGNED_PANEL_OWNER]);

export function isUnassignedPanelOwner(ownerUserId: string): boolean {
  return LEGACY_BOOTSTRAP_OWNERS.has(ownerUserId);
}

export async function claimUnassignedPanels(userId: string): Promise<number> {
  if (!userId || isUnassignedPanelOwner(userId)) return 0;
  const panels = await listPanels();
  let claimed = 0;
  for (const panel of panels) {
    if (!isUnassignedPanelOwner(panel.ownerUserId)) continue;
    await updatePanel(panel.id, { ownerUserId: userId });
    claimed += 1;
  }
  return claimed;
}

export function panelAuthOk(panel: Panel, authHeader?: string): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === panel.apiKey;
}
