import "server-only";

import { cookies } from "next/headers";

export async function getServerPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): Promise<T> {
  const cookieStore = await cookies();
  const value = cookieStore.get(key)?.value?.trim();

  return value && allowed.includes(value as T) ? (value as T) : fallback;
}
