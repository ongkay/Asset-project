"use client";
"use no memo";

import * as React from "react";

import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";
import { AdminDataTable } from "@/components/shared/data-table/table";

import { createAdminTransactionsColumns } from "./transactions-columns";

import type { AdminTransactionsPage } from "@/modules/admin/userlogs/types";
import type { AdminUserLogsTransactionsColumnVisibility } from "../userlogs-page-types";

type AdminTransactionsTableProps = {
  isFetching: boolean;
  isLoading: boolean;
  onOpenHistory: (transactionId: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  tableError: string | null;
  tablePage: AdminTransactionsPage;
  visibleColumns: AdminUserLogsTransactionsColumnVisibility;
};

export function AdminTransactionsTable({
  isFetching,
  isLoading,
  onOpenHistory,
  onPageChange,
  onPageSizeChange,
  tableError,
  tablePage,
  visibleColumns,
}: AdminTransactionsTableProps) {
  const columns = React.useMemo(() => createAdminTransactionsColumns({ onOpenHistory }), [onOpenHistory]);

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columns={columns}
        columnVisibility={visibleColumns}
        data={tablePage.items}
        emptyMessage="No transactions match the current filters."
        errorMessage={tableError}
        errorTitle="Transactions could not be loaded"
        getRowId={(row) => row.transactionId}
        isFetching={isFetching}
        isLoading={isLoading}
        pagination={{
          page: tablePage.page,
          pageSize: tablePage.pageSize,
          totalCount: tablePage.totalCount,
        }}
      />
      <AdminDataTablePagination
        itemLabel="transaction"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
      />
    </div>
  );
}
