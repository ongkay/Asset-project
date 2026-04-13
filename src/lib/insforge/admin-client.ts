import "server-only";

import { createClient } from "@insforge/sdk";

import { env } from "@/config/env.server";

import type { InsForgeAdminClientOptions, InsForgeClient } from "./types";

export function createInsForgeAdminClient(options: InsForgeAdminClientOptions = {}): InsForgeClient {
  return createClient({
    baseUrl: env.INSFORGE_URL,
    isServerMode: true,
    debug: options.debug,
    fetch: options.fetch,
    functionsUrl: options.functionsUrl,
    headers: {
      // The SDK does not expose a dedicated service-key option, so trusted server calls
      // use the same bearer header path that InsForge expects for privileged credentials.
      Authorization: `Bearer ${env.INSFORGE_SERVICE_KEY}`,
      ...options.headers,
    },
    retryCount: options.retryCount,
    retryDelay: options.retryDelay,
    timeout: options.timeout,
  });
}
