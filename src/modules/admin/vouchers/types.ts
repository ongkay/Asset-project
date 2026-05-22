import type { DiscountVoucherRow, VoucherOperationalStatus, VoucherScopeType } from "@/modules/vouchers/types";

export type VoucherTableStatusFilter = "active" | "all" | "exhausted" | "expired" | "inactive";

export type VoucherTableFilters = {
  page: number;
  pageSize: number;
  scopeType: VoucherScopeType | null;
  search: string | null;
  status: VoucherTableStatusFilter;
};

export type VoucherPackageOption = {
  checkoutGroup: string;
  isActive: boolean;
  name: string;
  packageId: string;
};

export type VoucherAdminRow = DiscountVoucherRow & {
  packageName: string | null;
  remainingUses: number | null;
  status: VoucherOperationalStatus;
};

export type VoucherTablePage = {
  items: VoucherAdminRow[];
  packageOptions: VoucherPackageOption[];
  page: number;
  pageSize: number;
  totalCount: number;
};
