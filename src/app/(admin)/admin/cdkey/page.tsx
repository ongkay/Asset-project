import { getCdKeyTablePage } from "@/modules/admin/cdkeys/queries";
import { parseCdKeyTableSearchParams } from "@/modules/admin/cdkeys/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminCdKeyPage } from "./_components/cdkey-page";

import type { CdKeyTableResult } from "@/modules/admin/cdkeys/types";

type AdminCdKeyRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCdKeyRoutePage({ searchParams }: AdminCdKeyRoutePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const filters = parseCdKeyTableSearchParams(resolvedSearchParams);

  let tablePage: CdKeyTableResult = {
    items: [],
    packageOptions: [],
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount: 0,
  };
  let tableError: string | null = null;

  try {
    tablePage = await getCdKeyTablePage(filters);
  } catch (error) {
    tableError = error instanceof Error ? error.message : "Failed to load CD key table.";
  }

  return (
    <AdminCdKeyPage
      key={`${filters.page}|${filters.pageSize}|${filters.search ?? ""}|${filters.status ?? ""}|${filters.packageId ?? ""}|${filters.packageSummary ?? ""}`}
      filters={filters}
      tableError={tableError}
      tablePage={tablePage}
    />
  );
}
