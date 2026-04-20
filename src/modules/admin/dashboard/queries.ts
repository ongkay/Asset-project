import "server-only";

import { z } from "zod";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { derivePackageSummaryFromAccessKeys, PACKAGE_ACCESS_KEYS } from "@/modules/packages/types";
import { validateActiveAppSession } from "@/modules/sessions/services";

import { adminDashboardFilterSchema, resolveAdminDashboardRange } from "./schemas";

import type { AdminDashboardFilters, AdminDashboardSnapshot, AdminDashboardStats } from "./types";

const isoDateTimeSchema = z.iso.datetime({ offset: true });

const adminDashboardStatsSchema = z.object({
  from: isoDateTimeSchema,
  to: isoDateTimeSchema,
  totalAssets: z.number().int().nonnegative(),
  totalMembers: z.number().int().nonnegative(),
  totalMixedSubscriptions: z.number().int().nonnegative(),
  totalPrivateSubscriptions: z.number().int().nonnegative(),
  totalShareSubscriptions: z.number().int().nonnegative(),
  totalSubscribedMembers: z.number().int().nonnegative(),
  totalSuccessAmountRp: z.number().int().nonnegative(),
});

const adminDashboardTransactionRowSchema = z.object({
  user_id: z.string().min(1),
  amount_rp: z.number().int().nonnegative(),
  created_at: isoDateTimeSchema,
  status: z.string().min(1),
});

const adminDashboardProfileRowSchema = z.object({
  user_id: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  avatar_url: z.string().url().nullable().or(z.null()),
  created_at: isoDateTimeSchema,
  role: z.literal("member"),
});

const adminDashboardCurrentSubscriptionRowSchema = z.object({
  user_id: z.string().min(1),
  package_name: z.string().min(1),
  access_keys_json: z.array(z.enum(PACKAGE_ACCESS_KEYS)).min(1),
  status: z.enum(["active", "processed", "expired", "canceled"]),
  start_at: isoDateTimeSchema,
  end_at: isoDateTimeSchema,
});

const adminDashboardAssetRowSchema = z.object({
  id: z.string().min(1),
});

const adminDashboardRecentUserRowSchema = z.object({
  user_id: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  last_seen_at: z.string().min(1),
});

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Failed to load admin dashboard.";
}

function createDashboardError(error: unknown) {
  return error instanceof Error ? error : new Error(getDashboardErrorMessage(error));
}

function parseArrayRows<TRow>(rows: unknown, schema: z.ZodType<TRow>): TRow[] {
  return z.array(schema).parse(rows ?? []);
}

function formatBucketLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });

  return `${day} ${month}`;
}

function getUtcBucketKey(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}

export function buildAdminDashboardDailySeries(fromIso: string, toIso: string) {
  const startDate = new Date(fromIso);
  const endDate = new Date(toIso);
  const series = [];

  for (
    let currentDate = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0, 0),
    );
    currentDate.getTime() <= endDate.getTime();
    currentDate = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate() + 1, 0, 0, 0, 0),
    )
  ) {
    series.push({
      bucketKey: getUtcBucketKey(currentDate.toISOString()),
      bucketLabel: formatBucketLabel(currentDate),
      amountRp: 0,
      successCount: 0,
      newMembers: 0,
      subscribedMembers: 0,
    });
  }

  return series;
}

function isCurrentSubscription(subscription: z.infer<typeof adminDashboardCurrentSubscriptionRowSchema>, now: Date) {
  return (
    (subscription.status === "active" || subscription.status === "processed") &&
    new Date(subscription.end_at).getTime() > now.getTime()
  );
}

function buildAdminDashboardSummary(input: {
  assets: z.infer<typeof adminDashboardAssetRowSchema>[];
  currentSubscriptions: z.infer<typeof adminDashboardCurrentSubscriptionRowSchema>[];
  memberProfiles: z.infer<typeof adminDashboardProfileRowSchema>[];
  transactions: z.infer<typeof adminDashboardTransactionRowSchema>[];
}) {
  const subscriptionComposition = {
    private: 0,
    share: 0,
    mixed: 0,
  };

  for (const subscription of input.currentSubscriptions) {
    const summary = derivePackageSummaryFromAccessKeys(subscription.access_keys_json);

    if (!summary) {
      continue;
    }

    subscriptionComposition[summary] += 1;
  }

  return {
    summary: {
      totalMembers: input.memberProfiles.length,
      totalSubscribedMembers: new Set(input.currentSubscriptions.map((subscription) => subscription.user_id)).size,
      totalAssets: input.assets.length,
      totalSuccessAmountRp: input.transactions.reduce((total, transaction) => total + transaction.amount_rp, 0),
    },
    subscriptionComposition,
  };
}

async function assertAdminDashboardAccess() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    throw new Error("An active app session is required.");
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile || profile.role !== "admin") {
    throw new Error("Admin role is required to read dashboard stats.");
  }
}

export async function getAdminDashboardStats(input: { from?: Date; to?: Date } = {}): Promise<AdminDashboardStats> {
  await assertAdminDashboardAccess();

  const database = createInsForgeAdminDatabase();
  const { data, error } = await database.rpc("get_admin_dashboard_stats", {
    p_from: input?.from?.toISOString(),
    p_to: input?.to?.toISOString(),
  });

  if (error) {
    throw createDashboardError(error);
  }

  return adminDashboardStatsSchema.parse(data);
}

