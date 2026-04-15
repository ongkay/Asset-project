"use client";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { ADMIN_PACKAGE_TABLE_COLUMNS } from "./columns";
import { AdminPackageRowActions } from "./package-row-actions";

import type { PackageTablePage } from "@/modules/admin/packages/types";
import type { AdminPackageColumnVisibility } from "./package-types";

type AdminPackageTableProps = {
  isLoading: boolean;
  onEditPackage: (packageId: string) => void;
  onPageChange: (page: number) => void;
  tableError: string | null;
  tablePage: PackageTablePage;
  visibleColumns: AdminPackageColumnVisibility;
};

function getVisibleColumnKeys(visibleColumns: AdminPackageColumnVisibility) {
  return ADMIN_PACKAGE_TABLE_COLUMNS.filter((column) => visibleColumns[column.key] || column.key === "actions");
}

export function AdminPackageTable({
  tablePage,
  tableError,
  visibleColumns,
  isLoading,
  onPageChange,
  onEditPackage,
}: AdminPackageTableProps) {
  const visibleColumnsList = getVisibleColumnKeys(visibleColumns);
  const totalPages = Math.max(1, Math.ceil(tablePage.totalCount / tablePage.pageSize));
  const hasPreviousPage = tablePage.page > 1;
  const hasNextPage = tablePage.page < totalPages;

  if (tableError) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Failed to load packages</AlertTitle>
        <AlertDescription>{tableError}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (tablePage.items.length === 0) {
    return (
      <Empty className="border-border/60 bg-muted/10 p-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircle />
          </EmptyMedia>
          <EmptyTitle>No packages found</EmptyTitle>
          <EmptyDescription>Try adjusting search keywords or summary filters.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumnsList.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tablePage.items.map((row) => (
            <TableRow key={row.id}>
              {visibleColumnsList.map((column) => {
                if (column.key === "actions") {
                  return (
                    <TableCell key={`${row.id}-actions`}>
                      <AdminPackageRowActions onEditPackage={onEditPackage} row={row} />
                    </TableCell>
                  );
                }

                return <TableCell key={`${row.id}-${column.key}`}>{column.renderCell?.(row) ?? "-"}</TableCell>;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {(tablePage.page - 1) * tablePage.pageSize + 1}-
          {Math.min(tablePage.page * tablePage.pageSize, tablePage.totalCount)} of {tablePage.totalCount}
        </p>

        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={!hasPreviousPage}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (hasPreviousPage) {
                    onPageChange(tablePage.page - 1);
                  }
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <Button size="sm" type="button" variant="outline">
                Page {tablePage.page} / {totalPages}
              </Button>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                aria-disabled={!hasNextPage}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (hasNextPage) {
                    onPageChange(tablePage.page + 1);
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
