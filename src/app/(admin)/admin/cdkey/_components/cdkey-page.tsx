"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { AdminCdKeyDetailDialog } from "./cdkey-detail-dialog/cdkey-detail-dialog";
import {
  fetchCdKeyDetailSnapshot,
  fetchCdKeyTablePage,
  getCdKeyDetailQueryKey,
  getCdKeyTableQueryKey,
} from "./cdkey-query";
import { AdminCdKeyFormDialog } from "./cdkey-form-dialog/cdkey-form-dialog";
import { AdminCdKeyTable } from "./cdkey-table/cdkey-table";
import { AdminCdKeyToolbar } from "./cdkey-table/cdkey-table-toolbar";
import { useCdKeyTableState } from "./use-cdkey-table-state";

import type {
  AdminCdKeyDetailDialogPayload,
  AdminCdKeyPageProps,
  CdKeyDetailDialogState,
  CdKeyFormDialogState,
} from "./cdkey-page-types";

function getPageStats(tableTotalCount: number, currentPageRows: AdminCdKeyPageProps["tablePage"]["items"]) {
  const usedCount = currentPageRows.filter((row) => row.status === "used").length;
  const unusedCount = currentPageRows.length - usedCount;

  return {
    usedCount,
    unusedCount,
    totalCount: tableTotalCount,
    currentPageCount: currentPageRows.length,
  };
}

export function AdminCdKeyPage({ tablePage: initialTablePage, tableError, filters }: AdminCdKeyPageProps) {
  const [formDialogState, setFormDialogState] = useState<CdKeyFormDialogState>({ open: false });
  const [detailDialogState, setDetailDialogState] = useState<CdKeyDetailDialogState>({ open: false, row: null });
  const tableState = useCdKeyTableState(filters);

  const isInitialQueryFilters =
    tableState.tableFilters.page === filters.page &&
    tableState.tableFilters.pageSize === filters.pageSize &&
    tableState.tableFilters.search === filters.search &&
    tableState.tableFilters.status === filters.status &&
    tableState.tableFilters.packageId === filters.packageId &&
    tableState.tableFilters.packageSummary === filters.packageSummary;

  const cdKeyTableQuery = useQuery({
    queryKey: getCdKeyTableQueryKey(tableState.tableFilters),
    queryFn: () => fetchCdKeyTablePage(tableState.tableFilters),
    initialData: !tableError && isInitialQueryFilters ? initialTablePage : undefined,
    placeholderData: (previousData) => previousData,
  });

  const tablePage = cdKeyTableQuery.data ?? initialTablePage;
  const queryError = cdKeyTableQuery.error instanceof Error ? cdKeyTableQuery.error.message : null;
  const tableErrorMessage = queryError ?? (!cdKeyTableQuery.data ? tableError : null);

  const detailRow = detailDialogState.open ? detailDialogState.row : null;
  const detailQuery = useQuery({
    queryKey: detailRow ? getCdKeyDetailQueryKey(detailRow.id) : [...getCdKeyDetailQueryKey("empty"), "disabled"],
    queryFn: () => fetchCdKeyDetailSnapshot({ id: detailRow?.id ?? "" }),
    enabled: Boolean(detailRow),
  });

  const detailPayload: AdminCdKeyDetailDialogPayload | null =
    detailRow && detailQuery.data
      ? { row: detailRow, detail: detailQuery.data }
      : detailRow
        ? { row: detailRow, detail: null }
        : null;

  const pageStats = getPageStats(tablePage.totalCount, tablePage.items);

  return (
    <>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total CD-Keys</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.totalCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Unused on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.unusedCount}</CardTitle>
              <Badge variant="secondary">
                <CircleDashed />
                Unused
              </Badge>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Used on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.usedCount}</CardTitle>
              <Badge variant="outline">
                <CheckCircle2 />
                Used
              </Badge>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Rows on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.currentPageCount}</CardTitle>
              <Badge variant="outline">
                <ListChecks />
                Visible
              </Badge>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-border/60 py-4 shadow-xs">
          <CardContent className="flex flex-col gap-5 px-4 lg:px-6">
            <AdminCdKeyToolbar
              onIssueCdKey={() => setFormDialogState({ open: true })}
              onSearchChange={tableState.setSearchInput}
              onStatusChange={tableState.setStatusFilter}
              onPackageChange={tableState.setPackageFilter}
              onPackageSummaryChange={tableState.setPackageSummaryFilter}
              onToggleColumn={tableState.handleToggleColumn}
              packageOptions={tablePage.packageOptions}
              searchValue={tableState.searchInput}
              statusValue={tableState.statusFilter}
              packageValue={tableState.packageFilter}
              packageSummaryValue={tableState.packageSummaryFilter}
              visibleColumns={tableState.visibleColumns}
            />

            <AdminCdKeyTable
              isFetching={cdKeyTableQuery.isFetching}
              isLoading={cdKeyTableQuery.isLoading && !cdKeyTableQuery.data}
              onOpenDetails={(row) => setDetailDialogState({ open: true, row })}
              onPageChange={tableState.handlePageChange}
              onPageSizeChange={tableState.handlePageSizeChange}
              tableError={tableErrorMessage}
              tablePage={tablePage}
              visibleColumns={tableState.visibleColumns}
            />
          </CardContent>
        </Card>
      </div>

      <AdminCdKeyFormDialog open={formDialogState.open} onOpenChange={(open) => setFormDialogState({ open })} />

      <AdminCdKeyDetailDialog
        open={detailDialogState.open}
        payload={detailPayload}
        loading={detailQuery.isLoading}
        errorMessage={detailQuery.error instanceof Error ? detailQuery.error.message : null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailDialogState({ open: false, row: null });
          }
        }}
      />
    </>
  );
}
