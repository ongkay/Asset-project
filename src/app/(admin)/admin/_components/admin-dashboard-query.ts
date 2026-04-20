"use client";

import { getAdminDashboardSnapshotAction } from "@/modules/admin/dashboard/actions";

import type { AdminDashboardFilters } from "@/modules/admin/dashboard/types";

export const ADMIN_DASHBOARD_QUERY_KEY = ["admin-dashboard"] as const;

export async function fetchAdminDashboardSnapshot(input: AdminDashboardFilters) {
  const result = await getAdminDashboardSnapshotAction(input);

  if (result?.data?.ok) {
    return result.data.snapshot;
  }

  throw new Error(
    result?.validationErrors?.formErrors?.[0] ?? result?.data?.message ?? "Failed to load admin dashboard.",
  );
}

export function getAdminDashboardQueryKey(filters: AdminDashboardFilters) {
  return [...ADMIN_DASHBOARD_QUERY_KEY, filters] as const;
}