export async function getAdminDashboardSnapshot(input: AdminDashboardFilters): Promise<AdminDashboardSnapshot> {
  const parsedFilters = adminDashboardFilterSchema.parse(input);
  const range = resolveAdminDashboardRange(parsedFilters);
  const now = new Date();

  await assertAdminDashboardAccess();

  const database = createInsForgeAdminDatabase();
  const [transactionsResult, profilesResult, subscriptionsResult, assetsResult] = await Promise.all([
    database
      .from("transactions")
      .select("user_id, amount_rp, created_at, status")
      .eq("status", "success")
      .gte("created_at", range.fromIso)
      .lte("created_at", range.toIso)
      .order("created_at"),
    database
      .from("profiles")
      .select("user_id, username, email, avatar_url, created_at, role")
      .eq("role", "member")
      .order("created_at"),
    database.from("subscriptions").select("user_id, package_name, access_keys_json, status, start_at, end_at"),
    database.from("assets").select("id"),
  ]);

  if (transactionsResult.error) {
    throw createDashboardError(transactionsResult.error);
  }

  if (profilesResult.error) {
    throw createDashboardError(profilesResult.error);
  }

  if (subscriptionsResult.error) {
    throw createDashboardError(subscriptionsResult.error);
  }

  if (assetsResult.error) {
    throw createDashboardError(assetsResult.error);
  }

  const transactions = parseArrayRows(transactionsResult.data, adminDashboardTransactionRowSchema);
  const memberProfiles = parseArrayRows(profilesResult.data, adminDashboardProfileRowSchema);
  const memberProfileByUserId = new Map(memberProfiles.map((profile) => [profile.user_id, profile]));
  const memberSubscriptions = parseArrayRows(
    subscriptionsResult.data,
    adminDashboardCurrentSubscriptionRowSchema,
  ).filter((subscription) => memberProfileByUserId.has(subscription.user_id));
  const currentSubscriptions = memberSubscriptions.filter((subscription) => isCurrentSubscription(subscription, now));
  const assets = parseArrayRows(assetsResult.data, adminDashboardAssetRowSchema);
  let recentUsers: z.infer<typeof adminDashboardRecentUserRowSchema>[] = [];

  if (memberProfiles.length > 0) {
    const recentUsersResult = await database
      .from("v_live_users")
      .select("user_id, username, email, last_seen_at")
      .order("last_seen_at", { ascending: false });

    if (recentUsersResult.error) {
      throw createDashboardError(recentUsersResult.error);
    }

    recentUsers = parseArrayRows(recentUsersResult.data, adminDashboardRecentUserRowSchema)
      .filter((row) => isoDateTimeSchema.safeParse(row.last_seen_at).success)
      .filter((row) => memberProfileByUserId.has(row.user_id))
      .slice(0, 50);
  }

  const summaryPayload = buildAdminDashboardSummary({
    assets,
    currentSubscriptions,
    memberProfiles,
    transactions,
  });

  const series = buildAdminDashboardDailySeries(range.fromIso, range.toIso);
  const seriesByBucketKey = new Map(series.map((point) => [point.bucketKey, point]));

  for (const transaction of transactions) {
    const bucket = seriesByBucketKey.get(getUtcBucketKey(transaction.created_at));

    if (!bucket) {
      continue;
    }

    bucket.amountRp += transaction.amount_rp;
    bucket.successCount += 1;
  }

  for (const profile of memberProfiles) {
    const bucket = seriesByBucketKey.get(getUtcBucketKey(profile.created_at));

    if (!bucket) {
      continue;
    }

    bucket.newMembers += 1;
  }

  for (const point of series) {
    const bucketEndIso = `${point.bucketKey}T23:59:59.999Z`;
    const subscribedUserIds = new Set(
      memberSubscriptions
        .filter((subscription) => subscription.start_at <= bucketEndIso && subscription.end_at >= bucketEndIso)
        .map((subscription) => subscription.user_id),
    );

    point.subscribedMembers = subscribedUserIds.size;
  }

  const packageNameByUserId = new Map(
    currentSubscriptions.map((subscription) => [subscription.user_id, subscription.package_name]),
  );

  return {
    summary: summaryPayload.summary,
    salesSeries: series.map(({ bucketKey, bucketLabel, amountRp }) => ({ bucketKey, bucketLabel, amountRp })),
    memberGrowthSeries: series.map(({ bucketKey, bucketLabel, newMembers, subscribedMembers }) => ({
      bucketKey,
      bucketLabel,
      newMembers,
      subscribedMembers,
    })),
    transactionSeries: series.map(({ bucketKey, bucketLabel, successCount }) => ({
      bucketKey,
      bucketLabel,
      successCount,
    })),
    subscriptionComposition: summaryPayload.subscriptionComposition,
    recentUsers: recentUsers.map((row) => ({
      userId: row.user_id,
      username: row.username,
      email: row.email,
      avatarUrl: memberProfileByUserId.get(row.user_id)?.avatar_url ?? null,
      role: "member",
      activePackageName: packageNameByUserId.get(row.user_id) ?? null,
      lastSeenAt: row.last_seen_at,
    })),
    range,
  };
}
