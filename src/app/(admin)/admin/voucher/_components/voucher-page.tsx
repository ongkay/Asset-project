"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { AdminVoucherFormDialog } from "./voucher-form-dialog/voucher-form-dialog";
import { fetchVoucherTablePage, getVoucherTableQueryKey } from "./voucher-query";
import { AdminVoucherTable } from "./voucher-table/voucher-table";
import { AdminVoucherToolbar } from "./voucher-table/voucher-table-toolbar";
import { useVoucherTableState } from "./use-voucher-table-state";

import type { AdminVoucherPageProps, VoucherFormDialogState } from "./voucher-page-types";

function getVoucherPageStats(currentPageRows: AdminVoucherPageProps["tablePage"]["items"], totalCount: number) {
  const activeCount = currentPageRows.filter((row) => row.status === "active").length;
  const expiredCount = currentPageRows.filter((row) => row.status === "expired").length;
  const exhaustedCount = currentPageRows.filter((row) => row.status === "exhausted").length;

  return {
    activeCount,
    exhaustedCount,
    expiredCount,
    totalCount,
  };
}

export function AdminVoucherPage({ filters, tableError, tablePage: initialTablePage }: AdminVoucherPageProps) {
  const [dialogState, setDialogState] = useState<VoucherFormDialogState>({ mode: null, open: false, row: null });
  const tableState = useVoucherTableState(filters);

  const isInitialQueryFilters =
    tableState.tableFilters.page === filters.page &&
    tableState.tableFilters.pageSize === filters.pageSize &&
    tableState.tableFilters.scopeType === filters.scopeType &&
    tableState.tableFilters.search === filters.search &&
    tableState.tableFilters.status === filters.status;

  const voucherTableQuery = useQuery({
    queryKey: getVoucherTableQueryKey(tableState.tableFilters),
    queryFn: () => fetchVoucherTablePage(tableState.tableFilters),
    initialData: !tableError && isInitialQueryFilters ? initialTablePage : undefined,
    placeholderData: (previousData) => previousData,
  });

  const tablePage = voucherTableQuery.data ?? initialTablePage;
  const queryError = voucherTableQuery.error instanceof Error ? voucherTableQuery.error.message : null;
  const tableErrorMessage = queryError ?? (!voucherTableQuery.data ? tableError : null);
  const pageStats = getVoucherPageStats(tablePage.items, tablePage.totalCount);

  return (
    <>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total Vouchers</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.totalCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.activeCount}</CardTitle>
              <Badge variant="secondary">
                <CheckCircle2 />
                Active
              </Badge>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Expired on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.expiredCount}</CardTitle>
              <Badge variant="outline">
                <Clock3 />
                Expired
              </Badge>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Exhausted on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.exhaustedCount}</CardTitle>
              <Badge variant="outline">
                <AlertOctagon />
                Exhausted
              </Badge>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-border/60 py-4 shadow-xs">
          <CardContent className="flex flex-col gap-5 px-4 lg:px-6">
            <AdminVoucherToolbar
              onCreateVoucher={() => setDialogState({ mode: "create", open: true })}
              onScopeChange={tableState.setScopeFilter}
              onSearchChange={tableState.setSearchInput}
              onStatusChange={tableState.setStatusFilter}
              onToggleColumn={tableState.handleToggleColumn}
              scopeValue={tableState.scopeFilter}
              searchValue={tableState.searchInput}
              statusValue={tableState.statusFilter}
              visibleColumns={tableState.visibleColumns}
            />

            <AdminVoucherTable
              isFetching={voucherTableQuery.isFetching}
              isLoading={voucherTableQuery.isLoading && !voucherTableQuery.data}
              onEditVoucher={(row) => setDialogState({ mode: "edit", open: true, row })}
              onPageChange={tableState.handlePageChange}
              onPageSizeChange={tableState.handlePageSizeChange}
              tableError={tableErrorMessage}
              tablePage={tablePage}
              visibleColumns={tableState.visibleColumns}
            />
          </CardContent>
        </Card>
      </div>

      <AdminVoucherFormDialog
        dialogState={dialogState}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState({ mode: null, open: false, row: null });
          }
        }}
        packageOptions={tablePage.packageOptions}
      />
    </>
  );
}
