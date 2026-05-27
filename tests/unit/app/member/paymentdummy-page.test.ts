import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((location: string) => {
    throw new Error(`NEXT_REDIRECT:${location}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/console/schemas", () => ({
  parsePaymentDummyPackageIdSearchParam: vi.fn(),
}));

vi.mock("@/modules/packages/services", () => ({
  getMemberPurchasablePackageById: vi.fn(),
  getPackageById: vi.fn(),
}));

import * as consoleSchemas from "@/modules/console/schemas";
import * as packageServices from "@/modules/packages/services";

import PaymentDummyRoutePage from "@/app/(member)/paymentdummy/page";

const mockedParsePaymentDummyPackageIdSearchParam = vi.mocked(consoleSchemas.parsePaymentDummyPackageIdSearchParam);
const mockedGetMemberPurchasablePackageById = vi.mocked(packageServices.getMemberPurchasablePackageById);
const mockedGetPackageById = vi.mocked(packageServices.getPackageById);

describe("app/member/paymentdummy/page", () => {
  beforeEach(() => {
    vi.mocked(navigationMocks.redirect).mockClear();
    mockedParsePaymentDummyPackageIdSearchParam.mockReset();
    mockedGetMemberPurchasablePackageById.mockReset();
    mockedGetPackageById.mockReset();
  });

  it("redirects valid package URLs to checkout", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: "11111111-1111-4111-8111-111111111111",
      paymentError: null,
    });
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      checkoutGroup: "semi-private",
      durationDays: 30,
      id: "11111111-1111-4111-8111-111111111111",
      isExtended: false,
      listAmountRp: 150000,
      name: "Swing Package",
      packageId: "11111111-1111-4111-8111-111111111111",
      sortOrder: 1,
      summary: "private",
    });

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({ packageId: "11111111-1111-4111-8111-111111111111" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/checkout?packageId=11111111-1111-4111-8111-111111111111");
  });

  it("redirects to /member when packageId is missing", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: null,
      paymentError: "missing-package",
    });

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/member?paymentError=missing-package");
  });

  it("redirects to /member when packageId is invalid", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: null,
      paymentError: "invalid-package",
    });

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({ packageId: "bad-id" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/member?paymentError=invalid-package");
  });

  it("redirects to /member when the package is disabled", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: "11111111-1111-4111-8111-111111111111",
      paymentError: null,
    });
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(null);
    mockedGetPackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      checkoutGroup: "semi-private",
      checkoutUrl: null,
      code: "PKG-TEST",
      createdAt: "2026-05-21T00:00:00.000Z",
      durationDays: 30,
      id: "11111111-1111-4111-8111-111111111111",
      isActive: false,
      isExtended: false,
      listAmountRp: 150000,
      name: "Swing Package",
      sortOrder: 1,
      updatedAt: "2026-05-21T00:00:00.000Z",
    });

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({ packageId: "11111111-1111-4111-8111-111111111111" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/member?paymentError=disabled-package");
  });

  it("redirects to /member when the package is no longer purchasable", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: "11111111-1111-4111-8111-111111111111",
      paymentError: null,
    });
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(null);
    mockedGetPackageById.mockResolvedValueOnce(null);

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({ packageId: "11111111-1111-4111-8111-111111111111" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/member?paymentError=invalid-package");
  });
});
