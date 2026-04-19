"use client";

import { CreditCard, ReceiptText } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { AdminTableDateRangeFilter } from "@/components/shared/table-filters/date-range-filter";
import { AdminTableFilterSelect } from "@/components/shared/table-filters/filter-select";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";

import { ADMIN_TRANSACTIONS_COLUMNS } from "./transactions-columns";

import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type { AdminTransactionsFilters } from "@/modules/admin/userlogs/types";
import type { AdminUserLogsTransactionsColumnVisibility } from "../userlogs-page-types";

type AdminTransactionsToolbarProps = {
  dateRange: AdminTableDateRangeValue;
  onDateRangeChange: (value: AdminTableDateRangeValue) => void;
  onSearchChange: (value: string) => void;
  onSourceChange: (value: AdminTransactionsFilters["source"]) => void;
  onStatusChange: (value: AdminTransactionsFilters["status"]) => void;
  onToggleColumn: (columnKey: keyof AdminUserLogsTransactionsColumnVisibility, nextVisible: boolean) => void;
  searchValue: string;
  sourceValue: AdminTransactionsFilters["source"];
  statusValue: AdminTransactionsFilters["status"];
  visibleColumns: AdminUserLogsTransactionsColumnVisibility;
};

const TRANSACTION_SOURCE_OPTIONS = [
  { label: "Dummy Payment", value: "payment_dummy" },
  { label: "CD Key", value: "cdkey" },
  { label: "Admin Manual", value: "admin_manual" },
] as const;

const TRANSACTION_STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
  { label: "Canceled", value: "canceled" },
] as const;

export function AdminTransactionsToolbar({
  dateRange,
  onDateRangeChange,
  onSearchChange,
  onSourceChange,
  onStatusChange,
  onToggleColumn,
  searchValue,
  sourceValue,
  statusValue,
  visibleColumns,
}: AdminTransactionsToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(18rem,1fr)_auto_auto_auto] sm:items-center @3xl/main:max-w-6xl">
          <AdminTableSearchInput
            ariaLabel="Search transactions"
            className="w-full sm:min-w-[18rem]"
            onChange={onSearchChange}
            placeholder="Search user, package, public ID, or user ID..."
            value={searchValue}
          />
          <AdminTableFilterSelect
            ariaLabel="Filter transactions by source"
            icon={ReceiptText}
            label="Source"
            onChange={onSourceChange}
            options={TRANSACTION_SOURCE_OPTIONS}
            value={sourceValue}
          />
          <AdminTableFilterSelect
            ariaLabel="Filter transactions by status"
            icon={CreditCard}
            label="Status"
            onChange={onStatusChange}
            options={TRANSACTION_STATUS_OPTIONS}
            value={statusValue}
          />
          <AdminTableDateRangeFilter
            ariaLabel="Filter transactions by created date"
            label="Created date"
            onChange={onDateRangeChange}
            value={dateRange}
          />
        </div>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_TRANSACTIONS_COLUMNS}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      }
    />
  );
}
