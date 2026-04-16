"use client";

import { getAssetEditorDataAction, getAssetTablePageAction } from "@/modules/admin/assets/actions";

import type { AssetEditorData, AssetTableFilters } from "@/modules/admin/assets/types";

export const ADMIN_ASSET_QUERY_KEY = ["admin-assets"] as const;

export async function fetchAssetTablePage(input: AssetTableFilters) {
  const result = await getAssetTablePageAction(input);

  if (result?.data?.ok) {
    return result.data.tablePage;
  }

  const validationError = result?.validationErrors?.formErrors?.[0];
  const message = validationError ?? result?.data?.message ?? "Failed to load asset table.";

  throw new Error(message);
}

export async function fetchAssetEditorData(assetId: string): Promise<AssetEditorData> {
  const result = await getAssetEditorDataAction({ id: assetId });

  if (result?.data?.ok) {
    return result.data.prefill;
  }

  const validationError = result?.validationErrors?.formErrors?.[0];
  const message = validationError ?? result?.data?.message ?? "Failed to load asset detail.";

  throw new Error(message);
}

export function getAssetTableQueryKey(filters: AssetTableFilters) {
  return [
    ...ADMIN_ASSET_QUERY_KEY,
    {
      search: filters.search,
      assetType: filters.assetType,
      status: filters.status,
      expiresFrom: filters.expiresFrom,
      expiresTo: filters.expiresTo,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  ] as const;
}

export function getAssetEditorQueryKey(assetId: string) {
  return [...ADMIN_ASSET_QUERY_KEY, "editor", assetId] as const;
}
