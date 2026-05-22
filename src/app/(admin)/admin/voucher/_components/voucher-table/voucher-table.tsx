"use client";
"use no memo";

import * as React from "react";

import { AdminDataTable } from "@/components/shared/data-table/table";
import { AdminDataTablePagination } from "@/components/shared/data-table/pagination";

import { createAdminVoucherTableColumns } from "./voucher-table-columns";

import type { VoucherAdminRow, VoucherTablePage } from "@/modules/admin/vouchers/types";
import type { AdminVoucherColumnVisibility } from "../voucher-page-types";

type AdminVoucherTableProps = {
  isFetching: boolean;
  isLoading: boolean;
  onEditVoucher: (row: VoucherAdminRow) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  tableError: string | null;
  tablePage: VoucherTablePage;
  visibleColumns: AdminVoucherColumnVisibility;
};

export function AdminVoucherTable({
  isFetching,
  isLoading,
  onEditVoucher,
  onPageChange,
  onPageSizeChange,
  tableError,
  tablePage,
  visibleColumns,
}: AdminVoucherTableProps) {
  const columns = React.useMemo(() => createAdminVoucherTableColumns({ onEditVoucher }), [onEditVoucher]);

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <AdminDataTable
        columnVisibility={visibleColumns}
        columns={columns}
        data={tablePage.items}
        emptyMessage="No vouchers found."
        errorMessage={tableError}
        errorTitle="Voucher table could not be loaded"
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
        itemLabel="voucher"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={tablePage.page}
        pageSize={tablePage.pageSize}
        totalCount={tablePage.totalCount}
      />
    </div>
  );
}
