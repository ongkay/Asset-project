import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/userlogs/queries", () => ({
  getAdminExtensionTrackPage: vi.fn(),
  getAdminLoginHistoryPage: vi.fn(),
  getAdminTransactionsPage: vi.fn(),
}));

vi.mock("@/modules/admin/userlogs/schemas", () => ({
  parseAdminUserLogsSearchParams: vi.fn(),
}));

vi.mock("@/modules/users/services", () => ({
  requireAdminShellAccess: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/userlogs/_components/userlogs-page", () => ({
  AdminUserLogsPage: vi.fn(() => null),
}));

import * as userLogsQueries from "@/modules/admin/userlogs/queries";
import * as userLogsSchemas from "@/modules/admin/userlogs/schemas";
import * as userServices from "@/modules/users/services";

import AdminUserLogsRoutePage from "@/app/(admin)/admin/userlogs/page";

const mockedGetAdminLoginHistoryPage = vi.mocked(userLogsQueries.getAdminLoginHistoryPage);
const mockedGetAdminExtensionTrackPage = vi.mocked(userLogsQueries.getAdminExtensionTrackPage);
const mockedGetAdminTransactionsPage = vi.mocked(userLogsQueries.getAdminTransactionsPage);
const mockedParseAdminUserLogsSearchParams = vi.mocked(userLogsSchemas.parseAdminUserLogsSearchParams);
const mockedRequireAdminShellAccess = vi.mocked(userServices.requireAdminShellAccess);

describe("app/admin/userlogs/page", () => {
  beforeEach(() => {
    mockedGetAdminLoginHistoryPage.mockReset();
    mockedGetAdminExtensionTrackPage.mockReset();
    mockedGetAdminTransactionsPage.mockReset();
    mockedParseAdminUserLogsSearchParams.mockReset();
    mockedRequireAdminShellAccess.mockReset();
    mockedRequireAdminShellAccess.mockResolvedValue(undefined as never);
  });

  it("guards access, parses route state, and server-loads only the active login tab", async () => {
    mockedParseAdminUserLogsSearchParams.mockReturnValueOnce({
      tab: "login",
      login: {
        search: "alpha",
        os: "Windows",
        dateFrom: null,
        dateTo: null,
        page: 2,
        pageSize: 20,
      },
      extension: {
        search: null,
        browser: null,
        os: null,
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
      },
      transactions: {
        search: null,
        source: null,
        status: null,
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
      },
    });
    mockedGetAdminLoginHistoryPage.mockResolvedValueOnce({
      items: [],
      page: 2,
      pageSize: 20,
      totalCount: 0,
      availableOsValues: ["Windows"],
    });

    const element = await AdminUserLogsRoutePage({
      searchParams: Promise.resolve({ tab: "login", loginSearch: "alpha", loginOs: "Windows", loginPage: "2" }),
    });

    expect(mockedRequireAdminShellAccess).toHaveBeenCalledTimes(1);
    expect(mockedParseAdminUserLogsSearchParams).toHaveBeenCalledWith({
      tab: "login",
      loginSearch: "alpha",
      loginOs: "Windows",
      loginPage: "2",
    });
    expect(mockedGetAdminLoginHistoryPage).toHaveBeenCalledWith({
      search: "alpha",
      os: "Windows",
      dateFrom: null,
      dateTo: null,
      page: 2,
      pageSize: 20,
    });
    expect(mockedGetAdminExtensionTrackPage).not.toHaveBeenCalled();
    expect(mockedGetAdminTransactionsPage).not.toHaveBeenCalled();
    expect(element.props.routeState.tab).toBe("login");
    expect(element.props.initialLoginHistoryPage).toEqual({
      items: [],
      page: 2,
      pageSize: 20,
      totalCount: 0,
      availableOsValues: ["Windows"],
    });
    expect(element.props.initialExtensionTrackPage).toBeNull();
    expect(element.props.initialTransactionsPage).toBeNull();
    expect(element.props.initialActiveTabError).toBeNull();
  });

  it("returns an empty fallback payload when the selected tab query fails", async () => {
    mockedParseAdminUserLogsSearchParams.mockReturnValueOnce({
      tab: "transactions",
      login: {
        search: null,
        os: null,
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
      },
      extension: {
        search: null,
        browser: null,
        os: null,
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
      },
      transactions: {
        search: null,
        source: "cdkey",
        status: "success",
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
      },
    });
    mockedGetAdminTransactionsPage.mockRejectedValueOnce(new Error("Transactions failed."));

    const element = await AdminUserLogsRoutePage({
      searchParams: Promise.resolve({ tab: "transactions", transactionSource: "cdkey", transactionStatus: "success" }),
    });

    expect(element.props.initialTransactionsPage).toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      revenueSummary: {
        successAmountRp: 0,
        successCount: 0,
      },
    });
    expect(element.props.initialActiveTabError).toBe("Transactions failed.");
  });
});
