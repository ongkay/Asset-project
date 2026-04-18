import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/users/actions", () => ({
  getAdminUserDetailAction: vi.fn(),
  getAdminUsersTablePageAction: vi.fn(),
}));

import * as adminUsersActions from "@/modules/admin/users/actions";
import {
  fetchAdminUserDetail,
  fetchAdminUsersTablePage,
  getAdminUserDetailQueryKey,
  getAdminUsersTableQueryKey,
} from "@/app/(admin)/admin/users/_components/users-query";

const mockedGetAdminUserDetailAction = vi.mocked(adminUsersActions.getAdminUserDetailAction);
const mockedGetAdminUsersTablePageAction = vi.mocked(adminUsersActions.getAdminUsersTablePageAction);

describe("admin/users/users-query", () => {
  beforeEach(() => {
    mockedGetAdminUserDetailAction.mockReset();
    mockedGetAdminUsersTablePageAction.mockReset();
  });

  it("unwraps a successful users table payload", async () => {
    mockedGetAdminUsersTablePageAction.mockResolvedValueOnce({
      data: {
        ok: true,
        tablePage: {
          items: [],
          page: 2,
          pageSize: 20,
          totalCount: 32,
        },
      },
    } as never);

    await expect(
      fetchAdminUsersTablePage({
        search: "alice",
        role: "member",
        subscriptionStatus: "active",
        packageSummary: "private",
        page: 2,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      items: [],
      page: 2,
      pageSize: 20,
      totalCount: 32,
    });
  });

  it("throws the best available error message for failed detail reads", async () => {
    mockedGetAdminUserDetailAction.mockResolvedValueOnce({
      validationErrors: {
        formErrors: ["User ID is required."],
      },
      data: {
        ok: false,
        message: "Failed to load user detail.",
      },
    } as never);

    await expect(fetchAdminUserDetail(" ")).rejects.toThrow("User ID is required.");
  });

  it("builds stable query keys from canonical filters", () => {
    expect(
      getAdminUsersTableQueryKey({
        search: "alice",
        role: "admin",
        subscriptionStatus: null,
        packageSummary: "none",
        page: 3,
        pageSize: 50,
      }),
    ).toEqual([
      "admin-users",
      {
        search: "alice",
        role: "admin",
        subscriptionStatus: null,
        packageSummary: "none",
        page: 3,
        pageSize: 50,
      },
    ]);

    expect(getAdminUserDetailQueryKey("user-1")).toEqual(["admin-users", "detail", "user-1"]);
  });
});
