import { getPackageTablePage } from "@/modules/admin/packages/queries";
import { parsePackageTableSearchParams } from "@/modules/admin/packages/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminPackagePage } from "./_components/package-page";
import type { PackageTablePage } from "@/modules/admin/packages/types";

type AdminPackagePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPackageRoutePage({ searchParams }: AdminPackagePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const filters = parsePackageTableSearchParams(resolvedSearchParams);

  let packageTablePage: PackageTablePage = {
    items: [],
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount: 0,
  };
  let packageTableError: string | null = null;

  try {
    packageTablePage = await getPackageTablePage(filters);
  } catch (error) {
    packageTableError = error instanceof Error ? error.message : "Failed to load package table.";
  }

  return (
    <AdminPackagePage
      key={`${filters.page}|${filters.pageSize}|${filters.search ?? ""}|${filters.summary ?? ""}|${filters.sort ?? ""}|${filters.order ?? ""}`}
      initialEditorPrefillById={{}}
      filters={filters}
      tableError={packageTableError}
      tablePage={packageTablePage}
    />
  );
}
