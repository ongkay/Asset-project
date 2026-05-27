import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

import { derivePaymentPageState, mapTransactionToPaymentPageData } from "@/modules/payments/queries";

function createPaymentTransaction() {
  return {
    amountRp: 90123,
    code: "TRX-0001",
    createdAt: "2026-05-22T10:00:00.000Z",
    failureReason: null,
    id: "11111111-1111-4111-8111-111111111111",
    listAmountRp: 100000,
    paymentFeeAmountRp: 123,
    paymentFulfillmentStatus: "not_started" as const,
    paymentProvider: "invoiceku" as const,
    paymentProviderStatus: "pending" as const,
    paymentReceivedAt: null,
    packageDiscountAmountRp: 10000,
    packageId: "22222222-2222-4222-8222-222222222222",
    packageName: "Premium Package",
    paidAt: null,
    providerExpiredAt: null,
    providerInvoiceId: null,
    providerPaymentUrl: null,
    providerPayloadJson: null,
    qrisString: null,
    source: "payment_qris" as const,
    status: "pending" as const,
    subscriptionId: null,
    userId: "33333333-3333-4333-8333-333333333333",
    voucherCode: null,
    voucherDiscountAmountRp: 0,
    voucherDiscountPercent: null,
    voucherId: null,
  };
}

describe("payments/queries", () => {
  it("treats pending QRIS transactions without invoice metadata as failed", () => {
    const transaction = createPaymentTransaction();

    expect(derivePaymentPageState(transaction)).toBe("failed");

    expect(mapTransactionToPaymentPageData(transaction)).toEqual(
      expect.objectContaining({
        canCancel: false,
        canCheckStatus: false,
        state: "failed",
      }),
    );
  });

  it("keeps pending QRIS transactions actionable when invoice metadata is complete", () => {
    const transaction = createPaymentTransaction();
    const completeTransaction = {
      ...transaction,
      providerExpiredAt: "2099-05-22T12:00:00.000Z",
      providerInvoiceId: "INV-001",
      providerPaymentUrl: "https://invoiceku.example.com/pay/INV-001",
      qrisString: "000201010212",
    };

    expect(derivePaymentPageState(completeTransaction)).toBe("pending");

    expect(mapTransactionToPaymentPageData(completeTransaction)).toEqual(
      expect.objectContaining({
        canCancel: true,
        canCheckStatus: true,
        state: "pending",
      }),
    );
  });
});
