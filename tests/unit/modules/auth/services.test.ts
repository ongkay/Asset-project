import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readValidatedInsForgeAccessTokenForActiveAppSession,
  signInAndCreateAppSession,
  signOutAndRevokeAppSession,
  signUpAndCreateAppSession,
} from "@/modules/auth/services";

const repositoryMocks = vi.hoisted(() => ({
  insertLoginLog: vi.fn(),
  provisionMemberProfile: vi.fn(),
  readAuthUserByEmail: vi.fn(),
  readAuthenticatedUserSnapshot: vi.fn(),
  readProfileByUserId: vi.fn(),
  readWrongPasswordFailureCount: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  createAppSession: vi.fn(),
  revokeActiveAppSession: vi.fn(),
  validateActiveAppSession: vi.fn(),
}));

const cookieMocks = vi.hoisted(() => ({
  clearInsForgeAccessTokenCookie: vi.fn(),
  readInsForgeAccessTokenCookie: vi.fn(),
  writeInsForgeAccessTokenCookie: vi.fn(),
}));

vi.mock("@/modules/auth/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth/repositories")>("@/modules/auth/repositories");

  return {
    ...actual,
    insertLoginLog: repositoryMocks.insertLoginLog,
    provisionMemberProfile: repositoryMocks.provisionMemberProfile,
    readAuthUserByEmail: repositoryMocks.readAuthUserByEmail,
    readAuthenticatedUserSnapshot: repositoryMocks.readAuthenticatedUserSnapshot,
    readProfileByUserId: repositoryMocks.readProfileByUserId,
    readWrongPasswordFailureCount: repositoryMocks.readWrongPasswordFailureCount,
    signInWithPassword: repositoryMocks.signInWithPassword,
    signUpWithPassword: repositoryMocks.signUpWithPassword,
  };
});

vi.mock("@/modules/sessions/services", () => ({
  createAppSession: sessionMocks.createAppSession,
  revokeActiveAppSession: sessionMocks.revokeActiveAppSession,
  validateActiveAppSession: sessionMocks.validateActiveAppSession,
}));

vi.mock("@/lib/cookies", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cookies")>("@/lib/cookies");

  return {
    ...actual,
    clearInsForgeAccessTokenCookie: cookieMocks.clearInsForgeAccessTokenCookie,
    readInsForgeAccessTokenCookie: cookieMocks.readInsForgeAccessTokenCookie,
    writeInsForgeAccessTokenCookie: cookieMocks.writeInsForgeAccessTokenCookie,
  };
});

