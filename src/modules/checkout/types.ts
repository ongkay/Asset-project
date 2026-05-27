export type CheckoutPaymentMethod = "qris" | "crypto" | "card";

export type CheckoutVoucherError = {
  errorCode:
    | "voucher-not-found"
    | "voucher-inactive"
    | "voucher-expired"
    | "voucher-package-mismatch"
    | "voucher-usage-limit-reached";
  message: string;
};

export type CheckoutCatalogItem = {
  amountRp: number;
  appliedVoucherAmountRp: number;
  appliedVoucherCode: string | null;
  appliedVoucherId: string | null;
  appliedVoucherPercent: number | null;
  durationDays: number;
  durationLabel: string;
  durationMonths: number;
  listAmountRp: number;
  name: string;
  originalMonthlyPriceRp: number;
  packageDiscountAmountRp: number;
  packageDiscountPercent: number;
  packageId: string;
  previewMonthlyPriceRp: number;
  previewTotalRp: number;
  sortOrder: number;
  summary: "private" | "share" | "mixed";
};

export type CheckoutCatalogGroup = {
  description: string;
  featureList: string[];
  groupKey: string;
  items: CheckoutCatalogItem[];
  label: string;
};

export type CheckoutSummaryQuote = {
  durationLabel: string;
  featureList: string[];
  groupDescription: string;
  groupKey: string;
  groupLabel: string;
  listAmountRp: number;
  packageDiscountAmountRp: number;
  packageDiscountPercent: number;
  packageId: string;
  packageName: string;
  totalRp: number;
  voucherCode: string | null;
  voucherDiscountAmountRp: number;
  voucherId: string | null;
  voucherDiscountPercent: number | null;
};

export type ResolvedCheckoutState = {
  appliedVoucherCode: string | null;
  groups: CheckoutCatalogGroup[];
  quote: CheckoutSummaryQuote | null;
  selectedGroupKey: string | null;
  selectedPackageId: string | null;
  voucherError: CheckoutVoucherError | null;
};

export type ResolveCheckoutStateInput = {
  packageId: string | null;
  voucherCode: string | null;
};

export type SubmitCheckoutInput = {
  packageId: string;
  paymentMethod: CheckoutPaymentMethod;
  voucherCode: string | null;
};

export type SubmitCheckoutResult =
  | {
      ok: true;
      redirectTo: `/payment/${string}` | "/console";
      subscriptionId?: string;
      transactionId: string;
    }
  | {
      errorCode:
        | "checkout-failed"
        | "disabled-package"
        | "invalid-package"
        | "payment-backend-not-ready"
        | "payment-method-unavailable"
        | "provider-auth-error"
        | "provider-invalid-response"
        | "provider-not-found"
        | "provider-unavailable"
        | "voucher-expired"
        | "voucher-inactive"
        | "voucher-not-found"
        | "voucher-package-mismatch"
        | "voucher-usage-limit-reached";
      message: string;
      ok: false;
    };
