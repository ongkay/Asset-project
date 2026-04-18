import { z } from "zod";

import type { CdKeyTableFilters } from "./types";

const cdKeyUsageStatusSchema = z.enum(["used", "unused"], {
  error: "CD key status is invalid.",
});

const packageSummarySchema = z.enum(["private", "share", "mixed"], {
  error: "Package summary is invalid.",
});

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(searchValue: string | undefined) {
  const trimmedSearch = searchValue?.trim();
  return trimmedSearch ? trimmedSearch : null;
}

function normalizePage(pageValue: string | undefined) {
  const parsedPage = Number.parseInt(pageValue ?? "1", 10);
  return Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
}

function normalizePageSize(pageSizeValue: string | undefined) {
  const parsedPageSize = Number.parseInt(pageSizeValue ?? "10", 10);
  return Number.isFinite(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100 ? parsedPageSize : 10;
}

function normalizeStatus(statusValue: string | undefined) {
  const parsedStatus = cdKeyUsageStatusSchema.safeParse(statusValue);
  return parsedStatus.success ? parsedStatus.data : null;
}

function normalizePackageId(packageIdValue: string | undefined) {
  if (!packageIdValue) {
    return null;
  }

  const trimmedPackageId = packageIdValue.trim();
  if (!trimmedPackageId) {
    return null;
  }

  const parsedPackageId = z.string().uuid().safeParse(trimmedPackageId);
  return parsedPackageId.success ? parsedPackageId.data : null;
}

function normalizePackageSummary(packageSummaryValue: string | undefined) {
  const parsedSummary = packageSummarySchema.safeParse(packageSummaryValue);
  return parsedSummary.success ? parsedSummary.data : null;
}

export const cdKeyTableFilterSchema = z.object({
  search: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional()
    .default(null),
  status: cdKeyUsageStatusSchema.nullable().optional().default(null),
  packageId: z.string().uuid({ error: "Package ID is invalid." }).nullable().optional().default(null),
  packageSummary: packageSummarySchema.nullable().optional().default(null),
  page: z.number({ error: "Page must be a number." }).int().min(1).default(1),
  pageSize: z.number({ error: "Page size must be a number." }).int().min(1).max(100).default(10),
}) satisfies z.ZodType<CdKeyTableFilters>;

export const cdKeyDetailInputSchema = z.object({
  id: z
    .string({ error: "CD key ID is required." })
    .trim()
    .min(1, "CD key ID is required.")
    .uuid("CD key ID is invalid."),
});

export const cdKeyIssueDialogBootstrapInputSchema = z
  .object({})
  .catchall(z.unknown())
  .transform(() => ({}));

export function parseCdKeyTableSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): CdKeyTableFilters {
  return {
    search: normalizeSearch(readSingleSearchParam(searchParams.search)),
    status: normalizeStatus(readSingleSearchParam(searchParams.status)),
    packageId: normalizePackageId(readSingleSearchParam(searchParams.packageId)),
    packageSummary: normalizePackageSummary(readSingleSearchParam(searchParams.packageSummary)),
    page: normalizePage(readSingleSearchParam(searchParams.page)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.pageSize)),
  };
}
