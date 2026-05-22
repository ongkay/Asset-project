"use client";

import { PlusIcon } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { Button } from "@/components/ui/button";

import { ADMIN_VOUCHER_TABLE_COLUMNS } from "./voucher-table-columns";
import { AdminVoucherFilterBar } from "./voucher-table-filter-bar";

import type { VoucherTableStatusFilter } from "@/modules/admin/vouchers/types";
import type { VoucherScopeType } from "@/modules/vouchers/types";
import type { AdminVoucherColumnVisibility } from "../voucher-page-types";

type AdminVoucherToolbarProps = {
  onCreateVoucher: () => void;
  onScopeChange: (scopeType: VoucherScopeType | null) => void;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: VoucherTableStatusFilter) => void;
  onToggleColumn: (columnKey: keyof AdminVoucherColumnVisibility, nextVisible: boolean) => void;
  scopeValue: VoucherScopeType | null;
  searchValue: string;
  statusValue: VoucherTableStatusFilter;
  visibleColumns: AdminVoucherColumnVisibility;
};

export function AdminVoucherToolbar({
  onCreateVoucher,
  onScopeChange,
  onSearchChange,
  onStatusChange,
  onToggleColumn,
  scopeValue,
  searchValue,
  statusValue,
  visibleColumns,
}: AdminVoucherToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <AdminVoucherFilterBar
          onScopeChange={onScopeChange}
          onSearchChange={onSearchChange}
          onStatusChange={onStatusChange}
          scopeValue={scopeValue}
          searchValue={searchValue}
          statusValue={statusValue}
        />
      }
      primaryAction={
        <Button className="flex-1 @3xl/main:flex-none" onClick={onCreateVoucher} size="sm" type="button">
          <PlusIcon data-icon="inline-start" />
          Add Voucher
        </Button>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_VOUCHER_TABLE_COLUMNS}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      }
    />
  );
}
