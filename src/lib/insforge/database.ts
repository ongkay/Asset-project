import "server-only";

import type { Database } from "@insforge/sdk";

import { createInsForgeAdminClient } from "./admin-client";
import { createInsForgeServerClient } from "./server-client";
import type { InsForgeAdminClientOptions, InsForgeServerClientOptions } from "./types";

export function createInsForgeServerDatabase(options: InsForgeServerClientOptions = {}): Database {
  return createInsForgeServerClient(options).database;
}

export function createInsForgeAdminDatabase(options: InsForgeAdminClientOptions = {}): Database {
  return createInsForgeAdminClient(options).database;
}
