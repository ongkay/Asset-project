"use client";

import { AdminTableGroupedFilterMenu } from "@/components/shared/table-filters/filter-menu";

import type { AssetType } from "@/modules/assets/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";

type AdminSubscriberFilterPopoverProps = {
  assetTypeValue: AssetType | null;
  statusValue: SubscriptionStatus | null;
  onAssetTypeChange: (value: AssetType | null) => void;
  onStatusChange: (value: SubscriptionStatus | null) => void;
};

function getSingleSelectValue<TValue extends string>(selectedValues: TValue[]) {
  return selectedValues.at(-1) ?? null;
}

export function AdminSubscriberFilterPopover({
  assetTypeValue,
  statusValue,
  onAssetTypeChange,
  onStatusChange,
}: AdminSubscriberFilterPopoverProps) {
  return (
    <AdminTableGroupedFilterMenu
      groups={[
        {
          key: "asset-type",
          label: "Asset Type",
          selectedValues: assetTypeValue ? [assetTypeValue] : [],
          options: [
            { label: "Private", value: "private" },
            { label: "Shared", value: "share" },
          ],
          onSelectedValuesChange: (selectedValues) =>
            onAssetTypeChange(getSingleSelectValue(selectedValues as AssetType[])),
        },
        {
          key: "status",
          label: "Status",
          selectedValues: statusValue ? [statusValue] : [],
          options: ["active", "processed", "expired", "canceled"].map((status) => ({
            label: status.charAt(0).toUpperCase() + status.slice(1),
            value: status as SubscriptionStatus,
          })),
          onSelectedValuesChange: (selectedValues) =>
            onStatusChange(getSingleSelectValue(selectedValues as SubscriptionStatus[])),
        },
      ]}
      onClearFilters={() => {
        onAssetTypeChange(null);
        onStatusChange(null);
      }}
    />
  );
}
