import { z } from "zod";

import { voucherScopeTypeSchema } from "@/modules/vouchers/schemas";

import type { VoucherTableFilters, VoucherTableStatusFilter } from "./types";

const voucherTableStatusSchema = z.enum(["active", "all", "exhausted", "expired", "inactive"]);

export const voucherTableFilterSchema = z.object({
  page: z.number({ error: "Page must be a number." }).int().min(1).default(1),
  pageSize: z.number({ error: "Page size must be a number." }).int().min(1).max(100).default(10),
  scopeType: voucherScopeTypeSchema.nullable().optional().default(null),
  search: z
    .string()
    .trim()
    .transform((searchValue) => (searchValue.length > 0 ? searchValue : null))
    .nullable()
    .optional()
    .default(null),
  status: voucherTableStatusSchema.optional().default("all"),
}) satisfies z.ZodType<VoucherTableFilters>;

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(searchValue: string | undefined): string | null {
  const trimmedSearch = searchValue?.trim();
  return trimmedSearch ? trimmedSearch : null;
}

function normalizePage(pageValue: string | undefined): number {
  if (!pageValue) {
    return 1;
  }

  const parsedPage = Number.parseInt(pageValue, 10);
  return Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
}

function normalizePageSize(pageSizeValue: string | undefined): number {
  if (!pageSizeValue) {
    return 10;
  }

  const parsedPageSize = Number.parseInt(pageSizeValue, 10);
  return Number.isFinite(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100 ? parsedPageSize : 10;
}

function normalizeScopeType(scopeTypeValue: string | undefined): VoucherTableFilters["scopeType"] {
  const parsedScopeType = voucherScopeTypeSchema.safeParse(scopeTypeValue);
  return parsedScopeType.success ? parsedScopeType.data : null;
}

function normalizeStatus(statusValue: string | undefined): VoucherTableStatusFilter {
  const parsedStatus = voucherTableStatusSchema.safeParse(statusValue);
  return parsedStatus.success ? parsedStatus.data : "all";
}

export function parseVoucherTableSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): VoucherTableFilters {
  return {
    page: normalizePage(readSingleSearchParam(searchParams.page)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.pageSize)),
    scopeType: normalizeScopeType(readSingleSearchParam(searchParams.scopeType)),
    search: normalizeSearch(readSingleSearchParam(searchParams.search)),
    status: normalizeStatus(readSingleSearchParam(searchParams.status)),
  };
}
