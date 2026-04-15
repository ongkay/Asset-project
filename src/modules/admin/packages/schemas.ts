import { z } from "zod";

import type { PackageTableFilters } from "./types";
import type { PackageSummary, PackageTableSortKey, PackageTableSortOrder } from "@/modules/packages/types";

const packageSummarySchema = z.enum(["private", "share", "mixed"]);
const packageTableSortKeySchema = z.enum(["status", "updatedAt"]);
const packageTableSortOrderSchema = z.enum(["asc", "desc"]);

export const packageTableFilterSchema = z
  .object({
    order: packageTableSortOrderSchema.nullable().optional().default(null),
    page: z.number({ error: "Page must be a number." }).int().min(1).default(1),
    pageSize: z.number({ error: "Page size must be a number." }).int().min(1).max(100).default(10),
    search: z
      .string()
      .trim()
      .transform((searchValue) => (searchValue.length > 0 ? searchValue : null))
      .nullable()
      .optional()
      .default(null),
    sort: packageTableSortKeySchema.nullable().optional().default(null),
    summary: packageSummarySchema.nullable().optional().default(null),
  })
  .transform((filters) => ({
    ...filters,
    order: filters.sort ? (filters.order ?? "asc") : null,
  })) satisfies z.ZodType<PackageTableFilters>;

export type PackageTableFilterInput = z.input<typeof packageTableFilterSchema>;

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

function normalizeSummary(summaryValue: string | undefined): PackageSummary | null {
  const parsedSummary = packageSummarySchema.safeParse(summaryValue);
  return parsedSummary.success ? parsedSummary.data : null;
}

function normalizeSort(sortValue: string | undefined): PackageTableSortKey | null {
  const parsedSort = packageTableSortKeySchema.safeParse(sortValue);
  return parsedSort.success ? parsedSort.data : null;
}

function normalizeOrder(orderValue: string | undefined): PackageTableSortOrder | null {
  const parsedOrder = packageTableSortOrderSchema.safeParse(orderValue);
  return parsedOrder.success ? parsedOrder.data : null;
}

export function parsePackageTableSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): PackageTableFilters {
  const sort = normalizeSort(readSingleSearchParam(searchParams.sort));

  return {
    order: sort ? (normalizeOrder(readSingleSearchParam(searchParams.order)) ?? "asc") : null,
    page: normalizePage(readSingleSearchParam(searchParams.page)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.pageSize)),
    search: normalizeSearch(readSingleSearchParam(searchParams.search)),
    sort,
    summary: normalizeSummary(readSingleSearchParam(searchParams.summary)),
  };
}
