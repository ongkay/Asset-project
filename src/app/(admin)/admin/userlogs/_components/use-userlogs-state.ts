"use client";

import { useEffect, useMemo, useState } from "react";

import { usePathname } from "next/navigation";

import { useAdminColumnVisibility } from "@/components/shared/data-table/visibility";

import {
  ADMIN_USERLOGS_EXTENSION_COLUMN_KEYS,
  ADMIN_USERLOGS_LOGIN_COLUMN_KEYS,
  ADMIN_USERLOGS_TRANSACTIONS_COLUMN_KEYS,
} from "./userlogs-page-types";

import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type {
  AdminExtensionTrackFilters,
  AdminLoginHistoryFilters,
  AdminTransactionsFilters,
  AdminUserLogsActiveTab,
  AdminUserLogsRouteState,
} from "@/modules/admin/userlogs/types";
import type {
  AdminUserLogsExtensionColumnVisibility,
  AdminUserLogsLoginColumnVisibility,
  AdminUserLogsTransactionsColumnVisibility,
} from "./userlogs-page-types";

const DEFAULT_PAGE_SIZE = 10;
const LOCKED_TRANSACTIONS_COLUMN_KEYS = ["actions"] as const;

export const ADMIN_USERLOGS_LOGIN_COLUMN_VISIBILITY_STORAGE_KEY = "admin.userlogs.login.columns.v1";
export const ADMIN_USERLOGS_EXTENSION_COLUMN_VISIBILITY_STORAGE_KEY = "admin.userlogs.extension.columns.v1";
export const ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY_STORAGE_KEY = "admin.userlogs.transactions.columns.v1";

export const DEFAULT_ADMIN_USERLOGS_LOGIN_COLUMN_VISIBILITY: AdminUserLogsLoginColumnVisibility = {
  user: true,
  ipAddress: true,
  browser: true,
  os: true,
  loginTime: true,
  status: false,
};

export const DEFAULT_ADMIN_USERLOGS_EXTENSION_COLUMN_VISIBILITY: AdminUserLogsExtensionColumnVisibility = {
  user: true,
  ipAddress: true,
  city: true,
  country: true,
  browser: true,
  os: true,
  extensionVersion: true,
  deviceId: true,
  extensionId: true,
  firstSeenAt: true,
  lastSeenAt: true,
};

export const DEFAULT_ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY: AdminUserLogsTransactionsColumnVisibility = {
  user: true,
  packageName: true,
  source: true,
  amountRp: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  actions: true,
};

function writeSearchParam(searchParams: URLSearchParams, key: string, value: string | null, defaultValue?: string) {
  if (!value || (defaultValue && value === defaultValue)) {
    searchParams.delete(key);
    return;
  }

  searchParams.set(key, value);
}

function writePaginationSearchParams(
  searchParams: URLSearchParams,
  pageKey: string,
  pageSizeKey: string,
  filters: { page: number; pageSize: number },
) {
  writeSearchParam(searchParams, pageKey, filters.page > 1 ? String(filters.page) : null);
  writeSearchParam(searchParams, pageSizeKey, filters.pageSize !== DEFAULT_PAGE_SIZE ? String(filters.pageSize) : null);
}

function writeLoginSearchParams(searchParams: URLSearchParams, filters: AdminLoginHistoryFilters) {
  writeSearchParam(searchParams, "loginSearch", filters.search);
  writeSearchParam(searchParams, "loginOs", filters.os);
  writeSearchParam(searchParams, "loginDateFrom", filters.dateFrom);
  writeSearchParam(searchParams, "loginDateTo", filters.dateTo);
  writePaginationSearchParams(searchParams, "loginPage", "loginPageSize", filters);
}

function writeExtensionSearchParams(searchParams: URLSearchParams, filters: AdminExtensionTrackFilters) {
  writeSearchParam(searchParams, "extensionSearch", filters.search);
  writeSearchParam(searchParams, "extensionBrowser", filters.browser);
  writeSearchParam(searchParams, "extensionOs", filters.os);
  writeSearchParam(searchParams, "extensionDateFrom", filters.dateFrom);
  writeSearchParam(searchParams, "extensionDateTo", filters.dateTo);
  writePaginationSearchParams(searchParams, "extensionPage", "extensionPageSize", filters);
}

function writeTransactionsSearchParams(searchParams: URLSearchParams, filters: AdminTransactionsFilters) {
  writeSearchParam(searchParams, "transactionSearch", filters.search);
  writeSearchParam(searchParams, "transactionSource", filters.source);
  writeSearchParam(searchParams, "transactionStatus", filters.status);
  writeSearchParam(searchParams, "transactionDateFrom", filters.dateFrom);
  writeSearchParam(searchParams, "transactionDateTo", filters.dateTo);
  writePaginationSearchParams(searchParams, "transactionPage", "transactionPageSize", filters);
}

