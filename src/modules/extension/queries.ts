import "server-only";

import type { ExtensionAssetDetail, ExtensionSessionSnapshot } from "./types";

import { extensionAssetDetailRpcSchema, extensionConsoleSnapshotRpcSchema } from "./schemas";
import {
  readExtensionAssetDetailRpc,
  readExtensionAssetExistence,
  readExtensionConsoleSnapshotRpc,
} from "./repositories";

export async function getExtensionConsoleSnapshotForUser(input: { userId: string }): Promise<ExtensionSessionSnapshot> {
  const snapshot = extensionConsoleSnapshotRpcSchema.parse(await readExtensionConsoleSnapshotRpc(input.userId));

  return {
    subscription: snapshot.subscription
      ? {
          daysLeft: snapshot.subscription.days_left,
          endAt: snapshot.subscription.end_at,
          id: snapshot.subscription.id,
          packageId: snapshot.subscription.package_id,
          packageName: snapshot.subscription.package_name,
          startAt: snapshot.subscription.start_at,
          status: snapshot.subscription.status,
        }
      : null,
    assets: snapshot.assets.map((asset) => ({
      accessKey: asset.access_key,
      assetType: asset.asset_type,
      expiresAt: asset.expires_at,
      id: asset.id,
      platform: asset.platform,
    })),
  };
}

export async function getExtensionAssetDetailForUser(input: {
  assetId: string;
  userId: string;
}): Promise<ExtensionAssetDetail | null> {
  const detailRow = await readExtensionAssetDetailRpc(input);

  if (!detailRow) {
    return null;
  }

  const detail = extensionAssetDetailRpcSchema.parse(detailRow);

  return {
    accessKey: detail.access_key,
    account: detail.account,
    asset: detail.asset_json,
    assetType: detail.asset_type,
    expiresAt: detail.expires_at,
    id: detail.id,
    note: detail.note,
    platform: detail.platform,
    proxy: detail.proxy,
    subscriptionId: detail.subscription_id,
  };
}

export async function doesExtensionAssetExist(assetId: string): Promise<boolean> {
  const assetRow = await readExtensionAssetExistence(assetId);
  return Boolean(assetRow);
}
