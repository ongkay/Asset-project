import { z } from "zod";

import { ASSET_STATUSES, ASSET_TYPES } from "@/modules/assets/types";

import type { AssetTableFilters } from "./types";

const assetStatusSchema = z.enum(ASSET_STATUSES, {
  error: "Asset status is invalid.",
});

const assetTypeSchema = z.enum(ASSET_TYPES, {
  error: "Asset type is invalid.",
});

export const assetEditorDataInputSchema = z.object({
  id: z.string({ error: "Asset ID is required." }).trim().min(1, "Asset ID is required."),
});

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use yyyy-MM-dd format.");

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(searchValue: string | undefined) {
  const trimmedSearch = searchValue?.trim();
  return trimmedSearch ? trimmedSearch : null;
}

function normalizePage(pageValue: string | undefined) {
  if (!pageValue) {
    return 1;
  }

  const parsedPage = Number.parseInt(pageValue, 10);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}

function normalizePageSize(pageSizeValue: string | undefined) {
  if (!pageSizeValue) {
    return 10;
  }

  const parsedPageSize = Number.parseInt(pageSizeValue, 10);

  if (!Number.isFinite(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 100) {
    return 10;
  }

  return parsedPageSize;
}

function normalizeAssetType(assetTypeValue: string | undefined) {
  const parsedAssetType = assetTypeSchema.safeParse(assetTypeValue);
  return parsedAssetType.success ? parsedAssetType.data : null;
}

function normalizeAssetStatus(statusValue: string | undefined) {
  const parsedStatus = assetStatusSchema.safeParse(statusValue);
  return parsedStatus.success ? parsedStatus.data : null;
}

function normalizeDateOnly(dateValue: string | undefined) {
  const parsedDate = dateOnlySchema.safeParse(dateValue);
  return parsedDate.success ? parsedDate.data : null;
}

function parseDateOnlyToUtcTimestamp(dateOnly: string) {
  const [yearString, monthString, dayString] = dateOnly.split("-");
  const year = Number.parseInt(yearString, 10);
  const month = Number.parseInt(monthString, 10);
  const day = Number.parseInt(dayString, 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return Number.NaN;
  }

  return Date.UTC(year, month - 1, day);
}

function isDateRangeReversed(expiresFrom: string | null, expiresTo: string | null) {
  if (!expiresFrom || !expiresTo) {
    return false;
  }

  return parseDateOnlyToUtcTimestamp(expiresFrom) > parseDateOnlyToUtcTimestamp(expiresTo);
}

export const assetTableFilterSchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform((searchValue) => (searchValue.length > 0 ? searchValue : null))
      .nullable()
      .optional()
      .default(null),
    assetType: assetTypeSchema.nullable().optional().default(null),
    status: assetStatusSchema.nullable().optional().default(null),
    expiresFrom: dateOnlySchema.nullable().optional().default(null),
    expiresTo: dateOnlySchema.nullable().optional().default(null),
    page: z.number({ error: "Page must be a number." }).int().min(1).default(1),
    pageSize: z.number({ error: "Page size must be a number." }).int().min(1).max(100).default(10),
  })
  .superRefine((input, context) => {
    if (isDateRangeReversed(input.expiresFrom, input.expiresTo)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry start date cannot be later than expiry end date.",
        path: ["expiresTo"],
      });
    }
  }) satisfies z.ZodType<AssetTableFilters>;

export function parseAssetTableSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AssetTableFilters {
  const expiresFrom = normalizeDateOnly(readSingleSearchParam(searchParams.expiresFrom));
  const expiresTo = normalizeDateOnly(readSingleSearchParam(searchParams.expiresTo));
  const hasReversedDateRange = isDateRangeReversed(expiresFrom, expiresTo);

  return {
    search: normalizeSearch(readSingleSearchParam(searchParams.search)),
    assetType: normalizeAssetType(readSingleSearchParam(searchParams.assetType)),
    status: normalizeAssetStatus(readSingleSearchParam(searchParams.status)),
    expiresFrom: hasReversedDateRange ? null : expiresFrom,
    expiresTo: hasReversedDateRange ? null : expiresTo,
    page: normalizePage(readSingleSearchParam(searchParams.page)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.pageSize)),
  };
}
