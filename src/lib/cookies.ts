import "server-only";

import { cookies } from "next/headers";

import { env } from "@/config/env.server";

const DEFAULT_APP_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_INSFORGE_REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_INSFORGE_ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_COOKIE_NAME = "email_verification_resend_cooldown";
const INSFORGE_ACCESS_TOKEN_COOKIE_NAME = "insforge_access_token";
const INSFORGE_REFRESH_TOKEN_COOKIE_NAME = "insforge_refresh_token";

type CookieWriteOptions = {
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "none" | "strict";
  secure?: boolean;
};

function buildCookieOptions(options: CookieWriteOptions = {}) {
  const resolvedSameSite = options.sameSite ?? "lax";

  return {
    path: options.path ?? "/",
    httpOnly: options.httpOnly ?? true,
    sameSite: resolvedSameSite,
    secure: options.secure ?? (resolvedSameSite === "none" || process.env.NODE_ENV === "production"),
    maxAge: options.maxAge,
    expires: options.expires,
  };
}

export async function readCookieValue(name: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function writeCookieValue(name: string, value: string, options: CookieWriteOptions = {}): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(name, value, buildCookieOptions(options));
}

export async function clearCookieValue(name: string, path = "/"): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(name, "", {
    ...buildCookieOptions({ path }),
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function readAppSessionCookie(): Promise<string | undefined> {
  return readCookieValue(env.APP_SESSION_COOKIE_NAME);
}

export async function writeAppSessionCookie(
  token: string,
  maxAgeSeconds = DEFAULT_APP_SESSION_MAX_AGE_SECONDS,
): Promise<void> {
  await writeCookieValue(env.APP_SESSION_COOKIE_NAME, token, {
    maxAge: maxAgeSeconds,
    sameSite: "none",
  });
}

export async function clearAppSessionCookie(): Promise<void> {
  await clearCookieValue(env.APP_SESSION_COOKIE_NAME);
}

export async function readInsForgeAccessTokenCookie(): Promise<string | undefined> {
  return readCookieValue(INSFORGE_ACCESS_TOKEN_COOKIE_NAME);
}

export async function writeInsForgeAccessTokenCookie(
  accessToken: string,
  maxAgeSeconds = DEFAULT_INSFORGE_ACCESS_TOKEN_MAX_AGE_SECONDS,
): Promise<void> {
  await writeCookieValue(INSFORGE_ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    maxAge: maxAgeSeconds,
  });
}

export async function clearInsForgeAccessTokenCookie(): Promise<void> {
  await clearCookieValue(INSFORGE_ACCESS_TOKEN_COOKIE_NAME);
}

export async function readInsForgeRefreshTokenCookie(): Promise<string | undefined> {
  return readCookieValue(INSFORGE_REFRESH_TOKEN_COOKIE_NAME);
}

export async function writeInsForgeRefreshTokenCookie(
  refreshToken: string,
  maxAgeSeconds = DEFAULT_INSFORGE_REFRESH_TOKEN_MAX_AGE_SECONDS,
): Promise<void> {
  await writeCookieValue(INSFORGE_REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    maxAge: maxAgeSeconds,
  });
}

export async function clearInsForgeRefreshTokenCookie(): Promise<void> {
  await clearCookieValue(INSFORGE_REFRESH_TOKEN_COOKIE_NAME);
}

export async function readEmailVerificationResendCooldownCookie(): Promise<string | undefined> {
  return readCookieValue(EMAIL_VERIFICATION_RESEND_COOLDOWN_COOKIE_NAME);
}

export async function writeEmailVerificationResendCooldownCookie(value: string, maxAgeSeconds: number): Promise<void> {
  await writeCookieValue(EMAIL_VERIFICATION_RESEND_COOLDOWN_COOKIE_NAME, value, {
    maxAge: maxAgeSeconds,
  });
}

export async function clearEmailVerificationResendCooldownCookie(): Promise<void> {
  await clearCookieValue(EMAIL_VERIFICATION_RESEND_COOLDOWN_COOKIE_NAME);
}

export {
  DEFAULT_APP_SESSION_MAX_AGE_SECONDS,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_COOKIE_NAME,
  INSFORGE_ACCESS_TOKEN_COOKIE_NAME,
  INSFORGE_REFRESH_TOKEN_COOKIE_NAME,
};
