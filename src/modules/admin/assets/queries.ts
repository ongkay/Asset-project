import "server-only";

import {
  getAssetById,
  getAssetStatusById,
  listActiveAssetIdsByUserIds,
  listActiveAssignmentsForAsset,
  listAssetIdsByPlatformOrNoteSearch,
  listAssetIdsByStatusFilter,
  listAssetsPage,
  listAssetStatusesByIds,
  listProfilesByUserIds,
  listSubscriptionsByIds,
  listUserIdsByIdentitySearch,
} from "@/modules/assets/repositories";
import type { AssetStatus } from "@/modules/assets/types";

import { assetTableFilterSchema } from "./schemas";

import type { AssetEditorData, AssetTableFilters, AssetTableResult } from "./types";

function toUtcStartOfDayIso(dateOnly: string) {
  return `${dateOnly}T00:00:00.000Z`;
}

function toUtcEndOfDayIso(dateOnly: string) {
  return `${dateOnly}T23:59:59.999Z`;
}

function intersectAssetIds(leftAssetIds: string[] | null, rightAssetIds: string[] | null): string[] | null {
  if (leftAssetIds === null) {
    return rightAssetIds;
  }

  if (rightAssetIds === null) {
    return leftAssetIds;
  }

  const rightSet = new Set(rightAssetIds);
  return leftAssetIds.filter((assetId) => rightSet.has(assetId));
}

function mergeAssetIds(leftAssetIds: string[], rightAssetIds: string[]) {
  return [...new Set([...leftAssetIds, ...rightAssetIds])];
}

function isNotNull<TValue>(value: TValue | null): value is TValue {
  return value !== null;
}

function deriveAssetStatusFallback(input: {
  disabledAt: string | null;
  expiresAt: string;
  assetType: "private" | "share";
  totalUsed: number;
}): AssetStatus {
  if (input.disabledAt) {
    return "disabled";
  }

  if (new Date(input.expiresAt).getTime() < Date.now()) {
    return "expired";
  }

  if (input.assetType === "private" && input.totalUsed > 0) {
    return "assigned";
  }

  return "available";
}

async function resolveSearchMatchedAssetIds(search: string | null): Promise<string[] | null> {
  if (!search) {
    return null;
  }

  const [assetIdsByAssetFields, userIdsByIdentity] = await Promise.all([
    listAssetIdsByPlatformOrNoteSearch(search),
    listUserIdsByIdentitySearch(search),
  ]);

  const assetIdsByUserIdentity = await listActiveAssetIdsByUserIds(userIdsByIdentity);
  return mergeAssetIds(assetIdsByAssetFields, assetIdsByUserIdentity);
}

export async function getAssetTablePage(input: AssetTableFilters): Promise<AssetTableResult> {
  const parsedFilters = assetTableFilterSchema.parse(input);
  const expiresFromIso = parsedFilters.expiresFrom ? toUtcStartOfDayIso(parsedFilters.expiresFrom) : null;
  const expiresToIso = parsedFilters.expiresTo ? toUtcEndOfDayIso(parsedFilters.expiresTo) : null;

  const statusFilteredAssetIds = parsedFilters.status
    ? await listAssetIdsByStatusFilter({
        status: parsedFilters.status,
        assetType: parsedFilters.assetType,
        expiresFromIso,
        expiresToIso,
      })
    : null;

  const searchMatchedAssetIds = await resolveSearchMatchedAssetIds(parsedFilters.search);
  const filteredAssetIds = intersectAssetIds(statusFilteredAssetIds, searchMatchedAssetIds);

  const assetsPage = await listAssetsPage({
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    assetType: parsedFilters.assetType,
    expiresFromIso,
    expiresToIso,
    filteredAssetIds,
  });

  if (assetsPage.items.length === 0) {
    return {
      items: [],
      page: parsedFilters.page,
      pageSize: parsedFilters.pageSize,
      totalCount: assetsPage.totalCount,
    };
  }

  const statuses = await listAssetStatusesByIds(assetsPage.items.map((asset) => asset.id));
  const statusByAssetId = new Map(statuses.map((status) => [status.id, status]));

  return {
    items: assetsPage.items.map((asset) => {
      const statusRow = statusByAssetId.get(asset.id);
      const totalUsed = statusRow?.totalUsed ?? 0;
      const status =
        statusRow?.status ??
        deriveAssetStatusFallback({
          disabledAt: asset.disabledAt,
          expiresAt: asset.expiresAt,
          assetType: asset.assetType,
          totalUsed,
        });

      return {
        id: asset.id,
        platform: asset.platform,
        assetType: asset.assetType,
        note: asset.note,
        expiresAt: asset.expiresAt,
        disabledAt: asset.disabledAt,
        status,
        totalUsed,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      };
    }),
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    totalCount: assetsPage.totalCount,
  };
}

export async function getAssetEditorData(assetId: string): Promise<AssetEditorData | null> {
  const [asset, status, activeAssignments] = await Promise.all([
    getAssetById(assetId),
    getAssetStatusById(assetId),
    listActiveAssignmentsForAsset(assetId),
  ]);

  if (!asset) {
    return null;
  }

  const userIds = [...new Set(activeAssignments.map((assignment) => assignment.userId))];
  const subscriptionIds = [...new Set(activeAssignments.map((assignment) => assignment.subscriptionId))];

  const [profiles, subscriptions] = await Promise.all([
    listProfilesByUserIds(userIds),
    listSubscriptionsByIds(subscriptionIds),
  ]);

  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const subscriptionById = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));

  const mappedUsers = activeAssignments
    .map((assignment) => {
      const profile = profileByUserId.get(assignment.userId);

      if (!profile) {
        return null;
      }

      return {
        userId: profile.userId,
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        accessKey: assignment.accessKey,
        subscriptionId: assignment.subscriptionId,
        subscriptionStatus: subscriptionById.get(assignment.subscriptionId)?.status,
        assignedAt: assignment.assignedAt,
      };
    })
    .filter(isNotNull);

  const activeUsers = asset.assetType === "private" ? mappedUsers.slice(0, 1) : mappedUsers;
  const totalUsed = status?.totalUsed ?? activeAssignments.length;
  const derivedStatus =
    status?.status ??
    deriveAssetStatusFallback({
      disabledAt: asset.disabledAt,
      expiresAt: asset.expiresAt,
      assetType: asset.assetType,
      totalUsed,
    });

  return {
    id: asset.id,
    platform: asset.platform,
    assetType: asset.assetType,
    account: asset.account,
    note: asset.note,
    proxy: asset.proxy,
    assetJson: asset.assetJson,
    expiresAt: asset.expiresAt,
    disabledAt: asset.disabledAt,
    status: derivedStatus,
    totalUsed,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    activeUsers,
  };
}
