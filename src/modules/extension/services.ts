import "server-only";

import { env } from "@/config/env.server";
import { readAppSessionCookie } from "@/lib/cookies";
import { ExtensionApiError } from "@/lib/extension-api/errors";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { signOutAndRevokeAppSession } from "@/modules/auth/services";
import { getConsoleStateSnapshot } from "@/modules/console/queries";
import {
  createSessionBoundRequestNonce,
  touchActiveAppSessionLastSeen,
  validateActiveAppSession,
  verifySessionBoundRequestNonce,
} from "@/modules/sessions/services";

import { doesExtensionAssetExist, getExtensionAssetDetailForUser, getExtensionConsoleSnapshotForUser } from "./queries";
import { upsertExtensionTrackHeartbeat } from "./repositories";
import {
  extensionIdSchema,
  extensionOriginSchema,
  extensionRequestHeadersSchema,
  extensionTrackHeartbeatInputSchema,
} from "./schemas";

import type {
  ExtensionNetworkMetadata,
  ExtensionRuntimeConfig,
  ExtensionSessionResponse,
  ExtensionSessionStatus,
} from "./types";

function readHeaderValue(headers: Headers | Record<string, string | null | undefined>, key: string) {
  if (headers instanceof Headers) {
    return headers.get(key) ?? headers.get(key.toLowerCase());
  }

  return headers[key] ?? headers[key.toLowerCase()] ?? null;
}

