"use client";

import { Boxes, ListFilter, Package2 } from "lucide-react";

import { AdminTableFilterSelect } from "@/components/shared/table-filters/filter-select";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";

import type { CdKeyTablePackageOption, CdKeyUsageStatus } from "@/modules/admin/cdkeys/types";
import type { PackageSummary } from "@/modules/packages/types";

type AdminCdKeyFilterBarProps = {
  onSearchChange: (search: string) => void;
  onStatusChange: (status: CdKeyUsageStatus | null) => void;
  onPackageChange: (packageId: string | null) => void;
  onPackageSummaryChange: (summary: PackageSummary | null) => void;
  packageOptions: CdKeyTablePackageOption[];
  searchValue: string;
  statusValue: CdKeyUsageStatus | null;
  packageValue: string | null;
  packageSummaryValue: PackageSummary | null;
};

export function AdminCdKeyFilterBar({
  onSearchChange,
  onStatusChange,
  onPackageChange,
  onPackageSummaryChange,
  packageOptions,
  searchValue,
  statusValue,
  packageValue,
  packageSummaryValue,
}: AdminCdKeyFilterBarProps) {
  return (
    <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-4 @3xl/main:max-w-6xl">
      <AdminTableSearchInput
        ariaLabel="Search CD-Keys by code, package, and used by user"
        className="w-full"
        onChange={onSearchChange}
        placeholder="Search code, package, username, or email"
        value={searchValue}
      />

      <AdminTableFilterSelect<CdKeyUsageStatus>
        ariaLabel="Filter CD-Keys by usage status"
        className="w-full"
        icon={ListFilter}
        label="Status"
        onChange={onStatusChange}
        options={[
          { label: "Used", value: "used" },
          { label: "Unused", value: "unused" },
        ]}
        value={statusValue}
      />

      <AdminTableFilterSelect<string>
        allLabel="All packages"
        ariaLabel="Filter CD-Keys by package"
        className="w-full"
        icon={Package2}
        label="Package"
        onChange={onPackageChange}
        options={packageOptions.map((option) => ({
          label: option.packageName ?? option.packageId,
          value: option.packageId,
        }))}
        value={packageValue}
      />

      <AdminTableFilterSelect<PackageSummary>
        ariaLabel="Filter CD-Keys by package summary"
        className="w-full"
        icon={Boxes}
        label="Summary"
        onChange={onPackageSummaryChange}
        options={[
          { label: "Private", value: "private" },
          { label: "Share", value: "share" },
          { label: "Mixed", value: "mixed" },
        ]}
        value={packageSummaryValue}
      />
    </div>
  );
}
