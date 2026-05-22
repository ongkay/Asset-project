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
    executeAsync: async () => ({ data: { ok: false, errorCode: "checkout-failed", message: "x" } }),
    isPending: false,
  }),
}));

import { PaymentDummyPage } from "@/app/(member)/paymentdummy/_components/paymentdummy-page";

describe("app/member/paymentdummy UI", () => {
  it("renders package summary, current subscription context, and the payment confirmation action", () => {
    const markup = renderToStaticMarkup(
      createElement(PaymentDummyPage, {
        currentSubscription: {
          daysLeft: 12,
          endAt: "2026-05-01T00:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
          packageId: "11111111-1111-4111-8111-111111111111",
          packageName: "Starter",
          startAt: "2026-04-01T00:00:00.000Z",
          status: "active",
        },
        selectedPackage: {
          accessKeys: ["tradingview:private"],
          amountRp: 120000,
          checkoutGroup: "full-private",
          durationDays: 30,
          id: "22222222-2222-4222-8222-222222222222",
          isExtended: true,
          listAmountRp: 150000,
          name: "Growth",
          packageId: "22222222-2222-4222-8222-222222222222",
          sortOrder: 10,
          summary: "private",
        },
      }),
    );

    expect(markup).toContain("Konfirmasi pembayaran");
    expect(markup).toContain("Growth");
    expect(markup).toContain("Rp120.000");
    expect(markup).toContain("Langganan berjalan saat ini");
    expect(markup).toContain("Starter");
    expect(markup).toContain("Lanjutkan pembayaran dummy");
  });
});
