import "server-only";

import type { Auth } from "@insforge/sdk";

import { createInsForgeAdminClient } from "./admin-client";
import { createInsForgeServerClient } from "./server-client";
import type { InsForgeAdminClientOptions, InsForgeServerClientOptions } from "./types";

export function createInsForgeServerAuth(options: InsForgeServerClientOptions = {}): Auth {
  return createInsForgeServerClient(options).auth;
}

export function createInsForgeAdminAuth(options: InsForgeAdminClientOptions = {}): Auth {
  return createInsForgeAdminClient(options).auth;
}
