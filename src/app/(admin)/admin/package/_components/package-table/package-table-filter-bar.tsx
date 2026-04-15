"use client";

import { ListFilter } from "lucide-react";

import { AdminTableFilterSelect } from "@/components/shared/table-filters/filter-select";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";

import type { PackageSummary } from "@/modules/packages/types";

type AdminPackageFilterBarProps = {
  onSearchChange: (search: string) => void;
  onSummaryChange: (summary: PackageSummary | null) => void;
  searchValue: string;
  summaryValue: PackageSummary | null;
};

export function AdminPackageFilterBar({
  searchValue,
  summaryValue,
  onSearchChange,
  onSummaryChange,
}: AdminPackageFilterBarProps) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center @3xl/main:max-w-2xl">
      <AdminTableSearchInput
        ariaLabel="Search package by name"
        onChange={onSearchChange}
        placeholder="Search package name"
        value={searchValue}
      />
      <AdminTableFilterSelect<PackageSummary>
        ariaLabel="Filter package summary"
        icon={ListFilter}
        label="Summary"
        onChange={onSummaryChange}
        options={[
          { label: "Private", value: "private" },
          { label: "Share", value: "share" },
          { label: "Mixed", value: "mixed" },
        ]}
        value={summaryValue}
      />
    </div>
  );
}
