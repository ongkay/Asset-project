import "server-only";

import {
  getPackageEditorData as getPackageEditorDataFromRepository,
  listCurrentSubscriptionsByPackageIds,
  listPackages,
} from "@/modules/packages/repositories";
import {
  calculatePackageDiscountAmountRp,
  calculatePackageDiscountPercent,
  derivePackageSummaryFromAccessKeys,
  isArchivedPackage,
  sortPackageAccessKeysCanonical,
} from "@/modules/packages/types";

import { packageTableFilterSchema } from "./schemas";
import type { PackageEditorPrefill, PackageTablePage } from "./types";
import type { PackageAdminRow } from "@/modules/packages/types";

function buildPackageAdminRowOrNull(
  packageRow: Awaited<ReturnType<typeof listPackages>>["items"][number],
  totalUsed: number,
): PackageAdminRow | null {
  const summary = derivePackageSummaryFromAccessKeys(packageRow.accessKeys);

  if (!summary) {
    return null;
  }

  return {
    accessKeys: packageRow.accessKeys,
    amountRp: packageRow.amountRp,
    checkoutGroup: packageRow.checkoutGroup,
    checkoutUrl: packageRow.checkoutUrl,
    code: packageRow.code,
    createdAt: packageRow.createdAt,
    durationDays: packageRow.durationDays,
    id: packageRow.id,
    isActive: packageRow.isActive,
    isExtended: packageRow.isExtended,
    lifecycle: isArchivedPackage(packageRow.checkoutGroup) ? "archived" : "current",
    listAmountRp: packageRow.listAmountRp,
    name: packageRow.name,
    packageDiscountAmountRp: calculatePackageDiscountAmountRp(packageRow.listAmountRp, packageRow.amountRp),
    packageDiscountPercent: calculatePackageDiscountPercent(packageRow.listAmountRp, packageRow.amountRp),
    sortOrder: packageRow.sortOrder,
    summary,
    totalUsed,
    updatedAt: packageRow.updatedAt,
  };
}

export async function getPackageTablePage(input: {
  checkoutGroup?: "semi-private" | "full-private" | null;
  lifecycle?: "all" | "archived" | "current";
  order?: "asc" | "desc" | null;
  page?: number;
  pageSize?: number;
  search?: string | null;
  sort?: "status" | "updatedAt" | null;
  summary?: "private" | "share" | "mixed" | null;
}): Promise<PackageTablePage> {
  const parsedFilters = packageTableFilterSchema.parse(input);
  const packageRows = await listPackages({
    checkoutGroup: parsedFilters.checkoutGroup,
    lifecycle: parsedFilters.lifecycle,
    order: parsedFilters.order,
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    search: parsedFilters.search,
    sort: parsedFilters.sort,
    summary: parsedFilters.summary,
  });

  if (packageRows.items.length === 0) {
    return {
      items: [],
      page: parsedFilters.page,
      pageSize: parsedFilters.pageSize,
      totalCount: packageRows.totalCount,
    };
  }

  const currentSubscriptions = await listCurrentSubscriptionsByPackageIds(packageRows.items.map((row) => row.id));
  const runningCountByPackageId = currentSubscriptions.reduce<Record<string, number>>((counts, subscriptionRow) => {
    counts[subscriptionRow.package_id] = (counts[subscriptionRow.package_id] ?? 0) + 1;
    return counts;
  }, {});

  const packageItems = packageRows.items
    .map((packageRow) => buildPackageAdminRowOrNull(packageRow, runningCountByPackageId[packageRow.id] ?? 0))
    .filter((packageRow) => packageRow !== null);
  const invalidRowCount = packageRows.items.length - packageItems.length;

  return {
    items: packageItems,
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    totalCount: Math.max(0, packageRows.totalCount - invalidRowCount),
  };
}

export async function getPackageEditorData(packageId: string): Promise<PackageEditorPrefill | null> {
  const editorData = await getPackageEditorDataFromRepository(packageId);

  if (!editorData) {
    return null;
  }

  const canonicalAccessKeys = sortPackageAccessKeysCanonical(editorData.accessKeys);

  return {
    accessKeys: canonicalAccessKeys,
    amountRp: editorData.amountRp,
    checkoutGroup: editorData.checkoutGroup,
    checkoutUrl: editorData.checkoutUrl,
    code: editorData.code,
    durationDays: editorData.durationDays,
    id: editorData.id,
    isActive: editorData.isActive,
    isExtended: editorData.isExtended,
    listAmountRp: editorData.listAmountRp,
    name: editorData.name,
    sortOrder: editorData.sortOrder,
  };
}
