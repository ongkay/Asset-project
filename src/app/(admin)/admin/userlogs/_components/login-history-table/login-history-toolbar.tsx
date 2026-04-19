"use client";

import { MonitorSmartphone } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { AdminTableDateRangeFilter } from "@/components/shared/table-filters/date-range-filter";
import { AdminTableFilterSelect } from "@/components/shared/table-filters/filter-select";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";

import { ADMIN_LOGIN_HISTORY_COLUMNS } from "./login-history-columns";

import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type { AdminUserLogsLoginColumnVisibility } from "../userlogs-page-types";

type AdminLoginHistoryToolbarProps = {
  availableOsValues: string[];
  dateRange: AdminTableDateRangeValue;
  onDateRangeChange: (value: AdminTableDateRangeValue) => void;
  onOsChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  onToggleColumn: (columnKey: keyof AdminUserLogsLoginColumnVisibility, nextVisible: boolean) => void;
  osValue: string | null;
  searchValue: string;
  visibleColumns: AdminUserLogsLoginColumnVisibility;
};

export function AdminLoginHistoryToolbar({
  availableOsValues,
  dateRange,
  onDateRangeChange,
  onOsChange,
  onSearchChange,
  onToggleColumn,
  osValue,
  searchValue,
  visibleColumns,
}: AdminLoginHistoryToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(18rem,1fr)_auto_auto] sm:items-center @3xl/main:max-w-5xl">
          <AdminTableSearchInput
            ariaLabel="Search login history"
            className="w-full sm:min-w-[18rem]"
            onChange={onSearchChange}
            placeholder="Search email, username, public ID, or user ID..."
            value={searchValue}
          />
          <AdminTableFilterSelect
            ariaLabel="Filter login history by operating system"
            icon={MonitorSmartphone}
            label="OS"
            onChange={onOsChange}
            options={availableOsValues.map((value) => ({ label: value, value }))}
            value={osValue}
          />
          <AdminTableDateRangeFilter
            ariaLabel="Filter login history by login date"
            label="Login date"
            onChange={onDateRangeChange}
            value={dateRange}
          />
        </div>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_LOGIN_HISTORY_COLUMNS}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      }
    />
  );
}
