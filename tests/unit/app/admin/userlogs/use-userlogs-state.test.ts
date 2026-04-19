import { describe, expect, it } from "vitest";

import {
  ADMIN_USERLOGS_EXTENSION_COLUMN_VISIBILITY_STORAGE_KEY,
  ADMIN_USERLOGS_LOGIN_COLUMN_VISIBILITY_STORAGE_KEY,
  ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY_STORAGE_KEY,
  DEFAULT_ADMIN_USERLOGS_EXTENSION_COLUMN_VISIBILITY,
  DEFAULT_ADMIN_USERLOGS_LOGIN_COLUMN_VISIBILITY,
  DEFAULT_ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY,
  buildAdminUserLogsUrl,
} from "@/app/(admin)/admin/userlogs/_components/use-userlogs-state";

describe("app/admin/userlogs/use-userlogs-state", () => {
  it("omits default userlogs state from the url", () => {
    expect(
      buildAdminUserLogsUrl("/admin/userlogs", {
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
      }),
    ).toBe("/admin/userlogs");
  });

  it("serializes namespaced state for all tabs and preserves unrelated params", () => {
    expect(
      buildAdminUserLogsUrl(
        "/admin/userlogs",
        {
          tab: "transactions",
          login: {
            search: "alpha@example.com",
            os: "Windows",
            dateFrom: "2026-06-01",
            dateTo: "2026-06-30",
            page: 2,
            pageSize: 25,
          },
          extension: {
            search: "device-a",
            browser: "Chrome",
            os: null,
            dateFrom: "2026-05-01",
            dateTo: "2026-05-31",
            page: 1,
            pageSize: 20,
          },
          transactions: {
            search: "starter",
            source: "cdkey",
            status: "success",
            dateFrom: "2026-04-01",
            dateTo: "2026-04-30",
            page: 3,
            pageSize: 50,
          },
        },
        "?dialog=history",
      ),
    ).toBe(
      "/admin/userlogs?dialog=history&tab=transactions&loginSearch=alpha%40example.com&loginOs=Windows&loginDateFrom=2026-06-01&loginDateTo=2026-06-30&loginPage=2&loginPageSize=25&extensionSearch=device-a&extensionBrowser=Chrome&extensionDateFrom=2026-05-01&extensionDateTo=2026-05-31&extensionPageSize=20&transactionSearch=starter&transactionSource=cdkey&transactionStatus=success&transactionDateFrom=2026-04-01&transactionDateTo=2026-04-30&transactionPage=3&transactionPageSize=50",
    );
  });

  it("uses tab-specific storage keys and keeps required columns visible by default", () => {
    expect(ADMIN_USERLOGS_LOGIN_COLUMN_VISIBILITY_STORAGE_KEY).toBe("admin.userlogs.login.columns.v1");
    expect(ADMIN_USERLOGS_EXTENSION_COLUMN_VISIBILITY_STORAGE_KEY).toBe("admin.userlogs.extension.columns.v1");
    expect(ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY_STORAGE_KEY).toBe("admin.userlogs.transactions.columns.v1");

    expect(DEFAULT_ADMIN_USERLOGS_LOGIN_COLUMN_VISIBILITY.user).toBe(true);
    expect(DEFAULT_ADMIN_USERLOGS_EXTENSION_COLUMN_VISIBILITY.extensionId).toBe(true);
    expect(DEFAULT_ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY.packageName).toBe(true);
    expect(DEFAULT_ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY.actions).toBe(true);
  });
});
