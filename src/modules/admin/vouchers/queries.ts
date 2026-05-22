import "server-only";

import { listPackages, listPackageRowsByIds } from "@/modules/packages/repositories";
import { getVoucherOperationalStatus, listVouchers } from "@/modules/vouchers/services";

import { voucherTableFilterSchema } from "./schemas";

import type { VoucherAdminRow, VoucherPackageOption, VoucherTablePage } from "./types";

function mapVoucherPackageOptions(
  packageRows: Awaited<ReturnType<typeof listPackages>>["items"],
): VoucherPackageOption[] {
  return packageRows.map((packageRow) => ({
    checkoutGroup: packageRow.checkoutGroup,
    isActive: packageRow.isActive,
    name: packageRow.name,
    packageId: packageRow.id,
  }));
}

async function listVoucherPackageOptions() {
  const packageRows = await listPackages({
    checkoutGroup: null,
    lifecycle: "current",
    order: null,
    page: 1,
    pageSize: 100,
    search: null,
    sort: null,
    summary: null,
  });

  return mapVoucherPackageOptions(packageRows.items);
}

function buildVoucherAdminRows(
  voucherRows: Awaited<ReturnType<typeof listVouchers>>["items"],
  packageNameById: ReadonlyMap<string, string>,
  now: Date,
): VoucherAdminRow[] {
  return voucherRows.map((voucherRow) => ({
    ...voucherRow,
    packageName: voucherRow.packageId ? (packageNameById.get(voucherRow.packageId) ?? null) : null,
    remainingUses: voucherRow.maxUses === null ? null : Math.max(0, voucherRow.maxUses - voucherRow.usedCount),
    status: getVoucherOperationalStatus(voucherRow, now),
  }));
}

export async function getVoucherTablePage(input: {
  page?: number;
  pageSize?: number;
  scopeType?: "global" | "package" | null;
  search?: string | null;
  status?: "active" | "all" | "exhausted" | "expired" | "inactive";
}): Promise<VoucherTablePage> {
  const parsedFilters = voucherTableFilterSchema.parse(input);
  const now = new Date();
  const [tablePage, packageOptions] = await Promise.all([
    listVouchers(parsedFilters, now),
    listVoucherPackageOptions(),
  ]);

  const packageIds = tablePage.items.flatMap((voucherRow) => (voucherRow.packageId ? [voucherRow.packageId] : []));
  const packageRows = await listPackageRowsByIds([...new Set(packageIds)]);
  const packageNameById = new Map(packageRows.map((packageRow) => [packageRow.id, packageRow.name]));

  return {
    items: buildVoucherAdminRows(tablePage.items, packageNameById, now),
    packageOptions,
    page: tablePage.page,
    pageSize: tablePage.pageSize,
    totalCount: tablePage.totalCount,
  };
}