function hasExtensionAssetAccess(status: ExtensionSessionStatus): status is "active" | "processed" {
  return status === "active" || status === "processed";
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

export function assertExtensionRequestAllowed(input: { extensionId: string | null; origin: string | null }) {
  const extensionId = input.extensionId?.trim() ?? "";

  if (!extensionId) {
    throw new ExtensionApiError("EXT_HEADER_REQUIRED", "Header x-extension-id is required.");
  }

  try {
    const parsedExtensionId = extensionIdSchema.parse(extensionId);
    const config = getExtensionRuntimeConfig();

    if (!config.allowedIds.includes(parsedExtensionId)) {
      throw new ExtensionApiError("EXT_ORIGIN_DENIED", "Extension origin is not allowed.");
    }

    const normalizedOrigin = input.origin?.trim() || `chrome-extension://${parsedExtensionId}`;
    const parsedOrigin = extensionOriginSchema.parse(normalizedOrigin);
    const parsedHeaders = extensionRequestHeadersSchema.parse({
      extensionId: parsedExtensionId,
      origin: parsedOrigin,
    });

    if (!config.allowedOrigins.includes(parsedHeaders.origin)) {
      throw new ExtensionApiError("EXT_ORIGIN_DENIED", "Extension origin is not allowed.");
    }

    return parsedHeaders;
  } catch (error) {
    if (error instanceof ExtensionApiError) {
      throw error;
    }

    throw new ExtensionApiError("EXT_ORIGIN_DENIED", "Extension origin is not allowed.");
  }
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

async function requireExtensionRequestContext(requestHeaders: Headers) {
  const extensionRequest = assertExtensionRequestAllowed({
    extensionId: readHeaderValue(requestHeaders, "x-extension-id"),
    origin: readHeaderValue(requestHeaders, "origin"),
  });

  const rawSessionCookie = await readAppSessionCookie();
  const activeSession = await validateActiveAppSession();

  if (!rawSessionCookie) {
    throw new ExtensionApiError("SESSION_MISSING", "An active app session is required.");
  }

  if (!activeSession) {
    throw new ExtensionApiError("SESSION_REVOKED", "This app session is no longer valid.");
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile) {
    throw new ExtensionApiError("SESSION_REVOKED", "This app session is no longer valid.");
  }

  if (profile.isBanned) {
    throw new ExtensionApiError("USER_BANNED", "This user is not allowed to use the extension.");
  }

  const snapshot = await getExtensionConsoleSnapshotForUser({ userId: activeSession.userId });
  const consoleState = await getConsoleStateSnapshot({ userId: activeSession.userId });
  const subscription = hasExtensionAssetAccess(consoleState.state) ? snapshot.subscription : null;

  return {
    consoleState,
    extensionRequest,
    profile,
    session: activeSession,
    snapshot,
    subscription,
  };
}

function requireExtensionAssetAccess(context: Awaited<ReturnType<typeof requireExtensionRequestContext>>) {
  if (!context.subscription || !hasExtensionAssetAccess(context.consoleState.state)) {
    throw new ExtensionApiError("SUBSCRIPTION_EXPIRED", "A valid subscription is required.");
  }

  return context.subscription;
}

export async function getExtensionSessionResponse(input: {
  requestHeaders: Headers;
}): Promise<ExtensionSessionResponse> {
  const context = await requireExtensionRequestContext(input.requestHeaders);
  await touchActiveAppSessionLastSeen();

  const user = {
    email: context.profile.email,
    id: context.session.userId,
    publicId: context.profile.publicId,
    username: context.profile.username,
  };

  if (!hasExtensionAssetAccess(context.consoleState.state) || !context.subscription) {
    return {
      subscription: {
        assets: [],
        daysLeft: 0,
        endAt: context.consoleState.latestSubscription?.endAt ?? null,
        packageName: context.consoleState.latestSubscription?.packageName ?? null,
        status: context.consoleState.state,
      },
      user,
    };
  }

  const requestNonce = await createSessionBoundRequestNonce({
    sessionId: context.session.sessionId,
    userId: context.session.userId,
  });

  return {
    requestNonce,
    subscription: {
      assets: context.snapshot.assets,
      daysLeft: context.subscription.daysLeft,
      endAt: context.subscription.endAt,
      packageName: context.subscription.packageName,
      status: context.subscription.status,
    },
    user,
  };
}

export async function getExtensionAssetResponse(input: {
  assetId: string;
  nonce: string | null;
  requestHeaders: Headers;
}) {
  if (!input.nonce?.trim()) {
    throw new ExtensionApiError("NONCE_REQUIRED", "Header x-request-nonce is required.");
  }

  const context = await requireExtensionRequestContext(input.requestHeaders);
  requireExtensionAssetAccess(context);
  let noncePayload;

  try {
    noncePayload = await verifySessionBoundRequestNonce(input.nonce);
  } catch {
    throw new ExtensionApiError("NONCE_INVALID", "Request nonce is invalid.");
  }

  if (noncePayload.sessionId !== context.session.sessionId || noncePayload.userId !== context.session.userId) {
    throw new ExtensionApiError("NONCE_INVALID", "Request nonce is invalid.");
  }

  const detail = await getExtensionAssetDetailForUser({
    assetId: input.assetId,
    userId: context.session.userId,
  });

  if (!detail) {
    const assetExists = await doesExtensionAssetExist(input.assetId);

    throw new ExtensionApiError(
      assetExists ? "ASSET_NOT_ALLOWED" : "NOT_FOUND",
      assetExists ? "This asset is not available to the active subscription." : "Asset was not found.",
    );
  }

  await touchActiveAppSessionLastSeen();

  return {
    accessKey: detail.accessKey,
    account: detail.account,
    asset: detail.asset,
    assetType: detail.assetType,
    expiresAt: detail.expiresAt,
    id: detail.id,
    note: detail.note,
    platform: detail.platform,
    proxy: detail.proxy,
  };
}

export async function createExtensionTrackResponse(input: { heartbeat: unknown; requestHeaders: Headers }) {
  const context = await requireExtensionRequestContext(input.requestHeaders);
  const heartbeat = extensionTrackHeartbeatInputSchema.parse(input.heartbeat);
  const network = extractTrustedNetworkMetadata(input.requestHeaders);

  await touchActiveAppSessionLastSeen();
  await upsertExtensionTrackHeartbeat({
    heartbeat: {
      ...heartbeat,
      extensionId: context.extensionRequest.extensionId,
      sessionId: context.session.sessionId,
      userId: context.session.userId,
    },
    network,
  });

  return {
    success: true,
    timestamp: new Date().toISOString(),
  };
}

export async function createExtensionLogoutResponse(input: { requestHeaders: Headers }) {
  assertExtensionRequestAllowed({
    extensionId: readHeaderValue(input.requestHeaders, "x-extension-id"),
    origin: readHeaderValue(input.requestHeaders, "origin"),
  });

  const payload = await signOutAndRevokeAppSession();

  return {
    redirectTo: payload.redirectTo,
    success: payload.ok,
  };
}
