"use client";
"use no memo";

import * as React from "react";

import { AdminDataTable } from "@/components/shared/data-table/table";
import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";

import { createAdminPackageTableColumns } from "./package-table-columns";

import type { PackageTablePage } from "@/modules/admin/packages/types";
import type { PackageTableSortKey, PackageTableSortOrder } from "@/modules/packages/types";
import type { AdminPackageColumnVisibility } from "../package-page-types";

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

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columnVisibility={visibleColumns}
        columns={columns}
        data={tablePage.items}
        emptyMessage="No packages found."
        errorMessage={tableError}
        errorTitle="Packages could not be loaded"
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
        itemLabel="package"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
      />
    </div>
  );
}
