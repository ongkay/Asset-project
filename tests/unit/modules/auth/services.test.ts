import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completePasswordReset,
  readCurrentAuthEmailVerificationState,
  readCurrentEmailVerificationResendCooldownRemainingSeconds,
  readValidatedInsForgeAccessTokenForActiveAppSession,
  requestEmailVerificationLink,
  requestPasswordReset,
  signInAndCreateAppSession,
  signOutAndRevokeAppSession,
  signUpAndCreateAppSession,
} from "@/modules/auth/services";

const repositoryMocks = vi.hoisted(() => ({
  deleteAuthUserAsAdmin: vi.fn(),
  refreshInsForgeSession: vi.fn(),
  insertLoginLog: vi.fn(),
  provisionMemberProfile: vi.fn(),
  readAuthUserByEmail: vi.fn(),
  readAuthenticatedUserSnapshot: vi.fn(),
  readProfileByUserId: vi.fn(),
  readWrongPasswordFailureCount: vi.fn(),
  resetPasswordWithOtp: vi.fn(),
  resendVerificationEmail: vi.fn(),
  sendResetPasswordEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  createAppSession: vi.fn(),
  revokeAllAppSessionsForUser: vi.fn(),
  revokeActiveAppSession: vi.fn(),
  revokeActiveAppSessionRecord: vi.fn(),
  validateActiveAppSession: vi.fn(),
}));

const cookieMocks = vi.hoisted(() => ({
  clearEmailVerificationResendCooldownCookie: vi.fn(),
  clearInsForgeAccessTokenCookie: vi.fn(),
  clearInsForgeRefreshTokenCookie: vi.fn(),
  readEmailVerificationResendCooldownCookie: vi.fn(),
  readInsForgeAccessTokenCookie: vi.fn(),
  readInsForgeRefreshTokenCookie: vi.fn(),
  writeEmailVerificationResendCooldownCookie: vi.fn(),
  writeInsForgeAccessTokenCookie: vi.fn(),
  writeInsForgeRefreshTokenCookie: vi.fn(),
}));

vi.mock("@/modules/auth/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth/repositories")>("@/modules/auth/repositories");

  return {
    ...actual,
    deleteAuthUserAsAdmin: repositoryMocks.deleteAuthUserAsAdmin,
    refreshInsForgeSession: repositoryMocks.refreshInsForgeSession,
    insertLoginLog: repositoryMocks.insertLoginLog,
    provisionMemberProfile: repositoryMocks.provisionMemberProfile,
    readAuthUserByEmail: repositoryMocks.readAuthUserByEmail,
    readAuthenticatedUserSnapshot: repositoryMocks.readAuthenticatedUserSnapshot,
    readProfileByUserId: repositoryMocks.readProfileByUserId,
    readWrongPasswordFailureCount: repositoryMocks.readWrongPasswordFailureCount,
    resetPasswordWithOtp: repositoryMocks.resetPasswordWithOtp,
    resendVerificationEmail: repositoryMocks.resendVerificationEmail,
    sendResetPasswordEmail: repositoryMocks.sendResetPasswordEmail,
    signInWithPassword: repositoryMocks.signInWithPassword,
    signUpWithPassword: repositoryMocks.signUpWithPassword,
  };
});

vi.mock("@/modules/sessions/services", () => ({
  createAppSession: sessionMocks.createAppSession,
  revokeAllAppSessionsForUser: sessionMocks.revokeAllAppSessionsForUser,
  revokeActiveAppSession: sessionMocks.revokeActiveAppSession,
  revokeActiveAppSessionRecord: sessionMocks.revokeActiveAppSessionRecord,
  validateActiveAppSession: sessionMocks.validateActiveAppSession,
}));

vi.mock("@/lib/cookies", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cookies")>("@/lib/cookies");

  return {
    ...actual,
    clearEmailVerificationResendCooldownCookie: cookieMocks.clearEmailVerificationResendCooldownCookie,
    clearInsForgeAccessTokenCookie: cookieMocks.clearInsForgeAccessTokenCookie,
    clearInsForgeRefreshTokenCookie: cookieMocks.clearInsForgeRefreshTokenCookie,
    readEmailVerificationResendCooldownCookie: cookieMocks.readEmailVerificationResendCooldownCookie,
    readInsForgeAccessTokenCookie: cookieMocks.readInsForgeAccessTokenCookie,
    readInsForgeRefreshTokenCookie: cookieMocks.readInsForgeRefreshTokenCookie,
    writeEmailVerificationResendCooldownCookie: cookieMocks.writeEmailVerificationResendCooldownCookie,
    writeInsForgeAccessTokenCookie: cookieMocks.writeInsForgeAccessTokenCookie,
    writeInsForgeRefreshTokenCookie: cookieMocks.writeInsForgeRefreshTokenCookie,
  };
});

