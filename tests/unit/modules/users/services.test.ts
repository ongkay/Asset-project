import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/modules/sessions/services", () => ({
  revokeActiveAppSession: vi.fn(),
  touchActiveAppSessionLastSeen: vi.fn(),
  validateActiveAppSession: vi.fn(),
}));

vi.mock("@/modules/users/repositories", () => ({
  findUserProfileById: vi.fn(),
  insertUserProfile: vi.fn(),
  isPublicIdTaken: vi.fn(),
  isUsernameTaken: vi.fn(),
  readProfileByEmail: vi.fn(),
  updateUserBanState: vi.fn(),
  updateUserProfileFields: vi.fn(),
}));

vi.mock("@/modules/auth/repositories", () => ({
  createAuthUserAsAdmin: vi.fn(),
  deleteAuthUserAsAdmin: vi.fn(),
  readAuthUserByEmail: vi.fn(),
}));

import * as authRepositories from "@/modules/auth/repositories";
import * as userRepositories from "@/modules/users/repositories";
import {
  createUserByAdmin,
  generateUniquePublicId,
  normalizeUsernameFromEmailLocalPart,
  resolveUniqueUsername,
  updateUserProfileByAdmin,
  toggleUserBanByAdmin,
} from "@/modules/users/services";

const mockedCreateAuthUserAsAdmin = vi.mocked(authRepositories.createAuthUserAsAdmin);
const mockedDeleteAuthUserAsAdmin = vi.mocked(authRepositories.deleteAuthUserAsAdmin);
const mockedReadAuthUserByEmail = vi.mocked(authRepositories.readAuthUserByEmail);
const mockedInsertUserProfile = vi.mocked(userRepositories.insertUserProfile);
const mockedIsPublicIdTaken = vi.mocked(userRepositories.isPublicIdTaken);
const mockedIsUsernameTaken = vi.mocked(userRepositories.isUsernameTaken);
const mockedReadProfileByEmail = vi.mocked(userRepositories.readProfileByEmail);
const mockedUpdateUserBanState = vi.mocked(userRepositories.updateUserBanState);
const mockedUpdateUserProfileFields = vi.mocked(userRepositories.updateUserProfileFields);

