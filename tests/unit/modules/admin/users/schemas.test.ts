import { describe, expect, it } from "vitest";

import { adminUsersTableFilterSchema, parseAdminUsersTableSearchParams } from "@/modules/admin/users/schemas";

describe("admin/users/schemas", () => {
  it("normalizes malformed route params without crashing the page", () => {
    expect(
      parseAdminUsersTableSearchParams({
        search: [" alice@example.com "],
        role: "owner",
        subscriptionStatus: "processed",
        packageSummary: "vip",
        page: "0",
        pageSize: "999",
      }),
    ).toEqual({
      search: "alice@example.com",
      role: null,
      subscriptionStatus: "processed",
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });
  });

  it("rejects unsupported package summary values in the canonical filter contract", () => {
    const result = adminUsersTableFilterSchema.safeParse({
      search: null,
      role: null,
      subscriptionStatus: null,
      packageSummary: "vip",
      page: 1,
      pageSize: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.packageSummary).toContain("Package summary is invalid.");
  });
});
