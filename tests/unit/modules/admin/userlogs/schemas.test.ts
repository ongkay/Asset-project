import { describe, expect, it } from "vitest";

import {
  adminExtensionTrackFilterSchema,
  adminLoginHistoryFilterSchema,
  adminTransactionDetailInputSchema,
  adminTransactionsFilterSchema,
  parseAdminUserLogsSearchParams,
} from "@/modules/admin/userlogs/schemas";

describe("admin/userlogs/schemas", () => {
  it("parses namespaced search params for all tabs and preserves inactive tab state", () => {
    expect(
      parseAdminUserLogsSearchParams({
        tab: "transactions",
        loginSearch: [" alice@example.com "],
        loginOs: "Windows",
        loginDateFrom: "2026-06-01",
        loginDateTo: "2026-06-30",
        loginPage: "3",
        loginPageSize: "25",
        extensionSearch: "device-a",
        extensionBrowser: "Chrome",
        extensionOs: "Windows",
        extensionDateFrom: "2026-05-01",
        extensionDateTo: "2026-05-31",
        extensionPage: "2",
        extensionPageSize: "20",
        transactionSearch: "starter",
        transactionSource: "cdkey",
        transactionStatus: "success",
        transactionDateFrom: "2026-04-01",
        transactionDateTo: "2026-04-30",
        transactionPage: "4",
        transactionPageSize: "50",
      }),
    ).toEqual({
      tab: "transactions",
      login: {
        search: "alice@example.com",
        os: "Windows",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
        page: 3,
        pageSize: 25,
      },
      extension: {
        search: "device-a",
        browser: "Chrome",
        os: "Windows",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
        page: 2,
        pageSize: 20,
      },
      transactions: {
        search: "starter",
        source: "cdkey",
        status: "success",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-30",
        page: 4,
        pageSize: 50,
      },
    });
  });

  it("normalizes invalid tab, filters, dates, and pagination without dropping sibling tab state", () => {
    expect(
      parseAdminUserLogsSearchParams({
        tab: "invalid-tab",
        loginSearch: "   ",
        loginOs: "",
        loginDateFrom: "2026-07-30",
        loginDateTo: "2026-07-01",
        loginPage: "0",
        loginPageSize: "999",
        extensionSearch: " seed-admin ",
        extensionBrowser: "Firefox",
        extensionOs: "Linux",
        extensionDateFrom: "not-a-date",
        extensionDateTo: "2026-08-01",
        extensionPage: "-4",
        extensionPageSize: "abc",
        transactionSearch: " member ",
        transactionSource: "manual",
        transactionStatus: "done",
        transactionDateFrom: "2026-09-30",
        transactionDateTo: "2026-09-01",
        transactionPage: "NaN",
        transactionPageSize: "101",
      }),
    ).toEqual({
      tab: "login",
      login: {
        search: null,
        os: null,
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
      },
      extension: {
        search: "seed-admin",
        browser: "Firefox",
        os: "Linux",
        dateFrom: null,
        dateTo: "2026-08-01",
        page: 1,
        pageSize: 10,
      },
      transactions: {
        search: "member",
        source: null,
        status: null,
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
      },
    });
  });

  it("rejects reversed date ranges in canonical tab filter schemas", () => {
    const loginResult = adminLoginHistoryFilterSchema.safeParse({
      search: null,
      os: "Windows",
      dateFrom: "2026-06-30",
      dateTo: "2026-06-01",
      page: 1,
      pageSize: 10,
    });
    const extensionResult = adminExtensionTrackFilterSchema.safeParse({
      search: null,
      browser: "Chrome",
      os: "Windows",
      dateFrom: "2026-07-31",
      dateTo: "2026-07-01",
      page: 1,
      pageSize: 10,
    });
    const transactionResult = adminTransactionsFilterSchema.safeParse({
      search: null,
      source: "cdkey",
      status: "success",
      dateFrom: "2026-08-31",
      dateTo: "2026-08-01",
      page: 1,
      pageSize: 10,
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error?.flatten().fieldErrors.dateTo).toContain(
      "Login start date cannot be later than login end date.",
    );
    expect(extensionResult.success).toBe(false);
    expect(extensionResult.error?.flatten().fieldErrors.dateTo).toContain(
      "Extension start date cannot be later than extension end date.",
    );
    expect(transactionResult.success).toBe(false);
    expect(transactionResult.error?.flatten().fieldErrors.dateTo).toContain(
      "Transaction start date cannot be later than transaction end date.",
    );
  });

  it("accepts valid transaction filter enums and trims search values", () => {
    expect(
      adminTransactionsFilterSchema.parse({
        search: " starter pack ",
        source: "admin_manual",
        status: "failed",
        dateFrom: "2026-10-01",
        dateTo: "2026-10-31",
        page: 2,
        pageSize: 25,
      }),
    ).toEqual({
      search: "starter pack",
      source: "admin_manual",
      status: "failed",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-31",
      page: 2,
      pageSize: 25,
    });
  });

  it("requires a valid transaction id for the detail action input", () => {
    expect(adminTransactionDetailInputSchema.safeParse({ transactionId: "   " }).success).toBe(false);
    expect(adminTransactionDetailInputSchema.parse({ transactionId: "550e8400-e29b-41d4-a716-446655440000" })).toEqual({
      transactionId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("accepts legacy uuid-like transaction ids used by existing runtime rows", () => {
    expect(adminTransactionDetailInputSchema.parse({ transactionId: "50000000-0000-0000-0000-000000000004" })).toEqual({
      transactionId: "50000000-0000-0000-0000-000000000004",
    });
  });
});
