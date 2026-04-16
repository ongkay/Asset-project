"use client";

import { HardDrive, ListFilter } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { AdminTableDateRangeFilter } from "@/components/shared/table-filters/date-range-filter";
import { AdminTableFilterSelect } from "@/components/shared/table-filters/filter-select";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";
import { Button } from "@/components/ui/button";

import { ADMIN_ASSET_TABLE_COLUMNS } from "./assets-columns";

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
        <div className="flex w-full flex-col gap-3 @3xl/main:max-w-4xl">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <AdminTableSearchInput
              ariaLabel="Search assets"
              placeholder="Search platform, note, username, or email"
              value={searchValue}
              onChange={onSearchChange}
            />
            <AdminTableDateRangeFilter
              ariaLabel="Filter by asset expiry range"
              label="Expiry Range"
              value={expiresRange}
              onChange={onExpiresRangeChange}
            />
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <AdminTableFilterSelect<AssetType>
              ariaLabel="Filter by asset type"
              icon={ListFilter}
              label="Asset Type"
              value={assetTypeValue}
              onChange={onAssetTypeChange}
              options={[
                { label: "Private", value: "private" },
                { label: "Share", value: "share" },
              ]}
            />
            <AdminTableFilterSelect<AssetStatus>
              ariaLabel="Filter by status"
              icon={HardDrive}
              label="Status"
              value={statusValue}
              onChange={onStatusChange}
              options={[
                { label: "Available", value: "available" },
                { label: "Assigned", value: "assigned" },
                { label: "Expired", value: "expired" },
                { label: "Disabled", value: "disabled" },
              ]}
            />
          </div>
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
          Add Asset
        </Button>
      }
    />
  );
}
