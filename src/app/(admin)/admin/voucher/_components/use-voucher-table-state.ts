"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { useAdminColumnVisibility } from "@/components/shared/data-table/visibility";

import { VOUCHER_TABLE_COLUMN_KEYS } from "./voucher-page-types";

import type { VoucherTableFilters, VoucherTableStatusFilter } from "@/modules/admin/vouchers/types";
import type { VoucherScopeType } from "@/modules/vouchers/types";
import type { AdminVoucherColumnVisibility } from "./voucher-page-types";

const COLUMN_VISIBILITY_STORAGE_KEY = "admin.voucher.columns.v1";
const LOCKED_VOUCHER_COLUMN_KEYS = ["actions"] as const;

export const DEFAULT_VOUCHER_COLUMN_VISIBILITY: AdminVoucherColumnVisibility = {
  actions: true,
  code: true,
  discountPercent: true,
  expiresAt: true,
  package: true,
  scope: true,
  status: true,
  updatedAt: true,
  usage: true,
};

function buildVoucherTableUrl(pathname: string, filters: VoucherTableFilters) {
  const nextSearchParams = new URLSearchParams();

  if (filters.search) {
    nextSearchParams.set("search", filters.search);
  }

  if (filters.scopeType) {
    nextSearchParams.set("scopeType", filters.scopeType);
  }

  if (filters.status !== "all") {
    nextSearchParams.set("status", filters.status);
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

export function useVoucherTableState(initialFilters: VoucherTableFilters) {
  const pathname = usePathname();
  const [tableFilters, setTableFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [scopeFilter, setScopeFilter] = useState<VoucherScopeType | null>(initialFilters.scopeType);
  const [statusFilter, setStatusFilter] = useState<VoucherTableStatusFilter>(initialFilters.status);
  const { handleToggleColumn, visibleColumns } = useAdminColumnVisibility({
    columnKeys: VOUCHER_TABLE_COLUMN_KEYS,
    defaultVisibility: DEFAULT_VOUCHER_COLUMN_VISIBILITY,
    lockedVisibleKeys: LOCKED_VOUCHER_COLUMN_KEYS,
    storageKey: COLUMN_VISIBILITY_STORAGE_KEY,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim();
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

      setTableFilters((currentFilters) => {
        if (
          currentFilters.search === nextSearch &&
          currentFilters.scopeType === scopeFilter &&
          currentFilters.status === statusFilter
        ) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          page: 1,
          scopeType: scopeFilter,
          search: nextSearch,
          status: statusFilter,
        };
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [scopeFilter, searchInput, statusFilter]);

  useEffect(() => {
    window.history.replaceState(null, "", buildVoucherTableUrl(pathname, tableFilters));
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

  return {
    handlePageChange,
    handlePageSizeChange,
    handleToggleColumn,
    scopeFilter,
    searchInput,
    setScopeFilter,
    setSearchInput,
    setStatusFilter,
    statusFilter,
    tableFilters,
    visibleColumns,
  };
}
