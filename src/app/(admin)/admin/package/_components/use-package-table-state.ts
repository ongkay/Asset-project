"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { useAdminColumnVisibility } from "@/components/shared/data-table/visibility";

import { PACKAGE_TABLE_COLUMN_KEYS } from "./package-page-types";
import type { AdminPackageColumnVisibility } from "./package-page-types";
import type { PackageTableFilters } from "@/modules/admin/packages/types";
import type { PackageSummary, PackageTableSortKey } from "@/modules/packages/types";

const COLUMN_VISIBILITY_STORAGE_KEY = "admin.package.columns.v1";

export const DEFAULT_PACKAGE_COLUMN_VISIBILITY: AdminPackageColumnVisibility = {
  actions: true,
  amountRp: true,
  durationDays: true,
  name: true,
  status: true,
  summary: true,
  totalUsed: true,
  updatedAt: true,
};

function buildPackageTableUrl(pathname: string, filters: PackageTableFilters) {
  const nextSearchParams = new URLSearchParams();

  if (filters.search) {
    nextSearchParams.set("search", filters.search);
  }

  if (filters.summary) {
    nextSearchParams.set("summary", filters.summary);
  }

  if (filters.page > 1) {
    nextSearchParams.set("page", String(filters.page));
  }

  if (filters.pageSize !== 10) {
    nextSearchParams.set("pageSize", String(filters.pageSize));
  }

  if (filters.sort && filters.order) {
    nextSearchParams.set("sort", filters.sort);
    nextSearchParams.set("order", filters.order);
  }

  const nextQueryString = nextSearchParams.toString();
  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
}

export function usePackageTableState(initialFilters: PackageTableFilters) {
  const pathname = usePathname();
  const [tableFilters, setTableFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [summaryFilter, setSummaryFilter] = useState<PackageSummary | null>(initialFilters.summary);
  const { handleToggleColumn, visibleColumns } = useAdminColumnVisibility({
    columnKeys: PACKAGE_TABLE_COLUMN_KEYS,
    defaultVisibility: DEFAULT_PACKAGE_COLUMN_VISIBILITY,
    lockedVisibleKeys: ["actions"],
    storageKey: COLUMN_VISIBILITY_STORAGE_KEY,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim();
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

      setTableFilters((currentFilters) => {
        if (currentFilters.search === nextSearch && currentFilters.summary === summaryFilter) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          page: 1,
          search: nextSearch,
          summary: summaryFilter,
        };
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, summaryFilter]);

  useEffect(() => {
    window.history.replaceState(null, "", buildPackageTableUrl(pathname, tableFilters));
  }, [pathname, tableFilters]);

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

  function handleSortChange(sort: PackageTableSortKey) {
    setTableFilters((currentFilters) => {
      if (currentFilters.sort !== sort) {
        return {
          ...currentFilters,
          order: "asc",
          page: 1,
          sort,
        };
      }

      if (currentFilters.order === "asc") {
        return {
          ...currentFilters,
          order: "desc",
          page: 1,
        };
      }

      return {
        ...currentFilters,
        order: null,
        page: 1,
        sort: null,
      };
    });
  }

  return {
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleToggleColumn,
    searchInput,
    setSearchInput,
    setSummaryFilter,
    summaryFilter,
    tableFilters,
    visibleColumns,
  };
}
