import "server-only";

import { env } from "@/config/env.server";
import {
  createSessionBoundRequestNonce,
  touchActiveAppSessionLastSeen,
  validateActiveAppSession,
  verifySessionBoundRequestNonce,
} from "@/modules/sessions/services";

import { extensionRequestHeadersSchema, extensionTrackHeartbeatInputSchema } from "./schemas";
import { upsertExtensionTrackHeartbeat } from "./repositories";

import type { ExtensionNetworkMetadata, ExtensionRuntimeConfig } from "./types";

function readHeaderValue(headers: Headers | Record<string, string | null | undefined>, key: string) {
  if (headers instanceof Headers) {
    return headers.get(key);
  }

  return headers[key] ?? headers[key.toLowerCase()] ?? null;
}

export function getExtensionRuntimeConfig(): ExtensionRuntimeConfig {
  return {
    allowedIds: env.EXTENSION_ALLOWED_IDS,
    allowedOrigins: env.EXTENSION_ALLOWED_ORIGINS,
    trustedProxyHeaders: {
      city: env.TRUSTED_PROXY_CITY_HEADER,
      country: env.TRUSTED_PROXY_COUNTRY_HEADER,
      ip: env.TRUSTED_PROXY_IP_HEADER,
    },
  };
}

export function assertExtensionRequestAllowed(input: { extensionId: string; origin: string }) {
  const headers = extensionRequestHeadersSchema.parse(input);
  const config = getExtensionRuntimeConfig();

  if (!config.allowedIds.includes(headers.extensionId)) {
    throw new Error("Extension ID is not allowed.");
  }

  if (!config.allowedOrigins.includes(headers.origin)) {
    throw new Error("Extension origin is not allowed.");
  }

  return headers;
}

export function extractTrustedNetworkMetadata(
  headers: Headers | Record<string, string | null | undefined>,
): ExtensionNetworkMetadata {
  const config = getExtensionRuntimeConfig();

  return {
    city: readHeaderValue(headers, config.trustedProxyHeaders.city),
    country: readHeaderValue(headers, config.trustedProxyHeaders.country),
    ipAddress: readHeaderValue(headers, config.trustedProxyHeaders.ip) ?? "unknown",
  };
}

async function requireActiveExtensionSession() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    throw new Error("An active app session is required.");
  }

  return activeSession;
}

export async function issueExtensionRequestNonceForActiveSession() {
  const activeSession = await requireActiveExtensionSession();
  await touchActiveAppSessionLastSeen();

  return createSessionBoundRequestNonce({
    sessionId: activeSession.sessionId,
    userId: activeSession.userId,
  });
}

export async function verifyExtensionRequestNonceForSession(input: {
  nonce: string;
  sessionId: string;
  userId: string;
}) {
  const payload = await verifySessionBoundRequestNonce(input.nonce);

  if (payload.sessionId !== input.sessionId || payload.userId !== input.userId) {
    throw new Error("Request nonce does not match the active session.");
  }

  return payload;
}

export async function trackExtensionHeartbeat(input: {
  heartbeat: {
    browser: string | null;
    deviceId: string;
    extensionId: string;
    extensionVersion: string;
    os: string | null;
  };
  requestHeaders: Headers | Record<string, string | null | undefined>;
}) {
  const activeSession = await requireActiveExtensionSession();
  const heartbeat = extensionTrackHeartbeatInputSchema.parse(input.heartbeat);
  const network = extractTrustedNetworkMetadata(input.requestHeaders);

  await touchActiveAppSessionLastSeen();

  return upsertExtensionTrackHeartbeat({
    heartbeat: {
      ...heartbeat,
      sessionId: activeSession.sessionId,
      userId: activeSession.userId,
    },
    network,
  });
}
