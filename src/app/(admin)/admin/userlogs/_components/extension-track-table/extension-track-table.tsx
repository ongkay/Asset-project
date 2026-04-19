"use client";
"use no memo";

import * as React from "react";

import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";
import { AdminDataTable } from "@/components/shared/data-table/table";

import { createAdminExtensionTrackColumns } from "./extension-track-columns";

import type { AdminExtensionTrackPage } from "@/modules/admin/userlogs/types";
import type { AdminUserLogsExtensionColumnVisibility } from "../userlogs-page-types";

type AdminExtensionTrackTableProps = {
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  tableError: string | null;
  tablePage: AdminExtensionTrackPage;
  visibleColumns: AdminUserLogsExtensionColumnVisibility;
};

export function AdminExtensionTrackTable({
  isFetching,
  isLoading,
  onPageChange,
  onPageSizeChange,
  tableError,
  tablePage,
  visibleColumns,
}: AdminExtensionTrackTableProps) {
  const columns = React.useMemo(() => createAdminExtensionTrackColumns(), []);

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columns={columns}
        columnVisibility={visibleColumns}
        data={tablePage.items}
        emptyMessage="No extension activity matches the current filters."
        errorMessage={tableError}
        errorTitle="Extension activity could not be loaded"
        getRowId={(row) => row.extensionTrackId}
        isFetching={isFetching}
        isLoading={isLoading}
        pagination={{
          page: tablePage.page,
          pageSize: tablePage.pageSize,
          totalCount: tablePage.totalCount,
        }}
      />
      <AdminDataTablePagination
        itemLabel="extension record"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
      />
    </div>
  );
}
