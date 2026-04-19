import "server-only";

import {
  listAdminAssignmentSnapshotRowsBySubscriptionId,
  listAdminExtensionTrackFilterValues,
  listAdminExtensionTrackPageRows,
  listAdminLoginHistoryOsValues,
  listAdminLoginHistoryPageRows,
  listAdminTransactionPageRows,
  readAdminTransactionRepositoryRowById,
  sumAdminSuccessfulTransactionAmount,
} from "./repositories";
import {
  adminExtensionTrackFilterSchema,
  adminLoginHistoryFilterSchema,
  adminTransactionDetailInputSchema,
  adminTransactionsFilterSchema,
} from "./schemas";

import type {
  AdminAssignmentSnapshotRow,
  AdminExtensionTrackPage,
  AdminExtensionTrackRow,
  AdminExtensionTrackRowUser,
  AdminLoginHistoryPage,
  AdminLoginHistoryRow,
  AdminLoginHistoryRowUser,
  AdminTransactionDetail,
  AdminTransactionRow,
  AdminTransactionRowUser,
  AdminTransactionsPage,
} from "./types";

function mapTransactionRowUser(input: {
  avatar_url: string | null;
  email: string;
  public_id: string;
  user_id: string;
  username: string;
}): AdminTransactionRowUser {
  return {
    userId: input.user_id,
    username: input.username,
    email: input.email,
    avatarUrl: input.avatar_url,
    publicId: input.public_id,
  };
}

function mapExtensionTrackRowUser(input: {
  avatar_url: string | null;
  email: string;
  public_id: string;
  user_id: string;
  username: string;
}): AdminExtensionTrackRowUser {
  return {
    userId: input.user_id,
    username: input.username,
    email: input.email,
    avatarUrl: input.avatar_url,
    publicId: input.public_id,
  };
}

function mapLoginHistoryRowUser(input: {
  avatar_url: string | null;
  email: string;
  profile_email: string | null;
  public_id: string | null;
  user_id: string | null;
  username: string | null;
}): AdminLoginHistoryRowUser {
  const isResolved = Boolean(input.user_id && input.username && input.profile_email && input.public_id);

  return {
    userId: input.user_id,
    username: isResolved ? input.username : null,
    email: isResolved ? (input.profile_email ?? input.email) : input.email,
    avatarUrl: isResolved ? input.avatar_url : null,
    publicId: isResolved ? input.public_id : null,
    isResolved,
  };
}

function mapLoginHistoryRow(input: {
  avatar_url: string | null;
  browser: string | null;
  created_at: string;
  email: string;
  failure_reason: string | null;
  id: string;
  ip_address: string;
  is_success: boolean;
  os: string | null;
  profile_email: string | null;
  public_id: string | null;
  user_id: string | null;
  username: string | null;
}): AdminLoginHistoryRow {
  return {
    loginLogId: input.id,
    user: mapLoginHistoryRowUser(input),
    ipAddress: input.ip_address,
    browser: input.browser,
    os: input.os,
    loginTime: input.created_at,
    isSuccess: input.is_success,
    failureReason: input.failure_reason,
  };
}

function mapExtensionTrackRow(input: {
  avatar_url: string | null;
  browser: string | null;
  city: string | null;
  country: string | null;
  device_id: string;
  email: string;
  extension_id: string;
  extension_version: string;
  first_seen_at: string;
  id: string;
  ip_address: string;
  last_seen_at: string;
  os: string | null;
  public_id: string;
  user_id: string;
  username: string;
}): AdminExtensionTrackRow {
  return {
    extensionTrackId: input.id,
    user: mapExtensionTrackRowUser(input),
    ipAddress: input.ip_address,
    city: input.city,
    country: input.country,
    browser: input.browser,
    os: input.os,
    extensionVersion: input.extension_version,
    deviceId: input.device_id,
    extensionId: input.extension_id,
    firstSeenAt: input.first_seen_at,
    lastSeenAt: input.last_seen_at,
  };
}

function mapTransactionRow(input: {
  amount_rp: number;
  avatar_url: string | null;
  created_at: string;
  email: string;
  id: string;
  package_id: string;
  package_name: string;
  paid_at: string | null;
  public_id: string;
  source: AdminTransactionRow["source"];
  status: AdminTransactionRow["status"];
  subscription_id: string | null;
  updated_at: string;
  user_id: string;
  username: string;
}): AdminTransactionRow {
  return {
    transactionId: input.id,
    subscriptionId: input.subscription_id,
    user: mapTransactionRowUser(input),
    packageId: input.package_id,
    packageName: input.package_name,
    source: input.source,
    status: input.status,
    amountRp: input.amount_rp,
    createdAt: input.created_at,
    updatedAt: input.updated_at,
    paidAt: input.paid_at,
  };
}

