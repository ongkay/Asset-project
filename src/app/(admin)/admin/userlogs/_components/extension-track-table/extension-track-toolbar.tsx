"use client";

import { LaptopMinimal, MonitorSmartphone } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { AdminTableDateRangeFilter } from "@/components/shared/table-filters/date-range-filter";
import { AdminTableFilterSelect } from "@/components/shared/table-filters/filter-select";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";

import { ADMIN_EXTENSION_TRACK_COLUMNS } from "./extension-track-columns";

import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type { AdminUserLogsExtensionColumnVisibility } from "../userlogs-page-types";

type AdminExtensionTrackToolbarProps = {
  availableBrowsers: string[];
  availableOsValues: string[];
  browserValue: string | null;
  dateRange: AdminTableDateRangeValue;
  onBrowserChange: (value: string | null) => void;
  onDateRangeChange: (value: AdminTableDateRangeValue) => void;
  onOsChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  onToggleColumn: (columnKey: keyof AdminUserLogsExtensionColumnVisibility, nextVisible: boolean) => void;
  osValue: string | null;
  searchValue: string;
  visibleColumns: AdminUserLogsExtensionColumnVisibility;
};

export function AdminExtensionTrackToolbar({
  availableBrowsers,
  availableOsValues,
  browserValue,
  dateRange,
  onBrowserChange,
  onDateRangeChange,
  onOsChange,
  onSearchChange,
  onToggleColumn,
  osValue,
  searchValue,
  visibleColumns,
}: AdminExtensionTrackToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(18rem,1fr)_auto_auto_auto] sm:items-center @3xl/main:max-w-6xl">
          <AdminTableSearchInput
            ariaLabel="Search extension tracks"
            className="w-full sm:min-w-[18rem]"
            onChange={onSearchChange}
            placeholder="Search user, device ID, extension ID, or IP..."
            value={searchValue}
          />
          <AdminTableFilterSelect
            ariaLabel="Filter extension tracks by browser"
            icon={LaptopMinimal}
            label="Browser"
            onChange={onBrowserChange}
            options={availableBrowsers.map((value) => ({ label: value, value }))}
            value={browserValue}
          />
          <AdminTableFilterSelect
            ariaLabel="Filter extension tracks by operating system"
            icon={MonitorSmartphone}
            label="OS"
            onChange={onOsChange}
            options={availableOsValues.map((value) => ({ label: value, value }))}
            value={osValue}
          />
          <AdminTableDateRangeFilter
            ariaLabel="Filter extension tracks by last seen date"
            label="Last seen"
            onChange={onDateRangeChange}
            value={dateRange}
          />
        </div>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_EXTENSION_TRACK_COLUMNS}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      }
    />
  );
}
