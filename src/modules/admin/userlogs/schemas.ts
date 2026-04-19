import { z } from "zod";

import type {
  AdminExtensionTrackFilters,
  AdminLoginHistoryFilters,
  AdminTransactionsFilters,
  AdminUserLogsActiveTab,
  AdminUserLogsRouteState,
} from "./types";

const ADMIN_USER_LOGS_TABS = ["login", "extension", "transactions"] as const;
const ADMIN_TRANSACTION_SOURCES = ["payment_dummy", "cdkey", "admin_manual"] as const;
const ADMIN_TRANSACTION_STATUSES = ["pending", "success", "failed", "canceled"] as const;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const adminUserLogsTabSchema = z.enum(ADMIN_USER_LOGS_TABS, {
  error: "Tab is invalid.",
});

const transactionSourceSchema = z.enum(ADMIN_TRANSACTION_SOURCES, {
  error: "Transaction source is invalid.",
});

const transactionStatusSchema = z.enum(ADMIN_TRANSACTION_STATUSES, {
  error: "Transaction status is invalid.",
});

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use yyyy-MM-dd format.");

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeOptionalString(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizePage(value: string | undefined) {
  const parsedPage = Number.parseInt(value ?? String(DEFAULT_PAGE), 10);
  return Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : DEFAULT_PAGE;
}

function normalizePageSize(value: string | undefined) {
  const parsedPageSize = Number.parseInt(value ?? String(DEFAULT_PAGE_SIZE), 10);

  return Number.isFinite(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= MAX_PAGE_SIZE
    ? parsedPageSize
    : DEFAULT_PAGE_SIZE;
}

function normalizeDateOnly(value: string | undefined) {
  const parsedDate = dateOnlySchema.safeParse(value);
  return parsedDate.success ? parsedDate.data : null;
}

function normalizeEnumValue<TValue extends string>(
  value: string | undefined,
  schema: z.ZodEnum<[TValue, ...TValue[]]>,
) {
  const parsedValue = schema.safeParse(value);
  return parsedValue.success ? parsedValue.data : null;
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

function isDateRangeReversed(dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom || !dateTo) {
    return false;
  }

  return parseDateOnlyToUtcTimestamp(dateFrom) > parseDateOnlyToUtcTimestamp(dateTo);
}

function buildDateRangeRefinement(message: string) {
  return <TInput extends { dateFrom: string | null; dateTo: string | null }>(
    input: TInput,
    context: z.RefinementCtx,
  ) => {
    if (isDateRangeReversed(input.dateFrom, input.dateTo)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["dateTo"],
      });
    }
  };
}

export const adminTransactionDetailInputSchema = z.object({
  transactionId: z.guid({ error: "Transaction ID is invalid." }),
});

export const adminLoginHistoryFilterSchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : null))
      .nullable()
      .optional()
      .default(null),
    os: z.string().trim().min(1, "Operating system is invalid.").nullable().optional().default(null),
    dateFrom: dateOnlySchema.nullable().optional().default(null),
    dateTo: dateOnlySchema.nullable().optional().default(null),
    page: z.number({ error: "Page must be a number." }).int().min(1).default(DEFAULT_PAGE),
    pageSize: z
      .number({ error: "Page size must be a number." })
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .superRefine(
    buildDateRangeRefinement("Login start date cannot be later than login end date."),
  ) satisfies z.ZodType<AdminLoginHistoryFilters>;

export const adminExtensionTrackFilterSchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : null))
      .nullable()
      .optional()
      .default(null),
    browser: z.string().trim().min(1, "Browser is invalid.").nullable().optional().default(null),
    os: z.string().trim().min(1, "Operating system is invalid.").nullable().optional().default(null),
    dateFrom: dateOnlySchema.nullable().optional().default(null),
    dateTo: dateOnlySchema.nullable().optional().default(null),
    page: z.number({ error: "Page must be a number." }).int().min(1).default(DEFAULT_PAGE),
    pageSize: z
      .number({ error: "Page size must be a number." })
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .superRefine(
    buildDateRangeRefinement("Extension start date cannot be later than extension end date."),
  ) satisfies z.ZodType<AdminExtensionTrackFilters>;

