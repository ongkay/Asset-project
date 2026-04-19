import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((location: string) => {
    throw new Error(`NEXT_REDIRECT:${location}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/console/queries", () => ({
  getConsoleSnapshot: vi.fn(),
}));

vi.mock("@/modules/console/schemas", () => ({
  parsePaymentDummyPackageIdSearchParam: vi.fn(),
}));

vi.mock("@/modules/packages/services", () => ({
  getMemberPurchasablePackageById: vi.fn(),
  getPackageById: vi.fn(),
}));

vi.mock("@/modules/auth/services", () => ({
  readValidatedInsForgeAccessTokenForActiveAppSession: vi.fn(),
}));

vi.mock("@/app/(member)/paymentdummy/_components/paymentdummy-page", () => ({
  PaymentDummyPage: vi.fn(() => null),
}));

import * as consoleQueries from "@/modules/console/queries";
import * as consoleSchemas from "@/modules/console/schemas";
import * as authServices from "@/modules/auth/services";
import * as packageServices from "@/modules/packages/services";

import PaymentDummyRoutePage from "@/app/(member)/paymentdummy/page";

const mockedRedirect = vi.mocked(navigationMocks.redirect);
const mockedGetConsoleSnapshot = vi.mocked(consoleQueries.getConsoleSnapshot);
const mockedParsePaymentDummyPackageIdSearchParam = vi.mocked(consoleSchemas.parsePaymentDummyPackageIdSearchParam);
const mockedReadValidatedInsForgeAccessTokenForActiveAppSession = vi.mocked(
  authServices.readValidatedInsForgeAccessTokenForActiveAppSession,
);
const mockedGetMemberPurchasablePackageById = vi.mocked(packageServices.getMemberPurchasablePackageById);
const mockedGetPackageById = vi.mocked(packageServices.getPackageById);

describe("app/member/paymentdummy/page", () => {
  beforeEach(() => {
    mockedRedirect.mockClear();
    mockedGetConsoleSnapshot.mockReset();
    mockedParsePaymentDummyPackageIdSearchParam.mockReset();
    mockedReadValidatedInsForgeAccessTokenForActiveAppSession.mockReset();
    mockedGetMemberPurchasablePackageById.mockReset();
    mockedGetPackageById.mockReset();
  });

  it("passes the selected package and current subscription summary to the client page", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: "11111111-1111-4111-8111-111111111111",
      paymentError: null,
    });
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 120000,
      durationDays: 30,
      id: "11111111-1111-4111-8111-111111111111",
      isExtended: true,
      name: "Starter",
      packageId: "11111111-1111-4111-8111-111111111111",
      summary: "private",
    });
    mockedGetConsoleSnapshot.mockResolvedValueOnce({
      assets: [],
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "22222222-2222-4222-8222-222222222222",
        packageId: "33333333-3333-4333-8333-333333333333",
        packageName: "Current",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      transactions: [],
    });

    const element = await PaymentDummyRoutePage({
      searchParams: Promise.resolve({ packageId: "11111111-1111-4111-8111-111111111111" }),
    });

    expect(mockedParsePaymentDummyPackageIdSearchParam).toHaveBeenCalledWith({
      packageId: "11111111-1111-4111-8111-111111111111",
    });
    expect(mockedGetMemberPurchasablePackageById).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(mockedGetConsoleSnapshot).toHaveBeenCalledTimes(1);
    expect(element.props.selectedPackage).toEqual({
      accessKeys: ["tradingview:private"],
      amountRp: 120000,
      durationDays: 30,
      id: "11111111-1111-4111-8111-111111111111",
      isExtended: true,
      name: "Starter",
      packageId: "11111111-1111-4111-8111-111111111111",
      summary: "private",
    });
    expect(element.props.currentSubscription).toEqual({
      daysLeft: 12,
      endAt: "2026-05-01T00:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
      packageId: "33333333-3333-4333-8333-333333333333",
      packageName: "Current",
      startAt: "2026-04-01T00:00:00.000Z",
      status: "active",
    });
  });

  it("redirects to the console when packageId is missing", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: null,
      paymentError: "missing-package",
    });

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/console?paymentError=missing-package");

    expect(mockedGetMemberPurchasablePackageById).not.toHaveBeenCalled();
  });

  it("redirects to the console when packageId is invalid", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: null,
      paymentError: "invalid-package",
    });

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({ packageId: "bad-id" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/console?paymentError=invalid-package");

    expect(mockedGetMemberPurchasablePackageById).not.toHaveBeenCalled();
  });

  it("redirects to the console with invalid-package when the package does not exist", async () => {
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
    ).rejects.toThrow("NEXT_REDIRECT:/console?paymentError=invalid-package");
  });

  it("redirects to the console with disabled-package when the package exists but is disabled", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: "11111111-1111-4111-8111-111111111111",
      paymentError: null,
    });
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(null);
    mockedGetPackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 120000,
      checkoutUrl: null,
      code: "PKG-STARTER",
      createdAt: "2026-04-01T00:00:00.000Z",
      durationDays: 30,
      id: "11111111-1111-4111-8111-111111111111",
      isActive: false,
      isExtended: true,
      name: "Starter",
      updatedAt: "2026-04-01T00:00:00.000Z",
    });

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({ packageId: "11111111-1111-4111-8111-111111111111" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/console?paymentError=disabled-package");
  });

  it("redirects to login instead of misclassifying a valid package when member auth is stale", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: "11111111-1111-4111-8111-111111111111",
      paymentError: null,
    });
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(null);
    mockedGetConsoleSnapshot.mockResolvedValueOnce({
      assets: [],
      subscription: null,
      transactions: [],
    });
    mockedGetPackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 120000,
      checkoutUrl: null,
      code: "PKG-STARTER",
      createdAt: "2026-04-01T00:00:00.000Z",
      durationDays: 30,
      id: "11111111-1111-4111-8111-111111111111",
      isActive: true,
      isExtended: true,
      name: "Starter",
      updatedAt: "2026-04-01T00:00:00.000Z",
    });
    mockedReadValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValueOnce(null);

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({ packageId: "11111111-1111-4111-8111-111111111111" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
