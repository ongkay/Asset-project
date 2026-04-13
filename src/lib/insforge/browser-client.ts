"use client";

import { createClient } from "@insforge/sdk";

import { publicEnv } from "@/config/env.client";

import type { InsForgeClient } from "./types";

let browserClient: InsForgeClient | undefined;

export function getInsForgeBrowserClient(): InsForgeClient {
  browserClient ??= createClient({
    baseUrl: publicEnv.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: publicEnv.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });

  return browserClient;
}
