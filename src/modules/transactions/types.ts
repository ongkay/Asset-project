import type { PackageActivationSnapshot } from "@/modules/packages/types";

export type ActivationSource = "payment_dummy" | "cdkey" | "admin_manual";
export type TransactionStatus = "pending" | "success" | "failed" | "canceled";

export type TransactionPackageSnapshot = Pick<PackageActivationSnapshot, "packageId" | "name" | "amountRp">;

export type TransactionRecord = {
  amountRp: number;
  code: string;
  createdAt: string;
  failureReason: string | null;
  id: string;
  listAmountRp: number;
  packageDiscountAmountRp: number;
  packageId: string;
  packageName: string;
  paidAt: string | null;
  source: ActivationSource;
  status: TransactionStatus;
  subscriptionId: string | null;
  userId: string;
  voucherCode: string | null;
  voucherDiscountAmountRp: number;
  voucherDiscountPercent: number | null;
  voucherId: string | null;
};

export type TransactionPricingSnapshot = {
  listAmountRp: number;
  packageDiscountAmountRp: number;
  voucherCode?: string | null;
  voucherDiscountAmountRp?: number;
  voucherDiscountPercent?: number | null;
  voucherId?: string | null;
};

export type CreateTransactionInput = {
  cdKeyId?: string;
  packageSnapshot: TransactionPackageSnapshot;
  pricingSnapshot?: TransactionPricingSnapshot;
  source: ActivationSource;
  subscriptionId?: string;
  userId: string;
};

export type FinalizeTransactionFailureInput = {
  failureReason: string;
  transactionId: string;
};