describe("users/services", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedCreateAuthUserAsAdmin.mockReset();
    mockedDeleteAuthUserAsAdmin.mockReset();
    mockedInsertUserProfile.mockReset();
    mockedIsPublicIdTaken.mockReset();
    mockedIsUsernameTaken.mockReset();
    mockedReadAuthUserByEmail.mockReset();
    mockedReadProfileByEmail.mockReset();
    mockedUpdateUserBanState.mockReset();
    mockedUpdateUserProfileFields.mockReset();
  });

  it("normalizes usernames from the email local-part", () => {
    expect(normalizeUsernameFromEmailLocalPart("  New.Member+Trial@AssetNext.dev ")).toBe("new-member-trial");
    expect(normalizeUsernameFromEmailLocalPart("%%%@@assetnext.dev")).toBe("user");
  });

  it("resolves username collisions with deterministic numeric suffixes", async () => {
    mockedIsUsernameTaken.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(resolveUniqueUsername("seed-active-browser")).resolves.toBe("seed-active-browser-2");
    expect(mockedIsUsernameTaken).toHaveBeenNthCalledWith(1, "seed-active-browser");
    expect(mockedIsUsernameTaken).toHaveBeenNthCalledWith(2, "seed-active-browser-2");
  });

  it("retries public_id generation until a unique readable id is found", async () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.000001).mockReturnValueOnce(0.000002);
    mockedIsPublicIdTaken.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(generateUniquePublicId("member")).resolves.toMatch(/^MEM-[A-Z0-9]+$/);
    expect(mockedIsPublicIdTaken).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate emails before auth or profile writes start", async () => {
    mockedReadAuthUserByEmail.mockResolvedValueOnce({
      id: "existing-auth-user",
      email: "existing@assetnext.dev",
      emailVerified: true,
    });

    await expect(
      createUserByAdmin({
        actingAdminUserId: "91000000-0000-4000-8000-000000000001",
        email: "existing@assetnext.dev",
        password: "Devpass123",
        role: "member",
      }),
    ).rejects.toThrow("Email is already used by another user.");

    expect(mockedCreateAuthUserAsAdmin).not.toHaveBeenCalled();
    expect(mockedInsertUserProfile).not.toHaveBeenCalled();
  });

  it("compensates by deleting the auth user if profile creation fails", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.000002);
    mockedReadAuthUserByEmail.mockResolvedValueOnce(null);
    mockedReadProfileByEmail.mockResolvedValueOnce(null);
    mockedIsUsernameTaken.mockResolvedValueOnce(false);
    mockedIsPublicIdTaken.mockResolvedValueOnce(false);
    mockedCreateAuthUserAsAdmin.mockResolvedValueOnce({
      email: "new.member@assetnext.dev",
      emailVerified: true,
      id: "new-auth-user",
    });
    mockedInsertUserProfile.mockRejectedValueOnce(new Error("profiles insert failed"));

    await expect(
      createUserByAdmin({
        actingAdminUserId: "91000000-0000-4000-8000-000000000001",
        email: "new.member@assetnext.dev",
        password: "Devpass123",
        role: "member",
      }),
    ).rejects.toThrow("profiles insert failed");

    expect(mockedDeleteAuthUserAsAdmin).toHaveBeenCalledWith({ userId: "new-auth-user" });
  });

  it("retries generated username or public_id conflicts during profile insert", async () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.000001).mockReturnValueOnce(0.000002);
    mockedReadAuthUserByEmail.mockResolvedValueOnce(null);
    mockedReadProfileByEmail.mockResolvedValueOnce(null);
    mockedIsUsernameTaken.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    mockedIsPublicIdTaken.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    mockedCreateAuthUserAsAdmin.mockResolvedValueOnce({
      email: "new.member@assetnext.dev",
      emailVerified: true,
      id: "new-auth-user",
    });
    mockedInsertUserProfile
      .mockRejectedValueOnce({
        code: "23505",
        message: 'duplicate key value violates unique constraint "profiles_username_unique"',
      })
      .mockResolvedValueOnce({
        avatar_url: null,
        ban_reason: null,
        email: "new.member@assetnext.dev",
        is_banned: false,
        public_id: "MEM-000096",
        role: "member",
        user_id: "new-auth-user",
        username: "new-member-2",
      });

    await expect(
      createUserByAdmin({
        actingAdminUserId: "91000000-0000-4000-8000-000000000001",
        email: "new.member@assetnext.dev",
        password: "Devpass123",
        role: "member",
      }),
    ).resolves.toEqual({
      publicId: "MEM-000096",
      userId: "new-auth-user",
      username: "new-member-2",
    });

    expect(mockedInsertUserProfile).toHaveBeenCalledTimes(2);
    expect(mockedDeleteAuthUserAsAdmin).not.toHaveBeenCalled();
  });

  it("blocks self-ban before the repository mutation runs", async () => {
    await expect(
      toggleUserBanByAdmin({
        actingAdminUserId: "91000000-0000-4000-8000-000000000001",
        nextIsBanned: true,
        userId: "91000000-0000-4000-8000-000000000001",
        banReason: null,
      }),
    ).rejects.toThrow("You cannot ban your own admin account.");

    expect(mockedUpdateUserBanState).not.toHaveBeenCalled();
  });

  it("rejects duplicate requested usernames on profile edit instead of auto-suffixing", async () => {
    mockedIsUsernameTaken.mockResolvedValueOnce(true);

    await expect(
      updateUserProfileByAdmin({
        actingAdminUserId: "91000000-0000-4000-8000-000000000001",
        userId: "91000000-0000-4000-8000-000000000002",
        username: "seed-active-browser",
        avatarUrl: null,
      }),
    ).rejects.toThrow("Username is already used by another user.");

    expect(mockedUpdateUserProfileFields).not.toHaveBeenCalled();
  });
});
