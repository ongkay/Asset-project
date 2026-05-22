import { getVoucherTablePage } from "@/modules/admin/vouchers/queries";
import { parseVoucherTableSearchParams } from "@/modules/admin/vouchers/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminVoucherPage } from "./_components/voucher-page";

import type { VoucherTablePage } from "@/modules/admin/vouchers/types";

type AdminVoucherRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminVoucherRoutePage({ searchParams }: AdminVoucherRoutePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const filters = parseVoucherTableSearchParams(resolvedSearchParams);

  let tablePage: VoucherTablePage = {
    items: [],
    packageOptions: [],
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount: 0,
  };
  let tableError: string | null = null;

  try {
    tablePage = await getVoucherTablePage(filters);
  } catch (error) {
    tableError = error instanceof Error ? error.message : "Failed to load voucher table.";
  }

  return (
    <AdminVoucherPage
      key={`${filters.page}|${filters.pageSize}|${filters.search ?? ""}|${filters.scopeType ?? ""}|${filters.status}`}
      filters={filters}
      tableError={tableError}
      tablePage={tablePage}
    />
  );
}
