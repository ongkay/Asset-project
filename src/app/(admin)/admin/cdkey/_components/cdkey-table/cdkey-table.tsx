"use client";
"use no memo";

import * as React from "react";

import { AdminDataTable } from "@/components/shared/data-table/table";
import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";

import { createAdminCdKeyTableColumns } from "./cdkey-table-columns";

import type { CdKeyAdminRow, CdKeyTableResult } from "@/modules/admin/cdkeys/types";
import type { AdminCdKeyColumnVisibility } from "../cdkey-page-types";

type AdminCdKeyTableProps = {
  isFetching: boolean;
  isLoading: boolean;
  onOpenDetails: (row: CdKeyAdminRow) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  tableError: string | null;
  tablePage: CdKeyTableResult;
  visibleColumns: AdminCdKeyColumnVisibility;
};

export function AdminCdKeyTable({
  isFetching,
  isLoading,
  onOpenDetails,
  onPageChange,
  onPageSizeChange,
  tableError,
  tablePage,
  visibleColumns,
}: AdminCdKeyTableProps) {
  const columns = React.useMemo(() => createAdminCdKeyTableColumns({ onOpenDetails }), [onOpenDetails]);

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columnVisibility={visibleColumns}
        columns={columns}
        data={tablePage.items}
        emptyMessage="No CD-Keys found."
        errorMessage={tableError}
        errorTitle="CD-Key table could not be loaded"
        getRowId={(row) => row.id}
        isFetching={isFetching}
        isLoading={isLoading}
        pagination={{
          page: tablePage.page,
          pageSize: tablePage.pageSize,
          totalCount: tablePage.totalCount,
        }}
      />
      <AdminDataTablePagination
        itemLabel="cd-key"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
      />
    </div>
  );
}
