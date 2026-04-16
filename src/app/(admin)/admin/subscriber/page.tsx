import { getSubscriberTablePage } from "@/modules/admin/subscriptions/queries";
import { parseSubscriberTableSearchParams } from "@/modules/admin/subscriptions/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminSubscriberPage } from "./_components/subscriber-page";

import type { SubscriberTableResult } from "@/modules/admin/subscriptions/types";

type AdminSubscriberRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSubscriberRoutePage({ searchParams }: AdminSubscriberRoutePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const filters = parseSubscriberTableSearchParams(resolvedSearchParams);

  let tablePage: SubscriberTableResult = {
    items: [],
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount: 0,
  };
  let tableError: string | null = null;

  try {
    tablePage = await getSubscriberTablePage(filters);
  } catch (error) {
    tableError = error instanceof Error ? error.message : "Failed to load subscriber table.";
  }

  return (
    <AdminSubscriberPage
      key={`${filters.page}|${filters.pageSize}|${filters.search ?? ""}|${filters.assetType ?? ""}|${filters.status ?? ""}|${filters.expiresFrom ?? ""}|${filters.expiresTo ?? ""}`}
      filters={filters}
      tablePage={tablePage}
      tableError={tableError}
    />
  );
}
