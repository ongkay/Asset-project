import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedGetAuthenticatedAppUser } = vi.hoisted(() => ({
  mockedGetAuthenticatedAppUser: vi.fn(),
}));

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: mockedGetAuthenticatedAppUser,
}));

vi.mock("@/modules/auth/services", async () => {
  return {
    checkAuthEmailStatus: vi.fn(),
    completePasswordReset: vi.fn(),
    changeUserPasswordByAdmin: vi.fn(),
    requestEmailVerificationLink: vi.fn(),
    requestPasswordReset: vi.fn(),
    signInAndCreateAppSession: vi.fn(),
    signOutAndRevokeAppSession: vi.fn(),
    signUpAndCreateAppSession: vi.fn(),
  };
});

vi.mock("@/lib/request-metadata", () => ({
  buildCurrentUrl: vi.fn(),
  readTrustedRequestMetadata: vi.fn(),
}));

import * as authServices from "@/modules/auth/services";
import * as requestMetadata from "@/lib/request-metadata";
import { changeUserPasswordAction, resendEmailVerificationAction } from "@/modules/auth/actions";

const mockedChangeUserPasswordByAdmin = vi.mocked(authServices.changeUserPasswordByAdmin);
const mockedRequestEmailVerificationLink = vi.mocked(authServices.requestEmailVerificationLink);
const mockedBuildCurrentUrl = vi.mocked(requestMetadata.buildCurrentUrl);

describe("auth/actions", () => {
  beforeEach(() => {
    mockedGetAuthenticatedAppUser.mockReset();
    mockedChangeUserPasswordByAdmin.mockReset();
    mockedRequestEmailVerificationLink.mockReset();
    mockedBuildCurrentUrl.mockReset();

    mockedGetAuthenticatedAppUser.mockResolvedValue({
      profile: {
        email: "admin@assetnext.dev",
        isBanned: false,
        role: "admin",
        userId: "91000000-0000-4000-8000-000000000001",
      },
      session: {
        sessionId: "session-1",
        userId: "91000000-0000-4000-8000-000000000001",
      },
    });
  });

  it("rejects invalid admin password-change payloads before the service runs", async () => {
    const result = await changeUserPasswordAction({
      userId: "91000000-0000-4000-8000-000000000002",
      newPassword: "123",
      confirmPassword: "456",
    });

    expect(result?.validationErrors?.fieldErrors.newPassword).toContain("Password must be at least 6 characters.");
    expect(result?.validationErrors?.fieldErrors.confirmPassword).toContain("Password confirmation must match.");
    expect(mockedChangeUserPasswordByAdmin).not.toHaveBeenCalled();
  });

  it("resends a verification link for the authenticated member using the public verification result page", async () => {
    mockedGetAuthenticatedAppUser.mockResolvedValueOnce({
      profile: {
        email: "member@assetnext.dev",
        isBanned: false,
        role: "member",
        userId: "91000000-0000-4000-8000-000000000002",
      },
      session: {
        sessionId: "session-2",
        userId: "91000000-0000-4000-8000-000000000002",
      },
    });
    mockedBuildCurrentUrl.mockResolvedValueOnce("https://assetnext.dev/email-verified");
    mockedRequestEmailVerificationLink.mockResolvedValueOnce({
      message: "Verification link sent. Check your email to continue.",
      ok: true,
    });

    const result = await resendEmailVerificationAction();

    expect(mockedBuildCurrentUrl).toHaveBeenCalledWith("/email-verified");
    expect(mockedRequestEmailVerificationLink).toHaveBeenCalledWith({
      email: "member@assetnext.dev",
      redirectTo: "https://assetnext.dev/email-verified",
    });
    expect(result?.data).toEqual({
      message: "Verification link sent. Check your email to continue.",
      ok: true,
    });
  });
});
