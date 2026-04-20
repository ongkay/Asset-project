import { describe, expect, it } from "vitest";

import {
  ADMIN_DASHBOARD_RECENT_USERS_PAGE_SIZE,
  formatAdminDashboardRecentUserAbsoluteDateTime,
  paginateAdminDashboardRecentUsers,
  resolveAdminDashboardRecentUserRelativeLabel,
} from "@/app/(admin)/admin/_components/admin-dashboard-recent-users-table";

describe("app/admin/admin-dashboard-recent-users-table", () => {
  it("paginates recent users with a compact 6-row default page size", () => {
    const users = Array.from({ length: 8 }, (_, index) => ({
      userId: `user-${index + 1}`,
      username: `user-${index + 1}`,
      email: `user-${index + 1}@example.com`,
      avatarUrl: null,
      role: "member" as const,
      activePackageName: null,
      lastSeenAt: "2026-04-20T11:00:00.000Z",
    }));

    expect(ADMIN_DASHBOARD_RECENT_USERS_PAGE_SIZE).toBe(6);
    expect(paginateAdminDashboardRecentUsers(users, 1)).toEqual({
      page: 1,
      pageCount: 2,
      users: users.slice(0, 6),
    });
    expect(paginateAdminDashboardRecentUsers(users, 2)).toEqual({
      page: 2,
      pageCount: 2,
      users: users.slice(6, 8),
    });
    expect(paginateAdminDashboardRecentUsers(users, 9)).toEqual({
      page: 2,
      pageCount: 2,
      users: users.slice(6, 8),
    });
  });

  it("formats recent user timestamps deterministically for absolute and relative labels", () => {
    expect(formatAdminDashboardRecentUserAbsoluteDateTime("2026-04-20T11:00:00.000Z", "Asia/Jakarta")).toBe(
      "20/04/26 18:00",
    );
    expect(
      resolveAdminDashboardRecentUserRelativeLabel("2026-04-20T11:00:00.000Z", new Date("2026-04-20T12:00:00.000Z")),
    ).toContain("1 jam");
  });
});
