import "server-only";

import {
  clearEmailVerificationResendCooldownCookie,
  clearInsForgeAccessTokenCookie,
  clearInsForgeRefreshTokenCookie,
  readEmailVerificationResendCooldownCookie,
  readInsForgeAccessTokenCookie,
  readInsForgeRefreshTokenCookie,
  writeEmailVerificationResendCooldownCookie,
  writeInsForgeAccessTokenCookie,
  writeInsForgeRefreshTokenCookie,
} from "@/lib/cookies";

import {
  adminChangeUserPasswordInputSchema,
  checkAuthEmailInputSchema,
  completeResetPasswordInputSchema,
  authRequestMetadataSchema,
  exchangeResetPasswordInputSchema,
  loginLogWriteInputSchema,
  resetPasswordInputSchema,
  sendResetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
} from "./schemas";
import {
  deleteAuthUserAsAdmin,
  exchangeResetPasswordToken,
  refreshInsForgeSession,
  updateAuthUserPasswordAsAdmin,
  insertLoginLog,
  provisionMemberProfile,
  resendVerificationEmail,
  readAuthUserByEmail,
  readAuthenticatedUserSnapshot,
  readWrongPasswordFailureCount,
  readProfileByUserId,
  resetPasswordWithOtp,
  sendResetPasswordEmail,
  signInWithPassword,
  signUpWithPassword,
} from "./repositories";
import {
  createAppSession,
  revokeAllAppSessionsForUser,
  revokeActiveAppSession,
  revokeActiveAppSessionRecord,
  validateActiveAppSession,
} from "../sessions/services";

import type { AuthActionResult, AuthFailureReason, AuthProfile, AuthRedirectTarget } from "./types";

const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

// These functions are the canonical server-side auth/session lifecycle boundary for Phase 1.
// UI auth flows should use them instead of composing raw auth + session + login-log calls ad hoc.
async function writeAuthenticationLog(input: {
  browser: string | null;
  email: string;
  failureReason: string | null;
  ipAddress: string;
  isSuccess: boolean;
  os: string | null;
  userId: string | null;
}) {
  await insertLoginLog(loginLogWriteInputSchema.parse(input));
}

async function writeAuthenticationLogSafely(input: {
  browser: string | null;
  email: string;
  failureReason: string | null;
  ipAddress: string;
  isSuccess: boolean;
  os: string | null;
  userId: string | null;
}) {
  try {
    await writeAuthenticationLog(input);
  } catch (error) {
    console.error("Auth audit log write failed:", error);
  }
}

function resolveRedirectTarget(profile: AuthProfile): AuthRedirectTarget {
  return profile.role === "admin" ? "/admin" : "/member";
}

function mapAuthFailureReason(error: { error?: string | null; message?: string | null; statusCode?: number } | null) {
  const code = error?.error?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (error?.statusCode === 403 || code.includes("verify") || message.includes("verify")) {
    return "email_not_verified" satisfies AuthFailureReason;
  }

  if (
    error?.statusCode === 401 ||
    code.includes("credential") ||
    code.includes("password") ||
    message.includes("password")
  ) {
    return "wrong_password" satisfies AuthFailureReason;
  }

  return "sign_in_failed" satisfies AuthFailureReason;
}

function mapRegisterFailureReason(
  error: { error?: string | null; message?: string | null; statusCode?: number } | null,
) {
  const code = error?.error?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (error?.statusCode === 409 || code.includes("exist") || message.includes("already")) {
    return "email_already_registered" satisfies AuthFailureReason;
  }

  return "auth_provider_error" satisfies AuthFailureReason;
}

function isInvalidResetTokenError(
  error: { error?: string | null; message?: string | null; statusCode?: number } | null,
) {
  const code = error?.error?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.statusCode === 400 ||
    error?.statusCode === 401 ||
    code.includes("token") ||
    code.includes("reset") ||
    message.includes("invalid") ||
    message.includes("expired") ||
    message.includes("token")
  );
}

async function readResetPasswordCtaState(email: string) {
  const failureCount = await readWrongPasswordFailureCount(email);

  return {
    failureCount,
    showResetPasswordCta: failureCount >= 5,
  };
}

function readCooldownRemainingSeconds(cooldownUntil: string | undefined, now = Date.now()) {
  const parsedCooldownUntil = Number.parseInt(cooldownUntil ?? "", 10);

  if (!Number.isFinite(parsedCooldownUntil) || parsedCooldownUntil <= now) {
    return 0;
  }

  return Math.ceil((parsedCooldownUntil - now) / 1000);
}

