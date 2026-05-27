import type { PackageActivationSnapshot } from "@/modules/packages/types";

export type ActivationSource = "payment_dummy" | "payment_qris" | "cdkey" | "admin_manual";
export type PaymentProvider = "invoiceku";
export type PaymentProviderStatus = "pending" | "paid" | "failed" | "canceled" | "expired";
export type PaymentFulfillmentStatus = "not_started" | "processing" | "fulfilled" | "failed";
export type TransactionStatus = "pending" | "success" | "failed" | "canceled";

export type TransactionPackageSnapshot = Pick<PackageActivationSnapshot, "packageId" | "name" | "amountRp">;

export type TransactionRecord = {
  amountRp: number;
  code: string;
  createdAt: string;
  failureReason: string | null;
  id: string;
  listAmountRp: number;
  paymentFeeAmountRp: number | null;
  paymentFulfillmentStatus: PaymentFulfillmentStatus | null;
  paymentProvider: PaymentProvider | null;
  paymentProviderStatus: PaymentProviderStatus | null;
  paymentReceivedAt: string | null;
  packageDiscountAmountRp: number;
  packageId: string;
  packageName: string;
  paidAt: string | null;
  providerExpiredAt: string | null;
  providerInvoiceId: string | null;
  providerPaymentUrl: string | null;
  providerPayloadJson: unknown | null;
  qrisString: string | null;
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
  paymentProvider?: PaymentProvider;
  pricingSnapshot?: TransactionPricingSnapshot;
  source: ActivationSource;
  subscriptionId?: string;
  userId: string;
};

export type SaveTransactionPaymentInvoiceDataInput = {
  amountRp: number;
  paymentFeeAmountRp: number;
  paymentProvider: PaymentProvider;
  paymentProviderStatus: PaymentProviderStatus;
  providerExpiredAt: string | null;
  providerInvoiceId: string;
  providerPayloadJson: unknown;
  providerPaymentUrl: string | null;
  qrisString: string;
  transactionId: string;
};

export type UpdateTransactionPaymentStateInput = {
  amountRp?: number;
  failureReason?: string | null;
  paymentProviderStatus: PaymentProviderStatus;
  paymentReceivedAt?: string | null;
  providerPayloadJson?: unknown;
  status?: TransactionStatus;
  transactionId: string;
};

export type FinalizeTransactionFailureInput = {
  failureReason: string;
  transactionId: string;
};
