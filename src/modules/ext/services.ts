import "server-only";

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
  readExtAssetSecretByUserId,
  readExtPlatformAccessByUserId,
  readExtPurchasablePackages,
  upsertExtHeartbeatByFingerprint,
} from "./repositories";
import {
  extAssetQuerySchema,
  extBootstrapQuerySchema,
  extHeartbeatBodySchema,
  extRedeemBodySchema,
  extRequestHeadersSchema,
} from "./schemas";

import type { ExtVersionStatus } from "./types";

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
    id: profile.userId,
    publicId: profile.publicId,
    username: profile.username,
  };

  if (consoleState.state === "active" || consoleState.state === "processed") {
    return {
      assets: await readExtPlatformAccessByUserId(activeSession.userId),
      auth: { status: "authenticated" as const },
      subscription: {
        countdownSeconds: Math.max(
          0,
          Math.floor(
            (new Date(consoleState.latestSubscription?.endAt ?? new Date().toISOString()).getTime() - Date.now()) /
              1000,
          ),
        ),
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
      countdownSeconds: 0,
      endAt: consoleState.latestSubscription?.endAt ?? null,
      packageName: consoleState.latestSubscription?.packageName ?? null,
      status: consoleState.state,
    },
    user,
    version: requestContext.versionStatus,
  };
}

export async function getExtAssetResponse(input: { query: unknown; requestHeaders: Headers }) {
  const query = extAssetQuerySchema.parse(input.query);
  const context = await requireExtSessionContext(input.requestHeaders, { versionFallback: null });
  const platformAccess = await readExtPlatformAccessByUserId(context.session.userId);
  const selectedPlatform = platformAccess.find((platformAccessItem) => platformAccessItem.platform === query.platform);

  if (!selectedPlatform) {
    return { reason: "subscription_required" as const, status: "forbidden" as const };
  }

  if (!query.mode && selectedPlatform.hasPrivateAccess && selectedPlatform.hasShareAccess) {
    return {
      availableModes: ["private", "share"] as const,
      defaultMode: "private" as const,
      platform: query.platform,
      selectionTimeoutSeconds: 10,
      status: "selection_required" as const,
    };
  }

  const resolvedMode = query.mode ?? (selectedPlatform.hasPrivateAccess ? "private" : "share");

  if (
    (resolvedMode === "private" && !selectedPlatform.hasPrivateAccess) ||
    (resolvedMode === "share" && !selectedPlatform.hasShareAccess)
  ) {
    throw new ExtApiError("EXT_MODE_NOT_ALLOWED", "The requested mode is not available for this subscription.");
  }

  const assetSecret = await readExtAssetSecretByUserId({
    mode: resolvedMode,
    platform: query.platform,
    userId: context.session.userId,
  });

  if (!assetSecret) {
    throw new ExtApiError("EXT_ASSET_UNAVAILABLE", "No active asset is available for this platform.");
  }

  return {
    cookies: assetSecret.cookies,
    mode: resolvedMode,
    platform: query.platform,
    proxy: assetSecret.proxy,
    status: "ready" as const,
  };
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