function readVerificationResendCooldownValue(input: string | undefined) {
  if (!input) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(input) as { cooldownUntil?: number; email?: string };

    if (typeof parsedValue.cooldownUntil !== "number" || typeof parsedValue.email !== "string") {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function appendEmailSearchParamToUrl(url: string, email: string) {
  const parsedUrl = new URL(url);

  parsedUrl.searchParams.set("email", email);

  return parsedUrl.toString();
}

async function createAlignedAppSession(input: { accessToken: string; refreshToken: string; userId: string }) {
  await createAppSession(input.userId);

  try {
    await writeInsForgeAccessTokenCookie(input.accessToken);
    await writeInsForgeRefreshTokenCookie(input.refreshToken);
  } catch (error) {
    await revokeActiveAppSession();
    throw error;
  }
}

export async function readValidatedInsForgeAccessTokenForActiveAppSession(): Promise<string | null> {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  const accessToken = await readInsForgeAccessTokenCookie();

  if (accessToken) {
    try {
      const authenticatedUserSnapshot = await readAuthenticatedUserSnapshot(accessToken);

      if (authenticatedUserSnapshot.user?.id === activeSession.userId) {
        return accessToken;
      }
    } catch {
      // Fall through to refresh-token validation below.
    }
  }

  const refreshToken = await readInsForgeRefreshTokenCookie();

  if (!refreshToken) {
    await revokeActiveAppSessionRecord();
    return null;
  }

  const refreshedSession = await refreshInsForgeSession({ refreshToken });

  if (refreshedSession.error || !refreshedSession.data?.accessToken || !refreshedSession.data.user) {
    await revokeActiveAppSessionRecord();
    return null;
  }

  if (refreshedSession.data.user.id !== activeSession.userId) {
    await revokeActiveAppSessionRecord();
    return null;
  }

  return refreshedSession.data.accessToken;
}

export async function hasValidatedInsForgeSessionForActiveAppSession(): Promise<boolean> {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return false;
  }

  const validateSnapshotForSession = async (accessToken?: string) => {
    try {
      const authenticatedUserSnapshot = await readAuthenticatedUserSnapshot(accessToken);

      return authenticatedUserSnapshot.user?.id === activeSession.userId;
    } catch {
      return false;
    }
  };

  const accessToken = await readInsForgeAccessTokenCookie();

  if (accessToken && (await validateSnapshotForSession(accessToken))) {
    return true;
  }

  if (await validateSnapshotForSession()) {
    return true;
  }

  await revokeActiveAppSessionRecord();
  return false;
}

export async function checkAuthEmailStatus(input: unknown) {
  const payload = checkAuthEmailInputSchema.parse(input);
  const authUser = await readAuthUserByEmail(payload);

  return {
    normalizedEmail: payload.email,
    status: authUser ? "registered" : "unregistered",
  };
}

export async function readCurrentAuthEmailVerificationState(): Promise<boolean | null> {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile) {
    await revokeActiveAppSession();
    return null;
  }

  const authUser = await readAuthUserByEmail({ email: profile.email });

  return authUser?.emailVerified ?? null;
}

export async function readCurrentEmailVerificationResendCooldownRemainingSeconds(): Promise<number> {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return 0;
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile) {
    return 0;
  }

  const cooldownValue = readVerificationResendCooldownValue(await readEmailVerificationResendCooldownCookie());

  if (!cooldownValue || cooldownValue.email !== profile.email) {
    return 0;
  }

  return readCooldownRemainingSeconds(String(cooldownValue.cooldownUntil));
}

