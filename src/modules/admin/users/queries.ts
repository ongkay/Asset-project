import "server-only";

import { derivePackageSummaryFromAccessKeys, type PackageSummary } from "@/modules/packages/types";

import {
  listAdminUserActiveAssetsByUserId,
  listAdminUserExtensionTracksByUserId,
  listAdminUserLoginLogsByUserId,
  listAdminUserSubscriptionsByUserId,
  listAdminUserSubscriptionsByUserIds,
  listAdminUserTableProfilesBatch,
  listAdminUserTableProfilesPage,
  listAdminUserTransactionsByUserId,
  readAdminUserProfileByUserId,
  type AdminUserProfileRepositoryRow,
  type AdminUserSubscriptionRepositoryRow,
} from "./repositories";
import { adminUserDetailInputSchema, adminUsersTableFilterSchema } from "./schemas";

import type { SubscriptionStatus } from "@/modules/subscriptions/types";

import type { AdminUserDetailPayload, AdminUsersTableFilters, AdminUsersTableResult } from "./types";

const TABLE_FILTER_BATCH_MULTIPLIER = 2;

function toTimestamp(value: string) {
  return new Date(value).getTime();
}

function compareDescending(leftValue: string, rightValue: string) {
  return toTimestamp(rightValue) - toTimestamp(leftValue);
}

function compareTextDescending(leftValue: string, rightValue: string) {
  return rightValue.localeCompare(leftValue);
}

function isRunningSubscription(subscription: AdminUserSubscriptionRepositoryRow, nowTimestamp: number) {
  return ["active", "processed"].includes(subscription.status) && toTimestamp(subscription.end_at) > nowTimestamp;
}

function compareSelectedSubscriptionRows(
  leftRow: AdminUserSubscriptionRepositoryRow,
  rightRow: AdminUserSubscriptionRepositoryRow,
) {
  return (
    compareDescending(leftRow.end_at, rightRow.end_at) ||
    compareDescending(leftRow.start_at, rightRow.start_at) ||
    compareDescending(leftRow.created_at, rightRow.created_at) ||
    compareTextDescending(leftRow.id, rightRow.id)
  );
}

function selectCurrentRunningSubscription(rows: AdminUserSubscriptionRepositoryRow[], nowTimestamp: number) {
  return (
    rows.filter((row) => isRunningSubscription(row, nowTimestamp)).sort(compareSelectedSubscriptionRows)[0] ?? null
  );
}

function selectTableSubscription(rows: AdminUserSubscriptionRepositoryRow[], nowTimestamp: number) {
  const currentRunningSubscription = selectCurrentRunningSubscription(rows, nowTimestamp);

  if (currentRunningSubscription) {
    return currentRunningSubscription;
  }

  return [...rows].sort(compareSelectedSubscriptionRows)[0] ?? null;
}

function groupSubscriptionsByUserId(rows: AdminUserSubscriptionRepositoryRow[]) {
  return rows.reduce<Map<string, AdminUserSubscriptionRepositoryRow[]>>((result, row) => {
    const existingRows = result.get(row.user_id);

    if (existingRows) {
      existingRows.push(row);
      return result;
    }

    result.set(row.user_id, [row]);
    return result;
  }, new Map());
}

function getPackageSummaryOrNone(
  accessKeys: AdminUserSubscriptionRepositoryRow["access_keys_json"],
): PackageSummary | "none" {
  return derivePackageSummaryFromAccessKeys(accessKeys) ?? "none";
}

