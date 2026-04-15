"use client";

import { getPackageTablePageAction } from "@/modules/admin/packages/actions";

import type { PackageTableFilters } from "@/modules/admin/packages/types";

export const ADMIN_PACKAGE_QUERY_KEY = ["admin-packages"] as const;

export async function fetchPackageTablePage(input: PackageTableFilters) {
  const result = await getPackageTablePageAction(input);

  if (result?.data?.ok) {
    return result.data.tablePage;
  }

  const validationError = result?.validationErrors?.formErrors?.[0];
  const message = validationError ?? result?.data?.message ?? "Failed to load package table.";

  throw new Error(message);
}

export function getPackageTableQueryKey(filters: PackageTableFilters) {
  return [
    ...ADMIN_PACKAGE_QUERY_KEY,
    {
      order: filters.order,
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      sort: filters.sort,
      summary: filters.summary,
    },
  ] as const;
}