export async function signInAndCreateAppSession(input: {
  credentials: unknown;
  metadata: unknown;
}): Promise<AuthActionResult> {
  const credentials = signInInputSchema.parse(input.credentials);
  const metadata = authRequestMetadataSchema.parse(input.metadata);
  const existingAuthUser = await readAuthUserByEmail({ email: credentials.email });

  if (!existingAuthUser) {
    return {
      message: "Continue by creating a new account first.",
      ok: false,
      showResetPasswordCta: false,
    };
  }

  const result = await signInWithPassword(credentials);

  if (result.error || !result.data?.user || !result.data.accessToken || !result.data.refreshToken) {
    const failureReason = mapAuthFailureReason(result.error);
    await writeAuthenticationLogSafely({
      browser: metadata.browser,
      email: credentials.email,
      failureReason,
      ipAddress: metadata.ipAddress,
      isSuccess: false,
      os: metadata.os,
      userId: existingAuthUser.id,
    });

    const resetPasswordState =
      failureReason === "wrong_password"
        ? await readResetPasswordCtaState(credentials.email)
        : { failureCount: 0, showResetPasswordCta: false };

    return {
      failureReason,
      message:
        failureReason === "wrong_password"
          ? "Password is incorrect. Try again."
          : failureReason === "email_not_verified"
            ? "Your email is not verified yet. Check your inbox before signing in."
            : "Login failed. Try again later.",
      ok: false,
      showResetPasswordCta: resetPasswordState.showResetPasswordCta,
    };
  }

  const profile = await readProfileByUserId(result.data.user.id);

  if (!profile) {
    await writeAuthenticationLogSafely({
      browser: metadata.browser,
      email: credentials.email,
      failureReason: "profile_missing",
      ipAddress: metadata.ipAddress,
      isSuccess: false,
      os: metadata.os,
      userId: result.data.user.id,
    });

    return {
      failureReason: "profile_missing",
      message: "This account is not ready for sign in yet.",
      ok: false,
    };
  }

  if (profile.isBanned) {
    await writeAuthenticationLogSafely({
      browser: metadata.browser,
      email: credentials.email,
      failureReason: "user_banned",
      ipAddress: metadata.ipAddress,
      isSuccess: false,
      os: metadata.os,
      userId: result.data.user.id,
    });

    return {
      failureReason: "user_banned",
      message: "This account is not allowed to sign in.",
      ok: false,
    };
  }

  await createAlignedAppSession({
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
    userId: result.data.user.id,
  });

  await writeAuthenticationLogSafely({
    browser: metadata.browser,
    email: credentials.email,
    failureReason: null,
    ipAddress: metadata.ipAddress,
    isSuccess: true,
    os: metadata.os,
    userId: result.data.user.id,
  });

  return {
    ok: true,
    redirectTo: resolveRedirectTarget(profile),
  };
}

export async function signUpAndCreateAppSession(input: {
  credentials: unknown;
  metadata: unknown;
}): Promise<AuthActionResult> {
  const credentials = signUpInputSchema.parse(input.credentials);
  const metadata = authRequestMetadataSchema.parse(input.metadata);
  const existingAuthUser = await readAuthUserByEmail({ email: credentials.email });

  if (existingAuthUser) {
    return {
      failureReason: "email_already_registered",
      message: "An account already exists for this email.",
      ok: false,
    };
  }

  const result = await signUpWithPassword(credentials);

  if (result.error || !result.data?.user || !result.data.refreshToken) {
    const failureReason = mapRegisterFailureReason(result.error);

    return {
      failureReason,
      message:
        failureReason === "email_already_registered"
          ? "An account already exists for this email."
          : "Account could not be created right now.",
      ok: false,
    };
  }

  const requiresEmailVerification = !result.data.accessToken && result.data.requireEmailVerification === true;

  if (!result.data.accessToken && !requiresEmailVerification) {
    return {
      failureReason: "auth_provider_error",
      message: "Account could not be created right now.",
      ok: false,
    };
  }

  const signupAccessToken = result.data.accessToken;

  let hasAlignedAppSession = false;

  try {
    const profile = await provisionMemberProfile({
      email: credentials.email,
      userId: result.data.user.id,
    });

    if (requiresEmailVerification) {
      return {
        failureReason: "email_not_verified",
        message: `Account created for ${profile.username}. Check your email to verify it before signing in.`,
        ok: false,
      };
    }

    if (!signupAccessToken) {
      throw new Error("Signup access token is required when email verification is not pending.");
    }

    await createAlignedAppSession({
      accessToken: signupAccessToken,
      refreshToken: result.data.refreshToken,
      userId: result.data.user.id,
    });
    hasAlignedAppSession = true;

    await writeAuthenticationLogSafely({
      browser: metadata.browser,
      email: credentials.email,
      failureReason: null,
      ipAddress: metadata.ipAddress,
      isSuccess: true,
      os: metadata.os,
      userId: result.data.user.id,
    });
    return {
      message: `Welcome, ${profile.username}.`,
      ok: true,
      redirectTo: "/member",
    };
  } catch (error) {
    if (hasAlignedAppSession) {
      await revokeActiveAppSession();
    }

    try {
      await deleteAuthUserAsAdmin({ userId: result.data.user.id });
    } catch {
      // Preserve the original signup failure and avoid masking it with rollback issues.
    }

    throw error;
  }
}

