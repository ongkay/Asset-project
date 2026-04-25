import "server-only";

import { env } from "@/config/env.server";
import { ExtApiError } from "@/lib/ext-api/errors";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { getConsoleStateSnapshot } from "@/modules/console/queries";
import { validateActiveAppSession, validateAppSessionToken } from "@/modules/sessions/services";

import { EXTENSION_V2_KEY } from "./platforms";
import { readExtAppConfig, readExtPlatformAccessByUserId, readExtPurchasablePackages } from "./repositories";
import { extBootstrapQuerySchema, extRequestHeadersSchema } from "./schemas";

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
    extensionVersion: requestHeaders.get("x-extension-version") ?? input.queryVersion ?? input.versionFallback,
    origin,
  } satisfies ExtRequestHeaders);

  if (!parsedHeaders.success) {
    throw new ExtApiError("EXT_REQUEST_INVALID", "Extension request headers are invalid.");
  }

  if (
    !env.EXT_API_ALLOWED_IDS.includes(parsedHeaders.data.extensionId) ||
    !env.EXT_API_ALLOWED_ORIGINS.includes(parsedHeaders.data.origin)
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

  const consoleState = await getConsoleStateSnapshot({ userId: activeSession.userId });
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
