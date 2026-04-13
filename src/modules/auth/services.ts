import "server-only";

import {
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
  insertLoginLog,
  readAuthenticatedUserSnapshot,
  readProfileByUserId,
  resetPasswordWithOtp,
  sendResetPasswordEmail,
  signInWithPassword,
  signUpWithPassword,
} from "./repositories";
import { createAppSession, revokeActiveAppSession } from "../sessions/services";

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

export async function signInAndCreateAppSession(input: { credentials: unknown; metadata: unknown }) {
  const credentials = signInInputSchema.parse(input.credentials);
  const metadata = authRequestMetadataSchema.parse(input.metadata);
  const result = await signInWithPassword(credentials);

  if (result.error || !result.data?.user) {
    await writeAuthenticationLog({
      browser: metadata.browser,
      email: credentials.email,
      failureReason: result.error?.message ?? "sign_in_failed",
      ipAddress: metadata.ipAddress,
      isSuccess: false,
      os: metadata.os,
      userId: null,
    });

    throw result.error ?? new Error("Sign in did not return a user.");
  }

  const appSession = await createAppSession(result.data.user.id);

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
    appSession,
    profile: await readProfileByUserId(result.data.user.id),
    user: result.data.user,
  };
}

export async function signUpAndCreateAppSession(input: { credentials: unknown; metadata: unknown }) {
  const credentials = signUpInputSchema.parse(input.credentials);
  const metadata = authRequestMetadataSchema.parse(input.metadata);
  const result = await signUpWithPassword(credentials);

  if (result.error || !result.data?.user) {
    throw result.error ?? new Error("Sign up did not return a user.");
  }

  const appSession = await createAppSession(result.data.user.id);

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
    appSession,
    profile: await readProfileByUserId(result.data.user.id),
    user: result.data.user,
  };
}

export async function signOutAndRevokeAppSession() {
  return revokeActiveAppSession();
}

export async function requestPasswordReset(input: unknown) {
  return sendResetPasswordEmail(sendResetPasswordInputSchema.parse(input));
}

export async function exchangePasswordResetCode(input: unknown) {
  return exchangeResetPasswordToken(exchangeResetPasswordInputSchema.parse(input));
}

export async function completePasswordReset(input: unknown) {
  return resetPasswordWithOtp(resetPasswordInputSchema.parse(input));
}

export async function getAuthenticatedUserSnapshot(accessToken?: string) {
  return readAuthenticatedUserSnapshot(accessToken);
}
