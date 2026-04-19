"use client";

import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { LogIn, Puzzle, ReceiptText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  fetchAdminExtensionTrackPage,
  fetchAdminLoginHistoryPage,
  fetchAdminTransactionDetail,
  fetchAdminTransactionsPage,
  getAdminExtensionTrackQueryKey,
  getAdminLoginHistoryQueryKey,
  getAdminTransactionDetailQueryKey,
  getAdminTransactionsQueryKey,
} from "./userlogs-query";
import { useUserLogsState } from "./use-userlogs-state";
import { AdminExtensionTrackTable } from "./extension-track-table/extension-track-table";
import { AdminExtensionTrackToolbar } from "./extension-track-table/extension-track-toolbar";
import { AdminLoginHistoryTable } from "./login-history-table/login-history-table";
import { AdminLoginHistoryToolbar } from "./login-history-table/login-history-toolbar";
import { TransactionDetailDialog } from "./transaction-detail-dialog/transaction-detail-dialog";
import { AdminTransactionsTable } from "./transactions-table/transactions-table";
import { AdminTransactionsToolbar } from "./transactions-table/transactions-toolbar";

import type { AdminUserLogsPageProps } from "./userlogs-page-types";
import type {
  AdminExtensionTrackPage,
  AdminLoginHistoryPage,
  AdminTransactionsPage,
} from "@/modules/admin/userlogs/types";

type TransactionDialogState = { open: true; transactionId: string } | { open: false; transactionId: null };

