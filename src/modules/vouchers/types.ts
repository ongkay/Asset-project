export type VoucherScopeType = "global" | "package";
export type VoucherOperationalStatus = "active" | "exhausted" | "expired" | "inactive";

export type DiscountVoucherRow = {
  code: string;
  createdAt: string;
  createdBy: string;
  discountPercent: number;
  expiresAt: string | null;
  id: string;
  isActive: boolean;
  maxUses: number | null;
  packageId: string | null;
  scopeType: VoucherScopeType;
  updatedAt: string;
  usedCount: number;
};

export type VoucherValidationErrorCode =
  | "voucher-not-found"
  | "voucher-inactive"
  | "voucher-expired"
  | "voucher-package-mismatch"
  | "voucher-usage-limit-reached";

export type VoucherValidationError = {
  errorCode: VoucherValidationErrorCode;
  message: string;
  ok: false;
};

export type VoucherValidationSuccess = {
  discountAmountRp: number;
  ok: true;
  voucher: DiscountVoucherRow;
};

export type VoucherValidationResult = VoucherValidationError | VoucherValidationSuccess;

export type CheckoutVoucherValidationInput = {
  baseAmountRp: number;
  code: string;
  packageId: string;
};

export type VoucherUsageConsumeInput = {
  voucherId: string;
};

export type VoucherFormInput = {
  code: string;
  discountPercent: number;
  expiresAt: string | null;
  isActive: boolean;
  maxUses: number | null;
  packageId: string | null;
  scopeType: VoucherScopeType;
};

export type CreateVoucherInput = VoucherFormInput & {
  createdBy: string;
};

export type UpdateVoucherInput = VoucherFormInput & {
  id: string;
};

export type VoucherToggleInput = {
  id: string;
  isActive: boolean;
};

export type VoucherListFilters = {
  page: number;
  pageSize: number;
  scopeType: VoucherScopeType | null;
  search: string | null;
  status: "active" | "all" | "exhausted" | "expired" | "inactive";
};

export type VoucherListResult<TItem = DiscountVoucherRow> = {
  items: TItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};
