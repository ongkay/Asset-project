# Extension V2 API Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `api/ext/*` route handlers and the new `src/modules/ext/*` server-side domain, including minimal DB changes for version gating and heartbeat fingerprint tracking.

**Architecture:** Keep App Router route handlers in `src/app/api/ext/*` thin and move all request guarding, dev header override handling, version resolution, bootstrap shaping, asset payload shaping, redeem orchestration, heartbeat writes, and logout orchestration into `src/modules/ext/*`. Reuse existing session, auth, package, console, and CD-Key domains where they are already the source of truth, and only add the minimal new schema needed for `extension_app_configs` plus `extension_tracks.origin` and fingerprint uniqueness.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript strict, Zod, Vitest, InsForge admin database adapter, SQL migrations, `pnpm`.

---

## File Map

- Create: `migrations/046_ext_v2_api.sql`
- Create: `src/lib/ext-api/errors.ts`
- Create: `src/modules/ext/platforms.ts`
- Create: `src/modules/ext/types.ts`
- Create: `src/modules/ext/schemas.ts`
- Create: `src/modules/ext/repositories.ts`
- Create: `src/modules/ext/services.ts`
- Create: `src/app/api/ext/bootstrap/route.ts`
- Create: `src/app/api/ext/asset/route.ts`
- Create: `src/app/api/ext/redeem/route.ts`
- Create: `src/app/api/ext/heartbeat/route.ts`
- Create: `src/app/api/ext/logout/route.ts`
- Create: `tests/unit/lib/ext-api/errors.test.ts`
- Create: `tests/unit/lib/request-metadata.test.ts`
- Create: `tests/unit/modules/sessions/services.test.ts`
- Create: `tests/unit/modules/ext/schemas.test.ts`
- Create: `tests/unit/modules/ext/repositories.test.ts`
- Create: `tests/unit/modules/ext/services.test.ts`
- Create: `tests/unit/app/api/ext/route-handlers.test.ts`
- Modify: `src/config/env.server.ts`
- Modify: `src/lib/request-metadata.ts`
- Modify: `src/modules/sessions/services.ts`
- Modify: `docs/DB.md`

## Task 1: Add Session Token Override And Request Metadata Foundation

**Files:**
- Modify: `src/modules/sessions/services.ts`
- Modify: `src/lib/request-metadata.ts`
- Test: `tests/unit/modules/sessions/services.test.ts`
- Test: `tests/unit/lib/request-metadata.test.ts`

- [ ] **Step 1: Write the failing tests for header-injected app session validation and metadata parsing**

```ts
// tests/unit/modules/sessions/services.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  readAppSessionCookie: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  findActiveSessionByTokenHash: vi.fn(),
  touchSessionLastSeen: vi.fn(),
}));

vi.mock("@/lib/cookies", () => ({
  clearAppSessionCookie: vi.fn(),
  clearInsForgeAccessTokenCookie: vi.fn(),
  readAppSessionCookie: cookieMocks.readAppSessionCookie,
  writeAppSessionCookie: vi.fn(),
}));

vi.mock("@/modules/sessions/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/sessions/repositories")>(
    "@/modules/sessions/repositories",
  );

  return {
    ...actual,
    findActiveSessionByTokenHash: repositoryMocks.findActiveSessionByTokenHash,
    touchSessionLastSeen: repositoryMocks.touchSessionLastSeen,
  };
});

describe("sessions/services token override helpers", () => {
  beforeEach(() => {
    cookieMocks.readAppSessionCookie.mockReset();
    repositoryMocks.findActiveSessionByTokenHash.mockReset();
    repositoryMocks.touchSessionLastSeen.mockReset();
  });

  it("validates a raw app_session token without reading cookies()", async () => {
    repositoryMocks.findActiveSessionByTokenHash.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-04-24T10:00:00.000Z",
      lastSeenAt: "2026-04-24T10:00:00.000Z",
      revokedAt: null,
    });

    const { validateAppSessionToken } = await import("@/modules/sessions/services");

    await expect(validateAppSessionToken("opaque-token")).resolves.toMatchObject({
      sessionId: "session-1",
    });
    expect(cookieMocks.readAppSessionCookie).not.toHaveBeenCalled();
  });

  it("touches last_seen_at by explicit session id", async () => {
    const { touchAppSessionLastSeen } = await import("@/modules/sessions/services");

    await touchAppSessionLastSeen("session-1");

    expect(repositoryMocks.touchSessionLastSeen).toHaveBeenCalledWith("session-1");
  });
});
```

```ts
// tests/unit/lib/request-metadata.test.ts
import { describe, expect, it } from "vitest";

import { readTrustedRequestMetadataFromHeaders } from "@/lib/request-metadata";

describe("request metadata helpers", () => {
  it("parses browser, os, origin, and trusted ip from explicit headers", () => {
    const metadata = readTrustedRequestMetadataFromHeaders(
      new Headers({
        origin: "chrome-extension://allowed-id",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/135.0.0.0 Safari/537.36",
        "x-forwarded-for": "127.0.0.1",
      }),
      {
        cityHeader: "x-vercel-ip-city",
        countryHeader: "x-vercel-ip-country",
        ipHeader: "x-forwarded-for",
      },
    );

    expect(metadata).toMatchObject({
      browser: "Chrome",
      ipAddress: "127.0.0.1",
      origin: "chrome-extension://allowed-id",
      os: "Linux",
    });
  });
});
```

- [ ] **Step 2: Run the targeted tests to confirm the helpers do not exist yet**

Run: `pnpm vitest run tests/unit/modules/sessions/services.test.ts tests/unit/lib/request-metadata.test.ts`

Expected: FAIL because `validateAppSessionToken`, `touchAppSessionLastSeen`, and `readTrustedRequestMetadataFromHeaders` are not exported yet.

- [ ] **Step 3: Implement the minimal session and request-metadata helpers**

```ts
// src/modules/sessions/services.ts
export async function validateAppSessionToken(rawToken: string | null | undefined) {
  const normalizedToken = rawToken?.trim();

  if (!normalizedToken) {
    return null;
  }

  return findActiveSessionByTokenHash(hashSessionToken(normalizedToken));
}

export async function validateActiveAppSession() {
  return validateAppSessionToken(await readAppSessionCookie());
}

export async function touchAppSessionLastSeen(sessionId: string) {
  await touchSessionLastSeen(sessionId);
}

export async function touchActiveAppSessionLastSeen() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  await touchAppSessionLastSeen(activeSession.sessionId);
  return activeSession;
}
```

