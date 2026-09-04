import { describe, expect, it } from "vitest";
import { mergeDashboardUsers } from "../../src/users/context.js";

describe("mergeDashboardUsers", () => {
  it("includes panel-only owners and prefers account display names", () => {
    const users = mergeDashboardUsers(
      [{ ownerUserId: "u1", ownerUserName: "Ada" }],
      [{ ownerUserId: "u1" }, { ownerUserId: "u2" }],
    );
    expect(users).toEqual([
      { userId: "u1", userName: "Ada" },
      { userId: "u2", userName: "u2" },
    ]);
  });
});
