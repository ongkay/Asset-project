import { AdminPackagePage } from "./_components/package-page";
import { getPackageTablePage } from "@/modules/admin/packages/queries";
import { requireAdminShellAccess } from "@/modules/users/services";

import type { PackageTablePage } from "@/modules/admin/packages/types";
import type { PackageSummary, PackageTableSortKey, PackageTableSortOrder } from "@/modules/packages/types";

type AdminPackagePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const VALID_PACKAGE_SUMMARIES: ReadonlySet<PackageSummary> = new Set(["private", "share", "mixed"]);
const VALID_PACKAGE_TABLE_SORT_KEYS: ReadonlySet<PackageTableSortKey> = new Set(["status", "updatedAt"]);
const VALID_PACKAGE_TABLE_SORT_ORDERS: ReadonlySet<PackageTableSortOrder> = new Set(["asc", "desc"]);

function isPackageSummary(value: string): value is PackageSummary {
  return VALID_PACKAGE_SUMMARIES.has(value as PackageSummary);
}

function isPackageTableSortKey(value: string): value is PackageTableSortKey {
  return VALID_PACKAGE_TABLE_SORT_KEYS.has(value as PackageTableSortKey);
}

function isPackageTableSortOrder(value: string): value is PackageTableSortOrder {
  return VALID_PACKAGE_TABLE_SORT_ORDERS.has(value as PackageTableSortOrder);
}

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(searchValue: string | undefined): string | null {
  const trimmedSearch = searchValue?.trim();
  return trimmedSearch ? trimmedSearch : null;
}

function normalizePage(pageValue: string | undefined): number {
  if (!pageValue) {
    return 1;
  }

  const parsedPage = Number.parseInt(pageValue, 10);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}

function normalizePageSize(pageSizeValue: string | undefined): number {
  if (!pageSizeValue) {
    return 10;
  }

  const parsedPageSize = Number.parseInt(pageSizeValue, 10);

  if (!Number.isFinite(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 100) {
    return 10;
  }

  return parsedPageSize;
}

function normalizeSummary(summaryValue: string | undefined): PackageSummary | null {
  if (!summaryValue || !isPackageSummary(summaryValue)) {
    return null;
  }

  return summaryValue;
}

function normalizeSort(sortValue: string | undefined): PackageTableSortKey | null {
  if (!sortValue || !isPackageTableSortKey(sortValue)) {
    return null;
  }

  return sortValue;
}

function normalizeOrder(orderValue: string | undefined): PackageTableSortOrder | null {
  if (!orderValue || !isPackageTableSortOrder(orderValue)) {
    return null;
  }

  return orderValue;
}

export default async function AdminPackageRoutePage({ searchParams }: AdminPackagePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const normalizedSearch = normalizeSearch(readSingleSearchParam(resolvedSearchParams.search));
  const normalizedSummary = normalizeSummary(readSingleSearchParam(resolvedSearchParams.summary));
  const normalizedPage = normalizePage(readSingleSearchParam(resolvedSearchParams.page));
  const normalizedPageSize = normalizePageSize(readSingleSearchParam(resolvedSearchParams.pageSize));
  const normalizedSort = normalizeSort(readSingleSearchParam(resolvedSearchParams.sort));
  const normalizedOrder = normalizedSort
    ? (normalizeOrder(readSingleSearchParam(resolvedSearchParams.order)) ?? "asc")
    : null;

  let packageTablePage: PackageTablePage = {
    items: [],
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalCount: 0,
  };
  let packageTableError: string | null = null;

  try {
    packageTablePage = await getPackageTablePage({
      order: normalizedOrder,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      search: normalizedSearch,
      sort: normalizedSort,
      summary: normalizedSummary,
    });
  } catch (error) {
    packageTableError = error instanceof Error ? error.message : "Failed to load package table.";
  }

  return (
    <AdminPackagePage
      key={`${normalizedPage}|${normalizedPageSize}|${normalizedSearch ?? ""}|${normalizedSummary ?? ""}|${normalizedSort ?? ""}|${normalizedOrder ?? ""}`}
      initialEditorPrefillById={{}}
      filters={{
        page: normalizedPage,
        pageSize: normalizedPageSize,
        order: normalizedOrder,
        search: normalizedSearch,
        sort: normalizedSort,
        summary: normalizedSummary,
      }}
      tableError={packageTableError}
      tablePage={packageTablePage}
    />
  );
}
