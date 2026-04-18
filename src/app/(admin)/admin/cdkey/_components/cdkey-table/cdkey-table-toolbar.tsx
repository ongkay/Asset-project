"use client";

import { PlusIcon } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { Button } from "@/components/ui/button";

import { ADMIN_CDKEY_TABLE_COLUMNS } from "./cdkey-table-columns";
import { AdminCdKeyFilterBar } from "./cdkey-table-filter-bar";

import type { AdminCdKeyColumnVisibility } from "../cdkey-page-types";
import type { CdKeyTablePackageOption, CdKeyUsageStatus } from "@/modules/admin/cdkeys/types";
import type { PackageSummary } from "@/modules/packages/types";

type AdminCdKeyToolbarProps = {
  onIssueCdKey: () => void;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: CdKeyUsageStatus | null) => void;
  onPackageChange: (packageId: string | null) => void;
  onPackageSummaryChange: (summary: PackageSummary | null) => void;
  onToggleColumn: (columnKey: keyof AdminCdKeyColumnVisibility, nextVisible: boolean) => void;
  packageOptions: CdKeyTablePackageOption[];
  searchValue: string;
  statusValue: CdKeyUsageStatus | null;
  packageValue: string | null;
  packageSummaryValue: PackageSummary | null;
  visibleColumns: AdminCdKeyColumnVisibility;
};

export function AdminCdKeyToolbar({
  onIssueCdKey,
  onSearchChange,
  onStatusChange,
  onPackageChange,
  onPackageSummaryChange,
  onToggleColumn,
  packageOptions,
  searchValue,
  statusValue,
  packageValue,
  packageSummaryValue,
  visibleColumns,
}: AdminCdKeyToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <AdminCdKeyFilterBar
          onSearchChange={onSearchChange}
          onStatusChange={onStatusChange}
          onPackageChange={onPackageChange}
          onPackageSummaryChange={onPackageSummaryChange}
          packageOptions={packageOptions}
          searchValue={searchValue}
          statusValue={statusValue}
          packageValue={packageValue}
          packageSummaryValue={packageSummaryValue}
        />
      }
      primaryAction={
        <Button className="flex-1 @3xl/main:flex-none" onClick={onIssueCdKey} size="sm" type="button">
          <PlusIcon data-icon="inline-start" />
          Issue CD-Key
        </Button>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_CDKEY_TABLE_COLUMNS}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      }
    />
  );
}
