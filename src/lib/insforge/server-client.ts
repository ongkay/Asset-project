import "server-only";

import { createClient } from "@insforge/sdk";

import { env } from "@/config/env.server";

import type { InsForgeClient, InsForgeServerClientOptions } from "./types";

export function createInsForgeServerClient(options: InsForgeServerClientOptions = {}): InsForgeClient {
  return createClient({
    baseUrl: env.INSFORGE_URL,
    anonKey: env.INSFORGE_ANON_KEY,
    isServerMode: true,
    edgeFunctionToken: options.accessToken,
    debug: options.debug,
    fetch: options.fetch,
    functionsUrl: options.functionsUrl,
    headers: options.headers,
    retryCount: options.retryCount,
    retryDelay: options.retryDelay,
    timeout: options.timeout,
  });
}
