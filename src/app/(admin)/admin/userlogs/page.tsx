import {
  getAdminExtensionTrackPage,
  getAdminLoginHistoryPage,
  getAdminTransactionsPage,
} from "@/modules/admin/userlogs/queries";
import { parseAdminUserLogsSearchParams } from "@/modules/admin/userlogs/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminUserLogsPage } from "./_components/userlogs-page";

import type {
  AdminExtensionTrackPage,
  AdminLoginHistoryPage,
  AdminTransactionsPage,
} from "@/modules/admin/userlogs/types";

type AdminUserLogsRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUserLogsRoutePage({ searchParams }: AdminUserLogsRoutePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const routeState = parseAdminUserLogsSearchParams(resolvedSearchParams);

  let initialLoginHistoryPage: AdminLoginHistoryPage | null = null;
  let initialExtensionTrackPage: AdminExtensionTrackPage | null = null;
  let initialTransactionsPage: AdminTransactionsPage | null = null;
  let initialActiveTabError: string | null = null;

  try {
    if (routeState.tab === "login") {
      initialLoginHistoryPage = await getAdminLoginHistoryPage(routeState.login);
    }

    if (routeState.tab === "extension") {
      initialExtensionTrackPage = await getAdminExtensionTrackPage(routeState.extension);
    }

    if (routeState.tab === "transactions") {
      initialTransactionsPage = await getAdminTransactionsPage(routeState.transactions);
    }
  } catch (error) {
    initialActiveTabError = error instanceof Error ? error.message : "Failed to load user logs.";

    if (routeState.tab === "login") {
      initialLoginHistoryPage = {
        items: [],
        page: routeState.login.page,
        pageSize: routeState.login.pageSize,
        totalCount: 0,
        availableOsValues: [],
      };
    }

    if (routeState.tab === "extension") {
      initialExtensionTrackPage = {
        items: [],
        page: routeState.extension.page,
        pageSize: routeState.extension.pageSize,
        totalCount: 0,
        availableBrowsers: [],
        availableOsValues: [],
      };
    }

    if (routeState.tab === "transactions") {
      initialTransactionsPage = {
        items: [],
        page: routeState.transactions.page,
        pageSize: routeState.transactions.pageSize,
        totalCount: 0,
        revenueSummary: {
          successAmountRp: 0,
          successCount: 0,
        },
      };
    }
  }

  return (
    <AdminUserLogsPage
      initialActiveTabError={initialActiveTabError}
      initialExtensionTrackPage={initialExtensionTrackPage}
      initialLoginHistoryPage={initialLoginHistoryPage}
      initialTransactionsPage={initialTransactionsPage}
      routeState={routeState}
    />
  );
}