export function buildAdminUserLogsUrl(pathname: string, routeState: AdminUserLogsRouteState, currentSearch = "") {
  const nextSearchParams = new URLSearchParams(currentSearch);

  writeSearchParam(nextSearchParams, "tab", routeState.tab, "login");
  writeLoginSearchParams(nextSearchParams, routeState.login);
  writeExtensionSearchParams(nextSearchParams, routeState.extension);
  writeTransactionsSearchParams(nextSearchParams, routeState.transactions);

  const nextQueryString = nextSearchParams.toString();
  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
}

function updateLoginFilters(
  currentState: AdminUserLogsRouteState,
  nextFilters: Partial<AdminLoginHistoryFilters>,
): AdminUserLogsRouteState {
  return {
    ...currentState,
    login: {
      ...currentState.login,
      ...nextFilters,
    },
  };
}

function updateExtensionFilters(
  currentState: AdminUserLogsRouteState,
  nextFilters: Partial<AdminExtensionTrackFilters>,
): AdminUserLogsRouteState {
  return {
    ...currentState,
    extension: {
      ...currentState.extension,
      ...nextFilters,
    },
  };
}

function updateTransactionsFilters(
  currentState: AdminUserLogsRouteState,
  nextFilters: Partial<AdminTransactionsFilters>,
): AdminUserLogsRouteState {
  return {
    ...currentState,
    transactions: {
      ...currentState.transactions,
      ...nextFilters,
    },
  };
}