describe("signInAndCreateAppSession", () => {
  beforeEach(() => {
    repositoryMocks.insertLoginLog.mockReset();
    repositoryMocks.deleteAuthUserAsAdmin.mockReset();
    repositoryMocks.refreshInsForgeSession.mockReset();
    repositoryMocks.provisionMemberProfile.mockReset();
    repositoryMocks.readAuthUserByEmail.mockReset();
    repositoryMocks.readAuthenticatedUserSnapshot.mockReset();
    repositoryMocks.readProfileByUserId.mockReset();
    repositoryMocks.readWrongPasswordFailureCount.mockReset();
    repositoryMocks.resetPasswordWithOtp.mockReset();
    repositoryMocks.resendVerificationEmail.mockReset();
    repositoryMocks.sendResetPasswordEmail.mockReset();
    repositoryMocks.signInWithPassword.mockReset();
    repositoryMocks.signUpWithPassword.mockReset();
    sessionMocks.createAppSession.mockReset();
    sessionMocks.revokeAllAppSessionsForUser.mockReset();
    sessionMocks.revokeActiveAppSession.mockReset();
    sessionMocks.revokeActiveAppSessionRecord.mockReset();
    sessionMocks.validateActiveAppSession.mockReset();
    cookieMocks.clearInsForgeAccessTokenCookie.mockReset();
    cookieMocks.clearInsForgeRefreshTokenCookie.mockReset();
    cookieMocks.clearEmailVerificationResendCooldownCookie.mockReset();
    cookieMocks.readEmailVerificationResendCooldownCookie.mockReset();
    cookieMocks.readInsForgeAccessTokenCookie.mockReset();
    cookieMocks.readInsForgeRefreshTokenCookie.mockReset();
    cookieMocks.writeEmailVerificationResendCooldownCookie.mockReset();
    cookieMocks.writeInsForgeAccessTokenCookie.mockReset();
    cookieMocks.writeInsForgeRefreshTokenCookie.mockReset();
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
        refreshToken: "insforge-refresh-token",
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
      redirectTo: "/member",
    });

    expect(cookieMocks.writeInsForgeAccessTokenCookie).toHaveBeenCalledWith("insforge-access-token");
    expect(cookieMocks.writeInsForgeRefreshTokenCookie).toHaveBeenCalledWith("insforge-refresh-token");
  });

  it("keeps login successful even when the authentication audit log write fails", async () => {
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: true,
      id: "11111111-1111-4111-8111-111111111111",
    });
    repositoryMocks.signInWithPassword.mockResolvedValue({
      data: {
        accessToken: "insforge-access-token",
        refreshToken: "insforge-refresh-token",
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
    repositoryMocks.insertLoginLog.mockRejectedValue(new Error("login log unavailable"));

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
      redirectTo: "/member",
    });

    expect(sessionMocks.revokeActiveAppSession).not.toHaveBeenCalled();
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
        refreshToken: "insforge-refresh-token",
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
        refreshToken: "signup-refresh-token",
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
    cookieMocks.clearInsForgeRefreshTokenCookie.mockResolvedValue(undefined);
    cookieMocks.clearEmailVerificationResendCooldownCookie.mockResolvedValue(undefined);

    await expect(signOutAndRevokeAppSession()).resolves.toEqual({
      ok: true,
      redirectTo: "/login",
    });

    expect(cookieMocks.clearInsForgeAccessTokenCookie).toHaveBeenCalledTimes(1);
    expect(cookieMocks.clearInsForgeRefreshTokenCookie).toHaveBeenCalledTimes(1);
    expect(cookieMocks.clearEmailVerificationResendCooldownCookie).toHaveBeenCalledTimes(1);
  });

  it("invalidates the app session when the InsForge token cookie is missing", async () => {
    sessionMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    cookieMocks.readInsForgeAccessTokenCookie.mockResolvedValue(undefined);

    await expect(readValidatedInsForgeAccessTokenForActiveAppSession()).resolves.toBeNull();

    expect(sessionMocks.revokeActiveAppSessionRecord).toHaveBeenCalledTimes(1);
    expect(sessionMocks.revokeActiveAppSession).not.toHaveBeenCalled();
  });

  it("refreshes the upstream auth session when only the refresh token cookie is still available", async () => {
    sessionMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    cookieMocks.readInsForgeAccessTokenCookie.mockResolvedValue(undefined);
    cookieMocks.readInsForgeRefreshTokenCookie.mockResolvedValue("refresh-token");
    repositoryMocks.refreshInsForgeSession.mockResolvedValue({
      data: {
        accessToken: "refreshed-access-token",
        refreshToken: "refreshed-refresh-token",
        user: {
          id: "11111111-1111-4111-8111-111111111111",
        },
      },
      error: null,
    });

    await expect(readValidatedInsForgeAccessTokenForActiveAppSession()).resolves.toBe("refreshed-access-token");

    expect(repositoryMocks.refreshInsForgeSession).toHaveBeenCalledWith({ refreshToken: "refresh-token" });
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

    expect(sessionMocks.revokeActiveAppSessionRecord).toHaveBeenCalledTimes(1);
    expect(sessionMocks.revokeActiveAppSession).not.toHaveBeenCalled();
  });

  it("reads the email verification flag for the current authenticated user", async () => {
    sessionMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
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
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: false,
      id: "11111111-1111-4111-8111-111111111111",
    });

    await expect(readCurrentAuthEmailVerificationState()).resolves.toBe(false);
  });

  it("keeps the email verification read path side-effect free when the email is already verified", async () => {
    sessionMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
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
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: true,
      id: "11111111-1111-4111-8111-111111111111",
    });

    await expect(readCurrentAuthEmailVerificationState()).resolves.toBe(true);

    expect(cookieMocks.clearEmailVerificationResendCooldownCookie).not.toHaveBeenCalled();
  });

  it("reads the remaining resend cooldown seconds from the cooldown cookie", async () => {
    sessionMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
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
    cookieMocks.readEmailVerificationResendCooldownCookie.mockResolvedValue(
      JSON.stringify({ cooldownUntil: Date.now() + 11_000, email: "member@example.com" }),
    );

    await expect(readCurrentEmailVerificationResendCooldownRemainingSeconds()).resolves.toBeGreaterThanOrEqual(10);
  });

  it("returns a clear login message when the provider rejects sign in for an unverified email", async () => {
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: false,
      id: "11111111-1111-4111-8111-111111111111",
    });
    repositoryMocks.signInWithPassword.mockResolvedValue({
      data: null,
      error: {
        error: "EMAIL_NOT_VERIFIED",
        message: "Email is not verified",
        statusCode: 403,
      },
    });
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
      failureReason: "email_not_verified",
      message: "Your email is not verified yet. Check your inbox before signing in.",
      ok: false,
      showResetPasswordCta: false,
    });
  });

  it("provisions the profile and instructs the user to verify email before sign in when signup requires verification", async () => {
    repositoryMocks.readAuthUserByEmail.mockResolvedValue(null);
    repositoryMocks.signUpWithPassword.mockResolvedValue({
      data: {
        accessToken: null,
        refreshToken: "signup-refresh-token",
        requireEmailVerification: true,
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
    ).resolves.toEqual({
      failureReason: "email_not_verified",
      message: "Account created for member-1. Check your email to verify it before signing in.",
      ok: false,
    });

    expect(sessionMocks.createAppSession).not.toHaveBeenCalled();
    expect(cookieMocks.writeInsForgeAccessTokenCookie).not.toHaveBeenCalled();
    expect(repositoryMocks.insertLoginLog).not.toHaveBeenCalled();
  });

  it("keeps signup successful even when the authentication audit log write fails", async () => {
    repositoryMocks.readAuthUserByEmail.mockResolvedValue(null);
    repositoryMocks.signUpWithPassword.mockResolvedValue({
      data: {
        accessToken: "signup-access-token",
        refreshToken: "signup-refresh-token",
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
    repositoryMocks.insertLoginLog.mockRejectedValue(new Error("login log unavailable"));

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
    ).resolves.toEqual({
      message: "Welcome, member-1.",
      ok: true,
      redirectTo: "/member",
    });

    expect(sessionMocks.revokeActiveAppSession).not.toHaveBeenCalled();
    expect(repositoryMocks.deleteAuthUserAsAdmin).not.toHaveBeenCalled();
  });

  it("returns an already verified message instead of resending another verification email", async () => {
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: true,
      id: "11111111-1111-4111-8111-111111111111",
    });

    await expect(
      requestEmailVerificationLink({
        email: "member@example.com",
        redirectTo: "https://assetnext.dev/email-verified",
      }),
    ).resolves.toEqual({
      message: "Your email is already verified. Refresh this page to continue.",
      ok: true,
    });

    expect(repositoryMocks.resendVerificationEmail).not.toHaveBeenCalled();
    expect(cookieMocks.clearEmailVerificationResendCooldownCookie).toHaveBeenCalledTimes(1);
  });

  it("enforces the resend verification cooldown on the server", async () => {
    cookieMocks.readEmailVerificationResendCooldownCookie.mockResolvedValue(
      JSON.stringify({ cooldownUntil: Date.now() + 5_000, email: "member@example.com" }),
    );

    const result = await requestEmailVerificationLink({
      email: "member@example.com",
      redirectTo: "https://assetnext.dev/email-verified",
    });

    expect(result.ok).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(4);
    expect(repositoryMocks.readAuthUserByEmail).not.toHaveBeenCalled();
    expect(repositoryMocks.resendVerificationEmail).not.toHaveBeenCalled();
  });

  it("sends a verification link with the provided redirect target when the email is still unverified", async () => {
    cookieMocks.readEmailVerificationResendCooldownCookie.mockResolvedValue(undefined);
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: false,
      id: "11111111-1111-4111-8111-111111111111",
    });
    repositoryMocks.resendVerificationEmail.mockResolvedValue({
      data: {
        message: "Verification email sent",
        success: true,
      },
      error: null,
    });

    await expect(
      requestEmailVerificationLink({
        email: "member@example.com",
        redirectTo: "https://assetnext.dev/email-verified",
      }),
    ).resolves.toEqual({
      message: "Verification link sent. Check your email to continue.",
      ok: true,
      retryAfterSeconds: 60,
    });

    expect(repositoryMocks.resendVerificationEmail).toHaveBeenCalledWith({
      email: "member@example.com",
      redirectTo: "https://assetnext.dev/email-verified",
    });
    expect(cookieMocks.writeEmailVerificationResendCooldownCookie).toHaveBeenCalledTimes(1);
  });

  it("revokes all existing app sessions after a successful password reset when the email is available", async () => {
    repositoryMocks.resetPasswordWithOtp.mockResolvedValue({
      data: {
        message: "Password reset successful.",
      },
      error: null,
    });
    repositoryMocks.readAuthUserByEmail.mockResolvedValue({
      email: "member@example.com",
      emailVerified: true,
      id: "11111111-1111-4111-8111-111111111111",
    });

    await expect(
      completePasswordReset({
        confirmPassword: "Secret123!",
        email: "member@example.com",
        password: "Secret123!",
        resetToken: "valid-reset-token",
      }),
    ).resolves.toEqual({
      message: "Password updated. Sign in with your new password to continue.",
      ok: true,
      redirectTo: "/login",
      requiresLogin: true,
    });

    expect(sessionMocks.revokeAllAppSessionsForUser).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
  });

  it("always appends the normalized email to the reset-password redirect target", async () => {
    repositoryMocks.sendResetPasswordEmail.mockResolvedValue({
      data: {
        message: "Password reset email sent",
        success: true,
      },
      error: null,
    });

    await expect(
      requestPasswordReset({
        payload: { email: "Member@Example.com" },
        redirectTo: "https://assetnext.dev/reset-password?source=login",
      }),
    ).resolves.toEqual({
      message: "If the email can receive reset instructions, we sent them.",
      ok: true,
    });

    expect(repositoryMocks.sendResetPasswordEmail).toHaveBeenCalledWith({
      email: "member@example.com",
      redirectTo: "https://assetnext.dev/reset-password?source=login&email=member%40example.com",
    });
  });
});
