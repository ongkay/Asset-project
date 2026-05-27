import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/checkout/queries", () => ({
  getCheckoutCatalog: vi.fn(),
}));

vi.mock("@/modules/packages/services", () => ({
  getMemberPurchasablePackageById: vi.fn(),
  getPackageById: vi.fn(),
}));

vi.mock("@/modules/payments/services", () => ({
  createQrisPaymentForCheckout: vi.fn(),
}));

vi.mock("@/modules/vouchers/services", () => ({
  validateVoucherForPackage: vi.fn(),
}));

import * as checkoutQueries from "@/modules/checkout/queries";
import * as packageServices from "@/modules/packages/services";
import * as paymentServices from "@/modules/payments/services";
import { resolveCheckoutState, submitCheckout } from "@/modules/checkout/services";
import * as voucherServices from "@/modules/vouchers/services";

const mockedGetCheckoutCatalog = vi.mocked(checkoutQueries.getCheckoutCatalog);
const mockedGetMemberPurchasablePackageById = vi.mocked(packageServices.getMemberPurchasablePackageById);
const mockedCreateQrisPaymentForCheckout = vi.mocked(paymentServices.createQrisPaymentForCheckout);
const mockedValidateVoucherForPackage = vi.mocked(voucherServices.validateVoucherForPackage);

function createCatalog() {
  return [
    {
      description: "Smart value, curated shared access.",
      featureList: ["Akses TradingView Premium", "Akses ForexTest Premium"],
      groupKey: "semi-private",
      items: [
        {
          amountRp: 76000,
          appliedVoucherAmountRp: 0,
          appliedVoucherCode: null,
          appliedVoucherId: null,
          appliedVoucherPercent: null,
          durationDays: 30,
          durationLabel: "30 days",
          durationMonths: 1,
          listAmountRp: 80000,
          name: "Semi Private 30 days",
          originalMonthlyPriceRp: 80000,
          packageDiscountAmountRp: 4000,
          packageDiscountPercent: 5,
          packageId: "11111111-1111-4111-8111-111111111111",
          previewMonthlyPriceRp: 76000,
          previewTotalRp: 76000,
          sortOrder: 10,
          summary: "share" as const,
        },
      ],
      label: "Semi Private",
    },
  ];
}

describe("checkout/services", () => {
  beforeEach(() => {
    mockedGetCheckoutCatalog.mockReset();
    mockedGetMemberPurchasablePackageById.mockReset();
    mockedCreateQrisPaymentForCheckout.mockReset();
    mockedValidateVoucherForPackage.mockReset();
  });

  it("falls back to the first package when packageId is null", async () => {
    mockedGetCheckoutCatalog.mockResolvedValueOnce(createCatalog());

    await expect(resolveCheckoutState({ packageId: null, voucherCode: null })).resolves.toMatchObject({
      appliedVoucherCode: null,
      quote: {
        packageId: "11111111-1111-4111-8111-111111111111",
        totalRp: 76000,
      },
      selectedGroupKey: "semi-private",
      selectedPackageId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("returns a voucher error when the selected voucher no longer applies", async () => {
    mockedGetCheckoutCatalog.mockResolvedValueOnce(createCatalog());
    mockedValidateVoucherForPackage.mockResolvedValueOnce({
      errorCode: "voucher-expired",
      message: "Voucher sudah kedaluwarsa.",
      ok: false,
    });

    await expect(
      resolveCheckoutState({
        packageId: "11111111-1111-4111-8111-111111111111",
        voucherCode: "VIP15",
      }),
    ).resolves.toMatchObject({
      appliedVoucherCode: null,
      voucherError: {
        errorCode: "voucher-expired",
      },
    });
  });

  it("submits checkout with transaction pricing snapshots", async () => {
    mockedGetCheckoutCatalog.mockResolvedValueOnce(createCatalog());
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 76000,
      checkoutGroup: "semi-private",
      durationDays: 30,
      id: "11111111-1111-4111-8111-111111111111",
      isExtended: true,
      listAmountRp: 80000,
      name: "Semi Private 30 days",
      packageId: "11111111-1111-4111-8111-111111111111",
      sortOrder: 10,
      summary: "share",
    });
    mockedValidateVoucherForPackage.mockResolvedValueOnce({
      discountAmountRp: 11400,
      ok: true,
      voucher: {
        code: "VIP15",
        createdAt: "2026-05-21T00:00:00.000Z",
        createdBy: "99999999-9999-4999-8999-999999999999",
        discountPercent: 15,
        expiresAt: null,
        id: "22222222-2222-4222-8222-222222222222",
        isActive: true,
        maxUses: null,
        packageId: null,
        scopeType: "global",
        updatedAt: "2026-05-21T00:00:00.000Z",
        usedCount: 0,
      },
    });
    mockedValidateVoucherForPackage.mockResolvedValueOnce({
      discountAmountRp: 11400,
      ok: true,
      voucher: {
        code: "VIP15",
        createdAt: "2026-05-21T00:00:00.000Z",
        createdBy: "99999999-9999-4999-8999-999999999999",
        discountPercent: 15,
        expiresAt: null,
        id: "22222222-2222-4222-8222-222222222222",
        isActive: true,
        maxUses: null,
        packageId: null,
        scopeType: "global",
        updatedAt: "2026-05-21T00:00:00.000Z",
        usedCount: 0,
      },
    });
    mockedCreateQrisPaymentForCheckout.mockResolvedValueOnce({
      ok: true,
      redirectTo: "/payment/transaction-1",
      transactionId: "transaction-1",
    });

    await expect(
      submitCheckout({
        customerEmail: "member@example.com",
        customerName: "member-one",
        packageId: "11111111-1111-4111-8111-111111111111",
        paymentMethod: "qris",
        userId: "33333333-3333-4333-8333-333333333333",
        voucherCode: "VIP15",
      }),
    ).resolves.toEqual({
      ok: true,
      redirectTo: "/payment/transaction-1",
      transactionId: "transaction-1",
    });

    expect(mockedCreateQrisPaymentForCheckout).toHaveBeenCalledWith({
      customerEmail: "member@example.com",
      customerName: "member-one",
      packageSnapshot: {
        accessKeys: ["tradingview:private"],
        amountRp: 76000,
        durationDays: 30,
        isExtended: true,
        name: "Semi Private 30 days",
        packageId: "11111111-1111-4111-8111-111111111111",
      },
      pricingSnapshot: {
        listAmountRp: 80000,
        packageDiscountAmountRp: 4000,
        voucherCode: "VIP15",
        voucherDiscountAmountRp: 11400,
        voucherDiscountPercent: 15,
        voucherId: "22222222-2222-4222-8222-222222222222",
      },
      userId: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("returns a stable unavailable error for non-QRIS methods", async () => {
    mockedGetCheckoutCatalog.mockResolvedValueOnce(createCatalog());

    await expect(
      submitCheckout({
        customerEmail: "member@example.com",
        customerName: "member-one",
        packageId: "11111111-1111-4111-8111-111111111111",
        paymentMethod: "card",
        userId: "33333333-3333-4333-8333-333333333333",
        voucherCode: null,
      }),
    ).resolves.toEqual({
      errorCode: "payment-method-unavailable",
      message: "Metode pembayaran ini belum tersedia. Silakan gunakan QRIS untuk saat ini.",
      ok: false,
    });

    expect(mockedCreateQrisPaymentForCheckout).not.toHaveBeenCalled();
  });
});
