"use client";

import { AdminTableGroupedFilterMenu } from "@/components/shared/table-filters/filter-menu";
import { ASSET_STATUSES, ASSET_TYPES } from "@/modules/assets/types";

import type { AssetStatus, AssetType } from "@/modules/assets/types";

type AdminAssetsFilterPopoverProps = {
  assetTypeValue: AssetType | null;
  statusValue: AssetStatus | null;
  onAssetTypeChange: (value: AssetType | null) => void;
  onStatusChange: (value: AssetStatus | null) => void;
};

function getSingleSelectValue<TValue extends string>(selectedValues: TValue[]) {
  return selectedValues.at(-1) ?? null;
}

function getAssetTypeSelection(selectedValues: AssetType[]) {
  return getSingleSelectValue(selectedValues);
}

function getAssetStatusSelection(selectedValues: AssetStatus[]) {
  return getSingleSelectValue(selectedValues);
}

export function AdminAssetsFilterPopover({
  assetTypeValue,
  statusValue,
  onAssetTypeChange,
  onStatusChange,
}: AdminAssetsFilterPopoverProps) {
  return (
    <AdminTableGroupedFilterMenu
      groups={[
        {
          key: "asset-type",
          label: "Asset Type",
          selectedValues: assetTypeValue ? [assetTypeValue] : [],
          options: ASSET_TYPES.map((assetType) => ({
            label: assetType === "private" ? "Private" : "Shared",
            value: assetType,
          })),
          onSelectedValuesChange: (selectedValues) =>
            onAssetTypeChange(getAssetTypeSelection(selectedValues as AssetType[])),
        },
        {
          key: "status",
          label: "Status",
          selectedValues: statusValue ? [statusValue] : [],
          options: ASSET_STATUSES.map((status) => ({
            label: status.charAt(0).toUpperCase() + status.slice(1),
            value: status,
          })),
          onSelectedValuesChange: (selectedValues) =>
            onStatusChange(getAssetStatusSelection(selectedValues as AssetStatus[])),
        },
      ]}
      onClearFilters={() => {
        onAssetTypeChange(null);
        onStatusChange(null);
      }}
    />
  );
}
