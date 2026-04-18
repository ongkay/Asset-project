"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { useAdminColumnVisibility } from "@/components/shared/data-table/visibility";
import { parseCdKeyTableSearchParams } from "@/modules/admin/cdkeys/schemas";

import { CDKEY_TABLE_COLUMN_KEYS } from "./cdkey-page-types";

import type { CdKeyTableFilters, CdKeyUsageStatus } from "@/modules/admin/cdkeys/types";
import type { PackageSummary } from "@/modules/packages/types";
import type { AdminCdKeyColumnVisibility } from "./cdkey-page-types";

const COLUMN_VISIBILITY_STORAGE_KEY = "admin.cdkey.columns.v1";
const LOCKED_CDKEY_COLUMN_KEYS = ["actions"] as const;

export const DEFAULT_CDKEY_COLUMN_VISIBILITY: AdminCdKeyColumnVisibility = {
  code: true,
  package: true,
  status: true,
  usedBy: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  actions: true,
};

function buildCdKeyTableUrl(pathname: string, filters: CdKeyTableFilters) {
  const nextSearchParams = new URLSearchParams();

  if (filters.search) {
    nextSearchParams.set("search", filters.search);
  }

  if (filters.status) {
    nextSearchParams.set("status", filters.status);
  }

  if (filters.packageId) {
    nextSearchParams.set("packageId", filters.packageId);
  }

  if (filters.packageSummary) {
    nextSearchParams.set("packageSummary", filters.packageSummary);
  }

  if (filters.page > 1) {
    nextSearchParams.set("page", String(filters.page));
  }

  if (filters.pageSize !== 10) {
    nextSearchParams.set("pageSize", String(filters.pageSize));
  }

  const nextQueryString = nextSearchParams.toString();
  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
}

function isSameCdKeyFilters(leftFilters: CdKeyTableFilters, rightFilters: CdKeyTableFilters) {
  return (
    leftFilters.search === rightFilters.search &&
    leftFilters.status === rightFilters.status &&
    leftFilters.packageId === rightFilters.packageId &&
    leftFilters.packageSummary === rightFilters.packageSummary &&
    leftFilters.page === rightFilters.page &&
    leftFilters.pageSize === rightFilters.pageSize
  );
}

function readCdKeyFiltersFromUrl() {
  const currentSearchParams = new URLSearchParams(window.location.search);

  return parseCdKeyTableSearchParams({
    search: currentSearchParams.get("search") ?? undefined,
    status: currentSearchParams.get("status") ?? undefined,
    packageId: currentSearchParams.get("packageId") ?? undefined,
    packageSummary: currentSearchParams.get("packageSummary") ?? undefined,
    page: currentSearchParams.get("page") ?? undefined,
    pageSize: currentSearchParams.get("pageSize") ?? undefined,
  });
}

export function useCdKeyTableState(initialFilters: CdKeyTableFilters) {
  const pathname = usePathname();
  const [tableFilters, setTableFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [statusFilter, setStatusFilter] = useState<CdKeyUsageStatus | null>(initialFilters.status);
  const [packageFilter, setPackageFilter] = useState<string | null>(initialFilters.packageId);
  const [packageSummaryFilter, setPackageSummaryFilter] = useState<PackageSummary | null>(
    initialFilters.packageSummary,
  );

  const { handleToggleColumn, visibleColumns } = useAdminColumnVisibility({
    columnKeys: CDKEY_TABLE_COLUMN_KEYS,
    defaultVisibility: DEFAULT_CDKEY_COLUMN_VISIBILITY,
    lockedVisibleKeys: LOCKED_CDKEY_COLUMN_KEYS,
    storageKey: COLUMN_VISIBILITY_STORAGE_KEY,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim();
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

      setTableFilters((currentFilters) => {
        if (
          currentFilters.search === nextSearch &&
          currentFilters.status === statusFilter &&
          currentFilters.packageId === packageFilter &&
          currentFilters.packageSummary === packageSummaryFilter
        ) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          page: 1,
          search: nextSearch,
          status: statusFilter,
          packageId: packageFilter,
          packageSummary: packageSummaryFilter,
        };
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, statusFilter, packageFilter, packageSummaryFilter]);

  useEffect(() => {
    const nextUrl = buildCdKeyTableUrl(pathname, tableFilters);
    const currentUrl = `${pathname}${window.location.search}`;

    if (currentUrl === nextUrl) {
      return;
    }

    window.history.pushState(null, "", nextUrl);
  }, [pathname, tableFilters]);

  useEffect(() => {
    function syncTableStateFromUrl() {
      const nextFilters = readCdKeyFiltersFromUrl();

      setTableFilters((currentFilters) =>
        isSameCdKeyFilters(currentFilters, nextFilters) ? currentFilters : nextFilters,
      );
      setSearchInput((currentInput) => {
        const nextInput = nextFilters.search ?? "";
        return currentInput === nextInput ? currentInput : nextInput;
      });
      setStatusFilter((currentStatus) => (currentStatus === nextFilters.status ? currentStatus : nextFilters.status));
      setPackageFilter((currentPackage) =>
        currentPackage === nextFilters.packageId ? currentPackage : nextFilters.packageId,
      );
      setPackageSummaryFilter((currentSummary) =>
        currentSummary === nextFilters.packageSummary ? currentSummary : nextFilters.packageSummary,
      );
    }

    syncTableStateFromUrl();
    window.addEventListener("popstate", syncTableStateFromUrl);

    return () => {
      window.removeEventListener("popstate", syncTableStateFromUrl);
    };
  }, [pathname]);

  function handlePageChange(page: number) {
    setTableFilters((currentFilters) => ({
      ...currentFilters,
      page: Math.max(1, page),
    }));
  }

  function handlePageSizeChange(pageSize: number) {
    setTableFilters((currentFilters) => ({
      ...currentFilters,
      page: 1,
      pageSize,
    }));
  }

  return {
    tableFilters,
    handlePageChange,
    handlePageSizeChange,
    handleToggleColumn,
    visibleColumns,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    packageFilter,
    setPackageFilter,
    packageSummaryFilter,
    setPackageSummaryFilter,
  };
}
