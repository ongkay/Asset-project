import "server-only";

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
  exchangeResetPasswordToken,
  updateAuthUserPasswordAsAdmin,
  insertLoginLog,
  provisionMemberProfile,
  readAuthUserByEmail,
  readAuthenticatedUserSnapshot,
  readWrongPasswordFailureCount,
  readProfileByUserId,
  resetPasswordWithOtp,
  sendResetPasswordEmail,
  signInWithPassword,
  signUpWithPassword,
} from "./repositories";
import { createAppSession, revokeActiveAppSession } from "../sessions/services";

import type { AuthActionResult, AuthFailureReason, AuthProfile, AuthRedirectTarget } from "./types";

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

function resolveRedirectTarget(profile: AuthProfile): AuthRedirectTarget {
  return profile.role === "admin" ? "/admin" : "/console";
}

function mapAuthFailureReason(error: { error?: string | null; message?: string | null; statusCode?: number } | null) {
  const code = error?.error?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

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

export async function checkAuthEmailStatus(input: unknown) {
  const payload = checkAuthEmailInputSchema.parse(input);
  const authUser = await readAuthUserByEmail(payload);

  return {
    normalizedEmail: payload.email,
    status: authUser ? "registered" : "unregistered",
  };
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

  if (result.error || !result.data?.user) {
    const failureReason = mapAuthFailureReason(result.error);
    await writeAuthenticationLog({
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
        failureReason === "wrong_password" ? "Password is incorrect. Try again." : "Login failed. Try again later.",
      ok: false,
      showResetPasswordCta: resetPasswordState.showResetPasswordCta,
    };
  }

  const profile = await readProfileByUserId(result.data.user.id);

  if (!profile) {
    await writeAuthenticationLog({
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
    await writeAuthenticationLog({
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

  await createAppSession(result.data.user.id);

  try {
    await writeAuthenticationLog({
      browser: metadata.browser,
      email: credentials.email,
      failureReason: null,
      ipAddress: metadata.ipAddress,
      isSuccess: true,
      os: metadata.os,
      userId: result.data.user.id,
    });
  } catch (error) {
    await revokeActiveAppSession();
    throw error;
  }

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

  if (result.error || !result.data?.user || !result.data.accessToken) {
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

  const profile = await provisionMemberProfile({
    email: credentials.email,
    userId: result.data.user.id,
  });

  await createAppSession(result.data.user.id);

  try {
    await writeAuthenticationLog({
      browser: metadata.browser,
      email: credentials.email,
      failureReason: null,
      ipAddress: metadata.ipAddress,
      isSuccess: true,
      os: metadata.os,
      userId: result.data.user.id,
    });
  } catch (error) {
    await revokeActiveAppSession();
    throw error;
  }

  return {
    message: `Welcome, ${profile.username}.`,
    ok: true,
    redirectTo: "/console",
  };
}

export async function signOutAndRevokeAppSession() {
  await revokeActiveAppSession();

  return {
    ok: true,
    redirectTo: "/login" as const,
  };
}

export async function requestPasswordReset(input: { payload: unknown; redirectTo: string }) {
  const payload = sendResetPasswordInputSchema.parse(input.payload);

  try {
    await sendResetPasswordEmail({
      ...payload,
      redirectTo: input.redirectTo,
    });
  } catch (_error) {
    // Keep the reset request privacy contract stable even when the provider rejects an unknown email.
  }

  return {
    message: "If the email can receive reset instructions, we sent them.",
    ok: true,
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