function mapAssignmentSnapshotRow(input: {
  access_key: string;
  asset_deleted_at: string | null;
  asset_expires_at: string;
  asset_id: string | null;
  asset_note: string | null;
  asset_platform: AdminAssignmentSnapshotRow["platform"];
  asset_type: AdminAssignmentSnapshotRow["assetType"];
  assigned_at: string;
  id: string;
  original_asset_id: string;
  revoke_reason: string | null;
  revoked_at: string | null;
  subscription_id: string;
}): AdminAssignmentSnapshotRow {
  return {
    assignmentId: input.id,
    subscriptionId: input.subscription_id,
    assetId: input.asset_id,
    originalAssetId: input.original_asset_id,
    accessKey: input.access_key,
    platform: input.asset_platform,
    assetType: input.asset_type,
    assetNote: input.asset_note,
    assetExpiresAt: input.asset_expires_at,
    assignedAt: input.assigned_at,
    revokedAt: input.revoked_at,
    revokeReason: input.revoke_reason,
    assetDeletedAt: input.asset_deleted_at,
  };
}

export async function getAdminLoginHistoryPage(
  input: Parameters<typeof adminLoginHistoryFilterSchema.parse>[0],
): Promise<AdminLoginHistoryPage> {
  const parsedInput = adminLoginHistoryFilterSchema.parse(input);
  const [{ rows, totalCount }, availableOsValues] = await Promise.all([
    listAdminLoginHistoryPageRows(parsedInput),
    listAdminLoginHistoryOsValues(),
  ]);

  return {
    items: rows.map((row) => mapLoginHistoryRow(row)),
    page: parsedInput.page,
    pageSize: parsedInput.pageSize,
    totalCount,
    availableOsValues,
  };
}

export async function getAdminExtensionTrackPage(
  input: Parameters<typeof adminExtensionTrackFilterSchema.parse>[0],
): Promise<AdminExtensionTrackPage> {
  const parsedInput = adminExtensionTrackFilterSchema.parse(input);
  const [{ rows, totalCount }, filterValues] = await Promise.all([
    listAdminExtensionTrackPageRows(parsedInput),
    listAdminExtensionTrackFilterValues(),
  ]);

  return {
    items: rows.map((row) => mapExtensionTrackRow(row)),
    page: parsedInput.page,
    pageSize: parsedInput.pageSize,
    totalCount,
    availableBrowsers: filterValues.browsers,
    availableOsValues: filterValues.osValues,
  };
}

export async function getAdminTransactionsPage(
  input: Parameters<typeof adminTransactionsFilterSchema.parse>[0],
): Promise<AdminTransactionsPage> {
  const parsedInput = adminTransactionsFilterSchema.parse(input);
  const [{ rows, totalCount }, revenueSummary] = await Promise.all([
    listAdminTransactionPageRows(parsedInput),
    sumAdminSuccessfulTransactionAmount({
      search: parsedInput.search,
      source: parsedInput.source,
      status: parsedInput.status,
      dateFrom: parsedInput.dateFrom,
      dateTo: parsedInput.dateTo,
    }),
  ]);

  return {
    items: rows.map((row) => mapTransactionRow(row)),
    page: parsedInput.page,
    pageSize: parsedInput.pageSize,
    totalCount,
    revenueSummary,
  };
}

export async function getAdminTransactionDetail(
  input: Parameters<typeof adminTransactionDetailInputSchema.parse>[0],
): Promise<AdminTransactionDetail> {
  const parsedInput = adminTransactionDetailInputSchema.parse(input);
  const transactionRow = await readAdminTransactionRepositoryRowById(parsedInput.transactionId);

  if (!transactionRow) {
    throw new Error("Transaction not found.");
  }

  const assignmentHistory = transactionRow.subscription_id
    ? (await listAdminAssignmentSnapshotRowsBySubscriptionId(transactionRow.subscription_id)).map((row) =>
        mapAssignmentSnapshotRow(row),
      )
    : [];

  return {
    transactionId: transactionRow.id,
    subscriptionId: transactionRow.subscription_id,
    user: mapTransactionRowUser(transactionRow),
    packageName: transactionRow.package_name,
    source: transactionRow.source,
    status: transactionRow.status,
    amountRp: transactionRow.amount_rp,
    createdAt: transactionRow.created_at,
    updatedAt: transactionRow.updated_at,
    paidAt: transactionRow.paid_at,
    assignmentHistory,
  };
}
