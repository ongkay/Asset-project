import "server-only";

import { createHash } from "node:crypto";

import { env } from "@/config/env.server";
import { ExtApiError } from "@/lib/ext-api/errors";
import { readTrustedRequestMetadataFromHeaders } from "@/lib/request-metadata";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { signOutAndRevokeAppSession } from "@/modules/auth/services";
import { redeemCdKey } from "@/modules/cdkeys/services";
import { getConsoleStateSnapshotByUserId } from "@/modules/console/queries";
import {
  touchAppSessionLastSeen,
  validateActiveAppSession,
  validateAppSessionToken,
} from "@/modules/sessions/services";

import { EXTENSION_V2_KEY } from "./platforms";
import {
  readExtAppConfig,
  readExtRuntimeAssetByUserId,
  readExtAssetSecretByUserId,
  readExtPlatformAccessByUserId,
  readExtPurchasablePackages,
  upsertExtHeartbeatByFingerprint,
} from "./repositories";
import {
  extAssetQuerySchema,
  extAssetSyncQuerySchema,
  extBootstrapQuerySchema,
  extHeartbeatBodySchema,
  extRedeemBodySchema,
  extRequestHeadersSchema,
} from "./schemas";

import type { ExtAssetSummary, ExtMode, ExtPlatform, ExtRuntimeAssetSnapshot, ExtVersionStatus } from "./types";

type ExtRequestHeaders = {
  extensionId: string;
  extensionVersion?: string;
  origin: string;
};

type ExtRequestAllowedContext = {
  extension: {
    extensionId: string;
    origin: string;
    version: string | null;
  };
  versionStatus: ExtVersionStatus;
};

type ExtVersionConfig = {
  downloadUrl: string;
  latestVersion: string;
  minimumVersion: string;
};

type ExtPlatformAccessSummary = Awaited<ReturnType<typeof readExtPlatformAccessByUserId>>[number];

type ExtResolvedRuntimeAsset = {
  asset: ExtRuntimeAssetSnapshot;
  mode: ExtMode;
  platform: ExtPlatform;
  revision: string;
};

export function compareVersion(left: string, right: string) {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);

    if (delta !== 0) {
      return Math.sign(delta);
    }
  }

  return 0;
}

export function readEffectiveHeader(requestHeaders: Headers, key: string, devOverrideKey: string) {
  if (env.EXT_API_DEV_HEADER_OVERRIDE && process.env.NODE_ENV !== "production") {
    return requestHeaders.get(devOverrideKey) ?? requestHeaders.get(key);
  }

  return requestHeaders.get(key);
}

function normalizeFingerprintValue(value: string | null) {
  return value?.trim() ? value : "Unknown";
}

export async function resolveOptionalSession(requestHeaders: Headers) {
  const overrideToken =
    env.EXT_API_DEV_HEADER_OVERRIDE && process.env.NODE_ENV !== "production"
      ? requestHeaders.get("x-ext-dev-app-session")
      : null;

  if (overrideToken?.trim()) {
    return validateAppSessionToken(overrideToken);
  }

  return validateActiveAppSession();
}

export function buildVersionStatus(
  currentVersion: string | null | undefined,
  config: ExtVersionConfig,
): ExtVersionStatus {
  const normalizedVersion = currentVersion?.trim() || "0.0.0";

  if (compareVersion(normalizedVersion, config.minimumVersion) < 0) {
    return {
      downloadUrl: config.downloadUrl,
      latestVersion: config.latestVersion,
      minimumVersion: config.minimumVersion,
      status: "update_required",
    };
  }

  if (compareVersion(normalizedVersion, config.latestVersion) < 0) {
    return {
      downloadUrl: config.downloadUrl,
      latestVersion: config.latestVersion,
      minimumVersion: config.minimumVersion,
      status: "update_available",
    };
  }

  return { status: "supported" };
}

