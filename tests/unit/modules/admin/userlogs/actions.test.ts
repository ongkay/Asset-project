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

vi.mock("@/modules/admin/userlogs/queries", () => ({
  getAdminExtensionTrackPage: vi.fn(),
  getAdminLoginHistoryPage: vi.fn(),
  getAdminTransactionDetail: vi.fn(),
  getAdminTransactionsPage: vi.fn(),
}));

import * as userLogsQueries from "@/modules/admin/userlogs/queries";
import {
  getAdminExtensionTrackPageAction,
  getAdminLoginHistoryPageAction,
  getAdminTransactionDetailAction,
  getAdminTransactionsPageAction,
} from "@/modules/admin/userlogs/actions";

const mockedGetAdminLoginHistoryPage = vi.mocked(userLogsQueries.getAdminLoginHistoryPage);
const mockedGetAdminExtensionTrackPage = vi.mocked(userLogsQueries.getAdminExtensionTrackPage);
const mockedGetAdminTransactionsPage = vi.mocked(userLogsQueries.getAdminTransactionsPage);
const mockedGetAdminTransactionDetail = vi.mocked(userLogsQueries.getAdminTransactionDetail);

describe("admin/userlogs/actions", () => {
  beforeEach(() => {
    mockedGetAdminLoginHistoryPage.mockReset();
    mockedGetAdminExtensionTrackPage.mockReset();
    mockedGetAdminTransactionsPage.mockReset();
    mockedGetAdminTransactionDetail.mockReset();
  });

  it("rejects invalid filter payloads before query execution", async () => {
    const loginResult = await getAdminLoginHistoryPageAction({
      search: null,
      os: null,
      dateFrom: null,
      dateTo: null,
      page: 0,
      pageSize: 10,
    });
    const detailResult = await getAdminTransactionDetailAction({ transactionId: "not-a-uuid" });

    expect(loginResult?.validationErrors?.fieldErrors.page).toContain("Too small: expected number to be >=1");
    expect(detailResult?.validationErrors?.fieldErrors.transactionId).toContain("Transaction ID is invalid.");
    expect(mockedGetAdminLoginHistoryPage).not.toHaveBeenCalled();
    expect(mockedGetAdminTransactionDetail).not.toHaveBeenCalled();
  });

  it("returns stable success envelopes for all userlogs read actions", async () => {
    mockedGetAdminLoginHistoryPage.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      availableOsValues: [],
    });
    mockedGetAdminExtensionTrackPage.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      availableBrowsers: [],
      availableOsValues: [],
    });
    mockedGetAdminTransactionsPage.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      revenueSummary: {
        successAmountRp: 0,
        successCount: 0,
      },
    });
    mockedGetAdminTransactionDetail.mockResolvedValueOnce({
      transactionId: "tx-1",
      subscriptionId: null,
      user: {
        userId: "user-1",
        username: "alpha",
        email: "alpha@example.com",
        avatarUrl: null,
        publicId: "MEM-001",
      },
      packageName: "Starter",
      source: "cdkey",
      status: "success",
      amountRp: 100000,
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T11:00:00.000Z",
      paidAt: "2026-06-01T11:00:00.000Z",
      assignmentHistory: [],
    });

    const loginResult = await getAdminLoginHistoryPageAction({
      search: null,
      os: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });
    const extensionResult = await getAdminExtensionTrackPageAction({
      search: null,
      browser: null,
      os: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });
    const transactionsResult = await getAdminTransactionsPageAction({
      search: null,
      source: null,
      status: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });
    const detailResult = await getAdminTransactionDetailAction({
      transactionId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(loginResult?.data).toEqual({
      ok: true,
      page: {
        items: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        availableOsValues: [],
      },
    });
    expect(extensionResult?.data).toEqual({
      ok: true,
      page: {
        items: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        availableBrowsers: [],
        availableOsValues: [],
      },
    });
    expect(transactionsResult?.data).toEqual({
      ok: true,
      page: {
        items: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        revenueSummary: {
          successAmountRp: 0,
          successCount: 0,
        },
      },
    });
    expect(detailResult?.data).toEqual({
      ok: true,
      detail: {
        transactionId: "tx-1",
        subscriptionId: null,
        user: {
          userId: "user-1",
          username: "alpha",
          email: "alpha@example.com",
          avatarUrl: null,
          publicId: "MEM-001",
        },
        packageName: "Starter",
        source: "cdkey",
        status: "success",
        amountRp: 100000,
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T11:00:00.000Z",
        paidAt: "2026-06-01T11:00:00.000Z",
        assignmentHistory: [],
      },
    });
  });

  it("returns stable failure envelopes when a read query throws", async () => {
    mockedGetAdminLoginHistoryPage.mockRejectedValueOnce(new Error("Login history failed."));
    mockedGetAdminExtensionTrackPage.mockRejectedValueOnce(new Error("Extension track failed."));
    mockedGetAdminTransactionsPage.mockRejectedValueOnce(new Error("Transactions failed."));
    mockedGetAdminTransactionDetail.mockRejectedValueOnce(new Error("Transaction not found."));

    const loginResult = await getAdminLoginHistoryPageAction({
      search: null,
      os: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });
    const extensionResult = await getAdminExtensionTrackPageAction({
      search: null,
      browser: null,
      os: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });
    const transactionsResult = await getAdminTransactionsPageAction({
      search: null,
      source: null,
      status: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });
    const detailResult = await getAdminTransactionDetailAction({
      transactionId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(loginResult?.data).toEqual({ ok: false, message: "Login history failed." });
    expect(extensionResult?.data).toEqual({ ok: false, message: "Extension track failed." });
    expect(transactionsResult?.data).toEqual({ ok: false, message: "Transactions failed." });
    expect(detailResult?.data).toEqual({ ok: false, message: "Transaction not found." });
  });
});
