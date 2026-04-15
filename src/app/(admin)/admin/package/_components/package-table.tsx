"use client";
"use no memo";

import * as React from "react";

import { flexRender, getCoreRowModel, useReactTable, type PaginationState } from "@tanstack/react-table";
import { AlertCircle, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { createAdminPackageTableColumns } from "./columns";

import type { PackageTablePage } from "@/modules/admin/packages/types";
import type { PackageTableSortKey, PackageTableSortOrder } from "@/modules/packages/types";
import type { AdminPackageColumnVisibility } from "./package-types";

type AdminPackageTableProps = {
  isFetching: boolean;
  isLoading: boolean;
  onEditPackage: (packageId: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sortKey: PackageTableSortKey) => void;
  sortOrder: PackageTableSortOrder | null;
  sortValue: PackageTableSortKey | null;
  tableError: string | null;
  tablePage: PackageTablePage;
  visibleColumns: AdminPackageColumnVisibility;
};

export function AdminPackageTable({
  tablePage,
  tableError,
  visibleColumns,
  isFetching,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onEditPackage,
  onSortChange,
  sortOrder,
  sortValue,
}: AdminPackageTableProps) {
  const columns = React.useMemo(
    () =>
      createAdminPackageTableColumns({
        onEditPackage,
        onSortChange,
        sortOrder,
        sortValue,
      }),
    [onEditPackage, onSortChange, sortOrder, sortValue],
  );
  const pagination = React.useMemo<PaginationState>(
    () => ({
      pageIndex: Math.max(0, tablePage.page - 1),
      pageSize: tablePage.pageSize,
    }),
    [tablePage.page, tablePage.pageSize],
  );

  const table = useReactTable({
    columns,
    data: tablePage.items,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    rowCount: tablePage.totalCount,
    state: {
      columnVisibility: visibleColumns,
      pagination,
    },
  });

  const pageCount = Math.max(1, table.getPageCount());
  const firstVisibleRow = tablePage.totalCount === 0 ? 0 : (tablePage.page - 1) * tablePage.pageSize + 1;
  const lastVisibleRow = Math.min(tablePage.page * tablePage.pageSize, tablePage.totalCount);

  if (tableError) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Packages could not be loaded</AlertTitle>
        <AlertDescription>{tableError}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <div className="overflow-hidden rounded-lg border">
          <Skeleton className="h-64 w-full rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody data-pending={isFetching ? "true" : undefined} className="data-[pending=true]:opacity-70">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                  No packages found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
          Showing {firstVisibleRow}-{lastVisibleRow} of {tablePage.totalCount} package(s).
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="package-rows-per-page" className="font-medium text-sm">
              Rows per page
            </Label>
            <Select value={String(tablePage.pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-20" id="package-rows-per-page">
                <SelectValue placeholder={tablePage.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={String(pageSize)}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center font-medium text-sm">
            Page {tablePage.page} of {pageCount}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              aria-label="Go to first page"
              className="hidden size-8 p-0 lg:flex"
              disabled={!table.getCanPreviousPage()}
              onClick={() => onPageChange(1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronsLeftIcon />
            </Button>
            <Button
              aria-label="Go to previous page"
              className="size-8"
              disabled={!table.getCanPreviousPage()}
              onClick={() => onPageChange(tablePage.page - 1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              aria-label="Go to next page"
              className="size-8"
              disabled={!table.getCanNextPage()}
              onClick={() => onPageChange(tablePage.page + 1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRightIcon />
            </Button>
            <Button
              aria-label="Go to last page"
              className="hidden size-8 lg:flex"
              disabled={!table.getCanNextPage()}
              onClick={() => onPageChange(pageCount)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
