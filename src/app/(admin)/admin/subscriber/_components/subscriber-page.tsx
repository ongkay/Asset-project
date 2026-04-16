"use client";

import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, UserCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchSubscriberTablePage, getSubscriberTableQueryKey } from "./subscriber-query";
import { SubscriberCancelDialog } from "./subscriber-cancel-dialog/subscriber-cancel-dialog";
import { SubscriberDialog } from "./subscriber-dialog/subscriber-dialog";
import { AdminSubscriberTable } from "./subscriber-table/subscriber-table";
import { AdminSubscriberToolbar } from "./subscriber-table/subscriber-toolbar";
import { useSubscriberTableState } from "./use-subscriber-table-state";

import type {
  AdminSubscriberPageProps,
  SubscriberCancelDialogState,
  SubscriberDialogState,
} from "./subscriber-page-types";

function formatCount(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function AdminSubscriberPage({ tablePage: initialTablePage, tableError, filters }: AdminSubscriberPageProps) {
  const [dialogState, setDialogState] = useState<SubscriberDialogState>({ mode: null, open: false });
  const [cancelDialogState, setCancelDialogState] = useState<SubscriberCancelDialogState>({ open: false, row: null });
  const tableState = useSubscriberTableState(filters);

  const isInitialQueryFilters =
    tableState.tableFilters.page === filters.page &&
    tableState.tableFilters.pageSize === filters.pageSize &&
    tableState.tableFilters.search === filters.search &&
    tableState.tableFilters.assetType === filters.assetType &&
    tableState.tableFilters.status === filters.status &&
    tableState.tableFilters.expiresFrom === filters.expiresFrom &&
    tableState.tableFilters.expiresTo === filters.expiresTo;

  const subscriberTableQuery = useQuery({
    queryKey: getSubscriberTableQueryKey(tableState.tableFilters),
    queryFn: () => fetchSubscriberTablePage(tableState.tableFilters),
    initialData: !tableError && isInitialQueryFilters ? initialTablePage : undefined,
    placeholderData: (previousData) => previousData,
  });

  const resolvedTablePage = subscriberTableQuery.data ?? initialTablePage;
  const queryError = subscriberTableQuery.error instanceof Error ? subscriberTableQuery.error.message : null;
  const tableErrorMessage = queryError ?? tableError;

  const pageStats = useMemo(() => {
    const activeCount = resolvedTablePage.items.filter((row) => row.subscriptionStatus === "active").length;
    const processedCount = resolvedTablePage.items.filter((row) => row.subscriptionStatus === "processed").length;
    const currentPageSpent = resolvedTablePage.items.reduce((totalSpent, row) => totalSpent + row.totalSpentRp, 0);

    return {
      totalRows: resolvedTablePage.totalCount,
      activeCount,
      processedCount,
      currentPageSpent,
    };
  }, [resolvedTablePage]);

  return (
    <>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total Subscriber Rows</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{formatCount(pageStats.totalRows)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">
                {formatCount(pageStats.activeCount)}
              </CardTitle>
              <Badge variant="secondary">
                <UserCheck />
                Active
              </Badge>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Processed on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">
                {formatCount(pageStats.processedCount)}
              </CardTitle>
              <Badge variant="outline">
                <Users />
                Partial
              </Badge>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Spent on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">
                Rp {formatCount(pageStats.currentPageSpent)}
              </CardTitle>
              <Badge variant="outline">
                <CreditCard />
                Success only
              </Badge>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-border/60 py-4 shadow-xs">
          <div className="flex flex-col gap-5 px-4 lg:px-6">
            <AdminSubscriberToolbar
              searchValue={tableState.searchInput}
              assetTypeValue={tableState.assetTypeFilter}
              statusValue={tableState.statusFilter}
              expiresRange={tableState.expiresRange}
              onSearchChange={tableState.setSearchInput}
              onAssetTypeChange={tableState.setAssetTypeFilter}
              onStatusChange={tableState.setStatusFilter}
              onExpiresRangeChange={tableState.setExpiresRange}
              onCreateSubscriber={() => setDialogState({ mode: "create", open: true })}
              visibleColumns={tableState.visibleColumns}
              onToggleColumn={tableState.handleToggleColumn}
            />

            <AdminSubscriberTable
              tablePage={resolvedTablePage}
              tableError={tableErrorMessage}
              visibleColumns={tableState.visibleColumns}
              isFetching={subscriberTableQuery.isFetching}
              isLoading={subscriberTableQuery.isLoading && !subscriberTableQuery.data}
              onEditRow={(row) => setDialogState({ mode: "edit", open: true, row })}
              onCancelRow={(row) => setCancelDialogState({ open: true, row })}
              onPageChange={tableState.handlePageChange}
              onPageSizeChange={tableState.handlePageSizeChange}
            />
          </div>
        </Card>
      </div>

      <SubscriberDialog
        dialogState={dialogState}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState({ mode: null, open: false });
          }
        }}
      />

      <SubscriberCancelDialog
        dialogState={cancelDialogState}
        onOpenChange={(open) => {
          if (!open) {
            setCancelDialogState({ open: false, row: null });
          }
        }}
      />
    </>
  );
}