function mapAdminUserTableRow(
  profile: AdminUserProfileRepositoryRow,
  subscriptionsByUserId: Map<string, AdminUserSubscriptionRepositoryRow[]>,
  nowTimestamp: number,
) {
  const userSubscriptions = subscriptionsByUserId.get(profile.user_id) ?? [];
  const selectedSubscription = selectTableSubscription(userSubscriptions, nowTimestamp);
  const currentRunningSubscription = selectCurrentRunningSubscription(userSubscriptions, nowTimestamp);

  return {
    userId: profile.user_id,
    email: profile.email,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    publicId: profile.public_id,
    role: profile.role,
    isBanned: profile.is_banned,
    subscriptionId: selectedSubscription?.id ?? null,
    subscriptionStatus: (selectedSubscription?.status as SubscriptionStatus | null) ?? null,
    subscriptionEndAt: currentRunningSubscription?.end_at ?? selectedSubscription?.end_at ?? null,
    activePackageSummary: currentRunningSubscription
      ? getPackageSummaryOrNone(currentRunningSubscription.access_keys_json)
      : "none",
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

async function collectFilteredAdminUserRows(input: {
  nowTimestamp: number;
  page: number;
  pageSize: number;
  role: AdminUsersTableFilters["role"];
  search: string | null;
  subscriptionStatus: AdminUsersTableFilters["subscriptionStatus"];
  packageSummary: AdminUsersTableFilters["packageSummary"];
}) {
  const pageStart = (input.page - 1) * input.pageSize;
  const candidateBatchSize = Math.max(input.pageSize * TABLE_FILTER_BATCH_MULTIPLIER, TABLE_FILTER_BATCH_MULTIPLIER);
  const pageItems: ReturnType<typeof mapAdminUserTableRow>[] = [];
  let matchedCount = 0;
  let offset = 0;

  while (true) {
    const candidateProfiles = await listAdminUserTableProfilesBatch({
      limit: candidateBatchSize,
      offset,
      role: input.role,
      search: input.search,
    });

    if (candidateProfiles.length === 0) {
      break;
    }

    const subscriptionsByUserId = groupSubscriptionsByUserId(
      await listAdminUserSubscriptionsByUserIds(candidateProfiles.map((profile) => profile.user_id)),
    );
    const matchedBatchRows = candidateProfiles
      .map((profile) => mapAdminUserTableRow(profile, subscriptionsByUserId, input.nowTimestamp))
      .filter((row) => {
        if (input.subscriptionStatus && row.subscriptionStatus !== input.subscriptionStatus) {
          return false;
        }

        if (input.packageSummary && row.activePackageSummary !== input.packageSummary) {
          return false;
        }

        return true;
      });

    for (const row of matchedBatchRows) {
      if (matchedCount >= pageStart && pageItems.length < input.pageSize) {
        pageItems.push(row);
      }

      matchedCount += 1;
    }

    offset += candidateProfiles.length;

    if (candidateProfiles.length < candidateBatchSize) {
      break;
    }
  }

  return {
    items: pageItems,
    totalCount: matchedCount,
  };
}

export async function getAdminUsersTablePage(input: AdminUsersTableFilters): Promise<AdminUsersTableResult> {
  const parsedInput = adminUsersTableFilterSchema.parse(input);
  const nowTimestamp = Date.now();
  const requiresSubscriptionFiltering = parsedInput.subscriptionStatus !== null || parsedInput.packageSummary !== null;

  if (!requiresSubscriptionFiltering) {
    const { profiles, totalCount } = await listAdminUserTableProfilesPage({
      page: parsedInput.page,
      pageSize: parsedInput.pageSize,
      role: parsedInput.role,
      search: parsedInput.search,
    });
    const subscriptionsByUserId = groupSubscriptionsByUserId(
      await listAdminUserSubscriptionsByUserIds(profiles.map((profile) => profile.user_id)),
    );

    return {
      items: profiles.map((profile) => mapAdminUserTableRow(profile, subscriptionsByUserId, nowTimestamp)),
      page: parsedInput.page,
      pageSize: parsedInput.pageSize,
      totalCount,
    };
  }
  const { items, totalCount } = await collectFilteredAdminUserRows({
    nowTimestamp,
    page: parsedInput.page,
    pageSize: parsedInput.pageSize,
    role: parsedInput.role,
    search: parsedInput.search,
    subscriptionStatus: parsedInput.subscriptionStatus,
    packageSummary: parsedInput.packageSummary,
  });

  return {
    items,
    page: parsedInput.page,
    pageSize: parsedInput.pageSize,
    totalCount,
  };
}

export async function getAdminUserDetail(input: { userId: string }): Promise<AdminUserDetailPayload> {
  const parsedInput = adminUserDetailInputSchema.parse(input);
  const nowTimestamp = Date.now();
  const [profile, subscriptions, activeAssets, transactions, loginLogs, extensionTracks] = await Promise.all([
    readAdminUserProfileByUserId(parsedInput.userId),
    listAdminUserSubscriptionsByUserId(parsedInput.userId),
    listAdminUserActiveAssetsByUserId(parsedInput.userId),
    listAdminUserTransactionsByUserId(parsedInput.userId),
    listAdminUserLoginLogsByUserId(parsedInput.userId),
    listAdminUserExtensionTracksByUserId(parsedInput.userId),
  ]);

  if (!profile) {
    throw new Error("User not found.");
  }

  const currentRunningSubscription = selectCurrentRunningSubscription(subscriptions, nowTimestamp);

  return {
    profile: {
      userId: profile.user_id,
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatar_url,
      publicId: profile.public_id,
      role: profile.role,
      isBanned: profile.is_banned,
      banReason: profile.ban_reason,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    },
    currentSubscription: currentRunningSubscription
      ? {
          subscriptionId: currentRunningSubscription.id,
          packageId: currentRunningSubscription.package_id,
          packageName: currentRunningSubscription.package_name,
          status: currentRunningSubscription.status,
          startAt: currentRunningSubscription.start_at,
          endAt: currentRunningSubscription.end_at,
          packageSummary: getPackageSummaryOrNone(currentRunningSubscription.access_keys_json),
        }
      : {
          subscriptionId: null,
          packageId: null,
          packageName: null,
          status: null,
          startAt: null,
          endAt: null,
          packageSummary: "none",
        },
    activeAssets: activeAssets
      .map((row) => ({
        assetId: row.asset_id,
        subscriptionId: row.subscription_id,
        accessKey: row.access_key,
        platform: row.platform,
        assetType: row.asset_type,
        note: row.note,
        expiresAt: row.expires_at,
        subscriptionStatus: row.subscription_status,
        subscriptionEndAt: row.subscription_end_at,
      }))
      .sort(
        (leftRow, rightRow) =>
          compareDescending(rightRow.expiresAt, leftRow.expiresAt) ||
          leftRow.accessKey.localeCompare(rightRow.accessKey),
      ),
    transactions: transactions.map((row) => ({
      transactionId: row.transaction_id,
      packageId: row.package_id,
      packageName: row.package_name,
      source: row.source,
      status: row.status,
      amountRp: row.amount_rp,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paidAt: row.paid_at,
    })),
    loginLogs: loginLogs.map((row) => ({
      loginLogId: row.id,
      userId: row.user_id,
      email: row.email,
      isSuccess: row.is_success,
      failureReason: row.failure_reason,
      ipAddress: row.ip_address,
      browser: row.browser,
      os: row.os,
      createdAt: row.created_at,
    })),
    extensionTracks: extensionTracks.map((row) => ({
      extensionTrackId: row.id,
      extensionId: row.extension_id,
      deviceId: row.device_id,
      extensionVersion: row.extension_version,
      ipAddress: row.ip_address,
      city: row.city,
      country: row.country,
      browser: row.browser,
      os: row.os,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
    })),
  };
}
