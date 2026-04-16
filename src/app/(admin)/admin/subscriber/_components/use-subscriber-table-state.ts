"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { useAdminColumnVisibility } from "@/components/shared/data-table/visibility";

import { SUBSCRIBER_TABLE_COLUMN_KEYS } from "./subscriber-page-types";

import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type { SubscriberTableFilters } from "@/modules/admin/subscriptions/types";
import type { AssetType } from "@/modules/assets/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";
import type { AdminSubscriberColumnVisibility } from "./subscriber-page-types";

const COLUMN_VISIBILITY_STORAGE_KEY = "admin.subscriber.columns.v1";
const LOCKED_SUBSCRIBER_COLUMN_KEYS = ["actions"] as const;

export const DEFAULT_SUBSCRIBER_COLUMN_VISIBILITY: AdminSubscriberColumnVisibility = {
  user: true,
  subscriptionStatus: true,
  startAt: true,
  expiresAt: true,
  totalSpentRp: true,
  packageName: true,
  actions: true,
};

function buildSubscriberTableUrl(pathname: string, filters: SubscriberTableFilters) {
  const nextSearchParams = new URLSearchParams();

  if (filters.search) {
    nextSearchParams.set("search", filters.search);
  }

  if (filters.assetType) {
    nextSearchParams.set("assetType", filters.assetType);
  }

  if (filters.status) {
    nextSearchParams.set("status", filters.status);
  }

  if (filters.expiresFrom) {
    nextSearchParams.set("expiresFrom", filters.expiresFrom);
  }

  if (filters.expiresTo) {
    nextSearchParams.set("expiresTo", filters.expiresTo);
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

export function useSubscriberTableState(initialFilters: SubscriberTableFilters) {
  const pathname = usePathname();
  const [tableFilters, setTableFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType | null>(initialFilters.assetType);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | null>(initialFilters.status);
  const [expiresRange, setExpiresRange] = useState<AdminTableDateRangeValue>({
    from: initialFilters.expiresFrom,
    to: initialFilters.expiresTo,
  });

  const { handleToggleColumn, visibleColumns } = useAdminColumnVisibility({
    columnKeys: SUBSCRIBER_TABLE_COLUMN_KEYS,
    defaultVisibility: DEFAULT_SUBSCRIBER_COLUMN_VISIBILITY,
    lockedVisibleKeys: LOCKED_SUBSCRIBER_COLUMN_KEYS,
    storageKey: COLUMN_VISIBILITY_STORAGE_KEY,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim();
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

      setTableFilters((currentFilters) => {
        if (
          currentFilters.search === nextSearch &&
          currentFilters.assetType === assetTypeFilter &&
          currentFilters.status === statusFilter &&
          currentFilters.expiresFrom === expiresRange.from &&
          currentFilters.expiresTo === expiresRange.to
        ) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          page: 1,
          search: nextSearch,
          assetType: assetTypeFilter,
          status: statusFilter,
          expiresFrom: expiresRange.from,
          expiresTo: expiresRange.to,
        };
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, assetTypeFilter, statusFilter, expiresRange]);

  useEffect(() => {
    window.history.replaceState(null, "", buildSubscriberTableUrl(pathname, tableFilters));
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
    tableFilters,
    handlePageChange,
    handlePageSizeChange,
    handleToggleColumn,
    visibleColumns,
    searchInput,
    setSearchInput,
    assetTypeFilter,
    setAssetTypeFilter,
    statusFilter,
    setStatusFilter,
    expiresRange,
    setExpiresRange,
  };
}
