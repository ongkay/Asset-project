import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    profile: {
      isBanned: false,
      role: "admin",
      userId: "91000000-0000-4000-8000-000000000001",
    },
    session: {
      id: "session-1",
      userId: "91000000-0000-4000-8000-000000000001",
    },
  }),
}));

vi.mock("@/modules/auth/services", async () => {
  return {
    checkAuthEmailStatus: vi.fn(),
    completePasswordReset: vi.fn(),
    changeUserPasswordByAdmin: vi.fn(),
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
import { changeUserPasswordAction } from "@/modules/auth/actions";

const mockedChangeUserPasswordByAdmin = vi.mocked(authServices.changeUserPasswordByAdmin);

describe("auth/actions", () => {
  beforeEach(() => {
    mockedChangeUserPasswordByAdmin.mockReset();
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
});
