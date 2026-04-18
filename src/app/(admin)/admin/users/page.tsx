import { getAdminUsersTablePage } from "@/modules/admin/users/queries";
import { parseAdminUsersTableSearchParams } from "@/modules/admin/users/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminUsersPage } from "./_components/users-page";

import type { AdminUsersTableResult } from "@/modules/admin/users/types";

type AdminUsersRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersRoutePage({ searchParams }: AdminUsersRoutePageProps) {
  const currentAdminUser = await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const filters = parseAdminUsersTableSearchParams(resolvedSearchParams);

  let tablePage: AdminUsersTableResult = {
    items: [],
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount: 0,
  };
  let tableError: string | null = null;

  try {
    tablePage = await getAdminUsersTablePage(filters);
  } catch (error) {
    tableError = error instanceof Error ? error.message : "Failed to load users table.";
  }

  return (
    <AdminUsersPage
      currentAdminUserId={currentAdminUser.profile.userId}
      key={`${filters.page}|${filters.pageSize}|${filters.search ?? ""}|${filters.role ?? ""}|${filters.subscriptionStatus ?? ""}|${filters.packageSummary ?? ""}`}
      filters={filters}
      tableError={tableError}
      tablePage={tablePage}
    />
  );
}
