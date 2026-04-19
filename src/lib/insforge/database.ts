import "server-only";

import type { Database } from "@insforge/sdk";

import { readInsForgeAccessTokenCookie } from "@/lib/cookies";

import { createInsForgeAdminClient } from "./admin-client";
import { createInsForgeServerClient } from "./server-client";
import type { InsForgeAdminClientOptions, InsForgeServerClientOptions } from "./types";

export function createInsForgeServerDatabase(options: InsForgeServerClientOptions = {}): Database {
  return createInsForgeServerClient(options).database;
}

export function createInsForgeAdminDatabase(options: InsForgeAdminClientOptions = {}): Database {
  return createInsForgeAdminClient(options).database;
}

export async function createAuthenticatedInsForgeServerDatabase(): Promise<Database> {
  const accessToken = await readInsForgeAccessTokenCookie();

  if (!accessToken) {
    throw new Error("An authenticated InsForge access token is required.");
  }

  return createInsForgeServerDatabase({ accessToken });
}
