import { describe, expect, it } from "vitest";

import {
  ADMIN_USERS_COLUMN_VISIBILITY_STORAGE_KEY,
  DEFAULT_ADMIN_USERS_COLUMN_VISIBILITY,
  buildAdminUsersTableUrl,
} from "@/app/(admin)/admin/users/_components/use-users-table-state";

describe("admin/users/use-users-table-state", () => {
  it("omits default filters from the users table url", () => {
    expect(
      buildAdminUsersTableUrl("/admin/users", {
        search: null,
        role: null,
        subscriptionStatus: null,
        packageSummary: null,
        page: 1,
        pageSize: 10,
      }),
    ).toBe("/admin/users");
  });

  it("serializes active filters into the users table url", () => {
    expect(
      buildAdminUsersTableUrl("/admin/users", {
        search: "alice@example.com",
        role: "member",
        subscriptionStatus: "processed",
        packageSummary: "mixed",
        page: 3,
        pageSize: 20,
      }),
    ).toBe(
      "/admin/users?search=alice%40example.com&role=member&subscriptionStatus=processed&packageSummary=mixed&page=3&pageSize=20",
    );
  });

  it("preserves unrelated search params when table filters change", () => {
    expect(
      buildAdminUsersTableUrl(
        "/admin/users",
        {
          search: "alice@example.com",
          role: "member",
          subscriptionStatus: null,
          packageSummary: null,
          page: 1,
          pageSize: 10,
        },
        "?dialog=edit-user&userId=user-1",
      ),
    ).toBe("/admin/users?dialog=edit-user&userId=user-1&search=alice%40example.com&role=member");
  });

  it("uses a page-specific storage key and keeps actions visible by default", () => {
    expect(ADMIN_USERS_COLUMN_VISIBILITY_STORAGE_KEY).toBe("admin.users.columns.v1");
    expect(DEFAULT_ADMIN_USERS_COLUMN_VISIBILITY.actions).toBe(true);
  });
});