export async function assertExtRequestAllowed(
  requestHeaders: Headers,
  input: { queryVersion?: string | null; versionFallback?: string | null } = {},
): Promise<ExtRequestAllowedContext> {
  const extensionId = readEffectiveHeader(requestHeaders, "x-extension-id", "x-ext-dev-extension-id");
  const origin = readEffectiveHeader(requestHeaders, "origin", "x-ext-dev-origin");

  if (!extensionId) {
    throw new ExtApiError("EXT_HEADER_REQUIRED", "Header x-extension-id is required.");
  }

  if (!origin) {
    throw new ExtApiError("EXT_HEADER_REQUIRED", "Header origin is required.");
  }

  const parsedHeaders = extRequestHeadersSchema.safeParse({
    extensionId,
    extensionVersion:
      requestHeaders.get("x-extension-version") ?? input.queryVersion ?? input.versionFallback ?? undefined,
    origin,
  } satisfies ExtRequestHeaders);

  if (!parsedHeaders.success) {
    throw new ExtApiError("EXT_REQUEST_INVALID", "Extension request headers are invalid.");
  }

  if (
    !env.EXTENSION_ALLOWED_IDS.includes(parsedHeaders.data.extensionId) ||
    !env.EXTENSION_ALLOWED_ORIGINS.includes(parsedHeaders.data.origin)
  ) {
    throw new ExtApiError("EXT_ORIGIN_DENIED", "Extension origin is not allowed.");
  }

  const config = await readExtAppConfig(EXTENSION_V2_KEY);

  if (!config) {
    throw new ExtApiError("EXT_REQUEST_INVALID", "Extension config is missing.");
  }

  return {
    extension: {
      extensionId: parsedHeaders.data.extensionId,
      origin: parsedHeaders.data.origin,
      version: parsedHeaders.data.extensionVersion ?? null,
    },
    versionStatus: buildVersionStatus(parsedHeaders.data.extensionVersion, config),
  };
}

export async function requireExtSessionContext(
  requestHeaders: Headers,
  input: { versionFallback?: string | null } = {},
) {
  const requestContext = await assertExtRequestAllowed(requestHeaders, input);

  if (requestContext.versionStatus.status === "update_required") {
    throw new ExtApiError("EXT_UPDATE_REQUIRED", "Extension update is required.");
  }

  const session = await resolveOptionalSession(requestHeaders);

  if (!session) {
    throw new ExtApiError("EXT_UNAUTHENTICATED", "An active app session is required.");
  }

  const profile = await readProfileByUserId(session.userId);

  if (!profile || profile.isBanned) {
    throw new ExtApiError("EXT_USER_BANNED", "This user is not allowed to use the extension.");
  }

  return {
    ...requestContext,
    session,
  };
}

export async function getExtBootstrapResponse(input: { query: unknown; requestHeaders: Headers }) {
  const query = extBootstrapQuerySchema.safeParse(input.query);

  if (!query.success) {
    throw new ExtApiError("EXT_REQUEST_INVALID", "Extension request headers are invalid.");
  }

  const requestContext = await assertExtRequestAllowed(input.requestHeaders, { queryVersion: query.data.version });
  const activeSession = await resolveOptionalSession(input.requestHeaders);

  if (!activeSession) {
    return {
      auth: { loginUrl: "/login", status: "unauthenticated" as const },
      version: requestContext.versionStatus,
    };
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile || profile.isBanned) {
    throw new ExtApiError("EXT_USER_BANNED", "This user is not allowed to use the extension.");
  }

  const consoleState = await getConsoleStateSnapshotByUserId(activeSession.userId);
  const user = {
    avatarUrl: profile.avatarUrl,
    email: profile.email,
    publicId: profile.publicId,
    username: profile.username,
  };

  if (consoleState.state === "active" || consoleState.state === "processed") {
    return {
      assets: await resolveBootstrapAssetSummaries(activeSession.userId, consoleState.state),
      auth: { status: "authenticated" as const },
      subscription: {
        endAt: consoleState.latestSubscription?.endAt ?? null,
        packageName: consoleState.latestSubscription?.packageName ?? null,
        status: consoleState.state,
      },
      user,
      version: requestContext.versionStatus,
    };
  }

  return {
    auth: { status: "authenticated" as const },
    packages: await readExtPurchasablePackages(),
    redeem: { enabled: true },
    subscription: {
      endAt: consoleState.latestSubscription?.endAt ?? null,
      packageName: consoleState.latestSubscription?.packageName ?? null,
      status: consoleState.state,
    },
    user,
    version: requestContext.versionStatus,
  };
}

export async function getExtAssetResponse(input: { query: unknown; requestHeaders: Headers }) {
  const query = extAssetQuerySchema.safeParse(input.query);

  if (!query.success) {
    throw new ExtApiError("EXT_REQUEST_INVALID", "Asset request query is invalid.");
  }

  const runtimeAsset = await resolveExtRuntimeAssetResponse({
    platform: query.data.platform,
    requestHeaders: input.requestHeaders,
  });

  if (runtimeAsset.status === "forbidden") {
    return { reason: "subscription_required" as const, status: "forbidden" as const };
  }

  return {
    cookies: runtimeAsset.asset.cookies,
    mode: runtimeAsset.mode,
    platform: query.data.platform,
    proxy: runtimeAsset.asset.proxy,
    revision: runtimeAsset.revision,
    status: "ready" as const,
    updatedAt: runtimeAsset.asset.updatedAt,
  };
}

