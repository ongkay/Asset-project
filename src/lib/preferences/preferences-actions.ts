"use server";

import { writeCookieValue } from "@/lib/cookies";

export async function setServerPreferenceCookie(key: string, value: string): Promise<void> {
  await writeCookieValue(key, value, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });
}
