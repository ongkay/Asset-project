"use client";

import { PlusIcon } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { AdminTableDateRangeFilter } from "@/components/shared/table-filters/date-range-filter";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";
import { Button } from "@/components/ui/button";

import { ADMIN_ASSET_TABLE_COLUMNS } from "./assets-columns";
import { AdminAssetsFilterPopover } from "./assets-filter-popover";

import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type { AssetStatus, AssetType } from "@/modules/assets/types";
import type { AdminAssetColumnVisibility } from "../assets-page-types";

type AdminAssetsToolbarProps = {
  searchValue: string;
  assetTypeValue: AssetType | null;
  statusValue: AssetStatus | null;
  expiresRange: AdminTableDateRangeValue;
  onSearchChange: (value: string) => void;
  onAssetTypeChange: (value: AssetType | null) => void;
  onStatusChange: (value: AssetStatus | null) => void;
  onExpiresRangeChange: (value: AdminTableDateRangeValue) => void;
  onCreateAsset: () => void;
  visibleColumns: AdminAssetColumnVisibility;
  onToggleColumn: (columnKey: keyof AdminAssetColumnVisibility, nextVisible: boolean) => void;
};

export function AdminAssetsToolbar({
  searchValue,
  assetTypeValue,
  statusValue,
  expiresRange,
  onSearchChange,
  onAssetTypeChange,
  onStatusChange,
  onExpiresRangeChange,
  onCreateAsset,
  visibleColumns,
  onToggleColumn,
}: AdminAssetsToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <div className="grid w-full lg:w-3/4 gap-3 sm:grid-cols-[minmax(24rem,1fr)_auto_auto] sm:items-center @3xl/main:max-w-5xl">
          <AdminTableSearchInput
            ariaLabel="Search assets"
            className="w-full sm:min-w-[24rem]"
            placeholder="Search assets..."
            value={searchValue}
            onChange={onSearchChange}
          />
          <AdminAssetsFilterPopover
            assetTypeValue={assetTypeValue}
            statusValue={statusValue}
            onAssetTypeChange={onAssetTypeChange}
            onStatusChange={onStatusChange}
          />
          <AdminTableDateRangeFilter
            ariaLabel="Filter by asset expiry range"
            // className="w-full justify-start gap-2 overflow-hidden sm:w-[9.5rem]"
            label="Date range"
            value={expiresRange}
            onChange={onExpiresRangeChange}
          />
        </div>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_ASSET_TABLE_COLUMNS}
          visibleColumns={visibleColumns}
          onToggleColumn={onToggleColumn}
        />
      }
      primaryAction={
        <Button className="flex-1 @3xl/main:flex-none" onClick={onCreateAsset} size="sm" type="button">
          <PlusIcon data-icon="inline-start" />
          Add Asset
        </Button>
      }
    />
  );
}
