import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/users/queries", () => ({
  getAdminUsersTablePage: vi.fn(),
}));

vi.mock("@/modules/admin/users/schemas", () => ({
  parseAdminUsersTableSearchParams: vi.fn(),
}));

vi.mock("@/modules/users/services", () => ({
  requireAdminShellAccess: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/users/_components/users-page", () => ({
  AdminUsersPage: vi.fn(() => null),
}));

import * as adminUserQueries from "@/modules/admin/users/queries";
import * as adminUserSchemas from "@/modules/admin/users/schemas";
import * as userServices from "@/modules/users/services";

import AdminUsersRoutePage from "@/app/(admin)/admin/users/page";

const mockedGetAdminUsersTablePage = vi.mocked(adminUserQueries.getAdminUsersTablePage);
const mockedParseAdminUsersTableSearchParams = vi.mocked(adminUserSchemas.parseAdminUsersTableSearchParams);
const mockedRequireAdminShellAccess = vi.mocked(userServices.requireAdminShellAccess);

describe("app/admin/users/page", () => {
  beforeEach(() => {
    mockedGetAdminUsersTablePage.mockReset();
    mockedParseAdminUsersTableSearchParams.mockReset();
    mockedRequireAdminShellAccess.mockReset();
    mockedRequireAdminShellAccess.mockResolvedValue({
      profile: {
        userId: "91000000-0000-4000-8000-000000000001",
      },
    } as never);
  });

  it("guards access, parses filters, and passes server-loaded table data to the client page", async () => {
    mockedParseAdminUsersTableSearchParams.mockReturnValueOnce({
      search: "alice",
      role: "member",
      subscriptionStatus: null,
      packageSummary: null,
      page: 2,
      pageSize: 20,
    });
    mockedGetAdminUsersTablePage.mockResolvedValueOnce({
      items: [],
      page: 2,
      pageSize: 20,
      totalCount: 0,
    });

    const element = await AdminUsersRoutePage({
      searchParams: Promise.resolve({ search: "alice", role: "member", page: "2", pageSize: "20" }),
    });

    expect(mockedRequireAdminShellAccess).toHaveBeenCalledTimes(1);
    expect(mockedParseAdminUsersTableSearchParams).toHaveBeenCalledWith({
      search: "alice",
      role: "member",
      page: "2",
      pageSize: "20",
    });
    expect(mockedGetAdminUsersTablePage).toHaveBeenCalledWith({
      search: "alice",
      role: "member",
      subscriptionStatus: null,
      packageSummary: null,
      page: 2,
      pageSize: 20,
    });
    expect(element.props.currentAdminUserId).toBe("91000000-0000-4000-8000-000000000001");
    expect(element.props.filters).toEqual({
      search: "alice",
      role: "member",
      subscriptionStatus: null,
      packageSummary: null,
      page: 2,
      pageSize: 20,
    });
    expect(element.props.tablePage).toEqual({
      items: [],
      page: 2,
      pageSize: 20,
      totalCount: 0,
    });
    expect(element.props.tableError).toBeNull();
  });

  it("returns an empty fallback payload when the initial table query fails", async () => {
    mockedParseAdminUsersTableSearchParams.mockReturnValueOnce({
      search: null,
      role: null,
      subscriptionStatus: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });
    mockedGetAdminUsersTablePage.mockRejectedValueOnce(new Error("Users table failed."));

    const element = await AdminUsersRoutePage({
      searchParams: Promise.resolve({}),
    });

    expect(element.props.tablePage).toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
    });
    expect(element.props.tableError).toBe("Users table failed.");
  });
});
