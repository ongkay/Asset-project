"use client";
"use no memo";

import * as React from "react";

import { AdminDataTable } from "@/components/shared/data-table/table";
import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";

import { createAdminSubscriberTableColumns } from "./subscriber-columns";

import type { SubscriberAdminRow, SubscriberTableResult } from "@/modules/admin/subscriptions/types";
import type { AdminSubscriberColumnVisibility } from "../subscriber-page-types";

type AdminSubscriberTableProps = {
  tablePage: SubscriberTableResult;
  tableError: string | null;
  visibleColumns: AdminSubscriberColumnVisibility;
  isFetching: boolean;
  isLoading: boolean;
  onEditRow: (row: SubscriberAdminRow) => void;
  onCancelRow: (row: SubscriberAdminRow) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function AdminSubscriberTable({
  tablePage,
  tableError,
  visibleColumns,
  isFetching,
  isLoading,
  onEditRow,
  onCancelRow,
  onPageChange,
  onPageSizeChange,
}: AdminSubscriberTableProps) {
  const columns = React.useMemo(
    () => createAdminSubscriberTableColumns({ onEditRow, onCancelRow }),
    [onEditRow, onCancelRow],
  );

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columns={columns}
        columnVisibility={visibleColumns}
        data={tablePage.items}
        emptyMessage="No subscribers found."
        errorTitle="Subscribers could not be loaded"
        errorMessage={tableError}
        getRowId={(row) => `${row.userId}:${row.subscriptionId}`}
        isFetching={isFetching}
        isLoading={isLoading}
        pagination={{
          page: tablePage.page,
          pageSize: tablePage.pageSize,
          totalCount: tablePage.totalCount,
        }}
      />
      <AdminDataTablePagination
        itemLabel="subscriber"
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
