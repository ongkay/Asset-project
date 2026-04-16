import { getAssetTablePage } from "@/modules/admin/assets/queries";
import { parseAssetTableSearchParams } from "@/modules/admin/assets/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminAssetsPage } from "./_components/assets-page";

import type { AssetTableResult } from "@/modules/admin/assets/types";

type AdminAssetsRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAssetsRoutePage({ searchParams }: AdminAssetsRoutePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const filters = parseAssetTableSearchParams(resolvedSearchParams);

  let tablePage: AssetTableResult = {
    items: [],
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount: 0,
  };
  let tableError: string | null = null;

  try {
    tablePage = await getAssetTablePage(filters);
  } catch (error) {
    tableError = error instanceof Error ? error.message : "Failed to load asset table.";
  }

  return (
    <AdminAssetsPage
      key={`${filters.page}|${filters.pageSize}|${filters.search ?? ""}|${filters.assetType ?? ""}|${filters.status ?? ""}|${filters.expiresFrom ?? ""}|${filters.expiresTo ?? ""}`}
      filters={filters}
      tablePage={tablePage}
      tableError={tableError}
      initialEditorPrefillById={{}}
    />
  );
}
