"use client";

import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

import { AdminDashboardMemberGrowthChart } from "./admin-dashboard-member-growth-chart";
import { fetchAdminDashboardSnapshot, getAdminDashboardQueryKey } from "./admin-dashboard-query";
import { AdminDashboardRecentUsersTable } from "./admin-dashboard-recent-users-table";
import { AdminDashboardSalesChart } from "./admin-dashboard-sales-chart";
import { AdminDashboardSubscriptionCompositionCard } from "./admin-dashboard-subscription-composition-card";
import { AdminDashboardTransactionsChart } from "./admin-dashboard-transactions-chart";
import { useAdminDashboardState } from "./use-admin-dashboard-state";

import type { AdminDashboardFilters, AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

type AdminDashboardPageProps = {
  initialError: string | null;
  initialFilters: AdminDashboardFilters;
  initialSnapshot: AdminDashboardSnapshot;
};

function isSameDashboardFilters(left: AdminDashboardFilters, right: AdminDashboardFilters) {
  return left.preset === right.preset && left.from === right.from && left.to === right.to;
}

function resolveAdminDashboardError(
  queryError: string | null,
  initialError: string | null,
  hasResolvedSnapshot: boolean,
) {
  return queryError ?? (hasResolvedSnapshot ? null : initialError);
}

const summaryCardCopy = [
  {
    title: "Total Member",
    description: "Total member terdaftar di sistem.",
    readValue(snapshot: AdminDashboardSnapshot) {
      return snapshot.summary.totalMembers.toLocaleString("id-ID");
    },
  },
  {
    title: "Member Berlangganan",
    description: "Member dengan subscription aktif saat ini.",
    readValue(snapshot: AdminDashboardSnapshot) {
      return snapshot.summary.totalSubscribedMembers.toLocaleString("id-ID");
    },
  },
  {
    title: "Total Asset",
    description: "Inventori asset yang tercatat di admin.",
    readValue(snapshot: AdminDashboardSnapshot) {
      return snapshot.summary.totalAssets.toLocaleString("id-ID");
    },
  },
  {
    title: "Total Transaksi Sukses",
    description: "Nilai transaksi sukses untuk range aktif.",
    readValue(snapshot: AdminDashboardSnapshot) {
      return formatCurrency(snapshot.summary.totalSuccessAmountRp, {
        currency: "IDR",
        locale: "id-ID",
        noDecimals: true,
      });
    },
  },
] as const;

export function AdminDashboardPage({ initialError, initialFilters, initialSnapshot }: AdminDashboardPageProps) {
  const state = useAdminDashboardState(initialFilters);
  const isInitialQueryFilters = isSameDashboardFilters(state.filters, initialFilters);
  const dashboardQuery = useQuery({
    queryKey: getAdminDashboardQueryKey(state.filters),
    queryFn: () => fetchAdminDashboardSnapshot(state.filters),
    initialData: !initialError && isInitialQueryFilters ? initialSnapshot : undefined,
    placeholderData: (previousData) => previousData,
    retry: false,
    staleTime: 60_000,
  });

  const resolvedSnapshot = dashboardQuery.data ?? initialSnapshot;
  const queryError = dashboardQuery.error instanceof Error ? dashboardQuery.error.message : null;
  const resolvedError = resolveAdminDashboardError(queryError, initialError, Boolean(dashboardQuery.data));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {resolvedError ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard gagal dimuat</AlertTitle>
          <AlertDescription>{resolvedError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCardCopy.map((item) => (
          <Card key={item.title} className="border-border/60 shadow-xs">
            <CardHeader className="gap-2">
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{item.readValue(resolvedSnapshot)}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDashboardSalesChart isFetching={dashboardQuery.isFetching} snapshot={resolvedSnapshot} state={state} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <AdminDashboardMemberGrowthChart series={resolvedSnapshot.memberGrowthSeries} />
        <AdminDashboardRecentUsersTable users={resolvedSnapshot.recentUsers} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <AdminDashboardTransactionsChart series={resolvedSnapshot.transactionSeries} />
        <AdminDashboardSubscriptionCompositionCard composition={resolvedSnapshot.subscriptionComposition} />
      </div>
    </div>
  );
}
