import { z } from "zod";

import type { PackageSummary } from "@/modules/packages/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";

import type { AdminUsersTableFilters } from "./types";

const ADMIN_USER_ROLES = ["admin", "member"] as const;
const ADMIN_USER_SUBSCRIPTION_STATUSES = [
  "active",
  "processed",
  "expired",
  "canceled",
] as const satisfies readonly SubscriptionStatus[];
const ADMIN_USER_PACKAGE_SUMMARIES = ["private", "share", "mixed", "none"] as const satisfies readonly (
  | PackageSummary
  | "none"
)[];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const adminUserRoleSchema = z.enum(ADMIN_USER_ROLES, {
  error: "Role is invalid.",
});

const adminUserSubscriptionStatusSchema = z.enum(ADMIN_USER_SUBSCRIPTION_STATUSES, {
  error: "Subscription status is invalid.",
});

const adminUserPackageSummarySchema = z.enum(ADMIN_USER_PACKAGE_SUMMARIES, {
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
  const parsedPage = Number.parseInt(pageValue ?? String(DEFAULT_PAGE), 10);
  return Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : DEFAULT_PAGE;
}

function normalizePageSize(pageSizeValue: string | undefined) {
  const parsedPageSize = Number.parseInt(pageSizeValue ?? String(DEFAULT_PAGE_SIZE), 10);

  return Number.isFinite(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= MAX_PAGE_SIZE
    ? parsedPageSize
    : DEFAULT_PAGE_SIZE;
}

function normalizeRole(roleValue: string | undefined): AdminUsersTableFilters["role"] {
  const parsedRole = adminUserRoleSchema.safeParse(roleValue);
  return parsedRole.success ? parsedRole.data : null;
}

function normalizeSubscriptionStatus(
  subscriptionStatusValue: string | undefined,
): AdminUsersTableFilters["subscriptionStatus"] {
  const parsedSubscriptionStatus = adminUserSubscriptionStatusSchema.safeParse(subscriptionStatusValue);
  return parsedSubscriptionStatus.success ? parsedSubscriptionStatus.data : null;
}

function normalizePackageSummary(packageSummaryValue: string | undefined): AdminUsersTableFilters["packageSummary"] {
  const parsedPackageSummary = adminUserPackageSummarySchema.safeParse(packageSummaryValue);
  return parsedPackageSummary.success ? parsedPackageSummary.data : null;
}

export const adminUserDetailInputSchema = z.object({
  userId: z.string({ error: "User ID is required." }).trim().min(1, "User ID is required."),
});

export const adminUsersTableFilterSchema = z.object({
  search: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional()
    .default(null),
  role: adminUserRoleSchema.nullable().optional().default(null),
  subscriptionStatus: adminUserSubscriptionStatusSchema.nullable().optional().default(null),
  packageSummary: adminUserPackageSummarySchema.nullable().optional().default(null),
  page: z.number({ error: "Page must be a number." }).int().min(1).default(DEFAULT_PAGE),
  pageSize: z
    .number({ error: "Page size must be a number." })
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
}) satisfies z.ZodType<AdminUsersTableFilters>;

export function parseAdminUsersTableSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AdminUsersTableFilters {
  return {
    search: normalizeSearch(readSingleSearchParam(searchParams.search)),
    role: normalizeRole(readSingleSearchParam(searchParams.role)),
    subscriptionStatus: normalizeSubscriptionStatus(readSingleSearchParam(searchParams.subscriptionStatus)),
    packageSummary: normalizePackageSummary(readSingleSearchParam(searchParams.packageSummary)),
    page: normalizePage(readSingleSearchParam(searchParams.page)),
    pageSize: normalizePageSize(readSingleSearchParam(searchParams.pageSize)),
  };
}
