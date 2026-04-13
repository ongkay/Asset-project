import "server-only";

import { cookies } from "next/headers";

import { env } from "@/config/env.server";

const DEFAULT_APP_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type CookieWriteOptions = {
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "none" | "strict";
  secure?: boolean;
};

function buildCookieOptions(options: CookieWriteOptions = {}) {
  return {
    path: options.path ?? "/",
    httpOnly: options.httpOnly ?? true,
    sameSite: options.sameSite ?? "lax",
    secure: options.secure ?? process.env.NODE_ENV === "production",
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
  });
}

export async function clearAppSessionCookie(): Promise<void> {
  await clearCookieValue(env.APP_SESSION_COOKIE_NAME);
}

export { DEFAULT_APP_SESSION_MAX_AGE_SECONDS };
