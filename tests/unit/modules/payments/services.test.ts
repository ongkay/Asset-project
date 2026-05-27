import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payments/invoiceku", () => ({
  createInvoice: vi.fn(),
  cancelInvoiceById: vi.fn(),
  getInvoiceById: vi.fn(),
  InvoiceKuProviderError: class InvoiceKuProviderError extends Error {
    code: string;
    httpStatus: number | null;

    constructor(code: string, message: string, httpStatus: number | null = null) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  },
}));

vi.mock("@/modules/subscriptions/repositories", () => ({
  getPackageById: vi.fn(),
}));

vi.mock("@/modules/subscriptions/services", () => ({
  fulfillPaidSubscriptionPurchase: vi.fn(),
}));

vi.mock("@/modules/transactions/services", () => ({
  claimPaidTransactionFulfillment: vi.fn(),
  createTransaction: vi.fn(),
  failTransaction: vi.fn(),
  failTransactionPaymentFulfillment: vi.fn(),
  fulfillTransactionPayment: vi.fn(),
  refreshTransactionPaymentState: vi.fn(),
  saveTransactionInvoiceData: vi.fn(),
}));

vi.mock("@/modules/payments/repositories", () => ({
  listQrisTransactionsForReconcile: vi.fn(),
  listReusablePendingQrisTransactions: vi.fn(),
  readPaymentTransactionById: vi.fn(),
  readPaymentTransactionByIdForOwner: vi.fn(),
}));

import * as invoiceKu from "@/lib/payments/invoiceku";
import * as paymentsRepositories from "@/modules/payments/repositories";
import {
  cancelMemberQrisPayment,
  checkMemberQrisPaymentStatus,
  createQrisPaymentForCheckout,
} from "@/modules/payments/services";
import * as subscriptionRepositories from "@/modules/subscriptions/repositories";
import * as subscriptionServices from "@/modules/subscriptions/services";
import * as transactionsServices from "@/modules/transactions/services";

const mockedCancelInvoiceById = vi.mocked(invoiceKu.cancelInvoiceById);
const mockedCreateInvoice = vi.mocked(invoiceKu.createInvoice);
const mockedGetInvoiceById = vi.mocked(invoiceKu.getInvoiceById);
const mockedListReusablePendingQrisTransactions = vi.mocked(paymentsRepositories.listReusablePendingQrisTransactions);
const mockedReadPaymentTransactionById = vi.mocked(paymentsRepositories.readPaymentTransactionById);
const mockedReadPaymentTransactionByIdForOwner = vi.mocked(paymentsRepositories.readPaymentTransactionByIdForOwner);
const mockedGetSubscriptionPackageById = vi.mocked(subscriptionRepositories.getPackageById);
const mockedFulfillPaidSubscriptionPurchase = vi.mocked(subscriptionServices.fulfillPaidSubscriptionPurchase);
const mockedClaimPaidTransactionFulfillment = vi.mocked(transactionsServices.claimPaidTransactionFulfillment);
const mockedCreateTransaction = vi.mocked(transactionsServices.createTransaction);
const mockedFailTransaction = vi.mocked(transactionsServices.failTransaction);
const mockedFulfillTransactionPayment = vi.mocked(transactionsServices.fulfillTransactionPayment);
const mockedRefreshTransactionPaymentState = vi.mocked(transactionsServices.refreshTransactionPaymentState);
const mockedSaveTransactionInvoiceData = vi.mocked(transactionsServices.saveTransactionInvoiceData);

function createPaymentTransaction(
  overrides: Partial<Awaited<ReturnType<typeof mockedReadPaymentTransactionByIdForOwner>>> = {},
) {
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
    providerExpiredAt: "2099-01-01T00:00:00.000Z",
    providerInvoiceId: "INV-001",
    providerPaymentUrl: "https://invoiceku.example.com/pay/INV-001",
    providerPayloadJson: { status: "success" },
    qrisString: "000201010212",
    source: "payment_qris" as const,
    status: "pending" as const,
    subscriptionId: null,
    userId: "33333333-3333-4333-8333-333333333333",
    voucherCode: "VIP10",
    voucherDiscountAmountRp: 10000,
    voucherDiscountPercent: 10,
    voucherId: "44444444-4444-4444-8444-444444444444",
    ...overrides,
  };
}

