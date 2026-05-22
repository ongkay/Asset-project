"use client";

import { FolderArchive, Layers3, ListFilter } from "lucide-react";

import { AdminTableFilterSelect } from "@/components/shared/table-filters/filter-select";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";

import type { PackageTableFilters } from "@/modules/admin/packages/types";
import type { EditablePackageCheckoutGroup, PackageSummary } from "@/modules/packages/types";

type AdminPackageFilterBarProps = {
  checkoutGroupValue: EditablePackageCheckoutGroup | null;
  lifecycleValue: PackageTableFilters["lifecycle"];
  onCheckoutGroupChange: (checkoutGroup: EditablePackageCheckoutGroup | null) => void;
  onLifecycleChange: (lifecycle: PackageTableFilters["lifecycle"]) => void;
  onSearchChange: (search: string) => void;
  onSummaryChange: (summary: PackageSummary | null) => void;
  searchValue: string;
  summaryValue: PackageSummary | null;
};

export function AdminPackageFilterBar({
  checkoutGroupValue,
  lifecycleValue,
  onCheckoutGroupChange,
  onLifecycleChange,
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
      <AdminTableFilterSelect<EditablePackageCheckoutGroup>
        ariaLabel="Filter package checkout group"
        icon={Layers3}
        label="Checkout Group"
        onChange={onCheckoutGroupChange}
        options={[
          { label: "Semi Private", value: "semi-private" },
          { label: "Full Private", value: "full-private" },
        ]}
        value={checkoutGroupValue}
      />
      <AdminTableFilterSelect<PackageTableFilters["lifecycle"]>
        allLabel="Current"
        ariaLabel="Filter package lifecycle"
        icon={FolderArchive}
        label="Lifecycle"
        onChange={(value) => onLifecycleChange(value ?? "current")}
        options={[
          { label: "Current", value: "current" },
          { label: "Archived", value: "archived" },
          { label: "All", value: "all" },
        ]}
        value={lifecycleValue}
      />
    </div>
  );
}
