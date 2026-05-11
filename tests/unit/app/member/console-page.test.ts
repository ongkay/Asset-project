import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/console/queries", () => ({
  getConsoleSnapshot: vi.fn(),
  getConsoleStateSnapshot: vi.fn(),
}));

vi.mock("@/modules/auth/services", () => ({
  readCurrentAuthEmailVerificationState: vi.fn(),
  readCurrentEmailVerificationResendCooldownRemainingSeconds: vi.fn(),
}));

vi.mock("@/modules/console/schemas", () => ({
  parseConsolePaymentErrorSearchParam: vi.fn(),
}));

vi.mock("@/modules/packages/services", () => ({
  listMemberPurchasablePackages: vi.fn(),
}));

vi.mock("@/app/(member)/console/_components/console-page", () => ({
  ConsolePage: vi.fn(() => null),
}));

import * as consoleQueries from "@/modules/console/queries";
import * as consoleSchemas from "@/modules/console/schemas";
import * as packageServices from "@/modules/packages/services";
import * as authServices from "@/modules/auth/services";

import MemberConsoleRoutePage from "@/app/(member)/console/page";

const mockedGetConsoleSnapshot = vi.mocked(consoleQueries.getConsoleSnapshot);
const mockedGetConsoleStateSnapshot = vi.mocked(consoleQueries.getConsoleStateSnapshot);
const mockedParseConsolePaymentErrorSearchParam = vi.mocked(consoleSchemas.parseConsolePaymentErrorSearchParam);
const mockedListMemberPurchasablePackages = vi.mocked(packageServices.listMemberPurchasablePackages);
const mockedReadCurrentAuthEmailVerificationState = vi.mocked(authServices.readCurrentAuthEmailVerificationState);
const mockedReadCurrentEmailVerificationResendCooldownRemainingSeconds = vi.mocked(
  authServices.readCurrentEmailVerificationResendCooldownRemainingSeconds,
);

describe("app/member/console/page", () => {
  beforeEach(() => {
    mockedGetConsoleSnapshot.mockReset();
    mockedGetConsoleStateSnapshot.mockReset();
    mockedParseConsolePaymentErrorSearchParam.mockReset();
    mockedListMemberPurchasablePackages.mockReset();
    mockedReadCurrentAuthEmailVerificationState.mockReset();
    mockedReadCurrentEmailVerificationResendCooldownRemainingSeconds.mockReset();
  });

  it("parses paymentError and passes explicit server bootstrap props to the client page", async () => {
    mockedParseConsolePaymentErrorSearchParam.mockReturnValueOnce("disabled-package");
    mockedGetConsoleSnapshot.mockResolvedValueOnce({
      assets: [],
      subscription: null,
      transactions: [],
    });
    mockedGetConsoleStateSnapshot.mockResolvedValueOnce({
      latestSubscription: null,
      state: "none",
    });
    mockedReadCurrentAuthEmailVerificationState.mockResolvedValueOnce(false);
    mockedReadCurrentEmailVerificationResendCooldownRemainingSeconds.mockResolvedValueOnce(42);
    mockedListMemberPurchasablePackages.mockResolvedValueOnce([
      {
        accessKeys: ["tradingview:private"],
        amountRp: 120000,
        durationDays: 30,
        id: "11111111-1111-4111-8111-111111111111",
        isExtended: true,
        name: "Starter",
        packageId: "11111111-1111-4111-8111-111111111111",
        summary: "private",
      },
    ]);

    const element = await MemberConsoleRoutePage({
      searchParams: Promise.resolve({ paymentError: "disabled-package" }),
    });

    expect(mockedParseConsolePaymentErrorSearchParam).toHaveBeenCalledWith({ paymentError: "disabled-package" });
    expect(mockedGetConsoleSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedGetConsoleStateSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedListMemberPurchasablePackages).toHaveBeenCalledTimes(1);
    expect(mockedReadCurrentAuthEmailVerificationState).toHaveBeenCalledTimes(1);
    expect(mockedReadCurrentEmailVerificationResendCooldownRemainingSeconds).toHaveBeenCalledTimes(1);
    expect(element.props.initialEmailVerificationResendCooldownRemainingSeconds).toBe(42);
    expect(element.props.initialEmailVerified).toBe(false);
    expect(element.props.initialPaymentError).toBe("disabled-package");
    expect(element.props.initialSnapshot).toEqual({
      assets: [],
      subscription: null,
      transactions: [],
    });
    expect(element.props.initialStateSnapshot).toEqual({
      latestSubscription: null,
      state: "none",
    });
    expect(element.props.initialPackages).toEqual([
      {
        accessKeys: ["tradingview:private"],
        amountRp: 120000,
        durationDays: 30,
        id: "11111111-1111-4111-8111-111111111111",
        isExtended: true,
        name: "Starter",
        packageId: "11111111-1111-4111-8111-111111111111",
        summary: "private",
      },
    ]);
  });
});