describe("payments/services", () => {
  beforeEach(() => {
    mockedCancelInvoiceById.mockReset();
    mockedCreateInvoice.mockReset();
    mockedGetInvoiceById.mockReset();
    mockedListReusablePendingQrisTransactions.mockReset();
    mockedReadPaymentTransactionById.mockReset();
    mockedReadPaymentTransactionByIdForOwner.mockReset();
    mockedGetSubscriptionPackageById.mockReset();
    mockedFulfillPaidSubscriptionPurchase.mockReset();
    mockedClaimPaidTransactionFulfillment.mockReset();
    mockedCreateTransaction.mockReset();
    mockedFailTransaction.mockReset();
    mockedFulfillTransactionPayment.mockReset();
    mockedRefreshTransactionPaymentState.mockReset();
    mockedSaveTransactionInvoiceData.mockReset();
  });

  it("reuses an active pending QRIS transaction for the same checkout quote", async () => {
    mockedListReusablePendingQrisTransactions.mockResolvedValueOnce([createPaymentTransaction()]);

    await expect(
      createQrisPaymentForCheckout({
        customerEmail: "member@example.com",
        customerName: "member-one",
        packageSnapshot: {
          accessKeys: ["tradingview:private"],
          amountRp: 100000,
          durationDays: 30,
          isExtended: true,
          name: "Premium Package",
          packageId: "22222222-2222-4222-8222-222222222222",
        },
        pricingSnapshot: {
          listAmountRp: 100000,
          packageDiscountAmountRp: 10000,
          voucherCode: "VIP10",
          voucherDiscountAmountRp: 10000,
          voucherDiscountPercent: 10,
          voucherId: "44444444-4444-4444-8444-444444444444",
        },
        userId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toEqual({
      ok: true,
      redirectTo: "/payment/11111111-1111-4111-8111-111111111111",
      transactionId: "11111111-1111-4111-8111-111111111111",
    });

    expect(mockedCreateTransaction).not.toHaveBeenCalled();
    expect(mockedCreateInvoice).not.toHaveBeenCalled();
  });

  it("creates a new provider invoice when no reusable payment exists", async () => {
    mockedListReusablePendingQrisTransactions.mockResolvedValueOnce([]);
    mockedCreateTransaction.mockResolvedValueOnce(
      createPaymentTransaction({
        amountRp: 90000,
        paymentFeeAmountRp: null,
        providerExpiredAt: null,
        providerInvoiceId: null,
        providerPaymentUrl: null,
        qrisString: null,
        voucherCode: null,
        voucherDiscountAmountRp: 0,
        voucherDiscountPercent: null,
        voucherId: null,
      }),
    );
    mockedCreateInvoice.mockResolvedValueOnce({
      amountOriginal: 90000,
      amountTotal: 90123,
      expiredAt: "2026-05-22T12:00:00.000Z",
      invoiceId: "INV-NEW-1",
      paymentUrl: "https://invoiceku.example.com/pay/INV-NEW-1",
      providerStatus: "pending",
      qrisImageUrl: "https://cdn.example.com/qris.png",
      qrisString: "000201010212NEW",
      raw: {
        status: "success",
        data: {
          amount_original: 90000,
          amount_total: 90123,
          expired_at: "2026-05-22T12:00:00.000Z",
          invoice_id: "INV-NEW-1",
          payment_url: "https://invoiceku.example.com/pay/INV-NEW-1",
          qris_image_url: "https://cdn.example.com/qris.png",
          qris_string: "000201010212NEW",
          status: "pending",
        },
      },
    });
    mockedSaveTransactionInvoiceData.mockResolvedValueOnce(
      createPaymentTransaction({
        amountRp: 90123,
        paymentFeeAmountRp: 123,
        providerExpiredAt: "2026-05-22T12:00:00.000Z",
        providerInvoiceId: "INV-NEW-1",
        providerPaymentUrl: "https://invoiceku.example.com/pay/INV-NEW-1",
        qrisString: "000201010212NEW",
        voucherCode: null,
        voucherDiscountAmountRp: 0,
        voucherDiscountPercent: null,
        voucherId: null,
      }),
    );

    await expect(
      createQrisPaymentForCheckout({
        customerEmail: "member@example.com",
        customerName: "member-one",
        packageSnapshot: {
          accessKeys: ["tradingview:private"],
          amountRp: 90000,
          durationDays: 30,
          isExtended: true,
          name: "Premium Package",
          packageId: "22222222-2222-4222-8222-222222222222",
        },
        pricingSnapshot: {
          listAmountRp: 100000,
          packageDiscountAmountRp: 10000,
          voucherCode: null,
          voucherDiscountAmountRp: 0,
          voucherDiscountPercent: null,
          voucherId: null,
        },
        userId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toEqual({
      ok: true,
      redirectTo: "/payment/11111111-1111-4111-8111-111111111111",
      transactionId: "11111111-1111-4111-8111-111111111111",
    });

    expect(mockedSaveTransactionInvoiceData).toHaveBeenCalledWith(
      expect.objectContaining({
        amountRp: 90123,
        paymentFeeAmountRp: 123,
        providerInvoiceId: "INV-NEW-1",
        qrisString: "000201010212NEW",
      }),
    );
  });

  it("does not redirect to payment page when saved invoice metadata is incomplete", async () => {
    mockedListReusablePendingQrisTransactions.mockResolvedValueOnce([]);
    mockedCreateTransaction.mockResolvedValueOnce(
      createPaymentTransaction({
        amountRp: 90000,
        paymentFeeAmountRp: null,
        providerExpiredAt: null,
        providerInvoiceId: null,
        providerPaymentUrl: null,
        qrisString: null,
        voucherCode: null,
        voucherDiscountAmountRp: 0,
        voucherDiscountPercent: null,
        voucherId: null,
      }),
    );
    mockedCreateInvoice.mockResolvedValueOnce({
      amountOriginal: 90000,
      amountTotal: 90123,
      expiredAt: "2026-05-22T12:00:00.000Z",
      invoiceId: "INV-NEW-2",
      paymentUrl: "https://invoiceku.example.com/pay/INV-NEW-2",
      providerStatus: "pending",
      qrisImageUrl: "https://cdn.example.com/qris.png",
      qrisString: "000201010212NEW2",
      raw: {
        status: "success",
        data: {
          amount_original: 90000,
          amount_total: 90123,
          expired_at: "2026-05-22T12:00:00.000Z",
          invoice_id: "INV-NEW-2",
          payment_url: "https://invoiceku.example.com/pay/INV-NEW-2",
          qris_image_url: "https://cdn.example.com/qris.png",
          qris_string: "000201010212NEW2",
          status: "pending",
        },
      },
    });
    mockedSaveTransactionInvoiceData.mockResolvedValueOnce(
      createPaymentTransaction({
        amountRp: 90123,
        paymentFeeAmountRp: 123,
        providerExpiredAt: null,
        providerInvoiceId: null,
        providerPaymentUrl: "https://invoiceku.example.com/pay/INV-NEW-2",
        qrisString: null,
        voucherCode: null,
        voucherDiscountAmountRp: 0,
        voucherDiscountPercent: null,
        voucherId: null,
      }),
    );
    mockedFailTransaction.mockResolvedValueOnce(undefined);

    await expect(
      createQrisPaymentForCheckout({
        customerEmail: "member@example.com",
        customerName: "member-one",
        packageSnapshot: {
          accessKeys: ["tradingview:private"],
          amountRp: 90000,
          durationDays: 30,
          isExtended: true,
          name: "Premium Package",
          packageId: "22222222-2222-4222-8222-222222222222",
        },
        pricingSnapshot: {
          listAmountRp: 100000,
          packageDiscountAmountRp: 10000,
          voucherCode: null,
          voucherDiscountAmountRp: 0,
          voucherDiscountPercent: null,
          voucherId: null,
        },
        userId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toEqual({
      errorCode: "checkout-failed",
      message: "Invoice QRIS belum bisa dibuat. Silakan coba lagi beberapa saat lagi.",
      ok: false,
    });

    expect(mockedFailTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        failureReason: "Provider invoice data is incomplete after save.",
      }),
    );
  });

  it("cancels a pending QRIS transaction for its owner", async () => {
    mockedReadPaymentTransactionByIdForOwner.mockResolvedValueOnce(createPaymentTransaction());
    mockedCancelInvoiceById.mockResolvedValueOnce({
      invoiceId: "INV-001",
      message: "Invoice cancelled successfully",
      providerStatus: "canceled",
      raw: {
        status: "success",
        data: {
          invoice_id: "INV-001",
          status: "failed",
        },
        message: "Invoice cancelled successfully",
      },
    });
    mockedRefreshTransactionPaymentState.mockResolvedValueOnce(
      createPaymentTransaction({
        failureReason: "member_canceled",
        paymentProviderStatus: "canceled",
        status: "canceled",
      }),
    );

    await expect(
      cancelMemberQrisPayment({
        transactionId: "11111111-1111-4111-8111-111111111111",
        userId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        message: "Transaksi berhasil dibatalkan.",
        payment: expect.objectContaining({
          providerStatus: "canceled",
          state: "canceled",
          status: "canceled",
        }),
      }),
    );
  });

  it("finalizes payment when cancel returns already paid", async () => {
    mockedReadPaymentTransactionByIdForOwner.mockResolvedValueOnce(createPaymentTransaction());
    mockedCancelInvoiceById.mockResolvedValueOnce({
      invoiceId: "INV-001",
      message: "Already paid",
      providerStatus: "paid",
      raw: {
        status: "success",
        data: {
          invoice_id: "INV-001",
          status: "paid",
        },
        message: "Already paid",
      },
    });
    mockedRefreshTransactionPaymentState.mockResolvedValueOnce(
      createPaymentTransaction({
        failureReason: null,
        paymentProviderStatus: "paid",
      }),
    );
    mockedReadPaymentTransactionById.mockResolvedValueOnce(
      createPaymentTransaction({
        paymentProviderStatus: "paid",
      }),
    );
    mockedClaimPaidTransactionFulfillment.mockResolvedValueOnce(true);
    mockedGetSubscriptionPackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 100000,
      durationDays: 30,
      isExtended: true,
      name: "Premium Package",
      packageId: "22222222-2222-4222-8222-222222222222",
      isActive: true,
    });
    mockedFulfillPaidSubscriptionPurchase.mockResolvedValueOnce({
      subscriptionId: "subscription-1",
      mode: "create-new",
    });
    mockedFulfillTransactionPayment.mockResolvedValueOnce(undefined);
    mockedReadPaymentTransactionById.mockResolvedValueOnce(
      createPaymentTransaction({
        paymentProviderStatus: "paid",
        status: "success",
        paymentFulfillmentStatus: "fulfilled",
      }),
    );

    await expect(
      cancelMemberQrisPayment({
        transactionId: "11111111-1111-4111-8111-111111111111",
        userId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        message: "Pembayaran berhasil dikonfirmasi.",
        payment: expect.objectContaining({
          providerStatus: "paid",
        }),
      }),
    );
  });

  it("returns canceled payment immediately without re-checking provider", async () => {
    mockedReadPaymentTransactionByIdForOwner.mockResolvedValueOnce(
      createPaymentTransaction({
        failureReason: "member_canceled",
        paymentProviderStatus: "canceled",
        status: "canceled",
      }),
    );

    await expect(
      checkMemberQrisPaymentStatus({
        transactionId: "11111111-1111-4111-8111-111111111111",
        userId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        message: "Transaksi ini sudah dibatalkan.",
        payment: expect.objectContaining({
          state: "canceled",
          status: "canceled",
        }),
      }),
    );

    expect(mockedGetInvoiceById).not.toHaveBeenCalled();
  });

  it("returns an invoice integrity error when pending payment metadata is incomplete", async () => {
    mockedReadPaymentTransactionByIdForOwner.mockResolvedValueOnce(
      createPaymentTransaction({
        providerExpiredAt: null,
        providerInvoiceId: null,
        qrisString: null,
      }),
    );

    await expect(
      checkMemberQrisPaymentStatus({
        transactionId: "11111111-1111-4111-8111-111111111111",
        userId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        errorCode: "provider-invalid-response",
        message: "Invoice QRIS untuk transaksi ini tidak lengkap. Silakan ulangi checkout untuk membuat QRIS baru.",
        ok: false,
      }),
    );

    expect(mockedGetInvoiceById).not.toHaveBeenCalled();
  });

  it("marks provider-expired invoices as failed", async () => {
    mockedReadPaymentTransactionByIdForOwner.mockResolvedValueOnce(createPaymentTransaction());
    mockedGetInvoiceById.mockResolvedValueOnce({
      amountTotal: 90123,
      invoiceId: "INV-001",
      orderId: "ORD-001",
      paidAt: null,
      providerStatus: "expired",
      raw: {
        status: "success",
        data: {
          amount_total: 90123,
          invoice_id: "INV-001",
          order_id: null,
          paid_at: null,
          status: "expired",
        },
      },
    });
    mockedRefreshTransactionPaymentState.mockResolvedValueOnce(
      createPaymentTransaction({
        failureReason: "payment_expired",
        paymentProviderStatus: "expired",
        status: "failed",
      }),
    );

    await expect(
      checkMemberQrisPaymentStatus({
        transactionId: "11111111-1111-4111-8111-111111111111",
        userId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        message: "Batas waktu pembayaran sudah berakhir.",
        payment: expect.objectContaining({
          providerStatus: "expired",
          status: "failed",
        }),
      }),
    );
  });
});
