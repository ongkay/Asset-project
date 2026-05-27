import type {
  PaymentFulfillmentStatus,
  PaymentProvider,
  PaymentProviderStatus,
  TransactionPricingSnapshot,
  TransactionStatus,
} from "@/modules/transactions/types";

export type PaymentPageState =
  | "pending"
  | "processing"
  | "processing_failed"
  | "success"
  | "expired"
  | "canceled"
  | "failed";

export type CheckoutPaymentPackageSnapshot = {
  accessKeys: string[];
  amountRp: number;
  durationDays: number;
  isExtended: boolean;
  name: string;
  packageId: string;
};

export type CreateQrisPaymentForCheckoutInput = {
  customerEmail: string;
  customerName: string;
  packageSnapshot: CheckoutPaymentPackageSnapshot;
  pricingSnapshot: TransactionPricingSnapshot;
  userId: string;
};

export type CreateQrisPaymentForCheckoutResult =
  | {
      ok: true;
      redirectTo: `/payment/${string}`;
      transactionId: string;
    }
  | {
      errorCode:
        | "checkout-failed"
        | "payment-backend-not-ready"
        | "provider-auth-error"
        | "provider-invalid-response"
        | "provider-not-found"
        | "provider-unavailable";
      message: string;
      ok: false;
    };

export type MemberPaymentPageData = {
  amountRp: number;
  amountSubtotalRp: number;
  canCancel: boolean;
  canCheckStatus: boolean;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  failureReason: string | null;
  fulfillmentStatus: PaymentFulfillmentStatus | null;
  id: string;
  packageId: string;
  packageName: string;
  paidAt: string | null;
  paymentFeeAmountRp: number;
  provider: PaymentProvider | null;
  providerInvoiceId: string | null;
  providerPaymentUrl: string | null;
  providerStatus: PaymentProviderStatus | null;
  qrisString: string | null;
  state: PaymentPageState;
  status: TransactionStatus;
  voucherCode: string | null;
  voucherDiscountAmountRp: number;
};

export type PaymentActionResult =
  | {
      message: string | null;
      ok: true;
      payment: MemberPaymentPageData;
    }
  | {
      errorCode:
        | "checkout-failed"
        | "payment-backend-not-ready"
        | "payment-not-found"
        | "payment-not-pending"
        | "provider-auth-error"
        | "provider-invalid-response"
        | "provider-not-found"
        | "provider-unavailable";
      message: string;
      ok: false;
      payment: MemberPaymentPageData | null;
    };

export type PaymentReconcileCandidate = {
  fulfillmentStatus: PaymentFulfillmentStatus | null;
  paymentProviderStatus: PaymentProviderStatus | null;
  providerExpiredAt: string | null;
  providerInvoiceId: string;
  transactionId: string;
};

export type PaymentCronJobResult = {
  canceledCount: number;
  checkedCount: number;
  executedAt: string;
  expiredCount: number;
  failedCount: number;
  finalizedCount: number;
  job: "reconcile-qris-payments";
  ok: true;
};