describe("signInAndCreateAppSession", () => {
  beforeEach(() => {
    repositoryMocks.insertLoginLog.mockReset();
    repositoryMocks.provisionMemberProfile.mockReset();
    repositoryMocks.readAuthUserByEmail.mockReset();
    repositoryMocks.readAuthenticatedUserSnapshot.mockReset();
    repositoryMocks.readProfileByUserId.mockReset();
    repositoryMocks.readWrongPasswordFailureCount.mockReset();
    repositoryMocks.signInWithPassword.mockReset();
    repositoryMocks.signUpWithPassword.mockReset();
    sessionMocks.createAppSession.mockReset();
    sessionMocks.revokeActiveAppSession.mockReset();
    sessionMocks.validateActiveAppSession.mockReset();
    cookieMocks.clearInsForgeAccessTokenCookie.mockReset();
    cookieMocks.readInsForgeAccessTokenCookie.mockReset();
    cookieMocks.writeInsForgeAccessTokenCookie.mockReset();
  });

  it("stores the InsForge access token when login succeeds", async () => {
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: true,
      id: "11111111-1111-4111-8111-111111111111",
    });
    repositoryMocks.signInWithPassword.mockResolvedValue({
      data: {
        accessToken: "insforge-access-token",
        user: {
          id: "11111111-1111-4111-8111-111111111111",
        },
      },
      error: null,
    });
    repositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "member@example.com",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "11111111-1111-4111-8111-111111111111",
      username: "member-1",
    });
    sessionMocks.createAppSession.mockResolvedValue({ sessionId: "session-1" });
    repositoryMocks.insertLoginLog.mockResolvedValue(undefined);

    await expect(
      signInAndCreateAppSession({
        credentials: { email: "member@example.com", password: "Secret123!" },
        metadata: {
          browser: null,
          ipAddress: "127.0.0.1",
          os: null,
        },
      }),
    ).resolves.toEqual({
      ok: true,
      redirectTo: "/console",
    });

    expect(cookieMocks.writeInsForgeAccessTokenCookie).toHaveBeenCalledWith("insforge-access-token");
  });

  it("revokes the freshly-created app session when token cookie persistence fails during sign in", async () => {
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: true,
      id: "11111111-1111-4111-8111-111111111111",
    });
    repositoryMocks.signInWithPassword.mockResolvedValue({
      data: {
        accessToken: "insforge-access-token",
        user: {
          id: "11111111-1111-4111-8111-111111111111",
        },
      },
      error: null,
    });
    repositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "member@example.com",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "11111111-1111-4111-8111-111111111111",
      username: "member-1",
    });
    sessionMocks.createAppSession.mockResolvedValue({ sessionId: "session-1" });
    cookieMocks.writeInsForgeAccessTokenCookie.mockRejectedValue(new Error("cookie write failed"));

    await expect(
      signInAndCreateAppSession({
        credentials: { email: "member@example.com", password: "Secret123!" },
        metadata: {
          browser: null,
          ipAddress: "127.0.0.1",
          os: null,
        },
      }),
    ).rejects.toThrow("cookie write failed");

    expect(sessionMocks.revokeActiveAppSession).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.insertLoginLog).not.toHaveBeenCalled();
  });

  it("revokes the freshly-created app session when token cookie persistence fails during sign up", async () => {
    repositoryMocks.readAuthUserByEmail.mockResolvedValue(null);
    repositoryMocks.signUpWithPassword.mockResolvedValue({
      data: {
        accessToken: "signup-access-token",
        user: {
          id: "11111111-1111-4111-8111-111111111111",
        },
      },
      error: null,
    });
    repositoryMocks.provisionMemberProfile.mockResolvedValue({
      avatarUrl: null,
      email: "member@example.com",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "11111111-1111-4111-8111-111111111111",
      username: "member-1",
    });
    sessionMocks.createAppSession.mockResolvedValue({ sessionId: "session-1" });
    cookieMocks.writeInsForgeAccessTokenCookie.mockRejectedValue(new Error("cookie write failed"));

    await expect(
      signUpAndCreateAppSession({
        credentials: {
          confirmPassword: "Secret123!",
          email: "member@example.com",
          password: "Secret123!",
        },
        metadata: {
          browser: null,
          ipAddress: "127.0.0.1",
          os: null,
        },
      }),
    ).rejects.toThrow("cookie write failed");

    expect(sessionMocks.revokeActiveAppSession).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.insertLoginLog).not.toHaveBeenCalled();
  });

  it("clears the InsForge access token when signing out", async () => {
    sessionMocks.revokeActiveAppSession.mockResolvedValue(1);
    cookieMocks.clearInsForgeAccessTokenCookie.mockResolvedValue(undefined);

    await expect(signOutAndRevokeAppSession()).resolves.toEqual({
      ok: true,
      redirectTo: "/login",
    });

    expect(cookieMocks.clearInsForgeAccessTokenCookie).toHaveBeenCalledTimes(1);
  });

  it("invalidates the app session when the InsForge token cookie is missing", async () => {
    sessionMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    cookieMocks.readInsForgeAccessTokenCookie.mockResolvedValue(undefined);

    await expect(readValidatedInsForgeAccessTokenForActiveAppSession()).resolves.toBeNull();

    expect(sessionMocks.revokeActiveAppSession).toHaveBeenCalledTimes(1);
  });

  it("invalidates the app session when the InsForge token does not map to the same user", async () => {
    sessionMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    cookieMocks.readInsForgeAccessTokenCookie.mockResolvedValue("stale-token");
    repositoryMocks.readAuthenticatedUserSnapshot.mockResolvedValue({
      accessToken: "stale-token",
      profile: null,
      user: {
        email: "other@example.com",
        id: "22222222-2222-4222-8222-222222222222",
      },
    });

    await expect(readValidatedInsForgeAccessTokenForActiveAppSession()).resolves.toBeNull();

    expect(sessionMocks.revokeActiveAppSession).toHaveBeenCalledTimes(1);
  });
});
