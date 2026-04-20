import { getAdminDashboardSnapshot } from "@/modules/admin/dashboard/queries";
import { parseAdminDashboardSearchParams, resolveAdminDashboardRange } from "@/modules/admin/dashboard/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminDashboardPage } from "./_components/admin-dashboard-page";

import type { AdminDashboardFilters, AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

type AdminRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function createEmptyDashboardSnapshot(filters: AdminDashboardFilters): AdminDashboardSnapshot {
  const range = resolveAdminDashboardRange(filters);

  return {
    summary: {
      totalMembers: 0,
      totalSubscribedMembers: 0,
      totalAssets: 0,
      totalSuccessAmountRp: 0,
    },
    salesSeries: [],
    memberGrowthSeries: [],
    transactionSeries: [],
    subscriptionComposition: {
      private: 0,
      share: 0,
      mixed: 0,
    },
    recentUsers: [],
    range,
  };
}

export default async function AdminRoutePage({ searchParams }: AdminRoutePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const initialFilters = parseAdminDashboardSearchParams(resolvedSearchParams);

  let initialSnapshot = createEmptyDashboardSnapshot(initialFilters);
  let initialError: string | null = null;

  try {
    initialSnapshot = await getAdminDashboardSnapshot(initialFilters);
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Failed to load admin dashboard.";
  }

  return (
    <AdminDashboardPage initialError={initialError} initialFilters={initialFilters} initialSnapshot={initialSnapshot} />
  );
}
