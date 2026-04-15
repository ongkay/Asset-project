"use client";
"use no memo";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { AdminColumnVisibility, AdminDataTablePaginationState } from "./types";
import type { ColumnDef } from "@tanstack/react-table";

type AdminDataTableProps<TRow, TColumnKey extends string> = {
  columns: ColumnDef<TRow>[];
  columnVisibility: AdminColumnVisibility<TColumnKey>;
  data: TRow[];
  emptyMessage: string;
  errorMessage: string | null;
  errorTitle: string;
  getRowId: (row: TRow) => string;
  isFetching: boolean;
  isLoading: boolean;
  pagination: AdminDataTablePaginationState;
};

export function AdminDataTable<TRow, TColumnKey extends string>({
  columns,
  columnVisibility,
  data,
  emptyMessage,
  errorMessage,
  errorTitle,
  getRowId,
  isFetching,
  isLoading,
  pagination,
}: AdminDataTableProps<TRow, TColumnKey>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    rowCount: pagination.totalCount,
    state: {
      columnVisibility,
      pagination: {
        pageIndex: Math.max(0, pagination.page - 1),
        pageSize: pagination.pageSize,
      },
    },
  });

  if (errorMessage) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
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
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
