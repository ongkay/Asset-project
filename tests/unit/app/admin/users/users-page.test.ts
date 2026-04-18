import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: null,
    error: null,
    isFetching: false,
    isLoading: false,
  }),
}));

vi.mock("@/app/(admin)/admin/users/_components/users-query", () => ({
  fetchAdminUsersTablePage: async () => ({
    items: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
  }),
  getAdminUsersTableQueryKey: () => ["admin-users"],
}));

vi.mock("@/app/(admin)/admin/users/_components/use-users-table-state", () => ({
  useUsersTableState: () => ({
    tableFilters: {
      search: null,
      role: null,
      subscriptionStatus: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    },
    handlePageChange: () => undefined,
    handlePageSizeChange: () => undefined,
    handleToggleColumn: () => undefined,
    visibleColumns: {
      userId: true,
      user: true,
      publicId: true,
      role: true,
      subscriptionStatus: true,
      expiresAt: true,
      packageSummary: true,
      banned: true,
      updatedAt: true,
      createdAt: true,
      actions: true,
    },
    searchInput: "",
    setSearchInput: () => undefined,
    roleFilter: null,
    setRoleFilter: () => undefined,
    subscriptionStatusFilter: null,
    setSubscriptionStatusFilter: () => undefined,
    packageSummaryFilter: null,
    setPackageSummaryFilter: () => undefined,
  }),
}));

vi.mock("@/app/(admin)/admin/users/_components/users-table/users-table", () => ({
  AdminUsersTable: () => null,
}));

vi.mock("@/app/(admin)/admin/users/_components/users-table/users-toolbar", () => ({
  AdminUsersToolbar: () => null,
}));

vi.mock("@/app/(admin)/admin/users/_components/user-form-dialog/user-form-dialog", () => ({
  UserFormDialog: () => null,
}));

vi.mock("@/app/(admin)/admin/users/_components/user-detail-dialog/user-detail-dialog", () => ({
  UserDetailDialog: () => null,
}));

vi.mock("@/app/(admin)/admin/users/_components/user-change-password-dialog/user-change-password-dialog", () => ({
  UserChangePasswordDialog: () => null,
}));

vi.mock("@/app/(admin)/admin/users/_components/user-ban-dialog/user-ban-dialog", () => ({
  UserBanDialog: () => null,
}));

import { resolveAdminUsersTableError } from "@/app/(admin)/admin/users/_components/users-page";

describe("app/admin/users/users-page", () => {
  it("clears the initial server error after the client query succeeds", () => {
    expect(resolveAdminUsersTableError(null, "Failed to load users table.", true)).toBeNull();
  });

  it("keeps showing the initial server error until client data is available", () => {
    expect(resolveAdminUsersTableError(null, "Failed to load users table.", false)).toBe("Failed to load users table.");
  });
});
