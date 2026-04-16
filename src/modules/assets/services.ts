import "server-only";

import {
  countActiveAssignmentsByAssetId,
  createAssetRow,
  deleteAssetRowSafely,
  getAssetById,
  recheckAssetSubscriptionsAfterChange,
  toggleAssetDisabledRow,
  updateAssetRow,
} from "./repositories";
import { assetDeleteSchema, assetToggleSchema } from "./schemas";

import type { AssetDeleteInput, AssetFormInput, AssetRow, AssetToggleInput } from "./types";

const DEFAULT_ASSET_EXPIRY_DAYS = 30;

function toMilliseconds(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

function isTupleChanged(input: {
  currentPlatform: AssetRow["platform"];
  currentAssetType: AssetRow["assetType"];
  nextPlatform: AssetFormInput["platform"];
  nextAssetType: AssetFormInput["assetType"];
}) {
  return input.currentPlatform !== input.nextPlatform || input.currentAssetType !== input.nextAssetType;
}

function isPastIsoDateTime(value: string) {
  return new Date(value).getTime() < Date.now();
}

function isExpiryChanged(currentExpiresAt: string, nextExpiresAt: string) {
  return new Date(currentExpiresAt).toISOString() !== new Date(nextExpiresAt).toISOString();
}

export function buildDefaultAssetExpiry(nowDate: Date = new Date()) {
  return new Date(nowDate.getTime() + toMilliseconds(DEFAULT_ASSET_EXPIRY_DAYS)).toISOString();
}

export async function createAsset(input: AssetFormInput) {
  return createAssetRow(input);
}

export async function updateAsset(input: { id: string } & AssetFormInput) {
  const existingAsset = await getAssetById(input.id);

  if (!existingAsset) {
    throw new Error("Asset not found.");
  }

  const activeAssignmentsCount = await countActiveAssignmentsByAssetId(input.id);
  const hasActiveAssignments = activeAssignmentsCount > 0;

  if (
    hasActiveAssignments &&
    isTupleChanged({
      currentPlatform: existingAsset.platform,
      currentAssetType: existingAsset.assetType,
      nextPlatform: input.platform,
      nextAssetType: input.assetType,
    })
  ) {
    throw new Error("Platform or asset type cannot be changed while the asset is still in use.");
  }

  const updatedAsset = await updateAssetRow(input);

  if (
    hasActiveAssignments &&
    isExpiryChanged(existingAsset.expiresAt, updatedAsset.expiresAt) &&
    isPastIsoDateTime(updatedAsset.expiresAt)
  ) {
    await recheckAssetSubscriptionsAfterChange({ id: updatedAsset.id });
  }

  return updatedAsset;
}

export async function toggleAssetDisabled(input: AssetToggleInput) {
  const parsedInput = assetToggleSchema.parse(input);
  const updatedAsset = await toggleAssetDisabledRow(parsedInput);

  if (parsedInput.disabled) {
    await recheckAssetSubscriptionsAfterChange({ id: parsedInput.id });
  }

  return updatedAsset;
}

export async function deleteAssetSafely(input: AssetDeleteInput) {
  const parsedInput = assetDeleteSchema.parse(input);
  await deleteAssetRowSafely(parsedInput);

  return {
    id: parsedInput.id,
  };
}
