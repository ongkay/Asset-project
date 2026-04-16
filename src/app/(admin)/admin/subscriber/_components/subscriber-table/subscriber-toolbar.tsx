"use client";

import { PlusIcon } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { AdminTableDateRangeFilter } from "@/components/shared/table-filters/date-range-filter";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";
import { Button } from "@/components/ui/button";

import { ADMIN_SUBSCRIBER_TABLE_COLUMNS } from "./subscriber-columns";
import { AdminSubscriberFilterPopover } from "./subscriber-filter-popover";

import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type { AssetType } from "@/modules/assets/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";
import type { AdminSubscriberColumnVisibility } from "../subscriber-page-types";

type AdminSubscriberToolbarProps = {
  searchValue: string;
  assetTypeValue: AssetType | null;
  statusValue: SubscriptionStatus | null;
  expiresRange: AdminTableDateRangeValue;
  onSearchChange: (value: string) => void;
  onAssetTypeChange: (value: AssetType | null) => void;
  onStatusChange: (value: SubscriptionStatus | null) => void;
  onExpiresRangeChange: (value: AdminTableDateRangeValue) => void;
  onCreateSubscriber: () => void;
  visibleColumns: AdminSubscriberColumnVisibility;
  onToggleColumn: (columnKey: keyof AdminSubscriberColumnVisibility, nextVisible: boolean) => void;
};

export function AdminSubscriberToolbar({
  searchValue,
  assetTypeValue,
  statusValue,
  expiresRange,
  onSearchChange,
  onAssetTypeChange,
  onStatusChange,
  onExpiresRangeChange,
  onCreateSubscriber,
  visibleColumns,
  onToggleColumn,
}: AdminSubscriberToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(24rem,1fr)_auto_auto] sm:items-center @3xl/main:max-w-5xl">
          <AdminTableSearchInput
            ariaLabel="Search subscribers"
            className="w-full sm:min-w-[24rem]"
            placeholder="Search by user ID, username, or email..."
            value={searchValue}
            onChange={onSearchChange}
          />
          <AdminSubscriberFilterPopover
            assetTypeValue={assetTypeValue}
            statusValue={statusValue}
            onAssetTypeChange={onAssetTypeChange}
            onStatusChange={onStatusChange}
          />
          <AdminTableDateRangeFilter
            ariaLabel="Filter by subscription expiry range"
            label="Expiry range"
            value={expiresRange}
            onChange={onExpiresRangeChange}
          />
        </div>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_SUBSCRIBER_TABLE_COLUMNS}
          visibleColumns={visibleColumns}
          onToggleColumn={onToggleColumn}
        />
      }
      primaryAction={
        <Button className="flex-1 @3xl/main:flex-none" onClick={onCreateSubscriber} size="sm" type="button">
          <PlusIcon data-icon="inline-start" />
          Add Subscriber
        </Button>
      }
    />
  );
}