export async function getExtAssetSyncResponse(input: { query: unknown; requestHeaders: Headers }) {
  const query = extAssetSyncQuerySchema.safeParse(input.query);

  if (!query.success) {
    throw new ExtApiError("EXT_REQUEST_INVALID", "Asset sync request query is invalid.");
  }

  const runtimeAsset = await resolveExtRuntimeAssetResponse({
    platform: query.data.platform,
    requestHeaders: input.requestHeaders,
  });

  if (runtimeAsset.status === "forbidden") {
    return runtimeAsset;
  }

  const syncMetadata = {
    mode: runtimeAsset.mode,
    platform: runtimeAsset.platform,
    revision: runtimeAsset.revision,
    updatedAt: runtimeAsset.asset.updatedAt,
  };

  if (!query.data.revision) {
    return {
      ...syncMetadata,
      reason: "missing_revision" as const,
      status: "stale" as const,
    };
  }

  if (query.data.revision !== runtimeAsset.revision) {
    return {
      ...syncMetadata,
      reason: "revision_mismatch" as const,
      status: "stale" as const,
    };
  }

  return {
    ...syncMetadata,
    status: "current" as const,
  };
}

async function resolveBootstrapAssetSummaries(
  userId: string,
  subscriptionStatus: Extract<
    Awaited<ReturnType<typeof getConsoleStateSnapshotByUserId>>["state"],
    "active" | "processed"
  >,
): Promise<ExtAssetSummary[]> {
  const platformAccess = await readExtPlatformAccessByUserId(userId);
  const resolvedAssets = await Promise.all(
    platformAccess.map((platformAccessEntry) =>
      resolveRuntimeAssetSummary({
        platformAccess: platformAccessEntry,
        subscriptionStatus,
        userId,
      }),
    ),
  );

  return resolvedAssets
    .filter((assetSummary): assetSummary is ExtAssetSummary => assetSummary !== null)
    .sort((left, right) => getPlatformSortWeight(left.platform) - getPlatformSortWeight(right.platform));
}

async function resolveExtRuntimeAssetResponse(input: { platform: ExtPlatform; requestHeaders: Headers }) {
  const context = await requireExtSessionContext(input.requestHeaders, { versionFallback: null });
  const consoleState = await getConsoleStateSnapshotByUserId(context.session.userId);

  if (consoleState.state !== "active" && consoleState.state !== "processed") {
    return { reason: "subscription_required" as const, status: "forbidden" as const };
  }

  const platformAccess = await readExtPlatformAccessByUserId(context.session.userId);
  const selectedPlatform = platformAccess.find((platformAccessItem) => platformAccessItem.platform === input.platform);

  if (!selectedPlatform) {
    return { reason: "subscription_required" as const, status: "forbidden" as const };
  }

  const resolvedAssetSummary = await resolveRuntimeAssetSummary({
    platformAccess: selectedPlatform,
    subscriptionStatus: consoleState.state,
    userId: context.session.userId,
  });

  if (!resolvedAssetSummary) {
    throw new ExtApiError("EXT_ASSET_UNAVAILABLE", "No active asset is available for this platform.");
  }

  const runtimeAsset = await readExtRuntimeAssetByUserId({
    mode: resolvedAssetSummary.mode,
    platform: input.platform,
    userId: context.session.userId,
  });

  if (!runtimeAsset) {
    throw new ExtApiError("EXT_ASSET_UNAVAILABLE", "No active asset is available for this platform.");
  }

  return {
    asset: runtimeAsset,
    mode: resolvedAssetSummary.mode,
    platform: input.platform,
    revision: buildExtAssetRevision({
      asset: runtimeAsset,
      mode: resolvedAssetSummary.mode,
      platform: input.platform,
    }),
  } satisfies ExtResolvedRuntimeAsset;
}

function serializeExtRevisionValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeExtRevisionValue(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${serializeExtRevisionValue(nestedValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function buildExtAssetRevision(input: { asset: ExtRuntimeAssetSnapshot; mode: ExtMode; platform: ExtPlatform }) {
  return `extr1_${createHash("sha256")
    .update(
      `${input.platform}:${input.mode}:${input.asset.assetId}:${input.asset.updatedAt}:${input.asset.proxy ?? ""}:${serializeExtRevisionValue(input.asset.cookies)}`,
    )
    .digest("base64url")}`;
}

async function resolveRuntimeAssetSummary(input: {
  platformAccess: ExtPlatformAccessSummary;
  subscriptionStatus: "active" | "processed";
  userId: string;
}): Promise<ExtAssetSummary | null> {
  const privateAssetReady = await hasReadyAssetForMode({
    mode: "private",
    platform: input.platformAccess.platform,
    shouldCheck: input.platformAccess.hasPrivateAccess,
    userId: input.userId,
  });
  const shareAssetReady = await hasReadyAssetForMode({
    mode: "share",
    platform: input.platformAccess.platform,
    shouldCheck: input.platformAccess.hasShareAccess,
    userId: input.userId,
  });

  if (input.platformAccess.platform === "tradingview") {
    return resolveTradingViewAssetSummary({
      hasPrivateAccess: input.platformAccess.hasPrivateAccess,
      hasShareAccess: input.platformAccess.hasShareAccess,
      privateAssetReady,
      shareAssetReady,
      subscriptionStatus: input.subscriptionStatus,
    });
  }

  if (input.platformAccess.platform === "fxtester") {
    if (shareAssetReady) {
      return { mode: "share", platform: "fxtester" };
    }

    return null;
  }

  if (privateAssetReady) {
    return { mode: "private", platform: input.platformAccess.platform };
  }

  if (shareAssetReady) {
    return { mode: "share", platform: input.platformAccess.platform };
  }

  return null;
}

function resolveTradingViewAssetSummary(input: {
  hasPrivateAccess: boolean;
  hasShareAccess: boolean;
  privateAssetReady: boolean;
  shareAssetReady: boolean;
  subscriptionStatus: "active" | "processed";
}): ExtAssetSummary | null {
  if (input.subscriptionStatus === "active") {
    if (input.hasPrivateAccess) {
      return input.privateAssetReady ? { mode: "private", platform: "tradingview" } : null;
    }

    return input.shareAssetReady ? { mode: "share", platform: "tradingview" } : null;
  }

  if (input.hasPrivateAccess && input.privateAssetReady) {
    return { mode: "private", platform: "tradingview" };
  }

  if (input.hasShareAccess && input.shareAssetReady) {
    return input.hasPrivateAccess
      ? { mode: "share", nextMode: "private", platform: "tradingview" }
      : { mode: "share", platform: "tradingview" };
  }

  return null;
}

async function hasReadyAssetForMode(input: {
  mode: ExtMode;
  platform: ExtPlatform;
  shouldCheck: boolean;
  userId: string;
}): Promise<boolean> {
  if (!input.shouldCheck) {
    return false;
  }

  const assetSecret = await readExtAssetSecretByUserId({
    mode: input.mode,
    platform: input.platform,
    userId: input.userId,
  });

  return assetSecret != null;
}

function getPlatformSortWeight(platform: ExtPlatform): number {
  if (platform === "tradingview") {
    return 0;
  }

  if (platform === "fxtester") {
    return 1;
  }
  return 1;
}

export async function createExtRedeemResponse(input: { body: unknown; requestHeaders: Headers }) {
  const payload = extRedeemBodySchema.parse(input.body);
  const context = await requireExtSessionContext(input.requestHeaders, { versionFallback: null });
  const result = await redeemCdKey({ code: payload.code, userId: context.session.userId });

  if (!result.ok) {
    if (result.errorCode === "code-used") {
      throw new ExtApiError("EXT_REDEEM_USED", result.message);
    }

    if (result.errorCode === "code-invalid") {
      throw new ExtApiError("EXT_REDEEM_INVALID", result.message);
    }

    throw new Error(result.message);
  }

  return {
    bootstrap: await getExtBootstrapResponse({ query: {}, requestHeaders: input.requestHeaders }),
    message: "CD-Key berhasil diredeem.",
    ok: true as const,
  };
}

export async function createExtHeartbeatResponse(input: { body: unknown; requestHeaders: Headers }) {
  const payload = extHeartbeatBodySchema.parse(input.body);
  const context = await requireExtSessionContext(input.requestHeaders, { versionFallback: payload.extensionVersion });
  const metadata = readTrustedRequestMetadataFromHeaders(input.requestHeaders, {
    cityHeader: env.TRUSTED_PROXY_CITY_HEADER,
    countryHeader: env.TRUSTED_PROXY_COUNTRY_HEADER,
    ipHeader: env.TRUSTED_PROXY_IP_HEADER,
  });

  await touchAppSessionLastSeen(context.session.sessionId);
  await upsertExtHeartbeatByFingerprint({
    browser: normalizeFingerprintValue(metadata.browser),
    city: input.requestHeaders.get(env.TRUSTED_PROXY_CITY_HEADER),
    country: input.requestHeaders.get(env.TRUSTED_PROXY_COUNTRY_HEADER),
    deviceId: payload.deviceId,
    extensionId: context.extension.extensionId,
    extensionVersion: payload.extensionVersion,
    ipAddress: metadata.ipAddress,
    origin: context.extension.origin,
    os: normalizeFingerprintValue(metadata.os),
    sessionId: context.session.sessionId,
    userId: context.session.userId,
  });

  return {
    ok: true as const,
    timestamp: new Date().toISOString(),
  };
}

export async function createExtLogoutResponse(input: { requestHeaders: Headers }) {
  await assertExtRequestAllowed(input.requestHeaders);

  const payload = await signOutAndRevokeAppSession();

  return {
    ok: payload.ok,
    redirectTo: payload.redirectTo,
  };
}
