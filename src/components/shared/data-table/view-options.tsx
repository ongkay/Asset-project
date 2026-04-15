"use client";

import { ChevronDownIcon, Settings2 } from "lucide-react";

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

import type { AdminColumnVisibility, AdminTableColumnOption } from "./types";

type AdminDataTableViewOptionsProps<TColumnKey extends string> = {
  columns: AdminTableColumnOption<TColumnKey>[];
  onToggleColumn: (columnKey: TColumnKey, nextVisible: boolean) => void;
  visibleColumns: AdminColumnVisibility<TColumnKey>;
};

export function AdminDataTableViewOptions<TColumnKey extends string>({
  columns,
  onToggleColumn,
  visibleColumns,
}: AdminDataTableViewOptionsProps<TColumnKey>) {
  const hideableColumns = columns.filter((column) => column.canHide !== false);

  return (
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
          {hideableColumns.map((column) => (
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
  );
}
