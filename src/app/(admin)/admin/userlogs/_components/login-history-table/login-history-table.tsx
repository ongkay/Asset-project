"use client";
"use no memo";

import * as React from "react";

import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";
import { AdminDataTable } from "@/components/shared/data-table/table";

import { createAdminLoginHistoryColumns } from "./login-history-columns";

import type { AdminLoginHistoryPage } from "@/modules/admin/userlogs/types";
import type { AdminUserLogsLoginColumnVisibility } from "../userlogs-page-types";

type AdminLoginHistoryTableProps = {
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  tableError: string | null;
  tablePage: AdminLoginHistoryPage;
  visibleColumns: AdminUserLogsLoginColumnVisibility;
};

export function AdminLoginHistoryTable({
  isFetching,
  isLoading,
  onPageChange,
  onPageSizeChange,
  tableError,
  tablePage,
  visibleColumns,
}: AdminLoginHistoryTableProps) {
  const columns = React.useMemo(() => createAdminLoginHistoryColumns(), []);

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columns={columns}
        columnVisibility={visibleColumns}
        data={tablePage.items}
        emptyMessage="No login history matches the current filters."
        errorMessage={tableError}
        errorTitle="Login history could not be loaded"
        getRowId={(row) => row.loginLogId}
        isFetching={isFetching}
        isLoading={isLoading}
        pagination={{
          page: tablePage.page,
          pageSize: tablePage.pageSize,
          totalCount: tablePage.totalCount,
        }}
      />
      <AdminDataTablePagination
        itemLabel="login record"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
      />
    </div>
  );
}
