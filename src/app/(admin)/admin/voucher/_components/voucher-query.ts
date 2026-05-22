"use client";

import { getVoucherTablePageAction } from "@/modules/admin/vouchers/actions";

import type { VoucherTableFilters } from "@/modules/admin/vouchers/types";

export const ADMIN_VOUCHER_QUERY_KEY = ["admin-vouchers"] as const;

export async function fetchVoucherTablePage(input: VoucherTableFilters) {
  const result = await getVoucherTablePageAction(input);

  if (result?.data?.ok) {
    return result.data.tablePage;
  }

  const validationError = result?.validationErrors?.formErrors?.[0];
  const message = validationError ?? result?.data?.message ?? "Failed to load voucher table.";

  throw new Error(message);
}

export function getVoucherTableQueryKey(filters: VoucherTableFilters) {
  return [
    ...ADMIN_VOUCHER_QUERY_KEY,
    {
      page: filters.page,
      pageSize: filters.pageSize,
      scopeType: filters.scopeType,
      search: filters.search,
      status: filters.status,
    },
  ] as const;
}