function formatCurrency(value: number) {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

function createEmptyLoginHistoryPage(page: number, pageSize: number): AdminLoginHistoryPage {
  return {
    items: [],
    page,
    pageSize,
    totalCount: 0,
    availableOsValues: [],
  };
}

function createEmptyExtensionTrackPage(page: number, pageSize: number): AdminExtensionTrackPage {
  return {
    items: [],
    page,
    pageSize,
    totalCount: 0,
    availableBrowsers: [],
    availableOsValues: [],
  };
}

function createEmptyTransactionsPage(page: number, pageSize: number): AdminTransactionsPage {
  return {
    items: [],
    page,
    pageSize,
    totalCount: 0,
    revenueSummary: {
      successAmountRp: 0,
      successCount: 0,
    },
  };
}

export function AdminUserLogsPage({
  initialActiveTabError,
  initialExtensionTrackPage,
  initialLoginHistoryPage,
  initialTransactionsPage,
  routeState,
}: AdminUserLogsPageProps) {
  const state = useUserLogsState(routeState);
  const [transactionDialogState, setTransactionDialogState] = useState<TransactionDialogState>({
    open: false,
    transactionId: null,
  });

  const isInitialLoginFilters = JSON.stringify(state.routeState.login) === JSON.stringify(routeState.login);
  const isInitialExtensionFilters = JSON.stringify(state.routeState.extension) === JSON.stringify(routeState.extension);
  const isInitialTransactionsFilters =
    JSON.stringify(state.routeState.transactions) === JSON.stringify(routeState.transactions);

  const loginHistoryQuery = useQuery({
    queryKey: getAdminLoginHistoryQueryKey(state.routeState.login),
    queryFn: () => fetchAdminLoginHistoryPage(state.routeState.login),
    enabled: state.activeTab === "login",
    initialData:
      state.activeTab === "login" && !initialActiveTabError && isInitialLoginFilters
        ? (initialLoginHistoryPage ?? undefined)
        : undefined,
    placeholderData: (previousData) => previousData,
  });
  const extensionTrackQuery = useQuery({
    queryKey: getAdminExtensionTrackQueryKey(state.routeState.extension),
    queryFn: () => fetchAdminExtensionTrackPage(state.routeState.extension),
    enabled: state.activeTab === "extension",
    initialData:
      state.activeTab === "extension" && !initialActiveTabError && isInitialExtensionFilters
        ? (initialExtensionTrackPage ?? undefined)
        : undefined,
    placeholderData: (previousData) => previousData,
  });
  const transactionsQuery = useQuery({
    queryKey: getAdminTransactionsQueryKey(state.routeState.transactions),
    queryFn: () => fetchAdminTransactionsPage(state.routeState.transactions),
    enabled: state.activeTab === "transactions",
    initialData:
      state.activeTab === "transactions" && !initialActiveTabError && isInitialTransactionsFilters
        ? (initialTransactionsPage ?? undefined)
        : undefined,
    placeholderData: (previousData) => previousData,
  });

  const detailTransactionId = transactionDialogState.open ? transactionDialogState.transactionId : null;
  const transactionDetailQuery = useQuery({
    queryKey: detailTransactionId
      ? getAdminTransactionDetailQueryKey(detailTransactionId)
      : [...getAdminTransactionDetailQueryKey("empty"), "disabled"],
    queryFn: () => fetchAdminTransactionDetail(detailTransactionId as string),
    enabled: Boolean(detailTransactionId),
  });

  const loginHistoryPage =
    loginHistoryQuery.data ??
    initialLoginHistoryPage ??
    createEmptyLoginHistoryPage(state.routeState.login.page, state.routeState.login.pageSize);
  const extensionTrackPage =
    extensionTrackQuery.data ??
    initialExtensionTrackPage ??
    createEmptyExtensionTrackPage(state.routeState.extension.page, state.routeState.extension.pageSize);
  const transactionsPage =
    transactionsQuery.data ??
    initialTransactionsPage ??
    createEmptyTransactionsPage(state.routeState.transactions.page, state.routeState.transactions.pageSize);

  const loginHistoryError =
    loginHistoryQuery.error instanceof Error
      ? loginHistoryQuery.error.message
      : state.activeTab === "login" && !loginHistoryQuery.data
        ? initialActiveTabError
        : null;
  const extensionTrackError =
    extensionTrackQuery.error instanceof Error
      ? extensionTrackQuery.error.message
      : state.activeTab === "extension" && !extensionTrackQuery.data
        ? initialActiveTabError
        : null;
  const transactionsError =
    transactionsQuery.error instanceof Error
      ? transactionsQuery.error.message
      : state.activeTab === "transactions" && !transactionsQuery.data
        ? initialActiveTabError
        : null;

  const transactionsSummaryItems = useMemo(
    () => [
      {
        label: "Successful Transactions",
        value: transactionsPage.revenueSummary.successCount.toLocaleString("id-ID"),
      },
      {
        label: "Revenue (Filtered)",
        value: formatCurrency(transactionsPage.revenueSummary.successAmountRp),
      },
    ],
    [transactionsPage.revenueSummary.successAmountRp, transactionsPage.revenueSummary.successCount],
  );

  return (
    <>
      <Tabs
        className="@container/main flex flex-col gap-4 md:gap-6"
        onValueChange={(value) => state.setActiveTab(value as typeof state.activeTab)}
        value={state.activeTab}
      >
        <Card className="border-border/60 py-4 shadow-xs">
          <CardHeader className="gap-4 px-4 pb-4 lg:px-6">
            <div className="space-y-1">
              <CardTitle>User Logs</CardTitle>
              <CardDescription>
                Review login history, extension activity, and transaction records without leaving the admin workspace.
              </CardDescription>
            </div>
            <TabsList className="w-full justify-start overflow-x-auto" variant="line">
              <TabsTrigger value="login">
                <LogIn data-icon="inline-start" />
                Login History
              </TabsTrigger>
              <TabsTrigger value="extension">
                <Puzzle data-icon="inline-start" />
                Extension Track
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <ReceiptText data-icon="inline-start" />
                Transactions
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="flex flex-col gap-5 px-4 lg:px-6">
            <TabsContent className="flex flex-col gap-5" value="login">
              <AdminLoginHistoryToolbar
                availableOsValues={loginHistoryPage.availableOsValues}
                dateRange={state.loginDateRange}
                onDateRangeChange={state.setLoginDateRange}
                onOsChange={state.setLoginOsFilter}
                onSearchChange={state.setLoginSearchInput}
                onToggleColumn={state.loginColumnVisibility.handleToggleColumn}
                osValue={state.loginOsFilter}
                searchValue={state.loginSearchInput}
                visibleColumns={state.loginColumnVisibility.visibleColumns}
              />
              <AdminLoginHistoryTable
                isFetching={loginHistoryQuery.isFetching}
                isLoading={loginHistoryQuery.isLoading && !loginHistoryQuery.data}
                onPageChange={state.handleLoginPageChange}
                onPageSizeChange={state.handleLoginPageSizeChange}
                tableError={loginHistoryError}
                tablePage={loginHistoryPage}
                visibleColumns={state.loginColumnVisibility.visibleColumns}
              />
            </TabsContent>

            <TabsContent className="flex flex-col gap-5" value="extension">
              <AdminExtensionTrackToolbar
                availableBrowsers={extensionTrackPage.availableBrowsers}
                availableOsValues={extensionTrackPage.availableOsValues}
                browserValue={state.extensionBrowserFilter}
                dateRange={state.extensionDateRange}
                onBrowserChange={state.setExtensionBrowserFilter}
                onDateRangeChange={state.setExtensionDateRange}
                onOsChange={state.setExtensionOsFilter}
                onSearchChange={state.setExtensionSearchInput}
                onToggleColumn={state.extensionColumnVisibility.handleToggleColumn}
                osValue={state.extensionOsFilter}
                searchValue={state.extensionSearchInput}
                visibleColumns={state.extensionColumnVisibility.visibleColumns}
              />
              <AdminExtensionTrackTable
                isFetching={extensionTrackQuery.isFetching}
                isLoading={extensionTrackQuery.isLoading && !extensionTrackQuery.data}
                onPageChange={state.handleExtensionPageChange}
                onPageSizeChange={state.handleExtensionPageSizeChange}
                tableError={extensionTrackError}
                tablePage={extensionTrackPage}
                visibleColumns={state.extensionColumnVisibility.visibleColumns}
              />
            </TabsContent>

            <TabsContent className="flex flex-col gap-5" value="transactions">
              <div className="grid gap-4 lg:grid-cols-2">
                {transactionsSummaryItems.map((item) => (
                  <Card
                    className="border-border/60 bg-linear-to-br from-card via-card to-primary/5 shadow-xs"
                    key={item.label}
                  >
                    <CardHeader>
                      <CardDescription>{item.label}</CardDescription>
                      <CardTitle className="font-semibold text-2xl tabular-nums">{item.value}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <AdminTransactionsToolbar
                dateRange={state.transactionDateRange}
                onDateRangeChange={state.setTransactionDateRange}
                onSearchChange={state.setTransactionSearchInput}
                onSourceChange={state.setTransactionSourceFilter}
                onStatusChange={state.setTransactionStatusFilter}
                onToggleColumn={state.transactionsColumnVisibility.handleToggleColumn}
                searchValue={state.transactionSearchInput}
                sourceValue={state.transactionSourceFilter}
                statusValue={state.transactionStatusFilter}
                visibleColumns={state.transactionsColumnVisibility.visibleColumns}
              />
              <AdminTransactionsTable
                isFetching={transactionsQuery.isFetching}
                isLoading={transactionsQuery.isLoading && !transactionsQuery.data}
                onOpenHistory={(transactionId) => setTransactionDialogState({ open: true, transactionId })}
                onPageChange={state.handleTransactionsPageChange}
                onPageSizeChange={state.handleTransactionsPageSizeChange}
                tableError={transactionsError}
                tablePage={transactionsPage}
                visibleColumns={state.transactionsColumnVisibility.visibleColumns}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <TransactionDetailDialog
        detail={transactionDetailQuery.data ?? null}
        errorMessage={transactionDetailQuery.error instanceof Error ? transactionDetailQuery.error.message : null}
        loading={transactionDetailQuery.isLoading}
        onOpenChange={(open) => {
          if (!open) {
            setTransactionDialogState({ open: false, transactionId: null });
          }
        }}
        open={transactionDialogState.open}
      />
    </>
  );
}
