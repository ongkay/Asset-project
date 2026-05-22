import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: () => ({
    executeAsync: async () => ({
      data: {
        appliedVoucherCode: null,
        groups: [],
        quote: null,
        selectedGroupKey: null,
        selectedPackageId: null,
        voucherError: null,
      },
      serverError: null,
    }),
    isPending: false,
  }),
}));

import { CheckoutPage } from "@/app/(member)/checkout/_components/checkout-page";

describe("app/member/checkout UI", () => {
  it("renders the checkout sections and summary copy from the mocked flow", () => {
    const markup = renderToStaticMarkup(
      createElement(CheckoutPage, {
        initialState: {
          appliedVoucherCode: null,
          groups: [
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
                  summary: "share",
                },
              ],
              label: "Semi Private",
            },
          ],
          quote: {
            durationLabel: "30 days",
            featureList: ["Akses TradingView Premium", "Akses ForexTest Premium"],
            groupDescription: "Smart value, curated shared access.",
            groupKey: "semi-private",
            groupLabel: "Semi Private",
            listAmountRp: 80000,
            packageDiscountAmountRp: 4000,
            packageDiscountPercent: 5,
            packageId: "11111111-1111-4111-8111-111111111111",
            packageName: "Semi Private 30 days",
            totalRp: 76000,
            voucherCode: null,
            voucherDiscountAmountRp: 0,
            voucherDiscountPercent: null,
            voucherId: null,
          },
          selectedGroupKey: "semi-private",
          selectedPackageId: "11111111-1111-4111-8111-111111111111",
          voucherError: null,
        },
      }),
    );

    expect(markup).toContain("Checkout");
    expect(markup).toContain("Select Package");
    expect(markup).toContain("Select Duration");
    expect(markup).toContain("Payment Method");
    expect(markup).toContain("Apply voucher");
    expect(markup).toContain("Pay Now");
    expect(markup).toContain("Semi Private");
    expect(markup).toContain("30 days");
    expect(markup).toContain("Akses TradingView Premium");
  });
});
