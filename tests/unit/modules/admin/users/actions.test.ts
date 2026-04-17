import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    id: "admin-user-id",
    profile: {
      isBanned: false,
      role: "admin",
      userId: "admin-user-id",
    },
    session: {
      id: "session-1",
      userId: "admin-user-id",
    },
  }),
}));

vi.mock("@/modules/admin/users/queries", () => ({
  getAdminUserDetail: vi.fn(),
  getAdminUsersTablePage: vi.fn(),
}));

import * as adminUserQueries from "@/modules/admin/users/queries";
import { getAdminUserDetailAction, getAdminUsersTablePageAction } from "@/modules/admin/users/actions";

const mockedGetAdminUsersTablePage = vi.mocked(adminUserQueries.getAdminUsersTablePage);
const mockedGetAdminUserDetail = vi.mocked(adminUserQueries.getAdminUserDetail);

describe("admin/users/actions", () => {
  beforeEach(() => {
    mockedGetAdminUsersTablePage.mockReset();
    mockedGetAdminUserDetail.mockReset();
  });

  it("rejects invalid table filter payloads before query execution", async () => {
    const result = await getAdminUsersTablePageAction({
      search: null,
      role: null,
      subscriptionStatus: null,
      packageSummary: null,
      page: 0,
      pageSize: 10,
    });

    expect(result?.validationErrors?.fieldErrors.page).toContain("Too small: expected number to be >=1");
    expect(mockedGetAdminUsersTablePage).not.toHaveBeenCalled();
  });

  it("returns the query payload in a stable success envelope", async () => {
    mockedGetAdminUsersTablePage.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
    });
    mockedGetAdminUserDetail.mockResolvedValueOnce({
      profile: {
        userId: "user-1",
        email: "alpha@example.com",
        username: "Alpha",
        avatarUrl: null,
        publicId: "MEM-ALPHA",
        role: "member",
        isBanned: false,
        banReason: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      currentSubscription: {
        subscriptionId: null,
        packageId: null,
        packageName: null,
        status: null,
        startAt: null,
        endAt: null,
        packageSummary: "none",
      },
      activeAssets: [],
      transactions: [],
      loginLogs: [],
      extensionTracks: [],
    });

    const tableResult = await getAdminUsersTablePageAction({
      search: null,
      role: null,
      subscriptionStatus: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });
    const detailResult = await getAdminUserDetailAction({ userId: "user-1" });

    expect(tableResult?.data).toEqual({
      ok: true,
      tablePage: {
        items: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
      },
    });
    expect(detailResult?.data).toEqual({
      ok: true,
      detail: {
        profile: {
          userId: "user-1",
          email: "alpha@example.com",
          username: "Alpha",
          avatarUrl: null,
          publicId: "MEM-ALPHA",
          role: "member",
          isBanned: false,
          banReason: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
        currentSubscription: {
          subscriptionId: null,
          packageId: null,
          packageName: null,
          status: null,
          startAt: null,
          endAt: null,
          packageSummary: "none",
        },
        activeAssets: [],
        transactions: [],
        loginLogs: [],
        extensionTracks: [],
      },
    });
  });

  it("returns a stable failure envelope when the table query throws", async () => {
    mockedGetAdminUsersTablePage.mockRejectedValueOnce(new Error("Users table failed."));

    const result = await getAdminUsersTablePageAction({
      search: null,
      role: null,
      subscriptionStatus: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });

    expect(result?.data).toEqual({
      ok: false,
      message: "Users table failed.",
    });
  });

  it("returns a stable failure envelope when a read query throws", async () => {
    mockedGetAdminUserDetail.mockRejectedValueOnce(new Error("User not found."));

    const result = await getAdminUserDetailAction({ userId: "missing-user" });

    expect(result?.data).toEqual({
      ok: false,
      message: "User not found.",
    });
  });
});
