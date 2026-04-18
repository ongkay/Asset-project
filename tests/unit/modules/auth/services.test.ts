import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/repositories", () => ({
  exchangeResetPasswordToken: vi.fn(),
  insertLoginLog: vi.fn(),
  provisionMemberProfile: vi.fn(),
  readAuthUserByEmail: vi.fn(),
  readAuthenticatedUserSnapshot: vi.fn(),
  readProfileByUserId: vi.fn(),
  readWrongPasswordFailureCount: vi.fn(),
  resetPasswordWithOtp: vi.fn(),
  sendResetPasswordEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  updateAuthUserPasswordAsAdmin: vi.fn(),
}));

vi.mock("@/modules/sessions/services", () => ({
  createAppSession: vi.fn(),
  revokeActiveAppSession: vi.fn(),
}));

import * as authRepositories from "@/modules/auth/repositories";
import { changeUserPasswordByAdmin } from "@/modules/auth/services";

const mockedReadProfileByUserId = vi.mocked(authRepositories.readProfileByUserId);
const mockedUpdateAuthUserPasswordAsAdmin = vi.mocked(authRepositories.updateAuthUserPasswordAsAdmin);

describe("auth/services", () => {
  beforeEach(() => {
    mockedReadProfileByUserId.mockReset();
    mockedUpdateAuthUserPasswordAsAdmin.mockReset();
  });

  it("updates the existing auth identity password through the trusted admin helper", async () => {
    mockedReadProfileByUserId.mockResolvedValueOnce({
      avatarUrl: null,
      email: "member@assetnext.dev",
      isBanned: false,
      publicId: "MEM-ABC123",
      role: "member",
      userId: "91000000-0000-4000-8000-000000000002",
      username: "member-user",
    });
    mockedUpdateAuthUserPasswordAsAdmin.mockResolvedValueOnce({
      userId: "91000000-0000-4000-8000-000000000002",
    });

    await expect(
      changeUserPasswordByAdmin({
        userId: "91000000-0000-4000-8000-000000000002",
        newPassword: "Devpass123",
        confirmPassword: "Devpass123",
      }),
    ).resolves.toEqual({
      userId: "91000000-0000-4000-8000-000000000002",
    });

    expect(mockedUpdateAuthUserPasswordAsAdmin).toHaveBeenCalledWith({
      newPassword: "Devpass123",
      userId: "91000000-0000-4000-8000-000000000002",
    });
  });
});
