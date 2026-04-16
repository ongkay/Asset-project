import { z } from "zod";

import { ASSET_TYPES } from "@/modules/assets/types";

import type { AssetType } from "@/modules/assets/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";
import type { SubscriberTableFilters } from "./types";

const SUBSCRIBER_STATUSES = ["active", "processed", "expired", "canceled"] as const;

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use yyyy-MM-dd format.");

const assetTypeSchema = z.enum(ASSET_TYPES, {
  error: "Asset type is invalid.",
});

const subscriberStatusSchema = z.enum(SUBSCRIBER_STATUSES, {
  error: "Subscription status is invalid.",
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

function normalizeAssetType(assetTypeValue: string | undefined): AssetType | null {
  const parsedAssetType = assetTypeSchema.safeParse(assetTypeValue);
  return parsedAssetType.success ? parsedAssetType.data : null;
}

function normalizeStatus(statusValue: string | undefined): SubscriptionStatus | null {
  const parsedStatus = subscriberStatusSchema.safeParse(statusValue);
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

export const subscriberTableFilterSchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : null))
      .nullable()
      .optional()
      .default(null),
    assetType: assetTypeSchema.nullable().optional().default(null),
    status: subscriberStatusSchema.nullable().optional().default(null),
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
  }) satisfies z.ZodType<SubscriberTableFilters>;

export const subscriberEditorDataInputSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  subscriptionId: z.string().trim().min(1).optional(),
});

export const subscriberUserSearchSchema = z.object({
  query: z.string({ error: "Search query is required." }).trim().min(1, "Search query is required."),
  page: z.number({ error: "Page must be a number." }).int().min(1).default(1),
  pageSize: z.number({ error: "Page size must be a number." }).int().min(1).max(100).default(10),
});

export const subscriberActivationDraftInputSchema = z.object({
  userId: z.string({ error: "User ID is required." }).trim().min(1, "User ID is required."),
  packageId: z.string({ error: "Package ID is required." }).trim().min(1, "Package ID is required."),
  subscriptionId: z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (!value) {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
  }),
});

export function parseSubscriberTableSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): SubscriberTableFilters {
  const expiresFrom = normalizeDateOnly(readSingleSearchParam(searchParams.expiresFrom));
  const expiresTo = normalizeDateOnly(readSingleSearchParam(searchParams.expiresTo));
  const hasReversedDateRange = isDateRangeReversed(expiresFrom, expiresTo);

  return {
    search: normalizeSearch(readSingleSearchParam(searchParams.search)),
    assetType: normalizeAssetType(readSingleSearchParam(searchParams.assetType)),
    status: normalizeStatus(readSingleSearchParam(searchParams.status)),
    expiresFrom: hasReversedDateRange ? null : expiresFrom,
    expiresTo: hasReversedDateRange ? null : expiresTo,
    page: normalizePage(readSingleSearchParam(searchParams.page)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.pageSize)),
  };
}
