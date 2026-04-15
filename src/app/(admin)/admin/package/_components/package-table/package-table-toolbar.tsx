"use client";

import { ChevronDownIcon, PlusIcon, Settings2 } from "lucide-react";

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
    <div className="flex flex-col gap-3 @3xl/main:flex-row @3xl/main:items-center @3xl/main:justify-between">
      <AdminPackageFilterBar
        onSearchChange={onSearchChange}
        onSummaryChange={onSummaryChange}
        searchValue={searchValue}
        summaryValue={summaryValue}
      />
      <div className="flex w-full items-center gap-2 @3xl/main:w-auto @3xl/main:justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex-1 @3xl/main:flex-none" size="sm" type="button" variant="outline">
              <Settings2 data-icon="inline-start" />
              View
              <ChevronDownIcon data-icon="inline-end" />
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

        <Button className="flex-1 @3xl/main:flex-none" onClick={onCreatePackage} size="sm" type="button">
          <PlusIcon data-icon="inline-start" />
          Add Package
        </Button>
      </div>
    </div>
  );
}