export async function signOutAndRevokeAppSession() {
  await revokeActiveAppSession();
  await clearEmailVerificationResendCooldownCookie();
  await clearInsForgeAccessTokenCookie();
  await clearInsForgeRefreshTokenCookie();

  return {
    ok: true,
    redirectTo: "/login" as const,
  };
}

export async function requestPasswordReset(input: { payload: unknown; redirectTo: string }) {
  const payload = sendResetPasswordInputSchema.parse(input.payload);
  const redirectTo = appendEmailSearchParamToUrl(input.redirectTo, payload.email);

  try {
    await sendResetPasswordEmail({
      ...payload,
      redirectTo,
    });
  } catch (_error) {
    // Keep the reset request privacy contract stable even when the provider rejects an unknown email.
  }

  return {
    message: "If the email can receive reset instructions, we sent them.",
    ok: true,
  };
}

export async function requestEmailVerificationLink(input: { email: string; redirectTo: string }) {
  const payload = sendResetPasswordInputSchema.parse({ email: input.email });
  const cooldownValue = readVerificationResendCooldownValue(await readEmailVerificationResendCooldownCookie());
  const retryAfterSeconds =
    cooldownValue?.email === payload.email ? readCooldownRemainingSeconds(String(cooldownValue.cooldownUntil)) : 0;

  if (retryAfterSeconds > 0) {
    return {
      message: `Please wait ${retryAfterSeconds} seconds before requesting another verification link.`,
      ok: false as const,
      retryAfterSeconds,
    };
  }

  const authUser = await readAuthUserByEmail(payload);

  if (!authUser) {
    return {
      message: "Verification status could not be confirmed right now.",
      ok: false as const,
    };
  }

  if (authUser.emailVerified) {
    await clearEmailVerificationResendCooldownCookie();

    return {
      message: "Your email is already verified. Refresh this page to continue.",
      ok: true as const,
    };
  }

  const result = await resendVerificationEmail({
    ...payload,
    redirectTo: input.redirectTo,
  });

  if (result.error) {
    return {
      message: "Verification link could not be sent right now.",
      ok: false as const,
    };
  }

  const cooldownUntil = Date.now() + EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;

  await writeEmailVerificationResendCooldownCookie(
    JSON.stringify({ cooldownUntil, email: payload.email }),
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  );

  return {
    message: "Verification link sent. Check your email to continue.",
    ok: true as const,
    retryAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  };
}

export async function exchangePasswordResetCode(input: unknown) {
  return exchangeResetPasswordToken(exchangeResetPasswordInputSchema.parse(input));
}

export async function completePasswordReset(input: unknown) {
  const payload = completeResetPasswordInputSchema.parse(input);
  const result = await resetPasswordWithOtp(
    resetPasswordInputSchema.parse({
      otp: payload.resetToken,
      password: payload.password,
    }),
  );

  if (result.error || !result.data) {
    return {
      failureReason: isInvalidResetTokenError(result.error) ? "invalid_reset_token" : "auth_provider_error",
      message: isInvalidResetTokenError(result.error)
        ? "Reset link is invalid or expired. Request a new link to continue."
        : "Password could not be updated right now.",
      ok: false,
      requiresLogin: true,
    } satisfies AuthActionResult;
  }

  if (payload.email) {
    const authUser = await readAuthUserByEmail({ email: payload.email });

    if (authUser) {
      await revokeAllAppSessionsForUser(authUser.id);
    }
  }

  return {
    message: "Password updated. Sign in with your new password to continue.",
    ok: true,
    redirectTo: "/login",
    requiresLogin: true,
  } satisfies AuthActionResult;
}

export async function changeUserPasswordByAdmin(input: unknown) {
  const payload = adminChangeUserPasswordInputSchema.parse(input);
  const profile = await readProfileByUserId(payload.userId);

  if (!profile) {
    throw new Error("User not found.");
  }

  return updateAuthUserPasswordAsAdmin({
    newPassword: payload.newPassword,
    userId: payload.userId,
  });
}

export async function getAuthenticatedUserSnapshot(accessToken?: string) {
  return readAuthenticatedUserSnapshot(accessToken);
}
