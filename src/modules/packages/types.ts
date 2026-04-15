export const PACKAGE_ACCESS_KEYS = [
  "tradingview:private",
  "tradingview:share",
  "fxreplay:private",
  "fxreplay:share",
  "fxtester:private",
  "fxtester:share",
] as const;

export type PackageAccessKey = (typeof PACKAGE_ACCESS_KEYS)[number];

export type PackageSummary = "private" | "share" | "mixed";
export type PackageTableSortKey = "status" | "updatedAt";
export type PackageTableSortOrder = "asc" | "desc";

const packageAccessKeyOrderMap: ReadonlyMap<PackageAccessKey, number> = new Map(
  PACKAGE_ACCESS_KEYS.map((accessKey, index) => [accessKey, index]),
);

export function sortPackageAccessKeysCanonical(accessKeys: readonly PackageAccessKey[]): PackageAccessKey[] {
  return [...accessKeys].sort((leftAccessKey, rightAccessKey) => {
    const leftOrder = packageAccessKeyOrderMap.get(leftAccessKey) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = packageAccessKeyOrderMap.get(rightAccessKey) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}

export function derivePackageSummaryFromAccessKeys(accessKeys: readonly PackageAccessKey[]): PackageSummary | null {
  if (accessKeys.length === 0) {
    return null;
  }

  let hasPrivateAccess = false;
  let hasShareAccess = false;

  for (const accessKey of accessKeys) {
    if (accessKey.endsWith(":private")) {
      hasPrivateAccess = true;
      continue;
    }

    if (accessKey.endsWith(":share")) {
      hasShareAccess = true;
    }
  }

  if (hasPrivateAccess && hasShareAccess) {
    return "mixed";
  }

  if (hasPrivateAccess) {
    return "private";
  }

  if (hasShareAccess) {
    return "share";
  }

  return null;
}

export type PackageRow = {
  accessKeys: PackageAccessKey[];
  amountRp: number;
  checkoutUrl: string | null;
  code: string;
  createdAt: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  name: string;
  updatedAt: string;
};

export type PackageEditorData = {
  accessKeys: PackageAccessKey[];
  amountRp: number;
  checkoutUrl: string | null;
  code: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  name: string;
};

export type PackageAdminRow = {
  accessKeys: PackageAccessKey[];
  amountRp: number;
  checkoutUrl: string | null;
  code: string;
  createdAt: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  name: string;
  summary: PackageSummary;
  totalUsed: number;
  updatedAt: string;
};

export type PackageTableResult<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type PackageFormInput = {
  accessKeys: PackageAccessKey[];
  amountRp: number;
  checkoutUrl: string | null;
  durationDays: number;
  isExtended: boolean;
  name: string;
};

export type PackageToggleInput = {
  id: string;
  isActive: boolean;
};
