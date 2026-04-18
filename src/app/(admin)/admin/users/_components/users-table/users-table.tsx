"use client";
"use no memo";

import * as React from "react";

import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";
import { AdminDataTable } from "@/components/shared/data-table/table";

import { createAdminUsersTableColumns } from "./users-columns";

import type { AdminUsersTableResult } from "@/modules/admin/users/types";
import type { AdminUsersRowActionHandlers } from "./users-types";
import type { AdminUsersColumnVisibility } from "../users-page-types";

type AdminUsersTableProps = AdminUsersRowActionHandlers & {
  isFetching: boolean;
  isLoading: boolean;
  tableError: string | null;
  tablePage: AdminUsersTableResult;
  visibleColumns: AdminUsersColumnVisibility;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function AdminUsersTable({
  isFetching,
  isLoading,
  tableError,
  tablePage,
  visibleColumns,
  onChangePassword,
  onEditUser,
  onOpenDetails,
  onPageChange,
  onPageSizeChange,
  onToggleBan,
}: AdminUsersTableProps) {
  const columns = React.useMemo(
    () =>
      createAdminUsersTableColumns({
        onChangePassword,
        onEditUser,
        onOpenDetails,
        onToggleBan,
      }),
    [onChangePassword, onEditUser, onOpenDetails, onToggleBan],
  );

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columns={columns}
        columnVisibility={visibleColumns}
        data={tablePage.items}
        emptyMessage="No users found."
        errorTitle="Users could not be loaded"
        errorMessage={tableError}
        getRowId={(row) => row.userId}
        isFetching={isFetching}
        isLoading={isLoading}
        pagination={{
          page: tablePage.page,
          pageSize: tablePage.pageSize,
          totalCount: tablePage.totalCount,
        }}
      />
      <AdminDataTablePagination
        itemLabel="user"
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
