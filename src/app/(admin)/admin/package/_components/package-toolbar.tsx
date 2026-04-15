"use client";

import { Columns3, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ADMIN_PACKAGE_TABLE_COLUMNS } from "./columns";
import { AdminPackageFilterBar } from "./package-filter-bar";

import type { AdminPackageColumnVisibility } from "./package-types";
import type { PackageSummary } from "@/modules/packages/types";

type AdminPackageToolbarProps = {
  onCreatePackage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onSearchChange: (search: string) => void;
  onSummaryChange: (summary: PackageSummary | null) => void;
  onToggleColumn: (columnKey: keyof AdminPackageColumnVisibility, nextVisible: boolean) => void;
  pageSizeValue: number;
  searchValue: string;
  summaryValue: PackageSummary | null;
  totalCount: number;
  visibleColumns: AdminPackageColumnVisibility;
};

export function AdminPackageToolbar({
  totalCount,
  onCreatePackage,
  onPageSizeChange,
  onSearchChange,
  onSummaryChange,
  onToggleColumn,
  pageSizeValue,
  searchValue,
  summaryValue,
  visibleColumns,
}: AdminPackageToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Package Management</Badge>
          <Badge variant="secondary">{totalCount} total</Badge>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" type="button" variant="outline">
                <Columns3 data-icon="inline-start" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {ADMIN_PACKAGE_TABLE_COLUMNS.filter((column) => column.key !== "actions").map((column) => (
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns[column.key]}
                    key={column.key}
                    onCheckedChange={(checked) => onToggleColumn(column.key, Boolean(checked))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={onCreatePackage} size="sm" type="button">
            <Plus data-icon="inline-start" />
            Add Package
          </Button>
        </div>
      </div>

      <AdminPackageFilterBar
        onPageSizeChange={onPageSizeChange}
        onSearchChange={onSearchChange}
        onSummaryChange={onSummaryChange}
        pageSizeValue={pageSizeValue}
        searchValue={searchValue}
        summaryValue={summaryValue}
      />
    </div>
  );
}
