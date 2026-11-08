import { describe, expect, it } from "vitest";
import { panelAuthOk } from "../../src/panels/registry.js";
import type { Panel } from "../../src/models.js";

const panel: Panel = {
  id: "panel_test",
  label: "Office",
  deviceProfile: "nspanel-eu",
  ownerUserId: "user1",
  accountIds: [],
  apiKey: "abcdefghijklmnopqrstuvwxyz12",
  createdAt: new Date().toISOString(),
};

describe("panelAuthOk", () => {
  it("accepts a matching Bearer token", () => {
    expect(panelAuthOk(panel, `Bearer ${panel.apiKey}`)).toBe(true);
  });

  it("rejects missing, empty, and wrong keys", () => {
    expect(panelAuthOk(panel, undefined)).toBe(false);
    expect(panelAuthOk(panel, "Bearer ")).toBe(false);
    expect(panelAuthOk(panel, "Bearer not-the-key-not-the-key-12")).toBe(false);
  });
});