export function useUserLogsState(initialRouteState: AdminUserLogsRouteState) {
  const pathname = usePathname();
  const [routeState, setRouteState] = useState(initialRouteState);
  const [loginSearchInput, setLoginSearchInput] = useState(initialRouteState.login.search ?? "");
  const [loginOsFilter, setLoginOsFilter] = useState(initialRouteState.login.os);
  const [loginDateRange, setLoginDateRange] = useState<AdminTableDateRangeValue>({
    from: initialRouteState.login.dateFrom,
    to: initialRouteState.login.dateTo,
  });
  const [extensionSearchInput, setExtensionSearchInput] = useState(initialRouteState.extension.search ?? "");
  const [extensionBrowserFilter, setExtensionBrowserFilter] = useState(initialRouteState.extension.browser);
  const [extensionOsFilter, setExtensionOsFilter] = useState(initialRouteState.extension.os);
  const [extensionDateRange, setExtensionDateRange] = useState<AdminTableDateRangeValue>({
    from: initialRouteState.extension.dateFrom,
    to: initialRouteState.extension.dateTo,
  });
  const [transactionSearchInput, setTransactionSearchInput] = useState(initialRouteState.transactions.search ?? "");
  const [transactionSourceFilter, setTransactionSourceFilter] = useState(initialRouteState.transactions.source);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState(initialRouteState.transactions.status);
  const [transactionDateRange, setTransactionDateRange] = useState<AdminTableDateRangeValue>({
    from: initialRouteState.transactions.dateFrom,
    to: initialRouteState.transactions.dateTo,
  });

  const loginColumnVisibility = useAdminColumnVisibility({
    columnKeys: ADMIN_USERLOGS_LOGIN_COLUMN_KEYS,
    defaultVisibility: DEFAULT_ADMIN_USERLOGS_LOGIN_COLUMN_VISIBILITY,
    storageKey: ADMIN_USERLOGS_LOGIN_COLUMN_VISIBILITY_STORAGE_KEY,
  });
  const extensionColumnVisibility = useAdminColumnVisibility({
    columnKeys: ADMIN_USERLOGS_EXTENSION_COLUMN_KEYS,
    defaultVisibility: DEFAULT_ADMIN_USERLOGS_EXTENSION_COLUMN_VISIBILITY,
    storageKey: ADMIN_USERLOGS_EXTENSION_COLUMN_VISIBILITY_STORAGE_KEY,
  });
  const transactionsColumnVisibility = useAdminColumnVisibility({
    columnKeys: ADMIN_USERLOGS_TRANSACTIONS_COLUMN_KEYS,
    defaultVisibility: DEFAULT_ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY,
    lockedVisibleKeys: LOCKED_TRANSACTIONS_COLUMN_KEYS,
    storageKey: ADMIN_USERLOGS_TRANSACTIONS_COLUMN_VISIBILITY_STORAGE_KEY,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = loginSearchInput.trim();
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

      setRouteState((currentState) => {
        if (
          currentState.login.search === nextSearch &&
          currentState.login.os === loginOsFilter &&
          currentState.login.dateFrom === loginDateRange.from &&
          currentState.login.dateTo === loginDateRange.to
        ) {
          return currentState;
        }

        return updateLoginFilters(currentState, {
          search: nextSearch,
          os: loginOsFilter,
          dateFrom: loginDateRange.from,
          dateTo: loginDateRange.to,
          page: 1,
        });
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loginDateRange, loginOsFilter, loginSearchInput]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = extensionSearchInput.trim();
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

      setRouteState((currentState) => {
        if (
          currentState.extension.search === nextSearch &&
          currentState.extension.browser === extensionBrowserFilter &&
          currentState.extension.os === extensionOsFilter &&
          currentState.extension.dateFrom === extensionDateRange.from &&
          currentState.extension.dateTo === extensionDateRange.to
        ) {
          return currentState;
        }

        return updateExtensionFilters(currentState, {
          search: nextSearch,
          browser: extensionBrowserFilter,
          os: extensionOsFilter,
          dateFrom: extensionDateRange.from,
          dateTo: extensionDateRange.to,
          page: 1,
        });
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [extensionBrowserFilter, extensionDateRange, extensionOsFilter, extensionSearchInput]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = transactionSearchInput.trim();
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

      setRouteState((currentState) => {
        if (
          currentState.transactions.search === nextSearch &&
          currentState.transactions.source === transactionSourceFilter &&
          currentState.transactions.status === transactionStatusFilter &&
          currentState.transactions.dateFrom === transactionDateRange.from &&
          currentState.transactions.dateTo === transactionDateRange.to
        ) {
          return currentState;
        }

        return updateTransactionsFilters(currentState, {
          search: nextSearch,
          source: transactionSourceFilter,
          status: transactionStatusFilter,
          dateFrom: transactionDateRange.from,
          dateTo: transactionDateRange.to,
          page: 1,
        });
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [transactionDateRange, transactionSearchInput, transactionSourceFilter, transactionStatusFilter]);

  useEffect(() => {
    window.history.replaceState(null, "", buildAdminUserLogsUrl(pathname, routeState, window.location.search));
  }, [pathname, routeState]);

  const activeTab = routeState.tab;

  const activeFilters = useMemo(() => {
    if (activeTab === "login") {
      return routeState.login;
    }

    if (activeTab === "extension") {
      return routeState.extension;
    }

    return routeState.transactions;
  }, [activeTab, routeState]);

  function setActiveTab(tab: AdminUserLogsActiveTab) {
    setRouteState((currentState) => ({
      ...currentState,
      tab,
    }));
  }

  function handleLoginPageChange(page: number) {
    setRouteState((currentState) => updateLoginFilters(currentState, { page: Math.max(1, page) }));
  }

  function handleLoginPageSizeChange(pageSize: number) {
    setRouteState((currentState) => updateLoginFilters(currentState, { page: 1, pageSize }));
  }

  function handleExtensionPageChange(page: number) {
    setRouteState((currentState) => updateExtensionFilters(currentState, { page: Math.max(1, page) }));
  }

  function handleExtensionPageSizeChange(pageSize: number) {
    setRouteState((currentState) => updateExtensionFilters(currentState, { page: 1, pageSize }));
  }

  function handleTransactionsPageChange(page: number) {
    setRouteState((currentState) => updateTransactionsFilters(currentState, { page: Math.max(1, page) }));
  }

  function handleTransactionsPageSizeChange(pageSize: number) {
    setRouteState((currentState) => updateTransactionsFilters(currentState, { page: 1, pageSize }));
  }

  return {
    activeFilters,
    activeTab,
    extensionBrowserFilter,
    extensionColumnVisibility,
    extensionDateRange,
    extensionOsFilter,
    extensionSearchInput,
    handleExtensionPageChange,
    handleExtensionPageSizeChange,
    handleLoginPageChange,
    handleLoginPageSizeChange,
    handleTransactionsPageChange,
    handleTransactionsPageSizeChange,
    loginColumnVisibility,
    loginDateRange,
    loginOsFilter,
    loginSearchInput,
    routeState,
    setActiveTab,
    setExtensionBrowserFilter,
    setExtensionDateRange,
    setExtensionOsFilter,
    setExtensionSearchInput,
    setLoginDateRange,
    setLoginOsFilter,
    setLoginSearchInput,
    setTransactionDateRange,
    setTransactionSearchInput,
    setTransactionSourceFilter,
    setTransactionStatusFilter,
    transactionDateRange,
    transactionSearchInput,
    transactionsColumnVisibility,
    transactionSourceFilter,
    transactionStatusFilter,
  };
}
