export const PACKAGE_ACCESS_KEYS = [
  "tradingview:private",
  "tradingview:share",
  "fxreplay:private",
  "fxreplay:share",
  "fxtester:private",
  "fxtester:share",
] as const;

export const PACKAGE_CHECKOUT_GROUPS = ["semi-private", "full-private", "legacy"] as const;
export const EDITABLE_PACKAGE_CHECKOUT_GROUPS = ["semi-private", "full-private"] as const;

export type PackageAccessKey = (typeof PACKAGE_ACCESS_KEYS)[number];
export type PackageCheckoutGroup = (typeof PACKAGE_CHECKOUT_GROUPS)[number];
export type EditablePackageCheckoutGroup = (typeof EDITABLE_PACKAGE_CHECKOUT_GROUPS)[number];
export type PackageAdminLifecycle = "current" | "archived";

export function isPackageAccessKey(value: unknown): value is PackageAccessKey {
  return typeof value === "string" && (PACKAGE_ACCESS_KEYS as readonly string[]).includes(value);
}

export function isEditablePackageCheckoutGroup(value: unknown): value is EditablePackageCheckoutGroup {
  return typeof value === "string" && (EDITABLE_PACKAGE_CHECKOUT_GROUPS as readonly string[]).includes(value);
}

export function isArchivedPackage(checkoutGroup: PackageCheckoutGroup) {
  return checkoutGroup === "legacy";
}

export function calculatePackageDiscountAmountRp(listAmountRp: number, amountRp: number) {
  return Math.max(0, listAmountRp - amountRp);
}

export function calculatePackageDiscountPercent(listAmountRp: number, amountRp: number) {
  if (listAmountRp <= 0) {
    return 0;
  }

  return Math.round((calculatePackageDiscountAmountRp(listAmountRp, amountRp) / listAmountRp) * 100);
}

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
  checkoutGroup: PackageCheckoutGroup;
  checkoutUrl: string | null;
  code: string;
  createdAt: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  listAmountRp: number;
  name: string;
  sortOrder: number;
  updatedAt: string;
};

export type PackageIssuableSnapshot = {
  checkoutGroup: PackageCheckoutGroup;
  id: string;
  listAmountRp: number;
  summary: PackageSummary;
  sortOrder: number;
} & PackageActivationSnapshot;

export type PackageActivationSnapshot = {
  packageId: string;
  accessKeys: PackageAccessKey[];
  amountRp: number;
  durationDays: number;
  isExtended: boolean;
  name: string;
};

export type MemberPurchasablePackage = PackageIssuableSnapshot;

export type PackageEditorData = {
  accessKeys: PackageAccessKey[];
  amountRp: number;
  checkoutGroup: PackageCheckoutGroup;
  checkoutUrl: string | null;
  code: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  listAmountRp: number;
  name: string;
  sortOrder: number;
};

export type PackageAdminRow = {
  accessKeys: PackageAccessKey[];
  amountRp: number;
  checkoutGroup: PackageCheckoutGroup;
  checkoutUrl: string | null;
  code: string;
  createdAt: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  lifecycle: PackageAdminLifecycle;
  listAmountRp: number;
  name: string;
  packageDiscountAmountRp: number;
  packageDiscountPercent: number;
  sortOrder: number;
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
  checkoutGroup: EditablePackageCheckoutGroup;
  checkoutUrl: string | null;
  durationDays: number;
  isExtended: boolean;
  listAmountRp: number;
  name: string;
  sortOrder: number;
};

export type PackageToggleInput = {
  id: string;
  isActive: boolean;
};
