import { renderToStaticMarkup } from "react-dom/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const userServiceMocks = vi.hoisted(() => ({
  requireMemberShellAccess: vi.fn(),
}));

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

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: vi.fn(() => null),
}));

vi.mock("@/modules/users/services", () => ({
  requireMemberShellAccess: userServiceMocks.requireMemberShellAccess,
}));

vi.mock("@/app/(member)/console/_components/console-page", () => ({
  ConsolePage: vi.fn(() => null),
}));

import * as consoleQueries from "@/modules/console/queries";
import * as consoleSchemas from "@/modules/console/schemas";
import * as packageServices from "@/modules/packages/services";
import * as authServices from "@/modules/auth/services";
import * as userServices from "@/modules/users/services";
import { ConsolePage } from "@/app/(member)/console/_components/console-page";

import MemberConsoleRoutePage from "@/app/(member)/console/page";

const mockedGetConsoleSnapshot = vi.mocked(consoleQueries.getConsoleSnapshot);
const mockedGetConsoleStateSnapshot = vi.mocked(consoleQueries.getConsoleStateSnapshot);
const mockedParseConsolePaymentErrorSearchParam = vi.mocked(consoleSchemas.parseConsolePaymentErrorSearchParam);
const mockedListMemberPurchasablePackages = vi.mocked(packageServices.listMemberPurchasablePackages);
const mockedReadCurrentAuthEmailVerificationState = vi.mocked(authServices.readCurrentAuthEmailVerificationState);
const mockedReadCurrentEmailVerificationResendCooldownRemainingSeconds = vi.mocked(
  authServices.readCurrentEmailVerificationResendCooldownRemainingSeconds,
);
const mockedRequireMemberShellAccess = vi.mocked(userServices.requireMemberShellAccess);
const mockedConsolePage = vi.mocked(ConsolePage);

describe("app/member/console/page", () => {
  beforeEach(() => {
    mockedGetConsoleSnapshot.mockReset();
    mockedGetConsoleStateSnapshot.mockReset();
    mockedParseConsolePaymentErrorSearchParam.mockReset();
    mockedListMemberPurchasablePackages.mockReset();
    mockedRequireMemberShellAccess.mockReset();
    mockedReadCurrentAuthEmailVerificationState.mockReset();
    mockedReadCurrentEmailVerificationResendCooldownRemainingSeconds.mockReset();
    mockedConsolePage.mockClear();
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
    mockedRequireMemberShellAccess.mockResolvedValueOnce({
      profile: {
        avatarUrl: null,
        email: "member@example.com",
        isBanned: false,
        publicId: "MEM-1",
        role: "member",
        userId: "11111111-1111-4111-8111-111111111111",
        username: "member",
      },
      session: {
        createdAt: "2026-03-28T00:00:00.000Z",
        lastSeenAt: "2026-04-01T00:00:00.000Z",
        revokedAt: null,
        sessionId: "session-1",
        userId: "11111111-1111-4111-8111-111111111111",
      },
    });
    mockedReadCurrentAuthEmailVerificationState.mockResolvedValueOnce(false);
    mockedReadCurrentEmailVerificationResendCooldownRemainingSeconds.mockResolvedValueOnce(42);
    mockedListMemberPurchasablePackages.mockResolvedValueOnce([
      {
        accessKeys: ["tradingview:private"],
        amountRp: 120000,
        checkoutGroup: "full-private",
        durationDays: 30,
        id: "11111111-1111-4111-8111-111111111111",
        isExtended: true,
        listAmountRp: 150000,
        name: "Starter",
        packageId: "11111111-1111-4111-8111-111111111111",
        sortOrder: 10,
        summary: "private",
      },
    ]);

    const element = await MemberConsoleRoutePage({
      searchParams: Promise.resolve({ paymentError: "disabled-package" }),
    });
    renderToStaticMarkup(element);

    expect(mockedParseConsolePaymentErrorSearchParam).toHaveBeenCalledWith({ paymentError: "disabled-package" });
    expect(mockedGetConsoleSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedGetConsoleStateSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedListMemberPurchasablePackages).toHaveBeenCalledTimes(1);
    expect(mockedRequireMemberShellAccess).toHaveBeenCalledTimes(1);
    expect(mockedReadCurrentAuthEmailVerificationState).toHaveBeenCalledTimes(1);
    expect(mockedReadCurrentEmailVerificationResendCooldownRemainingSeconds).toHaveBeenCalledTimes(1);
    expect(mockedConsolePage).toHaveBeenCalledTimes(1);
    expect(mockedConsolePage.mock.calls[0]?.[0]).toMatchObject({
      initialEmailVerificationResendCooldownRemainingSeconds: 42,
      initialEmailVerified: false,
      initialPackages: [
        {
          accessKeys: ["tradingview:private"],
          amountRp: 120000,
          checkoutGroup: "full-private",
          durationDays: 30,
          id: "11111111-1111-4111-8111-111111111111",
          isExtended: true,
          listAmountRp: 150000,
          name: "Starter",
          packageId: "11111111-1111-4111-8111-111111111111",
          sortOrder: 10,
          summary: "private",
        },
      ],
      initialPaymentError: "disabled-package",
    });
    expect(mockedConsolePage.mock.calls[0]?.[0]?.initialSnapshot).toEqual({
      assets: [],
      subscription: null,
      transactions: [],
    });
    expect(mockedConsolePage.mock.calls[0]?.[0]?.initialStateSnapshot).toEqual({
      latestSubscription: null,
      state: "none",
    });
  });
});
