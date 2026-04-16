"use client";
"use no memo";

import * as React from "react";

import { AdminDataTable } from "@/components/shared/data-table/table";
import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";

import { createAdminAssetTableColumns } from "./assets-columns";

import type { AssetTableResult } from "@/modules/admin/assets/types";
import type { AdminAssetColumnVisibility } from "../assets-page-types";

type AdminAssetsTableProps = {
  tablePage: AssetTableResult;
  tableError: string | null;
  visibleColumns: AdminAssetColumnVisibility;
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onOpenDetails: (assetId: string) => void;
};

export function AdminAssetsTable({
  tablePage,
  tableError,
  visibleColumns,
  isFetching,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onOpenDetails,
}: AdminAssetsTableProps) {
  const columns = React.useMemo(() => createAdminAssetTableColumns({ onOpenDetails }), [onOpenDetails]);

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columns={columns}
        columnVisibility={visibleColumns}
        data={tablePage.items}
        emptyMessage="No assets found."
        errorTitle="Assets could not be loaded"
        errorMessage={tableError}
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
        itemLabel="asset"
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
