"use client";

import { BadgePercent, ListFilter } from "lucide-react";

import { AdminTableFilterSelect } from "@/components/shared/table-filters/filter-select";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";

import type { VoucherTableStatusFilter } from "@/modules/admin/vouchers/types";
import type { VoucherScopeType } from "@/modules/vouchers/types";

type AdminVoucherFilterBarProps = {
  onScopeChange: (scopeType: VoucherScopeType | null) => void;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: VoucherTableStatusFilter) => void;
  scopeValue: VoucherScopeType | null;
  searchValue: string;
  statusValue: VoucherTableStatusFilter;
};

export function AdminVoucherFilterBar({
  onScopeChange,
  onSearchChange,
  onStatusChange,
  scopeValue,
  searchValue,
  statusValue,
}: AdminVoucherFilterBarProps) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center @3xl/main:max-w-2xl">
      <AdminTableSearchInput
        ariaLabel="Search voucher by code"
        onChange={onSearchChange}
        placeholder="Search voucher code"
        value={searchValue}
      />
      <AdminTableFilterSelect<VoucherScopeType>
        ariaLabel="Filter voucher scope"
        icon={BadgePercent}
        label="Scope"
        onChange={onScopeChange}
        options={[
          { label: "Global", value: "global" },
          { label: "Package", value: "package" },
        ]}
        value={scopeValue}
      />
      <AdminTableFilterSelect<VoucherTableStatusFilter>
        ariaLabel="Filter voucher status"
        icon={ListFilter}
        label="Status"
        onChange={(value) => onStatusChange(value ?? "all")}
        options={[
          { label: "All", value: "all" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
          { label: "Expired", value: "expired" },
          { label: "Exhausted", value: "exhausted" },
        ]}
        value={statusValue}
      />
    </div>
  );
}