```ts
// src/lib/request-metadata.ts
export function readTrustedRequestMetadataFromHeaders(
  requestHeaders: Headers,
  trustedProxyHeaders: { cityHeader: string; countryHeader: string; ipHeader: string },
): TrustedRequestMetadata {
  const userAgent = readHeaderValue(requestHeaders, "user-agent");
  const origin = readHeaderValue(requestHeaders, "origin");
  const host = readHeaderValue(requestHeaders, "x-forwarded-host") ?? readHeaderValue(requestHeaders, "host");
  const protocol =
    readHeaderValue(requestHeaders, "x-forwarded-proto") ?? (origin?.startsWith("https://") ? "https" : "http");

  return {
    browser: detectBrowser(userAgent),
    host,
    ipAddress: readHeaderValue(requestHeaders, trustedProxyHeaders.ipHeader) ?? "unknown",
    origin,
    os: detectOs(userAgent),
    protocol,
  };
}

export async function readTrustedRequestMetadata(): Promise<TrustedRequestMetadata> {
  const requestHeaders = await headers();

  return readTrustedRequestMetadataFromHeaders(requestHeaders, {
    cityHeader: env.TRUSTED_PROXY_CITY_HEADER,
    countryHeader: env.TRUSTED_PROXY_COUNTRY_HEADER,
    ipHeader: env.TRUSTED_PROXY_IP_HEADER,
  });
}
```

- [ ] **Step 4: Re-run the targeted tests**

Run: `pnpm vitest run tests/unit/modules/sessions/services.test.ts tests/unit/lib/request-metadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit this slice**

```bash
git add src/modules/sessions/services.ts src/lib/request-metadata.ts tests/unit/modules/sessions/services.test.ts tests/unit/lib/request-metadata.test.ts
git commit -m "feat: add ext session override foundations"
```

## Task 2: Add Ext Contract Files, Error Helper, And Environment Flags

**Files:**
- Modify: `src/config/env.server.ts`
- Create: `src/lib/ext-api/errors.ts`
- Create: `src/modules/ext/platforms.ts`
- Create: `src/modules/ext/types.ts`
- Create: `src/modules/ext/schemas.ts`
- Test: `tests/unit/lib/ext-api/errors.test.ts`
- Test: `tests/unit/modules/ext/schemas.test.ts`

- [ ] **Step 1: Write the failing tests for ext error mapping and input schemas**

```ts
// tests/unit/lib/ext-api/errors.test.ts
import { describe, expect, it } from "vitest";

import { ExtApiError, buildExtApiErrorResponse } from "@/lib/ext-api/errors";

describe("ext api errors", () => {
  it("maps EXT_UNAUTHENTICATED to 401", async () => {
    const response = buildExtApiErrorResponse(new ExtApiError("EXT_UNAUTHENTICATED", "Session required."));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_UNAUTHENTICATED",
        message: "Session required.",
      },
    });
  });
});
```

```ts
// tests/unit/modules/ext/schemas.test.ts
import { describe, expect, it } from "vitest";

import { extAssetQuerySchema, extHeartbeatBodySchema, extRequestHeadersSchema } from "@/modules/ext/schemas";

