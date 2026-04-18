"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { useAdminColumnVisibility } from "@/components/shared/data-table/visibility";

import { ADMIN_USERS_TABLE_COLUMN_KEYS } from "./users-page-types";

import type { PackageSummary } from "@/modules/packages/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";
import type { AdminUsersTableFilters } from "@/modules/admin/users/types";
import type { AdminUsersColumnVisibility } from "./users-page-types";

export const ADMIN_USERS_COLUMN_VISIBILITY_STORAGE_KEY = "admin.users.columns.v1";

const LOCKED_ADMIN_USERS_COLUMN_KEYS = ["actions"] as const;
const DEFAULT_PAGE_SIZE = 10;

export const DEFAULT_ADMIN_USERS_COLUMN_VISIBILITY: AdminUsersColumnVisibility = {
  userId: true,
  user: true,
  publicId: true,
  role: true,
  subscriptionStatus: true,
  expiresAt: true,
  packageSummary: true,
  banned: true,
  updatedAt: true,
  createdAt: true,
  actions: true,
};

export function buildAdminUsersTableUrl(pathname: string, filters: AdminUsersTableFilters, currentSearch = "") {
  const nextSearchParams = new URLSearchParams(currentSearch);

  if (filters.search) {
    nextSearchParams.set("search", filters.search);
  } else {
    nextSearchParams.delete("search");
  }

  if (filters.role) {
    nextSearchParams.set("role", filters.role);
  } else {
    nextSearchParams.delete("role");
  }

  if (filters.subscriptionStatus) {
    nextSearchParams.set("subscriptionStatus", filters.subscriptionStatus);
  } else {
    nextSearchParams.delete("subscriptionStatus");
  }

  if (filters.packageSummary) {
    nextSearchParams.set("packageSummary", filters.packageSummary);
  } else {
    nextSearchParams.delete("packageSummary");
  }

  if (filters.page > 1) {
    nextSearchParams.set("page", String(filters.page));
  } else {
    nextSearchParams.delete("page");
  }

  if (filters.pageSize !== DEFAULT_PAGE_SIZE) {
    nextSearchParams.set("pageSize", String(filters.pageSize));
  } else {
    nextSearchParams.delete("pageSize");
  }

  const nextQueryString = nextSearchParams.toString();
  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
}

export function useUsersTableState(initialFilters: AdminUsersTableFilters) {
  const pathname = usePathname();
  const [tableFilters, setTableFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [roleFilter, setRoleFilter] = useState<AdminUsersTableFilters["role"]>(initialFilters.role);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<SubscriptionStatus | null>(
    initialFilters.subscriptionStatus,
  );
  const [packageSummaryFilter, setPackageSummaryFilter] = useState<PackageSummary | "none" | null>(
    initialFilters.packageSummary,
  );

  const { handleToggleColumn, visibleColumns } = useAdminColumnVisibility({
    columnKeys: ADMIN_USERS_TABLE_COLUMN_KEYS,
    defaultVisibility: DEFAULT_ADMIN_USERS_COLUMN_VISIBILITY,
    lockedVisibleKeys: LOCKED_ADMIN_USERS_COLUMN_KEYS,
    storageKey: ADMIN_USERS_COLUMN_VISIBILITY_STORAGE_KEY,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim();
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

      setTableFilters((currentFilters) => {
        if (
          currentFilters.search === nextSearch &&
          currentFilters.role === roleFilter &&
          currentFilters.subscriptionStatus === subscriptionStatusFilter &&
          currentFilters.packageSummary === packageSummaryFilter
        ) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          page: 1,
          search: nextSearch,
          role: roleFilter,
          subscriptionStatus: subscriptionStatusFilter,
          packageSummary: packageSummaryFilter,
        };
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [packageSummaryFilter, roleFilter, searchInput, subscriptionStatusFilter]);

  useEffect(() => {
    window.history.replaceState(null, "", buildAdminUsersTableUrl(pathname, tableFilters, window.location.search));
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
    roleFilter,
    setRoleFilter,
    subscriptionStatusFilter,
    setSubscriptionStatusFilter,
    packageSummaryFilter,
    setPackageSummaryFilter,
  };
}
