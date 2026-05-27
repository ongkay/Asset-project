import { renderToStaticMarkup } from "react-dom/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const userServiceMocks = vi.hoisted(() => ({
  requireMemberShellAccess: vi.fn(),
}));

vi.mock("@/modules/console/queries", () => ({
  getConsoleSnapshot: vi.fn(),
  getConsoleStateSnapshot: vi.fn(),
}));

vi.mock("@/modules/console/schemas", () => ({
  parseConsolePaymentErrorSearchParam: vi.fn(),
}));

vi.mock("@/modules/users/services", () => ({
  requireMemberShellAccess: userServiceMocks.requireMemberShellAccess,
}));

vi.mock("@/app/(member)/member/_components/member-page", () => ({
  MemberPage: vi.fn(() => null),
}));

import * as consoleQueries from "@/modules/console/queries";
import * as consoleSchemas from "@/modules/console/schemas";
import * as userServices from "@/modules/users/services";
import { MemberPage } from "@/app/(member)/member/_components/member-page";

import MemberRoutePage from "@/app/(member)/member/page";

const mockedGetConsoleSnapshot = vi.mocked(consoleQueries.getConsoleSnapshot);
const mockedGetConsoleStateSnapshot = vi.mocked(consoleQueries.getConsoleStateSnapshot);
const mockedParseConsolePaymentErrorSearchParam = vi.mocked(consoleSchemas.parseConsolePaymentErrorSearchParam);
const mockedRequireMemberShellAccess = vi.mocked(userServices.requireMemberShellAccess);
const mockedMemberPage = vi.mocked(MemberPage);

describe("app/member/member/page", () => {
  beforeEach(() => {
    mockedGetConsoleSnapshot.mockReset();
    mockedGetConsoleStateSnapshot.mockReset();
    mockedParseConsolePaymentErrorSearchParam.mockReset();
    mockedRequireMemberShellAccess.mockReset();
    mockedMemberPage.mockClear();
  });

  it("parses paymentError and passes the canonical member bootstrap props", async () => {
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

    const element = await MemberRoutePage({
      searchParams: Promise.resolve({ paymentError: "disabled-package" }),
    });
    renderToStaticMarkup(element);

    expect(mockedParseConsolePaymentErrorSearchParam).toHaveBeenCalledWith({ paymentError: "disabled-package" });
    expect(mockedRequireMemberShellAccess).toHaveBeenCalledTimes(1);
    expect(mockedGetConsoleSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedGetConsoleStateSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedMemberPage).toHaveBeenCalledTimes(1);
    expect(mockedMemberPage.mock.calls[0]?.[0]).toMatchObject({
      initialPaymentError: "disabled-package",
      initialSnapshot: {
        assets: [],
        subscription: null,
        transactions: [],
      },
      initialStateSnapshot: {
        latestSubscription: null,
        state: "none",
      },
      profile: {
        avatarUrl: null,
        email: "member@example.com",
        isBanned: false,
        publicId: "MEM-1",
        role: "member",
        userId: "11111111-1111-4111-8111-111111111111",
        username: "member",
      },
    });
  });
});