describe("ext schemas", () => {
  it("accepts asset query without mode for mixed-platform discovery", () => {
    expect(extAssetQuerySchema.parse({ platform: "tradingview" })).toEqual({
      mode: undefined,
      platform: "tradingview",
    });
  });

  it("accepts heartbeat body with device id and extension version", () => {
    expect(extHeartbeatBodySchema.parse({ deviceId: "device-1", extensionVersion: "2.0.0" })).toEqual({
      deviceId: "device-1",
      extensionVersion: "2.0.0",
    });
  });

  it("requires raw extension id plus trusted origin", () => {
    expect(
      extRequestHeadersSchema.parse({
        extensionId: "allowed-id",
        origin: "chrome-extension://allowed-id",
      }),
    ).toMatchObject({ extensionId: "allowed-id" });
  });
});
```

- [ ] **Step 2: Run the schema and error tests to verify they fail**

Run: `pnpm vitest run tests/unit/lib/ext-api/errors.test.ts tests/unit/modules/ext/schemas.test.ts`

Expected: FAIL because `@/lib/ext-api/errors` and `@/modules/ext/*` do not exist yet.

- [ ] **Step 3: Add the env flags, error helper, platform registry, and schemas**

```ts
// src/config/env.server.ts
const booleanFlag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const serverEnvSchema = z.object({
  EXT_API_ALLOWED_IDS: commaSeparatedValues.pipe(z.array(extensionId).min(1)),
  EXT_API_ALLOWED_ORIGINS: commaSeparatedValues.pipe(z.array(extensionOrigin).min(1)),
  EXT_API_DEV_HEADER_OVERRIDE: booleanFlag,
});
```

```ts
// src/lib/ext-api/errors.ts
import "server-only";

export type ExtApiErrorCode =
  | "EXT_HEADER_REQUIRED"
  | "EXT_ORIGIN_DENIED"
  | "EXT_REQUEST_INVALID"
  | "EXT_UNAUTHENTICATED"
  | "EXT_SESSION_REVOKED"
  | "EXT_USER_BANNED"
  | "EXT_UPDATE_REQUIRED"
  | "EXT_SUBSCRIPTION_REQUIRED"
  | "EXT_PLATFORM_UNSUPPORTED"
  | "EXT_MODE_REQUIRED"
  | "EXT_MODE_NOT_ALLOWED"
  | "EXT_ASSET_UNAVAILABLE"
  | "EXT_REDEEM_INVALID"
  | "EXT_REDEEM_USED";

const EXT_API_STATUS_BY_CODE: Record<ExtApiErrorCode, number> = {
  EXT_HEADER_REQUIRED: 400,
  EXT_REQUEST_INVALID: 400,
  EXT_MODE_REQUIRED: 400,
  EXT_UNAUTHENTICATED: 401,
  EXT_SESSION_REVOKED: 401,
  EXT_ORIGIN_DENIED: 403,
  EXT_USER_BANNED: 403,
  EXT_UPDATE_REQUIRED: 403,
  EXT_SUBSCRIPTION_REQUIRED: 403,
  EXT_PLATFORM_UNSUPPORTED: 403,
  EXT_MODE_NOT_ALLOWED: 403,
  EXT_ASSET_UNAVAILABLE: 503,
  EXT_REDEEM_INVALID: 400,
  EXT_REDEEM_USED: 409,
};

export class ExtApiError extends Error {
  constructor(
    public readonly code: ExtApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtApiError";
  }
}

export function buildExtApiErrorResponse(error: unknown) {
  if (error instanceof ExtApiError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: EXT_API_STATUS_BY_CODE[error.code] });
  }

  throw error;
}
```

```ts
// src/modules/ext/platforms.ts
export const EXTENSION_V2_KEY = "asset-extension-v2";

export const EXT_PLATFORMS = {
  tradingview: {
    allowedHosts: ["www.tradingview.com", "tradingview.com"],
    cookieDomains: [".tradingview.com"],
    platform: "tradingview",
  },
  fxreplay: {
    allowedHosts: ["app.fxreplay.com", "fxreplay.com"],
    cookieDomains: [".fxreplay.com"],
    platform: "fxreplay",
  },
  fxtester: {
    allowedHosts: ["app.forextester.com", "forextester.com"],
    cookieDomains: [".forextester.com"],
    platform: "fxtester",
  },
} as const;
```

```ts
// src/modules/ext/types.ts
export type ExtVersionStatus =
  | { status: "supported" }
  | { downloadUrl: string; latestVersion: string; minimumVersion: string; status: "update_available" }
  | { downloadUrl: string; latestVersion: string; minimumVersion: string; status: "update_required" };

export type ExtPlatformAccessSummary = {
  hasPrivateAccess: boolean;
  hasShareAccess: boolean;
  platform: "tradingview" | "fxreplay" | "fxtester";
};

export type ExtAssetCookie = {
  domain: string;
  expirationDate?: number;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite: "lax" | "no_restriction" | "strict" | "unspecified";
  secure: boolean;
  value: string;
};
```

```ts
// src/modules/ext/schemas.ts
import { z } from "zod";

export const extPlatformSchema = z.enum(["tradingview", "fxreplay", "fxtester"]);
export const extModeSchema = z.enum(["private", "share"]);

export const extRequestHeadersSchema = z.object({
  extensionId: z.string().trim().min(1).refine((value) => !value.includes("://") && !value.includes("/")),
  extensionVersion: z.string().trim().min(1).optional(),
  origin: z.string().trim().min(1),
});

export const extBootstrapQuerySchema = z.object({
  version: z.string().trim().min(1).optional(),
});

export const extAssetQuerySchema = z.object({
  mode: extModeSchema.optional(),
  platform: extPlatformSchema,
});

export const extRedeemBodySchema = z.object({
  code: z.string().trim().min(1),
});

export const extHeartbeatBodySchema = z.object({
  deviceId: z.string().trim().min(1),
  extensionVersion: z.string().trim().min(1),
});
```

- [ ] **Step 4: Re-run the targeted tests**

Run: `pnpm vitest run tests/unit/lib/ext-api/errors.test.ts tests/unit/modules/ext/schemas.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit this slice**

```bash
git add src/config/env.server.ts src/lib/ext-api/errors.ts src/modules/ext/platforms.ts src/modules/ext/types.ts src/modules/ext/schemas.ts tests/unit/lib/ext-api/errors.test.ts tests/unit/modules/ext/schemas.test.ts
git commit -m "feat: add ext api contracts and guards"
```

## Task 3: Add DB Migration And Repositories For Config, Access, And Heartbeat

**Files:**
- Create: `migrations/046_ext_v2_api.sql`
- Create: `src/modules/ext/repositories.ts`
- Modify: `docs/DB.md`
- Test: `tests/unit/modules/ext/repositories.test.ts`

- [ ] **Step 1: Write the failing repository tests for config reads, access reads, and heartbeat fingerprint writes**

```ts
// tests/unit/modules/ext/repositories.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

import {
  readExtAppConfig,
  readExtAssetSecretByUserId,
  readExtPlatformAccessByUserId,
  readExtPurchasablePackages,
  upsertExtHeartbeatByFingerprint,
} from "@/modules/ext/repositories";

describe("ext/repositories", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("reads the active version gate row by extension key", async () => {
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  download_url: "https://github.com/example",
                  extension_key: "asset-extension-v2",
                  is_active: true,
                  latest_version: "2.0.1",
                  minimum_version: "2.0.0",
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    await expect(readExtAppConfig("asset-extension-v2")).resolves.toMatchObject({
      latestVersion: "2.0.1",
      minimumVersion: "2.0.0",
    });
  });

  it("updates last_seen_at when the full heartbeat fingerprint matches", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { first_seen_at: "2026-04-24T10:00:00.000Z", id: "track-1", last_seen_at: "2026-04-24T11:00:00.000Z" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqOs = vi.fn().mockReturnValue({ select });
    const eqBrowser = vi.fn().mockReturnValue({ eq: eqOs });
    const eqIp = vi.fn().mockReturnValue({ eq: eqBrowser });
    const eqOrigin = vi.fn().mockReturnValue({ eq: eqIp });
    const eqExtensionId = vi.fn().mockReturnValue({ eq: eqOrigin });
    const eqDeviceId = vi.fn().mockReturnValue({ eq: eqExtensionId });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqDeviceId });
    const update = vi.fn().mockReturnValue({ eq: eqUserId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    await upsertExtHeartbeatByFingerprint({
      browser: "Chrome",
      deviceId: "device-1",
      extensionId: "allowed-id",
      extensionVersion: "2.0.0",
      origin: "chrome-extension://allowed-id",
      os: "Linux",
      sessionId: "session-1",
      userId: "user-1",
      ipAddress: "127.0.0.1",
      city: "Bandung",
      country: "ID",
    });

    expect(eqOrigin).toHaveBeenCalledWith("origin", "chrome-extension://allowed-id");
    expect(eqBrowser).toHaveBeenCalledWith("browser", "Chrome");
    expect(eqOs).toHaveBeenCalledWith("os", "Linux");
  });

  it("maps asset secret rows into proxy plus cookie payload", async () => {
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    assets: {
                      asset_json: [
                        {
                          domain: ".tradingview.com",
                          httpOnly: false,
                          name: "sessionid",
                          path: "/",
                          sameSite: "no_restriction",
                          secure: true,
                          value: "secret",
                        },
                      ],
                      proxy: "http://proxy.local",
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });

    await expect(
      readExtAssetSecretByUserId({ mode: "private", platform: "tradingview", userId: "user-1" }),
    ).resolves.toEqual({
      cookies: [
        {
          domain: ".tradingview.com",
          httpOnly: false,
          name: "sessionid",
          path: "/",
          sameSite: "no_restriction",
          secure: true,
          value: "secret",
        },
      ],
      proxy: "http://proxy.local",
    });
  });
});
```

- [ ] **Step 2: Run the repository tests to confirm the module and migration-backed semantics are missing**

Run: `pnpm vitest run tests/unit/modules/ext/repositories.test.ts`

Expected: FAIL because `@/modules/ext/repositories` does not exist yet.

- [ ] **Step 3: Add the migration, DB doc updates, and repository implementation**

```sql
-- migrations/046_ext_v2_api.sql
create table if not exists public.extension_app_configs (
  id uuid primary key default gen_random_uuid(),
  extension_key text not null unique,
  latest_version text not null,
  minimum_version text not null,
  download_url text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.extension_app_configs (extension_key, latest_version, minimum_version, download_url, is_active)
values ('asset-extension-v2', '0.0.1', '0.0.1', 'https://github.com/', true)
on conflict (extension_key) do nothing;

alter table public.extension_tracks add column if not exists origin text;

update public.extension_tracks
set origin = coalesce(origin, 'unknown'),
    browser = coalesce(browser, 'Unknown'),
    os = coalesce(os, 'Unknown')
where origin is null or browser is null or os is null;

alter table public.extension_tracks alter column origin set not null;
alter table public.extension_tracks alter column browser set not null;
alter table public.extension_tracks alter column os set not null;

drop index if exists extension_tracks_user_id_device_id_ip_address_extension_id_key;

create unique index if not exists extension_tracks_fingerprint_unique
on public.extension_tracks (user_id, device_id, extension_id, origin, ip_address, browser, os);
```

```ts
// src/modules/ext/repositories.ts
import "server-only";

import { z } from "zod";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

const extPlatformAccessRowSchema = z.object({
  access_key: z.string().min(1),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
});

const extAssetSecretRowSchema = z.object({
  asset_json: z.array(
    z.object({
      domain: z.string().min(1),
      expirationDate: z.number().int().optional(),
      httpOnly: z.boolean().default(false),
      name: z.string().min(1),
      path: z.string().min(1).default("/"),
      sameSite: z.enum(["lax", "no_restriction", "strict", "unspecified"]).default("no_restriction"),
      secure: z.boolean().default(true),
      value: z.string().min(1),
    }),
  ),
  proxy: z.string().nullable(),
});

const extAppConfigRowSchema = z.object({
  download_url: z.string().min(1),
  extension_key: z.string().min(1),
  is_active: z.boolean(),
  latest_version: z.string().min(1),
  minimum_version: z.string().min(1),
});

export async function readExtAppConfig(extensionKey: string) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("extension_app_configs")
    .select("extension_key, latest_version, minimum_version, download_url, is_active")
    .eq("extension_key", extensionKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = extAppConfigRowSchema.parse(data);

  return {
    downloadUrl: row.download_url,
    extensionKey: row.extension_key,
    isActive: row.is_active,
    latestVersion: row.latest_version,
    minimumVersion: row.minimum_version,
  };
}

export async function readExtPlatformAccessByUserId(userId: string) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("asset_assignments")
    .select("access_key, asset_platform")
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) throw error;

  const rows = z
    .array(
      z.object({
        access_key: z.string().min(1),
        asset_platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
      }),
    )
    .parse(data ?? []);

  const byPlatform = new Map<string, { hasPrivateAccess: boolean; hasShareAccess: boolean }>();

  for (const row of rows) {
    const current = byPlatform.get(row.asset_platform) ?? { hasPrivateAccess: false, hasShareAccess: false };
    current.hasPrivateAccess ||= row.access_key.endsWith(":private");
    current.hasShareAccess ||= row.access_key.endsWith(":share");
    byPlatform.set(row.asset_platform, current);
  }

  return [...byPlatform.entries()].map(([platform, value]) => ({
    ...value,
    platform: platform as "tradingview" | "fxreplay" | "fxtester",
  }));
}

export async function readExtAssetSecretByUserId(input: {
  mode: "private" | "share";
  platform: "tradingview" | "fxreplay" | "fxtester";
  userId: string;
}) {
  const accessKey = `${input.platform}:${input.mode}`;
  const { data, error } = await createInsForgeAdminDatabase()
    .from("asset_assignments")
    .select("assets!inner(proxy, asset_json)")
    .eq("user_id", input.userId)
    .eq("access_key", accessKey)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data || !("assets" in data) || !data.assets) return null;

  const asset = extAssetSecretRowSchema.parse(data.assets);

  return {
    cookies: asset.asset_json,
    proxy: asset.proxy,
  };
}

export async function readExtPurchasablePackages() {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("packages")
    .select("id, name, amount_rp, checkout_url, access_keys_json")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return z
    .array(
      z.object({
        access_keys_json: z.array(z.string()),
        amount_rp: z.number().int().nonnegative(),
        checkout_url: z.string().nullable(),
        id: z.string().min(1),
        name: z.string().min(1),
      }),
    )
    .parse(data ?? [])
    .map((row) => ({
      amountRp: row.amount_rp,
      checkoutUrl: row.checkout_url ? `/paymentdummy?packageId=${row.id}` : `/paymentdummy?packageId=${row.id}`,
      id: row.id,
      name: row.name,
      summary: row.access_keys_json.some((value) => value.endsWith(":private")) && row.access_keys_json.some((value) => value.endsWith(":share"))
        ? "mixed"
        : row.access_keys_json.some((value) => value.endsWith(":private"))
          ? "private"
          : "share",
    }));
}

export async function upsertExtHeartbeatByFingerprint(input: {
  browser: string;
  city: string | null;
  country: string | null;
  deviceId: string;
  extensionId: string;
  extensionVersion: string;
  ipAddress: string;
  origin: string;
  os: string;
  sessionId: string;
  userId: string;
}) {
  const nowIso = new Date().toISOString();
  const database = createInsForgeAdminDatabase();
  const updateQuery = database
    .from("extension_tracks")
    .update({
      city: input.city,
      country: input.country,
      extension_version: input.extensionVersion,
      last_seen_at: nowIso,
      session_id: input.sessionId,
    })
    .eq("user_id", input.userId)
    .eq("device_id", input.deviceId)
    .eq("extension_id", input.extensionId)
    .eq("origin", input.origin)
    .eq("ip_address", input.ipAddress)
    .eq("browser", input.browser)
    .eq("os", input.os)
    .select("id, first_seen_at, last_seen_at")
    .maybeSingle();

  const { data: updatedRow, error: updateError } = await updateQuery;
  if (updateError) throw updateError;
  if (updatedRow) return updatedRow;

  const { data: insertedRow, error: insertError } = await database
    .from("extension_tracks")
    .insert([
      {
        browser: input.browser,
        city: input.city,
        country: input.country,
        device_id: input.deviceId,
        extension_id: input.extensionId,
        extension_version: input.extensionVersion,
        first_seen_at: nowIso,
        ip_address: input.ipAddress,
        last_seen_at: nowIso,
        origin: input.origin,
        os: input.os,
        session_id: input.sessionId,
        user_id: input.userId,
      },
    ])
    .select("id, first_seen_at, last_seen_at")
    .single();

  if (insertError) throw insertError;
  return insertedRow;
}
```

```md
<!-- docs/DB.md -->
- add `extension_app_configs` section under extension-related tables
- update `extension_tracks` section to include `origin`
- update uniqueness note to `user_id + device_id + extension_id + origin + ip_address + browser + os`
```

- [ ] **Step 4: Re-run the repository tests**

Run: `pnpm vitest run tests/unit/modules/ext/repositories.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit this slice**

```bash
git add migrations/046_ext_v2_api.sql src/modules/ext/repositories.ts docs/DB.md tests/unit/modules/ext/repositories.test.ts
git commit -m "feat: add ext api storage and repositories"
```

## Task 4: Implement Request Context And Bootstrap Service

**Files:**
- Create: `src/modules/ext/services.ts`
- Test: `tests/unit/modules/ext/services.test.ts`

- [ ] **Step 1: Write the failing service tests for bootstrap context, dev header override, and version status**

```ts
// tests/unit/modules/ext/services.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const envMocks = vi.hoisted(() => ({
  EXT_API_ALLOWED_IDS: ["allowed-id"],
  EXT_API_ALLOWED_ORIGINS: ["chrome-extension://allowed-id"],
  EXT_API_DEV_HEADER_OVERRIDE: true,
  TRUSTED_PROXY_CITY_HEADER: "x-vercel-ip-city",
  TRUSTED_PROXY_COUNTRY_HEADER: "x-vercel-ip-country",
  TRUSTED_PROXY_IP_HEADER: "x-forwarded-for",
}));

const authRepositoryMocks = vi.hoisted(() => ({ readProfileByUserId: vi.fn() }));
const authServiceMocks = vi.hoisted(() => ({ signOutAndRevokeAppSession: vi.fn() }));
const cdKeyServiceMocks = vi.hoisted(() => ({ redeemCdKey: vi.fn() }));
const consoleQueryMocks = vi.hoisted(() => ({ getConsoleStateSnapshot: vi.fn() }));
const extRepositoryMocks = vi.hoisted(() => ({
  readExtAppConfig: vi.fn(),
  readExtAssetSecretByUserId: vi.fn(),
  readExtPlatformAccessByUserId: vi.fn(),
  readExtPurchasablePackages: vi.fn(),
  upsertExtHeartbeatByFingerprint: vi.fn(),
}));
const sessionServiceMocks = vi.hoisted(() => ({
  touchAppSessionLastSeen: vi.fn(),
  validateActiveAppSession: vi.fn(),
  validateAppSessionToken: vi.fn(),
}));

vi.mock("@/config/env.server", () => ({ env: envMocks }));
vi.mock("@/modules/auth/repositories", () => authRepositoryMocks);
vi.mock("@/modules/auth/services", () => authServiceMocks);
vi.mock("@/modules/cdkeys/services", () => cdKeyServiceMocks);
vi.mock("@/modules/console/queries", () => consoleQueryMocks);
vi.mock("@/modules/ext/repositories", () => extRepositoryMocks);
vi.mock("@/modules/sessions/services", () => sessionServiceMocks);

describe("ext/services bootstrap", () => {
  beforeEach(() => {
    authRepositoryMocks.readProfileByUserId.mockReset();
    consoleQueryMocks.getConsoleStateSnapshot.mockReset();
    extRepositoryMocks.readExtAppConfig.mockReset();
    extRepositoryMocks.readExtAssetSecretByUserId.mockReset();
    extRepositoryMocks.readExtPlatformAccessByUserId.mockReset();
    extRepositoryMocks.readExtPurchasablePackages.mockReset();
    extRepositoryMocks.upsertExtHeartbeatByFingerprint.mockReset();
    authServiceMocks.signOutAndRevokeAppSession.mockReset();
    cdKeyServiceMocks.redeemCdKey.mockReset();
    sessionServiceMocks.touchAppSessionLastSeen.mockReset();
    sessionServiceMocks.validateActiveAppSession.mockReset();
    sessionServiceMocks.validateAppSessionToken.mockReset();
  });

  it("returns unauthenticated bootstrap when session lookup is empty", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue(null);

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).resolves.toEqual({
      auth: { loginUrl: "/login", status: "unauthenticated" },
      version: { status: "supported" },
    });
  });

  it("returns active bootstrap with platform access summary", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.1",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({
      latestSubscription: {
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: true, platform: "tradingview" },
    ]);

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).resolves.toMatchObject({
      auth: { status: "authenticated" },
      assets: [{ hasPrivateAccess: true, hasShareAccess: true, platform: "tradingview" }],
      version: { status: "update_available" },
    });
  });

  it("returns authenticated bootstrap with packages when subscription state is expired", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.expired@assetnext.dev",
      isBanned: false,
      publicId: "MEM-002",
      role: "member",
      userId: "user-1",
      username: "seed-expired",
    });
    consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({
      latestSubscription: {
        endAt: "2026-04-01T00:00:00.000Z",
        id: "sub-2",
        packageId: "pkg-2",
        packageName: "Starter",
        startAt: "2026-03-01T00:00:00.000Z",
        status: "expired",
      },
      state: "expired",
    });
    extRepositoryMocks.readExtPurchasablePackages.mockResolvedValue([
      { amountRp: 150000, checkoutUrl: "/paymentdummy?packageId=pkg-1", id: "pkg-1", name: "Starter", summary: "mixed" },
    ]);

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).resolves.toMatchObject({
      packages: [{ id: "pkg-1" }],
      redeem: { enabled: true },
      subscription: { status: "expired" },
    });
  });
});
```

- [ ] **Step 2: Run the bootstrap service tests to confirm the service does not exist yet**

Run: `pnpm vitest run tests/unit/modules/ext/services.test.ts`

Expected: FAIL because `@/modules/ext/services` does not exist yet.

- [ ] **Step 3: Implement request context resolution, version comparison, and bootstrap shaping**

```ts
// src/modules/ext/services.ts
import "server-only";

import { env } from "@/config/env.server";
import { ExtApiError } from "@/lib/ext-api/errors";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { getConsoleStateSnapshot } from "@/modules/console/queries";
import { validateActiveAppSession, validateAppSessionToken } from "@/modules/sessions/services";

import { EXTENSION_V2_KEY } from "./platforms";
import { extBootstrapQuerySchema, extRequestHeadersSchema } from "./schemas";
import { readExtAppConfig, readExtPlatformAccessByUserId, readExtPurchasablePackages } from "./repositories";

function compareVersion(left: string, right: string) {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) return Math.sign(delta);
  }

  return 0;
}

function readEffectiveHeader(requestHeaders: Headers, key: string, devOverrideKey: string) {
  if (env.EXT_API_DEV_HEADER_OVERRIDE && process.env.NODE_ENV !== "production") {
    return requestHeaders.get(devOverrideKey) ?? requestHeaders.get(key);
  }

  return requestHeaders.get(key);
}

async function resolveOptionalSession(requestHeaders: Headers) {
  const overrideToken =
    env.EXT_API_DEV_HEADER_OVERRIDE && process.env.NODE_ENV !== "production"
      ? requestHeaders.get("x-ext-dev-app-session")
      : null;

  return overrideToken ? validateAppSessionToken(overrideToken) : validateActiveAppSession();
}

function buildVersionStatus(currentVersion: string | null | undefined, config: { downloadUrl: string; latestVersion: string; minimumVersion: string }) {
  const normalizedVersion = currentVersion?.trim() || "0.0.0";

  if (compareVersion(normalizedVersion, config.minimumVersion) < 0) {
    return {
      downloadUrl: config.downloadUrl,
      latestVersion: config.latestVersion,
      minimumVersion: config.minimumVersion,
      status: "update_required" as const,
    };
  }

  if (compareVersion(normalizedVersion, config.latestVersion) < 0) {
    return {
      downloadUrl: config.downloadUrl,
      latestVersion: config.latestVersion,
      minimumVersion: config.minimumVersion,
      status: "update_available" as const,
    };
  }

  return { status: "supported" as const };
}

async function assertExtRequestAllowed(
  requestHeaders: Headers,
  input: { queryVersion?: string | null; versionFallback?: string | null } = {},
) {
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
  });

  if (!parsedHeaders.success) {
    throw new ExtApiError("EXT_REQUEST_INVALID", "Extension request headers are invalid.");
  }

  if (!env.EXT_API_ALLOWED_IDS.includes(parsedHeaders.data.extensionId) || !env.EXT_API_ALLOWED_ORIGINS.includes(parsedHeaders.data.origin)) {
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

async function requireExtSessionContext(requestHeaders: Headers, input: { versionFallback?: string | null } = {}) {
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
  const query = extBootstrapQuerySchema.parse(input.query);
  const requestContext = await assertExtRequestAllowed(input.requestHeaders, { queryVersion: query.version });

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

  if (consoleState.state === "active" || consoleState.state === "processed") {
    return {
      assets: await readExtPlatformAccessByUserId(activeSession.userId),
      auth: { status: "authenticated" as const },
      subscription: {
        countdownSeconds: Math.max(
          0,
          Math.floor((new Date(consoleState.latestSubscription?.endAt ?? new Date().toISOString()).getTime() - Date.now()) / 1000),
        ),
        endAt: consoleState.latestSubscription?.endAt ?? null,
        packageName: consoleState.latestSubscription?.packageName ?? null,
        status: consoleState.state,
      },
      user: {
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        id: profile.userId,
        publicId: profile.publicId,
        username: profile.username,
      },
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
    user: {
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      id: profile.userId,
      publicId: profile.publicId,
      username: profile.username,
    },
    version: requestContext.versionStatus,
  };
}
```

- [ ] **Step 4: Re-run the bootstrap service tests**

Run: `pnpm vitest run tests/unit/modules/ext/services.test.ts`

Expected: PASS for the bootstrap-focused tests.

- [ ] **Step 5: Commit this slice**

```bash
git add src/modules/ext/services.ts tests/unit/modules/ext/services.test.ts
git commit -m "feat: add ext bootstrap service"
```

## Task 5: Implement Asset Service, Asset Payload Mapping, And Mutation Services

**Files:**
- Modify: `src/modules/ext/services.ts`
- Test: `tests/unit/modules/ext/services.test.ts`

- [ ] **Step 1: Expand the failing service tests for asset, redeem, heartbeat, and logout**

```ts
// append to tests/unit/modules/ext/services.test.ts
it("returns selection_required when a platform has both private and share access", async () => {
  extRepositoryMocks.readExtAppConfig.mockResolvedValue({
    downloadUrl: "https://github.com/example",
    extensionKey: "asset-extension-v2",
    isActive: true,
    latestVersion: "2.0.0",
    minimumVersion: "2.0.0",
  });
  sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
  authRepositoryMocks.readProfileByUserId.mockResolvedValue({
    avatarUrl: null,
    email: "seed.active@assetnext.dev",
    isBanned: false,
    publicId: "MEM-001",
    role: "member",
    userId: "user-1",
    username: "seed-active",
  });
  consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({ latestSubscription: { endAt: "2026-05-01T00:00:00.000Z", id: "sub-1", packageId: "pkg-1", packageName: "Starter", startAt: "2026-04-01T00:00:00.000Z", status: "active" }, state: "active" });
  extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([{ hasPrivateAccess: true, hasShareAccess: true, platform: "tradingview" }]);

  const { getExtAssetResponse } = await import("@/modules/ext/services");

  await expect(
    getExtAssetResponse({
      query: { platform: "tradingview" },
      requestHeaders: new Headers({
        "x-ext-dev-app-session": "opaque-token",
        "x-ext-dev-extension-id": "allowed-id",
        "x-ext-dev-origin": "chrome-extension://allowed-id",
      }),
    }),
  ).resolves.toEqual({
    availableModes: ["private", "share"],
    defaultMode: "private",
    platform: "tradingview",
    selectionTimeoutSeconds: 10,
    status: "selection_required",
  });
});

it("normalizes browser and os to Unknown before writing a heartbeat row", async () => {
  extRepositoryMocks.readExtAppConfig.mockResolvedValue({
    downloadUrl: "https://github.com/example",
    extensionKey: "asset-extension-v2",
    isActive: true,
    latestVersion: "2.0.0",
    minimumVersion: "2.0.0",
  });
  sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
  extRepositoryMocks.upsertExtHeartbeatByFingerprint.mockResolvedValue({ id: "track-1" });

  const { createExtHeartbeatResponse } = await import("@/modules/ext/services");

  await expect(
    createExtHeartbeatResponse({
      body: { deviceId: "device-1", extensionVersion: "2.0.0" },
      requestHeaders: new Headers({
        "x-ext-dev-app-session": "opaque-token",
        "x-ext-dev-extension-id": "allowed-id",
        "x-ext-dev-origin": "chrome-extension://allowed-id",
        "x-forwarded-for": "127.0.0.1",
      }),
    }),
  ).resolves.toMatchObject({ ok: true });

  expect(extRepositoryMocks.upsertExtHeartbeatByFingerprint).toHaveBeenCalledWith(
    expect.objectContaining({
      browser: "Unknown",
      os: "Unknown",
      origin: "chrome-extension://allowed-id",
    }),
  );
});

it("maps a successful redeem result into bootstrap refresh payload", async () => {
  extRepositoryMocks.readExtAppConfig.mockResolvedValue({
    downloadUrl: "https://github.com/example",
    extensionKey: "asset-extension-v2",
    isActive: true,
    latestVersion: "2.0.0",
    minimumVersion: "2.0.0",
  });
  sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
  cdKeyServiceMocks.redeemCdKey.mockResolvedValue({ ok: true });
  authRepositoryMocks.readProfileByUserId.mockResolvedValue({
    avatarUrl: null,
    email: "seed.active@assetnext.dev",
    isBanned: false,
    publicId: "MEM-001",
    role: "member",
    userId: "user-1",
    username: "seed-active",
  });
  consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({
    latestSubscription: {
      endAt: "2026-05-01T00:00:00.000Z",
      id: "sub-1",
      packageId: "pkg-1",
      packageName: "Starter",
      startAt: "2026-04-01T00:00:00.000Z",
      status: "active",
    },
    state: "active",
  });
  extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([{ hasPrivateAccess: true, hasShareAccess: false, platform: "tradingview" }]);

  const { createExtRedeemResponse } = await import("@/modules/ext/services");

  await expect(
    createExtRedeemResponse({
      body: { code: "ABCD123456" },
      requestHeaders: new Headers({
        "x-ext-dev-app-session": "opaque-token",
        "x-ext-dev-extension-id": "allowed-id",
        "x-ext-dev-origin": "chrome-extension://allowed-id",
      }),
    }),
  ).resolves.toMatchObject({ ok: true });
});

it("maps logout payload through the auth sign-out service", async () => {
  authServiceMocks.signOutAndRevokeAppSession.mockResolvedValue({ ok: true, redirectTo: "/login" });
  extRepositoryMocks.readExtAppConfig.mockResolvedValue({
    downloadUrl: "https://github.com/example",
    extensionKey: "asset-extension-v2",
    isActive: true,
    latestVersion: "2.0.0",
    minimumVersion: "2.0.0",
  });

  const { createExtLogoutResponse } = await import("@/modules/ext/services");

  await expect(
    createExtLogoutResponse({
      requestHeaders: new Headers({
        "x-ext-dev-extension-id": "allowed-id",
        "x-ext-dev-origin": "chrome-extension://allowed-id",
      }),
    }),
  ).resolves.toEqual({ ok: true, redirectTo: "/login" });
});
```

- [ ] **Step 2: Run the expanded service tests to capture the missing behavior**

Run: `pnpm vitest run tests/unit/modules/ext/services.test.ts`

Expected: FAIL because asset selection, heartbeat normalization, redeem orchestration, and logout orchestration are not implemented yet.

- [ ] **Step 3: Implement `getExtAssetResponse`, `createExtRedeemResponse`, `createExtHeartbeatResponse`, and `createExtLogoutResponse`**

```ts
// src/modules/ext/services.ts
import { readTrustedRequestMetadataFromHeaders } from "@/lib/request-metadata";
import { signOutAndRevokeAppSession } from "@/modules/auth/services";
import { redeemCdKey } from "@/modules/cdkeys/services";
import { touchAppSessionLastSeen } from "@/modules/sessions/services";

import { extAssetQuerySchema, extHeartbeatBodySchema, extRedeemBodySchema } from "./schemas";
import { readExtAssetSecretByUserId, readExtPlatformAccessByUserId, upsertExtHeartbeatByFingerprint } from "./repositories";

function normalizeFingerprintValue(value: string | null) {
  return value?.trim() ? value : "Unknown";
}

export async function getExtAssetResponse(input: { query: unknown; requestHeaders: Headers }) {
  const query = extAssetQuerySchema.parse(input.query);
  const context = await requireExtSessionContext(input.requestHeaders, { versionFallback: null });
  const platformAccess = await readExtPlatformAccessByUserId(context.session.userId);
  const selectedPlatform = platformAccess.find((item) => item.platform === query.platform);

  if (!selectedPlatform) {
    return { reason: "subscription_required", status: "forbidden" as const };
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

  if ((resolvedMode === "private" && !selectedPlatform.hasPrivateAccess) || (resolvedMode === "share" && !selectedPlatform.hasShareAccess)) {
    throw new ExtApiError("EXT_MODE_NOT_ALLOWED", "The requested mode is not available for this subscription.");
  }

  const assetSecret = await readExtAssetSecretByUserId({ mode: resolvedMode, platform: query.platform, userId: context.session.userId });

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
    throw new ExtApiError(result.errorCode === "code-used" ? "EXT_REDEEM_USED" : "EXT_REDEEM_INVALID", result.message);
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

  return { ok: true as const, timestamp: new Date().toISOString() };
}

export async function createExtLogoutResponse(input: { requestHeaders: Headers }) {
  await assertExtRequestAllowed(input.requestHeaders);
  const payload = await signOutAndRevokeAppSession();

  return {
    ok: payload.ok,
    redirectTo: payload.redirectTo,
  };
}
```

- [ ] **Step 4: Re-run the expanded service tests**

Run: `pnpm vitest run tests/unit/modules/ext/services.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit this slice**

```bash
git add src/modules/ext/services.ts tests/unit/modules/ext/services.test.ts
git commit -m "feat: finish ext asset and mutation services"
```

## Task 6: Add Route Handlers For `api/ext/*`

**Files:**
- Create: `src/app/api/ext/bootstrap/route.ts`
- Create: `src/app/api/ext/asset/route.ts`
- Create: `src/app/api/ext/redeem/route.ts`
- Create: `src/app/api/ext/heartbeat/route.ts`
- Create: `src/app/api/ext/logout/route.ts`
- Test: `tests/unit/app/api/ext/route-handlers.test.ts`

- [ ] **Step 1: Write the failing route handler tests**

```ts
// tests/unit/app/api/ext/route-handlers.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/ext/services", () => ({
  createExtHeartbeatResponse: vi.fn(),
  createExtLogoutResponse: vi.fn(),
  createExtRedeemResponse: vi.fn(),
  getExtAssetResponse: vi.fn(),
  getExtBootstrapResponse: vi.fn(),
}));

import { GET as getExtAsset } from "@/app/api/ext/asset/route";
import { GET as getExtBootstrap } from "@/app/api/ext/bootstrap/route";
import { POST as postExtHeartbeat } from "@/app/api/ext/heartbeat/route";
import { POST as postExtLogout } from "@/app/api/ext/logout/route";
import { POST as postExtRedeem } from "@/app/api/ext/redeem/route";
import { ExtApiError } from "@/lib/ext-api/errors";
import {
  createExtHeartbeatResponse,
  createExtLogoutResponse,
  createExtRedeemResponse,
  getExtAssetResponse,
  getExtBootstrapResponse,
} from "@/modules/ext/services";

describe("ext route handlers", () => {
  it("passes bootstrap query version and headers into the service", async () => {
    vi.mocked(getExtBootstrapResponse).mockResolvedValue({
      auth: { loginUrl: "/login", status: "unauthenticated" },
      version: { status: "supported" },
    });

    const request = new Request("http://localhost/api/ext/bootstrap?version=2.0.0", {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
    });
    const response = await getExtBootstrap(request);

    expect(response.status).toBe(200);
    expect(getExtBootstrapResponse).toHaveBeenCalledWith({
      query: { version: "2.0.0" },
      requestHeaders: request.headers,
    });
  });

  it("maps ExtApiError to json error payload", async () => {
    vi.mocked(getExtAssetResponse).mockRejectedValue(new ExtApiError("EXT_MODE_NOT_ALLOWED", "Mode is not allowed."));

    const response = await getExtAsset(
      new Request("http://localhost/api/ext/asset?platform=tradingview&mode=share", {
        headers: {
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_MODE_NOT_ALLOWED",
        message: "Mode is not allowed.",
      },
    });
  });

  it("passes POST /api/ext/redeem body into the service", async () => {
    vi.mocked(createExtRedeemResponse).mockResolvedValue({ ok: true, message: "CD-Key berhasil diredeem." });

    const request = new Request("http://localhost/api/ext/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "ABCD123456" }),
    });

    const response = await postExtRedeem(request);

    expect(response.status).toBe(200);
    expect(createExtRedeemResponse).toHaveBeenCalledWith({
      body: { code: "ABCD123456" },
      requestHeaders: request.headers,
    });
  });

  it("passes POST /api/ext/heartbeat body into the service", async () => {
    vi.mocked(createExtHeartbeatResponse).mockResolvedValue({ ok: true, timestamp: "2026-04-24T10:00:00.000Z" });

    const request = new Request("http://localhost/api/ext/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "device-1", extensionVersion: "2.0.0" }),
    });

    const response = await postExtHeartbeat(request);

    expect(response.status).toBe(200);
    expect(createExtHeartbeatResponse).toHaveBeenCalledWith({
      body: { deviceId: "device-1", extensionVersion: "2.0.0" },
      requestHeaders: request.headers,
    });
  });

  it("maps logout service payload to json", async () => {
    vi.mocked(createExtLogoutResponse).mockResolvedValue({ ok: true, redirectTo: "/login" });

    const request = new Request("http://localhost/api/ext/logout", { method: "POST" });
    const response = await postExtLogout(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, redirectTo: "/login" });
  });
});
```

- [ ] **Step 2: Run the route handler tests to confirm the route files are missing**

Run: `pnpm vitest run tests/unit/app/api/ext/route-handlers.test.ts`

Expected: FAIL because `src/app/api/ext/*` route files do not exist yet.

- [ ] **Step 3: Implement the route handlers with thin parsing only**

```ts
// src/app/api/ext/bootstrap/route.ts
import { buildExtApiErrorResponse } from "@/lib/ext-api/errors";
import { getExtBootstrapResponse } from "@/modules/ext/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    return Response.json(
      await getExtBootstrapResponse({
        query: { version: searchParams.get("version") ?? undefined },
        requestHeaders: request.headers,
      }),
    );
  } catch (error) {
    return buildExtApiErrorResponse(error);
  }
}
```

```ts
// src/app/api/ext/asset/route.ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    return Response.json(
      await getExtAssetResponse({
        query: {
          mode: searchParams.get("mode") ?? undefined,
          platform: searchParams.get("platform") ?? undefined,
        },
        requestHeaders: request.headers,
      }),
    );
  } catch (error) {
    return buildExtApiErrorResponse(error);
  }
}
```

```ts
// src/app/api/ext/redeem/route.ts and src/app/api/ext/heartbeat/route.ts
export async function POST(request: Request) {
  try {
    return Response.json(await createExtRedeemResponse({ body: await request.json(), requestHeaders: request.headers }));
  } catch (error) {
    return buildExtApiErrorResponse(error);
  }
}
```

```ts
// src/app/api/ext/logout/route.ts
export async function POST(request: Request) {
  try {
    return Response.json(await createExtLogoutResponse({ requestHeaders: request.headers }));
  } catch (error) {
    return buildExtApiErrorResponse(error);
  }
}
```

- [ ] **Step 4: Re-run the route handler tests**

Run: `pnpm vitest run tests/unit/app/api/ext/route-handlers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit this slice**

```bash
git add src/app/api/ext/bootstrap/route.ts src/app/api/ext/asset/route.ts src/app/api/ext/redeem/route.ts src/app/api/ext/heartbeat/route.ts src/app/api/ext/logout/route.ts tests/unit/app/api/ext/route-handlers.test.ts
git commit -m "feat: add ext api route handlers"
```

## Task 7: Run Full Verification And Manual curl/Postman Checks

**Files:**
- Modify: `src/modules/ext/services.ts`
- Modify: `src/modules/ext/repositories.ts`
- Modify: `src/app/api/ext/*.ts`
- Test: `tests/unit/modules/ext/services.test.ts`
- Test: `tests/unit/modules/ext/repositories.test.ts`
- Test: `tests/unit/app/api/ext/route-handlers.test.ts`

- [ ] **Step 1: Run the targeted API suite**

Run: `pnpm vitest run tests/unit/lib/ext-api/errors.test.ts tests/unit/lib/request-metadata.test.ts tests/unit/modules/sessions/services.test.ts tests/unit/modules/ext/schemas.test.ts tests/unit/modules/ext/repositories.test.ts tests/unit/modules/ext/services.test.ts tests/unit/app/api/ext/route-handlers.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the repo quality gates**

Run: `pnpm lint && pnpm typecheck && pnpm test`

Expected: PASS.

- [ ] **Step 3: Verify manual dev-header override requests**

Run:

```bash
curl "http://localhost:3000/api/ext/bootstrap?version=2.0.0" \
  -H "x-extension-version: 2.0.0" \
  -H "x-ext-dev-origin: chrome-extension://allowed-id" \
  -H "x-ext-dev-extension-id: allowed-id" \
  -H "x-ext-dev-app-session: <opaque-app-session-token>"
```

Expected: JSON bootstrap payload with either `auth.status = "unauthenticated"` or an authenticated snapshot, depending on the injected token.

Run:

```bash
curl "http://localhost:3000/api/ext/asset?platform=tradingview" \
  -H "x-extension-version: 2.0.0" \
  -H "x-ext-dev-origin: chrome-extension://allowed-id" \
  -H "x-ext-dev-extension-id: allowed-id" \
  -H "x-ext-dev-app-session: <opaque-app-session-token>"
```

Expected: `selection_required`, `ready`, `forbidden`, or `blocked` payload with the exact response shape from the spec.

- [ ] **Step 4: Run `pnpm check:fix` and confirm the worktree is clean except for intended changes**

Run: `pnpm check:fix`

Expected: PASS.

- [ ] **Step 5: Commit the verification pass**

```bash
git add src/config/env.server.ts src/lib/request-metadata.ts src/modules/sessions/services.ts src/lib/ext-api/errors.ts src/modules/ext/platforms.ts src/modules/ext/types.ts src/modules/ext/schemas.ts src/modules/ext/repositories.ts src/modules/ext/services.ts src/app/api/ext/bootstrap/route.ts src/app/api/ext/asset/route.ts src/app/api/ext/redeem/route.ts src/app/api/ext/heartbeat/route.ts src/app/api/ext/logout/route.ts tests/unit/lib/ext-api/errors.test.ts tests/unit/lib/request-metadata.test.ts tests/unit/modules/sessions/services.test.ts tests/unit/modules/ext/schemas.test.ts tests/unit/modules/ext/repositories.test.ts tests/unit/modules/ext/services.test.ts tests/unit/app/api/ext/route-handlers.test.ts migrations/046_ext_v2_api.sql docs/DB.md
git commit -m "feat: implement extension v2 api endpoints"
```