export const adminTransactionsFilterSchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : null))
      .nullable()
      .optional()
      .default(null),
    source: transactionSourceSchema.nullable().optional().default(null),
    status: transactionStatusSchema.nullable().optional().default(null),
    dateFrom: dateOnlySchema.nullable().optional().default(null),
    dateTo: dateOnlySchema.nullable().optional().default(null),
    page: z.number({ error: "Page must be a number." }).int().min(1).default(DEFAULT_PAGE),
    pageSize: z
      .number({ error: "Page size must be a number." })
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .superRefine(
    buildDateRangeRefinement("Transaction start date cannot be later than transaction end date."),
  ) satisfies z.ZodType<AdminTransactionsFilters>;

function parseActiveTab(tabValue: string | undefined): AdminUserLogsActiveTab {
  const parsedTab = adminUserLogsTabSchema.safeParse(tabValue);
  return parsedTab.success ? parsedTab.data : "login";
}

function parseLoginFilters(searchParams: Record<string, string | string[] | undefined>): AdminLoginHistoryFilters {
  const dateFrom = normalizeDateOnly(readSingleSearchParam(searchParams.loginDateFrom));
  const dateTo = normalizeDateOnly(readSingleSearchParam(searchParams.loginDateTo));
  const hasReversedDateRange = isDateRangeReversed(dateFrom, dateTo);

  return {
    search: normalizeOptionalString(readSingleSearchParam(searchParams.loginSearch)),
    os: normalizeOptionalString(readSingleSearchParam(searchParams.loginOs)),
    dateFrom: hasReversedDateRange ? null : dateFrom,
    dateTo: hasReversedDateRange ? null : dateTo,
    page: normalizePage(readSingleSearchParam(searchParams.loginPage)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.loginPageSize)),
  };
}

function parseExtensionFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminExtensionTrackFilters {
  const dateFrom = normalizeDateOnly(readSingleSearchParam(searchParams.extensionDateFrom));
  const dateTo = normalizeDateOnly(readSingleSearchParam(searchParams.extensionDateTo));
  const hasReversedDateRange = isDateRangeReversed(dateFrom, dateTo);

  return {
    search: normalizeOptionalString(readSingleSearchParam(searchParams.extensionSearch)),
    browser: normalizeOptionalString(readSingleSearchParam(searchParams.extensionBrowser)),
    os: normalizeOptionalString(readSingleSearchParam(searchParams.extensionOs)),
    dateFrom: hasReversedDateRange ? null : dateFrom,
    dateTo: hasReversedDateRange ? null : dateTo,
    page: normalizePage(readSingleSearchParam(searchParams.extensionPage)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.extensionPageSize)),
  };
}

function parseTransactionFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminTransactionsFilters {
  const dateFrom = normalizeDateOnly(readSingleSearchParam(searchParams.transactionDateFrom));
  const dateTo = normalizeDateOnly(readSingleSearchParam(searchParams.transactionDateTo));
  const hasReversedDateRange = isDateRangeReversed(dateFrom, dateTo);

  return {
    search: normalizeOptionalString(readSingleSearchParam(searchParams.transactionSearch)),
    source: normalizeEnumValue(readSingleSearchParam(searchParams.transactionSource), transactionSourceSchema),
    status: normalizeEnumValue(readSingleSearchParam(searchParams.transactionStatus), transactionStatusSchema),
    dateFrom: hasReversedDateRange ? null : dateFrom,
    dateTo: hasReversedDateRange ? null : dateTo,
    page: normalizePage(readSingleSearchParam(searchParams.transactionPage)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.transactionPageSize)),
  };
}

export function parseAdminUserLogsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AdminUserLogsRouteState {
  return {
    tab: parseActiveTab(readSingleSearchParam(searchParams.tab)),
    login: parseLoginFilters(searchParams),
    extension: parseExtensionFilters(searchParams),
    transactions: parseTransactionFilters(searchParams),
  };
}
