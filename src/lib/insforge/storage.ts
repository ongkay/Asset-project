import "server-only";

import type { Storage } from "@insforge/sdk";

import { createInsForgeAdminClient } from "./admin-client";
import { createInsForgeServerClient } from "./server-client";
import type { InsForgeAdminClientOptions, InsForgeServerClientOptions } from "./types";

export function createInsForgeServerStorage(options: InsForgeServerClientOptions = {}): Storage {
  return createInsForgeServerClient(options).storage;
}

export function createInsForgeAdminStorage(options: InsForgeAdminClientOptions = {}): Storage {
  return createInsForgeAdminClient(options).storage;
}
