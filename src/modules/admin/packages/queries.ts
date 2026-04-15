import "server-only";

import { packageTableFilterSchema } from "@/modules/packages/schemas";
import {
  getPackageEditorData as getPackageEditorDataFromRepository,
  listCurrentSubscriptionsByPackageIds,
  listPackages,
} from "@/modules/packages/repositories";
import { derivePackageSummaryFromAccessKeys, sortPackageAccessKeysCanonical } from "@/modules/packages/types";

import type { PackageEditorPrefill, PackageTablePage } from "./types";

function requirePackageSummaryFromAccessKeys(accessKeys: Parameters<typeof derivePackageSummaryFromAccessKeys>[0]) {
  const summary = derivePackageSummaryFromAccessKeys(accessKeys);

  if (!summary) {
    throw new Error("Package summary cannot be derived from access keys.");
  }

  return summary;
}

export async function getPackageTablePage(input: {
  page?: number;
  pageSize?: number;
  search?: string | null;
  summary?: "private" | "share" | "mixed" | null;
}): Promise<PackageTablePage> {
  const parsedFilters = packageTableFilterSchema.parse(input);
  const packageRows = await listPackages({
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    search: parsedFilters.search,
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

  const packageItems = packageRows.items.map((packageRow) => ({
    amountRp: packageRow.amountRp,
    checkoutUrl: packageRow.checkoutUrl,
    code: packageRow.code,
    createdAt: packageRow.createdAt,
    durationDays: packageRow.durationDays,
    id: packageRow.id,
    isActive: packageRow.isActive,
    isExtended: packageRow.isExtended,
    name: packageRow.name,
    summary: requirePackageSummaryFromAccessKeys(packageRow.accessKeys),
    totalUsed: runningCountByPackageId[packageRow.id] ?? 0,
    updatedAt: packageRow.updatedAt,
  }));

  return {
    items: packageItems,
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    totalCount: packageRows.totalCount,
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
    checkoutUrl: editorData.checkoutUrl,
    code: editorData.code,
    durationDays: editorData.durationDays,
    id: editorData.id,
    isActive: editorData.isActive,
    isExtended: editorData.isExtended,
    name: editorData.name,
  };
}
