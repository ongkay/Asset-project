"use client";

import { PlusIcon } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { Button } from "@/components/ui/button";

import { ADMIN_PACKAGE_TABLE_COLUMNS } from "./package-table-columns";
import { AdminPackageFilterBar } from "./package-table-filter-bar";

import type { AdminPackageColumnVisibility } from "../package-page-types";
import type { PackageSummary } from "@/modules/packages/types";

type AdminPackageToolbarProps = {
  onCreatePackage: () => void;
  onSearchChange: (search: string) => void;
  onSummaryChange: (summary: PackageSummary | null) => void;
  onToggleColumn: (columnKey: keyof AdminPackageColumnVisibility, nextVisible: boolean) => void;
  searchValue: string;
  summaryValue: PackageSummary | null;
  visibleColumns: AdminPackageColumnVisibility;
};

export function AdminPackageToolbar({
  onCreatePackage,
  onSearchChange,
  onSummaryChange,
  onToggleColumn,
  searchValue,
  summaryValue,
  visibleColumns,
}: AdminPackageToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <AdminPackageFilterBar
          onSearchChange={onSearchChange}
          onSummaryChange={onSummaryChange}
          searchValue={searchValue}
          summaryValue={summaryValue}
        />
      }
      primaryAction={
        <Button className="flex-1 @3xl/main:flex-none" onClick={onCreatePackage} size="sm" type="button">
          <PlusIcon data-icon="inline-start" />
          Add Package
        </Button>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_PACKAGE_TABLE_COLUMNS}
          onToggleColumn={onToggleColumn}
          visibleColumns={visibleColumns}
        />
      }
    />
  );
}
