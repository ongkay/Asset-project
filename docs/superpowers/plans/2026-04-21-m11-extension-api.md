# Milestone 11 Extension API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelesaikan `GET /api/extension/session`, `GET /api/extension/asset`, `POST /api/extension/track`, plus hybrid dev harness yang bisa membuktikan semua checklist Milestone 11 dari request extension nyata yang memakai `app_session` web yang sama.

**Architecture:** Tetap pakai App Router route handlers yang tipis di `src/app/api/extension/**`, dengan seluruh guard pipeline, nonce flow, error contract, dan read/write orchestration dipusatkan di `src/modules/extension/**`. Proof browser dijalankan dari route dev-only `/console/extension-harness`, tetapi request nyata selalu dieksekusi oleh companion Chrome dev extension variants (`allowed` dan `denied`) yang hidup di root repo agar `Origin`, `x-extension-id`, cookie `app_session`, dan `requestNonce` benar-benar terbukti dari jalur request extension yang asli.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript strict, Vitest, Tailwind/shadcn UI primitives, Chrome Extensions Manifest V3 dev tooling, InsForge admin database adapter, `pnpm`, `npx @insforge/cli`.

---

## File Map

- Create: `src/lib/extension-api/errors.ts`
- Create: `src/modules/extension/queries.ts`
- Create: `src/app/api/extension/session/route.ts`
- Create: `src/app/api/extension/asset/route.ts`
- Create: `src/app/api/extension/track/route.ts`
- Create: `src/app/(extension-dev)/console/extension-harness/page.tsx`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-harness-shell.tsx`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-harness-state.ts`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-request-panel.tsx`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-response-viewer.tsx`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-scenario-list.tsx`
- Create: `tests/unit/lib/cookies.test.ts`
- Create: `tests/unit/lib/extension-api/errors.test.ts`
- Create: `tests/unit/modules/extension/schemas.test.ts`
- Create: `tests/unit/modules/extension/queries.test.ts`
- Create: `tests/unit/modules/extension/services.test.ts`
- Create: `tests/unit/app/api/extension/route-handlers.test.ts`
- Create: `tests/unit/app/extension-harness/page.test.ts`
- Create: `tests/unit/app/extension-harness/state.test.ts`
- Create: `tests/unit/dev/extension-harness/manifests.test.ts`
- Create: `dev/extension-harness/allowed/manifest.json`
- Create: `dev/extension-harness/allowed/background.js`
- Create: `dev/extension-harness/allowed/content-script.js`
- Create: `dev/extension-harness/denied/manifest.json`
- Create: `dev/extension-harness/denied/background.js`
- Create: `dev/extension-harness/denied/content-script.js`
- Create: `dev/extension-harness/README.md`
- Modify: `src/lib/cookies.ts`
- Modify: `src/modules/extension/types.ts`
- Modify: `src/modules/extension/schemas.ts`
- Modify: `src/modules/extension/repositories.ts`
- Modify: `src/modules/extension/services.ts`

## Task 1: Kunci `app_session` transport dan error contract extension

**Files:**
- Modify: `src/lib/cookies.ts`
- Create: `src/lib/extension-api/errors.ts`
- Test: `tests/unit/lib/cookies.test.ts`
- Test: `tests/unit/lib/extension-api/errors.test.ts`

- [ ] **Step 1: Tulis failing tests untuk cookie transport dan error response**

```ts
// tests/unit/lib/cookies.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const headerMocks = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  return {
    cookieStore,
    cookies: vi.fn(async () => cookieStore),
  };
});

vi.mock("next/headers", () => ({
  cookies: headerMocks.cookies,
}));

describe("lib/cookies app_session transport", () => {
  beforeEach(() => {
    headerMocks.cookieStore.get.mockReset();
    headerMocks.cookieStore.set.mockReset();
  });

  it("writes app_session with explicit SameSite=None for extension-compatible requests", async () => {
    const { writeAppSessionCookie } = await import("@/lib/cookies");

    await writeAppSessionCookie("opaque-token");

    expect(headerMocks.cookieStore.set).toHaveBeenCalledWith(
      "app_session",
      "opaque-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "none",
      }),
    );
  });
});
```

```ts
// tests/unit/lib/extension-api/errors.test.ts
import { describe, expect, it } from "vitest";

import { ExtensionApiError, buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";

describe("extension api errors", () => {
  it("maps SESSION_MISSING to a 401 response", async () => {
    const response = buildExtensionApiErrorResponse(
      new ExtensionApiError("SESSION_MISSING", "An active app session is required."),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "SESSION_MISSING",
        message: "An active app session is required.",
      },
    });
  });

  it("maps NOT_FOUND to a 404 response", async () => {
    const response = buildExtensionApiErrorResponse(new ExtensionApiError("NOT_FOUND", "Asset was not found."));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Asset was not found.",
      },
    });
  });
});
```

- [ ] **Step 2: Jalankan test target untuk memastikan masih gagal**

Run: `pnpm vitest run tests/unit/lib/cookies.test.ts tests/unit/lib/extension-api/errors.test.ts`

Expected: FAIL karena `sameSite` `app_session` belum explicit `none` dan helper `@/lib/extension-api/errors` belum ada.

- [ ] **Step 3: Implementasi minimal cookie transport dan helper error**

```ts
// src/lib/cookies.ts
export async function writeAppSessionCookie(
  token: string,
  maxAgeSeconds = DEFAULT_APP_SESSION_MAX_AGE_SECONDS,
): Promise<void> {
  await writeCookieValue(env.APP_SESSION_COOKIE_NAME, token, {
    maxAge: maxAgeSeconds,
    sameSite: "none",
  });
}
```

```ts
// src/lib/extension-api/errors.ts
import "server-only";

export type ExtensionApiErrorCode =
  | "EXT_ORIGIN_DENIED"
  | "EXT_HEADER_REQUIRED"
  | "NONCE_REQUIRED"
  | "NONCE_INVALID"
  | "SESSION_MISSING"
  | "SESSION_REVOKED"
  | "USER_BANNED"
  | "SUBSCRIPTION_EXPIRED"
  | "ASSET_NOT_ALLOWED"
  | "NOT_FOUND";

const EXTENSION_API_STATUS_BY_CODE: Record<ExtensionApiErrorCode, number> = {
  EXT_HEADER_REQUIRED: 400,
  NONCE_REQUIRED: 400,
  NONCE_INVALID: 400,
  SESSION_MISSING: 401,
  SESSION_REVOKED: 401,
  EXT_ORIGIN_DENIED: 403,
  USER_BANNED: 403,
  SUBSCRIPTION_EXPIRED: 403,
  ASSET_NOT_ALLOWED: 403,
  NOT_FOUND: 404,
};

export class ExtensionApiError extends Error {
  constructor(
    public readonly code: ExtensionApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtensionApiError";
  }
}

export function buildExtensionApiErrorResponse(error: unknown) {
  if (error instanceof ExtensionApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: EXTENSION_API_STATUS_BY_CODE[error.code] },
    );
  }

  throw error;
}
```

- [ ] **Step 4: Jalankan ulang test target**

Run: `pnpm vitest run tests/unit/lib/cookies.test.ts tests/unit/lib/extension-api/errors.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit slice ini**

```bash
git add src/lib/cookies.ts src/lib/extension-api/errors.ts tests/unit/lib/cookies.test.ts tests/unit/lib/extension-api/errors.test.ts
git commit -m "feat: lock extension session cookie and error contract"
```

## Task 2: Tambahkan contract read model extension dan wrapper RPC admin

**Files:**
- Modify: `src/modules/extension/types.ts`
- Modify: `src/modules/extension/schemas.ts`
- Modify: `src/modules/extension/repositories.ts`
- Create: `src/modules/extension/queries.ts`
- Test: `tests/unit/modules/extension/schemas.test.ts`
- Test: `tests/unit/modules/extension/queries.test.ts`

- [ ] **Step 1: Tulis failing tests untuk schema dan query mapping extension**

```ts
// tests/unit/modules/extension/schemas.test.ts
import { describe, expect, it } from "vitest";

import {
  extensionAssetDetailRpcSchema,
  extensionConsoleSnapshotRpcSchema,
  extensionTrackHeartbeatInputSchema,
} from "@/modules/extension/schemas";

describe("extension schemas", () => {
  it("accepts console snapshot rows that only expose active valid assets", () => {
    expect(
      extensionConsoleSnapshotRpcSchema.parse({
        subscription: {
          days_left: 12,
          end_at: "2026-05-01T00:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
          package_id: "22222222-2222-4222-8222-222222222222",
          package_name: "Starter",
          start_at: "2026-04-01T00:00:00.000Z",
          status: "processed",
        },
        assets: [
          {
            access_key: "tradingview:private",
            asset_type: "private",
            assignment_id: "33333333-3333-4333-8333-333333333333",
            expires_at: "2026-05-01T00:00:00.000Z",
            id: "TV-001",
            note: null,
            platform: "tradingview",
            proxy: null,
            subscription_id: "11111111-1111-4111-8111-111111111111",
          },
        ],
        transactions: [],
      }),
    ).toBeTruthy();
  });

  it("accepts raw asset detail rows returned by get_user_asset_detail", () => {
    expect(
      extensionAssetDetailRpcSchema.parse({
        access_key: "fxreplay:share",
        account: "account-1",
        asset_json: [{ name: "session", value: "cookie-1" }],
        asset_type: "share",
        expires_at: "2026-05-01T00:00:00.000Z",
        id: "20000000-0000-0000-0000-000000000003",
        note: "Seed share asset",
        platform: "fxreplay",
        proxy: null,
        subscription_id: "44444444-4444-4444-8444-444444444444",
      }),
    ).toBeTruthy();
  });

  it("accepts the track request body without extensionId because the ID comes from the header", () => {
    expect(
      extensionTrackHeartbeatInputSchema.parse({
        browser: "Chrome",
        deviceId: "m11-allowed-primary",
        extensionVersion: "0.0.1",
        os: "macOS",
      }),
    ).toEqual({
      browser: "Chrome",
      deviceId: "m11-allowed-primary",
      extensionVersion: "0.0.1",
      os: "macOS",
    });
  });
});
```

```ts
// tests/unit/modules/extension/queries.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

describe("extension queries", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("reads the session snapshot through get_user_console_snapshot", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        subscription: {
          days_left: 12,
          end_at: "2026-05-01T00:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
          package_id: "22222222-2222-4222-8222-222222222222",
          package_name: "Starter",
          start_at: "2026-04-01T00:00:00.000Z",
          status: "active",
        },
        assets: [
          {
            access_key: "tradingview:private",
            asset_type: "private",
            assignment_id: "33333333-3333-4333-8333-333333333333",
            expires_at: "2026-05-01T00:00:00.000Z",
            id: "TV-001",
            note: null,
            platform: "tradingview",
            proxy: null,
            subscription_id: "11111111-1111-4111-8111-111111111111",
          },
        ],
        transactions: [],
      },
      error: null,
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { getExtensionConsoleSnapshotForUser } = await import("@/modules/extension/queries");

    await expect(
      getExtensionConsoleSnapshotForUser({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    ).resolves.toEqual({
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "11111111-1111-4111-8111-111111111111",
        packageId: "22222222-2222-4222-8222-222222222222",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      assets: [
        {
          accessKey: "tradingview:private",
          assetType: "private",
          expiresAt: "2026-05-01T00:00:00.000Z",
          id: "TV-001",
          platform: "tradingview",
        },
      ],
    });
    expect(rpc).toHaveBeenCalledWith("get_user_console_snapshot", {
      p_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });

  it("returns null when get_user_asset_detail has no active row", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { getExtensionAssetDetailForUser } = await import("@/modules/extension/queries");

    await expect(
      getExtensionAssetDetailForUser({
        assetId: "20000000-0000-0000-0000-000000000003",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).resolves.toBeNull();
  });

  it("checks whether the requested asset id still exists in the inventory table", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "20000000-0000-0000-0000-000000000003" },
      error: null,
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle,
          })),
        })),
      })),
    });

    const { doesExtensionAssetExist } = await import("@/modules/extension/queries");

    await expect(doesExtensionAssetExist("20000000-0000-0000-0000-000000000003")).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Jalankan test target untuk memastikan masih gagal**

Run: `pnpm vitest run tests/unit/modules/extension/schemas.test.ts tests/unit/modules/extension/queries.test.ts`

Expected: FAIL karena schema RPC dan query exports baru belum ada.

- [ ] **Step 3: Tambahkan schema, repository wrapper, dan query mapping minimal**

```ts
// src/modules/extension/types.ts
export type ExtensionSessionSnapshot = {
  subscription: {
    daysLeft: number;
    endAt: string;
    id: string;
    packageId: string;
    packageName: string;
    startAt: string;
    status: "active" | "processed";
  } | null;
  assets: Array<{
    accessKey: string;
    assetType: "private" | "share";
    expiresAt: string;
    id: string;
    platform: "tradingview" | "fxreplay" | "fxtester";
  }>;
};

export type ExtensionAssetDetail = {
  accessKey: string;
  account: string;
  asset: unknown;
  assetType: "private" | "share";
  expiresAt: string;
  id: string;
  note: string | null;
  platform: "tradingview" | "fxreplay" | "fxtester";
  proxy: string | null;
  subscriptionId: string;
};

export type ExtensionTrackHeartbeatInput = {
  browser: string | null;
  deviceId: string;
  extensionVersion: string;
  os: string | null;
};

export type ExtensionTrackHeartbeatWriteInput = ExtensionTrackHeartbeatInput & {
  extensionId: string;
  sessionId: string;
  userId: string;
};
```

```ts
// src/modules/extension/schemas.ts
import { z } from "zod";

const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const extensionConsoleSnapshotRpcSchema = z.object({
  subscription: z
    .object({
      days_left: z.number().int().nonnegative(),
      end_at: isoDateTimeSchema,
      id: z.string().min(1),
      package_id: z.string().min(1),
      package_name: z.string().min(1),
      start_at: isoDateTimeSchema,
      status: z.enum(["active", "processed"]),
    })
    .nullable(),
  assets: z.array(
    z.object({
      access_key: z.string().min(1),
      asset_type: z.enum(["private", "share"]),
      assignment_id: z.string().min(1),
      expires_at: isoDateTimeSchema,
      id: z.string().min(1),
      note: z.string().nullable(),
      platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
      proxy: z.string().nullable(),
      subscription_id: z.string().min(1),
    }),
  ),
  transactions: z.array(z.unknown()),
});

export const extensionAssetDetailRpcSchema = z.object({
  access_key: z.string().min(1),
  account: z.string().min(1),
  asset_json: z.unknown(),
  asset_type: z.enum(["private", "share"]),
  expires_at: isoDateTimeSchema,
  id: z.string().min(1),
  note: z.string().nullable(),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  proxy: z.string().nullable(),
  subscription_id: z.string().min(1),
});

export const extensionTrackHeartbeatInputSchema = z.object({
  browser: z.string().trim().min(1).nullable().default(null),
  deviceId: z.string().trim().min(1, "Device ID is required."),
  extensionVersion: z.string().trim().min(1, "Extension version is required."),
  os: z.string().trim().min(1).nullable().default(null),
});
```

```ts
// src/modules/extension/repositories.ts
export async function readExtensionConsoleSnapshotRpc(userId: string) {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database.rpc("get_user_console_snapshot", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function readExtensionAssetDetailRpc(input: { assetId: string; userId: string }) {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database.rpc("get_user_asset_detail", {
    p_asset_id: input.assetId,
    p_user_id: input.userId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function readExtensionAssetExistence(assetId: string) {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database.from("assets").select("id").eq("id", assetId).maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return data;
}
```

```ts
// src/modules/extension/queries.ts
import "server-only";

import type { ExtensionAssetDetail, ExtensionSessionSnapshot } from "./types";

import { extensionAssetDetailRpcSchema, extensionConsoleSnapshotRpcSchema } from "./schemas";
import {
  readExtensionAssetDetailRpc,
  readExtensionAssetExistence,
  readExtensionConsoleSnapshotRpc,
} from "./repositories";

export async function getExtensionConsoleSnapshotForUser(input: { userId: string }): Promise<ExtensionSessionSnapshot> {
  const snapshot = extensionConsoleSnapshotRpcSchema.parse(await readExtensionConsoleSnapshotRpc(input.userId));

  return {
    subscription: snapshot.subscription
      ? {
          daysLeft: snapshot.subscription.days_left,
          endAt: snapshot.subscription.end_at,
          id: snapshot.subscription.id,
          packageId: snapshot.subscription.package_id,
          packageName: snapshot.subscription.package_name,
          startAt: snapshot.subscription.start_at,
          status: snapshot.subscription.status,
        }
      : null,
    assets: snapshot.assets.map((asset) => ({
      accessKey: asset.access_key,
      assetType: asset.asset_type,
      expiresAt: asset.expires_at,
      id: asset.id,
      platform: asset.platform,
    })),
  };
}

export async function getExtensionAssetDetailForUser(input: {
  assetId: string;
  userId: string;
}): Promise<ExtensionAssetDetail | null> {
  const data = await readExtensionAssetDetailRpc(input);

  if (!data) {
    return null;
  }

  const detail = extensionAssetDetailRpcSchema.parse(data);

  return {
    accessKey: detail.access_key,
    account: detail.account,
    asset: detail.asset_json,
    assetType: detail.asset_type,
    expiresAt: detail.expires_at,
    id: detail.id,
    note: detail.note,
    platform: detail.platform,
    proxy: detail.proxy,
    subscriptionId: detail.subscription_id,
  };
}

export async function doesExtensionAssetExist(assetId: string) {
  const assetRow = await readExtensionAssetExistence(assetId);
  return Boolean(assetRow);
}
```

- [ ] **Step 4: Jalankan ulang test schema dan query**

Run: `pnpm vitest run tests/unit/modules/extension/schemas.test.ts tests/unit/modules/extension/queries.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit slice ini**

```bash
git add src/modules/extension/types.ts src/modules/extension/schemas.ts src/modules/extension/repositories.ts src/modules/extension/queries.ts tests/unit/modules/extension/schemas.test.ts tests/unit/modules/extension/queries.test.ts
git commit -m "feat: add extension read model wrappers"
```

## Task 3: Implementasikan guard pipeline dan service `session`, `asset`, `track`

**Files:**
- Modify: `src/modules/extension/services.ts`
- Test: `tests/unit/modules/extension/services.test.ts`

- [ ] **Step 1: Tulis failing service tests untuk guard pipeline dan response mapping**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  readAppSessionCookie: vi.fn(),
}));

const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

const extensionQueryMocks = vi.hoisted(() => ({
  doesExtensionAssetExist: vi.fn(),
  getExtensionAssetDetailForUser: vi.fn(),
  getExtensionConsoleSnapshotForUser: vi.fn(),
}));

const extensionRepositoryMocks = vi.hoisted(() => ({
  upsertExtensionTrackHeartbeat: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  createSessionBoundRequestNonce: vi.fn(),
  touchActiveAppSessionLastSeen: vi.fn(),
  validateActiveAppSession: vi.fn(),
  verifySessionBoundRequestNonce: vi.fn(),
}));

vi.mock("@/lib/cookies", () => ({
  readAppSessionCookie: cookieMocks.readAppSessionCookie,
}));

vi.mock("@/modules/auth/repositories", () => ({
  readProfileByUserId: authRepositoryMocks.readProfileByUserId,
}));

vi.mock("@/modules/extension/queries", () => ({
  doesExtensionAssetExist: extensionQueryMocks.doesExtensionAssetExist,
  getExtensionAssetDetailForUser: extensionQueryMocks.getExtensionAssetDetailForUser,
  getExtensionConsoleSnapshotForUser: extensionQueryMocks.getExtensionConsoleSnapshotForUser,
}));

vi.mock("@/modules/extension/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/extension/repositories")>(
    "@/modules/extension/repositories",
  );

  return {
    ...actual,
    upsertExtensionTrackHeartbeat: extensionRepositoryMocks.upsertExtensionTrackHeartbeat,
  };
});

vi.mock("@/modules/sessions/services", async () => {
  const actual = await vi.importActual<typeof import("@/modules/sessions/services")>("@/modules/sessions/services");

  return {
    ...actual,
    createSessionBoundRequestNonce: sessionServiceMocks.createSessionBoundRequestNonce,
    touchActiveAppSessionLastSeen: sessionServiceMocks.touchActiveAppSessionLastSeen,
    validateActiveAppSession: sessionServiceMocks.validateActiveAppSession,
    verifySessionBoundRequestNonce: sessionServiceMocks.verifySessionBoundRequestNonce,
  };
});

describe("extension services", () => {
  beforeEach(() => {
    cookieMocks.readAppSessionCookie.mockReset();
    authRepositoryMocks.readProfileByUserId.mockReset();
    extensionQueryMocks.doesExtensionAssetExist.mockReset();
    extensionQueryMocks.getExtensionAssetDetailForUser.mockReset();
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockReset();
    extensionRepositoryMocks.upsertExtensionTrackHeartbeat.mockReset();
    sessionServiceMocks.createSessionBoundRequestNonce.mockReset();
    sessionServiceMocks.touchActiveAppSessionLastSeen.mockReset();
    sessionServiceMocks.validateActiveAppSession.mockReset();
    sessionServiceMocks.verifySessionBoundRequestNonce.mockReset();
  });

  it("throws SESSION_MISSING when the browser has no app_session cookie", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue(undefined);
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "SESSION_MISSING" });
  });

  it("throws SESSION_REVOKED when the cookie exists but the active session row is gone", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "SESSION_REVOKED" });
  });

  it("throws EXT_ORIGIN_DENIED when the extension id is not allowlisted", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://denied-id",
          "x-extension-id": "denied-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_ORIGIN_DENIED" });
  });

  it("throws USER_BANNED before any extension data is read", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: true,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "USER_BANNED" });

    expect(extensionQueryMocks.getExtensionConsoleSnapshotForUser).not.toHaveBeenCalled();
  });

  it("throws SUBSCRIPTION_EXPIRED when the active user has no running extension-eligible subscription", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.none.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-none-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      subscription: null,
      assets: [],
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "SUBSCRIPTION_EXPIRED" });
  });

  it("builds the extension session payload for an active user", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      assets: [
        {
          accessKey: "tradingview:private",
          assetType: "private",
          expiresAt: "2026-05-01T00:00:00.000Z",
          id: "TV-001",
          platform: "tradingview",
        },
      ],
    });
    sessionServiceMocks.createSessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      value: "nonce-1",
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      requestNonce: {
        expiresAt: "2026-04-21T13:01:00.000Z",
        value: "nonce-1",
      },
      subscription: {
        assets: [
          {
            accessKey: "tradingview:private",
            assetType: "private",
            expiresAt: "2026-05-01T00:00:00.000Z",
            id: "TV-001",
            platform: "tradingview",
          },
        ],
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        packageName: "Starter",
        status: "active",
      },
      user: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        username: "seed-active-browser",
      },
    });
  });

  it("builds the raw asset response after nonce verification", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      assets: [],
    });
    sessionServiceMocks.verifySessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    extensionQueryMocks.getExtensionAssetDetailForUser.mockResolvedValue({
      accessKey: "tradingview:private",
      account: "seed-account",
      asset: [{ name: "session", value: "cookie-1" }],
      assetType: "private",
      expiresAt: "2026-05-01T00:00:00.000Z",
      id: "TV-001",
      note: null,
      platform: "tradingview",
      proxy: null,
      subscriptionId: "sub-1",
    });

    const { getExtensionAssetResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionAssetResponse({
        assetId: "TV-001",
        nonce: "nonce-1",
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      accessKey: "tradingview:private",
      account: "seed-account",
      asset: [{ name: "session", value: "cookie-1" }],
      assetType: "private",
      expiresAt: "2026-05-01T00:00:00.000Z",
      id: "TV-001",
      note: null,
      platform: "tradingview",
      proxy: null,
    });
  });

  it("returns ASSET_NOT_ALLOWED when the asset row exists but is not readable for the active subscription", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      assets: [],
    });
    sessionServiceMocks.verifySessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    extensionQueryMocks.getExtensionAssetDetailForUser.mockResolvedValue(null);
    extensionQueryMocks.doesExtensionAssetExist.mockResolvedValue(true);

    const { getExtensionAssetResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionAssetResponse({
        assetId: "TV-001",
        nonce: "nonce-1",
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_ALLOWED" });
  });

  it("returns NOT_FOUND when the asset id does not exist at all", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      assets: [],
    });
    sessionServiceMocks.verifySessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    extensionQueryMocks.getExtensionAssetDetailForUser.mockResolvedValue(null);
    extensionQueryMocks.doesExtensionAssetExist.mockResolvedValue(false);

    const { getExtensionAssetResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionAssetResponse({
        assetId: "missing-asset",
        nonce: "nonce-1",
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("uses x-extension-id from the request header when writing extension_tracks", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      assets: [],
    });
    extensionRepositoryMocks.upsertExtensionTrackHeartbeat.mockResolvedValue({
      firstSeenAt: "2026-04-21T13:05:00.000Z",
      id: "track-1",
      lastSeenAt: "2026-04-21T13:05:00.000Z",
    });

    const { createExtensionTrackResponse } = await import("@/modules/extension/services");

    await expect(
      createExtensionTrackResponse({
        heartbeat: {
          browser: "Chrome",
          deviceId: "m11-allowed-primary",
          extensionVersion: "0.0.1",
          os: "macOS",
        },
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      success: true,
      timestamp: expect.any(String),
    });

    expect(extensionRepositoryMocks.upsertExtensionTrackHeartbeat).toHaveBeenCalledWith({
      heartbeat: {
        browser: "Chrome",
        deviceId: "m11-allowed-primary",
        extensionId: "allowed-id",
        extensionVersion: "0.0.1",
        os: "macOS",
        sessionId: "session-1",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      network: expect.objectContaining({
        ipAddress: expect.any(String),
      }),
    });
  });
});
```

- [ ] **Step 2: Jalankan test service untuk memastikan masih gagal**

Run: `pnpm vitest run tests/unit/modules/extension/services.test.ts`

Expected: FAIL karena service contract baru belum ada dan error mapping saat ini masih generik.

- [ ] **Step 3: Implementasikan service guard pipeline dan response builder minimal**

```ts
// src/modules/extension/services.ts
import "server-only";

import { readAppSessionCookie } from "@/lib/cookies";
import { ExtensionApiError } from "@/lib/extension-api/errors";
import { readProfileByUserId } from "@/modules/auth/repositories";
import {
  createSessionBoundRequestNonce,
  touchActiveAppSessionLastSeen,
  validateActiveAppSession,
  verifySessionBoundRequestNonce,
} from "@/modules/sessions/services";

import { extensionRequestHeadersSchema, extensionTrackHeartbeatInputSchema } from "./schemas";
import {
  doesExtensionAssetExist,
  getExtensionAssetDetailForUser,
  getExtensionConsoleSnapshotForUser,
} from "./queries";
import { upsertExtensionTrackHeartbeat } from "./repositories";

function readHeaderValue(headers: Headers, key: string) {
  return headers.get(key) ?? headers.get(key.toLowerCase());
}

function assertExtensionRequestAllowed(input: { extensionId: string | null; origin: string | null }) {
  const extensionId = input.extensionId?.trim() ?? "";
  const origin = input.origin?.trim() ?? "";

  if (!extensionId) {
    throw new ExtensionApiError("EXT_HEADER_REQUIRED", "Header x-extension-id is required.");
  }

  const parsedHeaders = extensionRequestHeadersSchema.parse({ extensionId, origin });
  const config = getExtensionRuntimeConfig();

  if (!config.allowedIds.includes(parsedHeaders.extensionId) || !config.allowedOrigins.includes(parsedHeaders.origin)) {
    throw new ExtensionApiError("EXT_ORIGIN_DENIED", "Extension origin is not allowed.");
  }

  return parsedHeaders;
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

  if (!snapshot.subscription) {
    throw new ExtensionApiError("SUBSCRIPTION_EXPIRED", "A valid subscription is required.");
  }

  return {
    extensionRequest,
    profile,
    session: activeSession,
    snapshot,
  };
}

export async function getExtensionSessionResponse(input: { requestHeaders: Headers }) {
  const context = await requireExtensionRequestContext(input.requestHeaders);
  await touchActiveAppSessionLastSeen();

  const requestNonce = await createSessionBoundRequestNonce({
    sessionId: context.session.sessionId,
    userId: context.session.userId,
  });

  return {
    user: {
      id: context.session.userId,
      username: context.profile.username,
    },
    subscription: {
      status: context.snapshot.subscription.status,
      packageName: context.snapshot.subscription.packageName,
      endAt: context.snapshot.subscription.endAt,
      daysLeft: context.snapshot.subscription.daysLeft,
      assets: context.snapshot.assets,
    },
    requestNonce,
  };
}

export async function getExtensionAssetResponse(input: { assetId: string; nonce: string | null; requestHeaders: Headers }) {
  if (!input.nonce?.trim()) {
    throw new ExtensionApiError("NONCE_REQUIRED", "Header x-request-nonce is required.");
  }

  const context = await requireExtensionRequestContext(input.requestHeaders);
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
    id: detail.id,
    accessKey: detail.accessKey,
    assetType: detail.assetType,
    platform: detail.platform,
    expiresAt: detail.expiresAt,
    account: detail.account,
    proxy: detail.proxy,
    note: detail.note,
    asset: detail.asset,
  };
}

export async function createExtensionTrackResponse(input: {
  heartbeat: unknown;
  requestHeaders: Headers;
}) {
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
```

- [ ] **Step 4: Jalankan ulang test service**

Run: `pnpm vitest run tests/unit/modules/extension/services.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit slice ini**

```bash
git add src/modules/extension/services.ts tests/unit/modules/extension/services.test.ts
git commit -m "feat: add extension guard pipeline services"
```

## Task 4: Tambahkan route handlers `/api/extension/*`

**Files:**
- Create: `src/app/api/extension/session/route.ts`
- Create: `src/app/api/extension/asset/route.ts`
- Create: `src/app/api/extension/track/route.ts`
- Test: `tests/unit/app/api/extension/route-handlers.test.ts`

- [ ] **Step 1: Tulis failing route handler tests**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/extension/services", () => ({
  createExtensionTrackResponse: vi.fn(),
  getExtensionAssetResponse: vi.fn(),
  getExtensionSessionResponse: vi.fn(),
}));

import { ExtensionApiError } from "@/lib/extension-api/errors";
import { GET as getExtensionAsset } from "@/app/api/extension/asset/route";
import { GET as getExtensionSession } from "@/app/api/extension/session/route";
import { POST as postExtensionTrack } from "@/app/api/extension/track/route";
import {
  createExtensionTrackResponse,
  getExtensionAssetResponse,
  getExtensionSessionResponse,
} from "@/modules/extension/services";

const mockedGetExtensionSessionResponse = vi.mocked(getExtensionSessionResponse);
const mockedGetExtensionAssetResponse = vi.mocked(getExtensionAssetResponse);
const mockedCreateExtensionTrackResponse = vi.mocked(createExtensionTrackResponse);

describe("extension route handlers", () => {
  it("returns the extension session payload", async () => {
    mockedGetExtensionSessionResponse.mockResolvedValue({
      requestNonce: { expiresAt: "2026-04-21T13:01:00.000Z", value: "nonce-1" },
      subscription: { assets: [], daysLeft: 12, endAt: "2026-05-01T00:00:00.000Z", packageName: "Starter", status: "active" },
      user: { id: "user-1", username: "seed-active-browser" },
    });

    const response = await getExtensionSession(
      new Request("http://localhost/api/extension/session", {
        headers: {
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      requestNonce: { expiresAt: "2026-04-21T13:01:00.000Z", value: "nonce-1" },
      subscription: { assets: [], daysLeft: 12, endAt: "2026-05-01T00:00:00.000Z", packageName: "Starter", status: "active" },
      user: { id: "user-1", username: "seed-active-browser" },
    });
  });

  it("maps ExtensionApiError to a JSON error response", async () => {
    mockedGetExtensionAssetResponse.mockRejectedValue(
      new ExtensionApiError("NONCE_INVALID", "Request nonce is invalid."),
    );

    const response = await getExtensionAsset(
      new Request("http://localhost/api/extension/asset?id=TV-001", {
        headers: {
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
          "x-request-nonce": "bad-nonce",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NONCE_INVALID",
        message: "Request nonce is invalid.",
      },
    });
  });

  it("passes the request body into POST /api/extension/track", async () => {
    mockedCreateExtensionTrackResponse.mockResolvedValue({
      success: true,
      timestamp: "2026-04-21T13:05:00.000Z",
    });

    const response = await postExtensionTrack(
      new Request("http://localhost/api/extension/track", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        },
        body: JSON.stringify({
          browser: "Chrome",
          deviceId: "m11-allowed-primary",
          extensionVersion: "0.0.1",
          os: "macOS",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      timestamp: "2026-04-21T13:05:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Jalankan test route handler untuk memastikan masih gagal**

Run: `pnpm vitest run tests/unit/app/api/extension/route-handlers.test.ts`

Expected: FAIL karena route handlers belum ada.

- [ ] **Step 3: Implementasikan route handler tipis untuk `session`, `asset`, dan `track`**

```ts
// src/app/api/extension/session/route.ts
import { buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";
import { getExtensionSessionResponse } from "@/modules/extension/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return Response.json(
      await getExtensionSessionResponse({
        requestHeaders: request.headers,
      }),
    );
  } catch (error) {
    return buildExtensionApiErrorResponse(error);
  }
}
```

```ts
// src/app/api/extension/asset/route.ts
import { buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";
import { getExtensionAssetResponse } from "@/modules/extension/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    return Response.json(
      await getExtensionAssetResponse({
        assetId: searchParams.get("id") ?? "",
        nonce: request.headers.get("x-request-nonce"),
        requestHeaders: request.headers,
      }),
    );
  } catch (error) {
    return buildExtensionApiErrorResponse(error);
  }
}
```

```ts
// src/app/api/extension/track/route.ts
import { buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";
import { createExtensionTrackResponse } from "@/modules/extension/services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return Response.json(
      await createExtensionTrackResponse({
        heartbeat: await request.json(),
        requestHeaders: request.headers,
      }),
    );
  } catch (error) {
    return buildExtensionApiErrorResponse(error);
  }
}
```

- [ ] **Step 4: Jalankan ulang test route handlers**

Run: `pnpm vitest run tests/unit/app/api/extension/route-handlers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit slice ini**

```bash
git add src/app/api/extension/session/route.ts src/app/api/extension/asset/route.ts src/app/api/extension/track/route.ts tests/unit/app/api/extension/route-handlers.test.ts
git commit -m "feat: add extension API route handlers"
```

## Task 5: Bangun route dev-only `/console/extension-harness` dan persistence state

**Files:**
- Create: `src/app/(extension-dev)/console/extension-harness/page.tsx`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-harness-shell.tsx`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-harness-state.ts`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-request-panel.tsx`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-response-viewer.tsx`
- Create: `src/app/(extension-dev)/console/extension-harness/_components/extension-scenario-list.tsx`
- Test: `tests/unit/app/extension-harness/page.test.ts`
- Test: `tests/unit/app/extension-harness/state.test.ts`

- [ ] **Step 1: Tulis failing tests untuk route dev-only dan state helper**

```ts
// tests/unit/app/extension-harness/page.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((location: string) => {
    throw new Error(`NEXT_REDIRECT:${location}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn(),
}));

vi.mock("@/modules/extension/services", () => ({
  getExtensionRuntimeConfig: vi.fn(() => ({
    allowedIds: ["allowed-id"],
    allowedOrigins: ["chrome-extension://allowed-id"],
    trustedProxyHeaders: { city: "x-city", country: "x-country", ip: "x-ip" },
  })),
}));

vi.mock("@/app/(extension-dev)/console/extension-harness/_components/extension-harness-shell", () => ({
  ExtensionHarnessShell: vi.fn(() => null),
}));

import * as userServices from "@/modules/users/services";

import ExtensionHarnessPage from "@/app/(extension-dev)/console/extension-harness/page";

const mockedGetAuthenticatedAppUser = vi.mocked(userServices.getAuthenticatedAppUser);

describe("extension harness page", () => {
  beforeEach(() => {
    mockedGetAuthenticatedAppUser.mockReset();
    mockedGetAuthenticatedAppUser.mockResolvedValue({
      profile: {
        email: "seed.active.browser@assetnext.dev",
        isBanned: false,
        role: "member",
        username: "seed-active-browser",
      },
      session: {
        sessionId: "session-1",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    } as never);
  });

  it("returns notFound in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(ExtensionHarnessPage()).rejects.toThrow("NEXT_NOT_FOUND");

    vi.unstubAllEnvs();
  });

  it("redirects guests to /login", async () => {
    mockedGetAuthenticatedAppUser.mockResolvedValue(null);

    await expect(ExtensionHarnessPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
```

```ts
// tests/unit/app/extension-harness/state.test.ts
import { describe, expect, it } from "vitest";

import {
  EXTENSION_HARNESS_HISTORY_STORAGE_KEY,
  appendHarnessHistoryEntry,
  parseHarnessHistory,
} from "@/app/(extension-dev)/console/extension-harness/_components/extension-harness-state";

describe("extension harness state", () => {
  it("parses an empty history safely", () => {
    expect(parseHarnessHistory(null)).toEqual([]);
    expect(parseHarnessHistory("not-json")).toEqual([]);
  });

  it("prepends the latest history entry and trims to the newest 10 items", () => {
    const currentEntries = Array.from({ length: 10 }, (_, index) => ({
      id: `entry-${index}`,
      executedAt: `2026-04-21T13:0${index}:00.000Z`,
      expectedStatus: 200,
      scenarioId: `scenario-${index}`,
      status: 200,
      summary: "PASS",
    }));

    const nextEntries = appendHarnessHistoryEntry(currentEntries, {
      id: "entry-10",
      executedAt: "2026-04-21T13:10:00.000Z",
      expectedStatus: 403,
      scenarioId: "denied-origin",
      status: 403,
      summary: "PASS",
    });

    expect(EXTENSION_HARNESS_HISTORY_STORAGE_KEY).toBe("console.extension-harness.history.v1");
    expect(nextEntries).toHaveLength(10);
    expect(nextEntries[0]?.id).toBe("entry-10");
    expect(nextEntries.at(-1)?.id).toBe("entry-8");
  });
});
```

- [ ] **Step 2: Jalankan test page dan state helper untuk memastikan masih gagal**

Run: `pnpm vitest run tests/unit/app/extension-harness/page.test.ts tests/unit/app/extension-harness/state.test.ts`

Expected: FAIL karena route dev-only dan helper state belum ada.

- [ ] **Step 3: Implementasikan route dev-only, state helper, dan shell minimal**

```ts
// src/app/(extension-dev)/console/extension-harness/page.tsx
import { notFound, redirect } from "next/navigation";

import { ExtensionHarnessShell } from "./_components/extension-harness-shell";

import { getExtensionRuntimeConfig } from "@/modules/extension/services";
import { getAuthenticatedAppUser } from "@/modules/users/services";

export default async function ExtensionHarnessPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const authenticatedUser = await getAuthenticatedAppUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  if (authenticatedUser.profile.isBanned) {
    redirect("/unauthorized");
  }

  const runtimeConfig = getExtensionRuntimeConfig();

  return (
    <ExtensionHarnessShell
      allowedIds={runtimeConfig.allowedIds}
      allowedOrigins={runtimeConfig.allowedOrigins}
      currentUser={{
        email: authenticatedUser.profile.email,
        role: authenticatedUser.profile.role,
        username: authenticatedUser.profile.username,
      }}
    />
  );
}
```

```ts
// src/app/(extension-dev)/console/extension-harness/_components/extension-harness-state.ts
export const EXTENSION_HARNESS_HISTORY_STORAGE_KEY = "console.extension-harness.history.v1";

export type ExtensionHarnessHistoryEntry = {
  id: string;
  executedAt: string;
  expectedStatus: number;
  scenarioId: string;
  status: number;
  summary: string;
};

export function parseHarnessHistory(rawValue: string | null): ExtensionHarnessHistoryEntry[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendHarnessHistoryEntry(
  currentEntries: ExtensionHarnessHistoryEntry[],
  nextEntry: ExtensionHarnessHistoryEntry,
) {
  return [nextEntry, ...currentEntries].slice(0, 10);
}
```

```tsx
// src/app/(extension-dev)/console/extension-harness/_components/extension-harness-shell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import {
  EXTENSION_HARNESS_HISTORY_STORAGE_KEY,
  appendHarnessHistoryEntry,
  parseHarnessHistory,
} from "./extension-harness-state";
import { ExtensionRequestPanel } from "./extension-request-panel";
import { ExtensionResponseViewer } from "./extension-response-viewer";
import { ExtensionScenarioList, extensionHarnessScenarios } from "./extension-scenario-list";

export function ExtensionHarnessShell(props: {
  allowedIds: string[];
  allowedOrigins: string[];
  currentUser: { email: string; role: string; username: string };
}) {
  const [history, setHistory] = useState(() =>
    typeof window === "undefined" ? [] : parseHarnessHistory(window.localStorage.getItem(EXTENSION_HARNESS_HISTORY_STORAGE_KEY)),
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState(extensionHarnessScenarios[0].id);
  const [requestEditorValue, setRequestEditorValue] = useState("");
  const [latestResponse, setLatestResponse] = useState<null | { status: number; body: unknown }>(null);
  const [connectionState, setConnectionState] = useState<"waiting" | "ready">("waiting");

  const selectedScenario = useMemo(
    () => extensionHarnessScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? extensionHarnessScenarios[0],
    [selectedScenarioId],
  );

  async function runScenario() {
    const payload = JSON.parse(requestEditorValue) as {
      body?: unknown;
      headers: Record<string, string>;
      method: string;
      url: string;
    };

    const absolutePayload = {
      ...payload,
      url: new URL(payload.url, window.location.origin).toString(),
    };

    window.postMessage(
      {
        payload: absolutePayload,
        source: "assetnext-extension-harness-page",
        type: "request",
      },
      window.location.origin,
    );
  }

  useEffect(() => {
    setRequestEditorValue(JSON.stringify(selectedScenario.request, null, 2));
  }, [selectedScenario]);

  useEffect(() => {
    window.localStorage.setItem(EXTENSION_HARNESS_HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    function handleWindowMessage(event: MessageEvent) {
      if (event.data?.source !== "assetnext-extension-harness-extension") {
        return;
      }

      if (event.data.type === "ready") {
        setConnectionState("ready");
        return;
      }

      if (event.data.type === "result") {
        const nextResponse = {
          body: event.data.response.body,
          status: event.data.response.status,
        };

        setLatestResponse(nextResponse);
        setHistory((currentEntries) =>
          appendHarnessHistoryEntry(currentEntries, {
            id: crypto.randomUUID(),
            executedAt: new Date().toISOString(),
            expectedStatus: selectedScenario.expectedStatus,
            scenarioId: selectedScenario.id,
            status: nextResponse.status,
            summary: nextResponse.status === selectedScenario.expectedStatus ? "PASS" : "FAIL",
          }),
        );
      }
    }

    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, [selectedScenario.expectedStatus, selectedScenario.id]);

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <ExtensionScenarioList history={history} selectedScenarioId={selectedScenarioId} onSelectScenario={setSelectedScenarioId} />
      <div className="space-y-6">
        <ExtensionRequestPanel
          connectionState={connectionState}
          currentUser={props.currentUser}
          editorValue={requestEditorValue}
          onChangeEditorValue={setRequestEditorValue}
          onRunScenario={runScenario}
          scenario={selectedScenario}
        />
        <ExtensionResponseViewer history={history} latestResponse={latestResponse} />
      </div>
    </div>
  );
}
```

```tsx
// src/app/(extension-dev)/console/extension-harness/_components/extension-scenario-list.tsx
import { Button } from "@/components/ui/button";

import type { ExtensionHarnessHistoryEntry } from "./extension-harness-state";

export const extensionHarnessScenarios = [
  {
    id: "session-success",
    expectedStatus: 200,
    label: "Session Success",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "GET",
      url: "/api/extension/session",
    },
  },
  {
    id: "session-processed",
    expectedStatus: 200,
    label: "Session Processed",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "GET",
      url: "/api/extension/session",
    },
  },
  {
    id: "asset-success",
    expectedStatus: 200,
    label: "Asset Success",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
        "x-request-nonce": "replace-from-session-response",
      },
      method: "GET",
      url: "/api/extension/asset?id=TV-001",
    },
  },
  {
    id: "asset-missing-nonce",
    expectedStatus: 400,
    label: "Asset Missing Nonce",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "GET",
      url: "/api/extension/asset?id=TV-001",
    },
  },
  {
    id: "asset-invalid-nonce",
    expectedStatus: 400,
    label: "Asset Invalid Nonce",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
        "x-request-nonce": "invalid-nonce",
      },
      method: "GET",
      url: "/api/extension/asset?id=TV-001",
    },
  },
  {
    id: "track-success",
    expectedStatus: 200,
    label: "Track Success",
    request: {
      body: {
        browser: "Chrome",
        deviceId: "m11-allowed-primary",
        extensionVersion: "0.0.1",
        os: "macOS",
      },
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
      url: "/api/extension/track",
    },
  },
  {
    id: "track-different-identity",
    expectedStatus: 200,
    label: "Track Different Identity",
    request: {
      body: {
        browser: "Chrome",
        deviceId: "m11-allowed-secondary",
        extensionVersion: "0.0.1",
        os: "macOS",
      },
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
      url: "/api/extension/track",
    },
  },
  {
    id: "missing-extension-header",
    expectedStatus: 400,
    label: "Missing Extension Header",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
      },
      method: "GET",
      url: "/api/extension/session",
    },
  },
  {
    id: "denied-origin",
    expectedStatus: 403,
    label: "Denied Origin",
    request: {
      body: {
        browser: "Chrome",
        deviceId: "m11-denied-origin",
        extensionVersion: "0.0.1",
        os: "macOS",
      },
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://denied-id",
        "x-extension-id": "denied-id",
      },
      method: "POST",
      url: "/api/extension/track",
    },
  },
] as const;

export function ExtensionScenarioList(props: {
  history: ExtensionHarnessHistoryEntry[];
  onSelectScenario: (scenarioId: string) => void;
  selectedScenarioId: string;
}) {
  return (
    <aside className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div>
        <h2 className="font-semibold text-base">Scenarios</h2>
        <p className="text-muted-foreground text-sm">Pilih preset lalu jalankan request dari companion extension.</p>
      </div>

      <div className="space-y-2">
        {extensionHarnessScenarios.map((scenario) => (
          <Button
            key={scenario.id}
            className="w-full justify-start"
            onClick={() => props.onSelectScenario(scenario.id)}
            variant={props.selectedScenarioId === scenario.id ? "default" : "outline"}
          >
            {scenario.label}
          </Button>
        ))}
      </div>

      <div className="space-y-1 border-t border-border/60 pt-3 text-sm">
        <p className="font-medium">Recent runs</p>
        {props.history.slice(0, 3).map((entry) => (
          <p key={entry.id} className="text-muted-foreground">
            {entry.scenarioId} · {entry.summary} · {entry.status}
          </p>
        ))}
      </div>
    </aside>
  );
}
```

```tsx
// src/app/(extension-dev)/console/extension-harness/_components/extension-request-panel.tsx
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ExtensionRequestPanel(props: {
  connectionState: "waiting" | "ready";
  currentUser: { email: string; role: string; username: string };
  editorValue: string;
  onChangeEditorValue: (value: string) => void;
  onRunScenario: () => Promise<void>;
  scenario: { expectedStatus: number; id: string; label: string };
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
      <div className="space-y-1">
        <h2 className="font-semibold text-base">Request Editor</h2>
        <p className="text-muted-foreground text-sm">
          {props.currentUser.username} · {props.currentUser.email} · connection: {props.connectionState}
        </p>
      </div>

      <div className="rounded-lg bg-muted/40 p-3 text-sm">
        <p className="font-medium">Scenario: {props.scenario.label}</p>
        <p className="text-muted-foreground">Expected status: {props.scenario.expectedStatus}</p>
      </div>

      <Textarea
        className="min-h-72 font-mono text-xs"
        onChange={(event) => props.onChangeEditorValue(event.target.value)}
        value={props.editorValue}
      />

      <Button onClick={() => void props.onRunScenario()}>Run Scenario</Button>
    </section>
  );
}
```

```tsx
// src/app/(extension-dev)/console/extension-harness/_components/extension-response-viewer.tsx
import type { ExtensionHarnessHistoryEntry } from "./extension-harness-state";

export function ExtensionResponseViewer(props: {
  history: ExtensionHarnessHistoryEntry[];
  latestResponse: null | { body: unknown; status: number };
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
      <div>
        <h2 className="font-semibold text-base">Response Viewer</h2>
        <p className="text-muted-foreground text-sm">Raw response, status, dan history tersimpan di localStorage.</p>
      </div>

      <div className="rounded-lg bg-muted/40 p-3 text-sm">
        <p>Status: {props.latestResponse?.status ?? "-"}</p>
      </div>

      <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs">
        {JSON.stringify(props.latestResponse?.body ?? null, null, 2)}
      </pre>

      <div className="space-y-1 border-t border-border/60 pt-3 text-sm">
        <p className="font-medium">Response history</p>
        {props.history.map((entry) => (
          <p key={entry.id} className="text-muted-foreground">
            {entry.executedAt} · {entry.scenarioId} · {entry.summary} · {entry.status}
          </p>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Jalankan ulang test route dan state helper**

Run: `pnpm vitest run tests/unit/app/extension-harness/page.test.ts tests/unit/app/extension-harness/state.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit slice ini**

```bash
git add "src/app/(extension-dev)/console/extension-harness/page.tsx" "src/app/(extension-dev)/console/extension-harness/_components/extension-harness-shell.tsx" "src/app/(extension-dev)/console/extension-harness/_components/extension-harness-state.ts" "src/app/(extension-dev)/console/extension-harness/_components/extension-request-panel.tsx" "src/app/(extension-dev)/console/extension-harness/_components/extension-response-viewer.tsx" "src/app/(extension-dev)/console/extension-harness/_components/extension-scenario-list.tsx" tests/unit/app/extension-harness/page.test.ts tests/unit/app/extension-harness/state.test.ts
git commit -m "feat: add extension harness console"
```

## Task 6: Tambahkan companion Chrome dev extension variants dan README

**Files:**
- Create: `dev/extension-harness/allowed/manifest.json`
- Create: `dev/extension-harness/allowed/background.js`
- Create: `dev/extension-harness/allowed/content-script.js`
- Create: `dev/extension-harness/denied/manifest.json`
- Create: `dev/extension-harness/denied/background.js`
- Create: `dev/extension-harness/denied/content-script.js`
- Create: `dev/extension-harness/README.md`
- Test: `tests/unit/dev/extension-harness/manifests.test.ts`

- [ ] **Step 1: Tulis failing manifest test untuk varian `allowed` dan `denied`**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readManifest(variant: "allowed" | "denied") {
  return JSON.parse(
    readFileSync(join(process.cwd(), "dev", "extension-harness", variant, "manifest.json"), "utf8"),
  ) as {
    background: { service_worker: string };
    content_scripts: Array<{ js: string[]; matches: string[] }>;
    manifest_version: number;
    name: string;
  };
}

describe("extension harness manifests", () => {
  it("declares two installable Manifest V3 variants", () => {
    const allowed = readManifest("allowed");
    const denied = readManifest("denied");

    expect(allowed.manifest_version).toBe(3);
    expect(denied.manifest_version).toBe(3);
    expect(allowed.name).not.toBe(denied.name);
    expect(allowed.background.service_worker).toBe("background.js");
    expect(denied.background.service_worker).toBe("background.js");
  });

  it("limits content-script injection to the harness route", () => {
    const allowed = readManifest("allowed");

    expect(allowed.content_scripts[0]?.matches).toEqual([
      "http://localhost:3000/console/extension-harness*",
      "http://127.0.0.1:3000/console/extension-harness*",
    ]);
    expect(allowed.content_scripts[0]?.js).toEqual(["content-script.js"]);
  });
});
```

- [ ] **Step 2: Jalankan manifest test untuk memastikan masih gagal**

Run: `pnpm vitest run tests/unit/dev/extension-harness/manifests.test.ts`

Expected: FAIL karena folder dan manifest variants belum ada.

- [ ] **Step 3: Tambahkan dua varian extension dan bridge message passing minimal**

```json
// dev/extension-harness/allowed/manifest.json
{
  "manifest_version": 3,
  "name": "AssetNext Extension Harness (Allowed)",
  "version": "0.0.1",
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": [
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "http://localhost:3000/console/extension-harness*",
        "http://127.0.0.1:3000/console/extension-harness*"
      ],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ]
}
```

```json
// dev/extension-harness/denied/manifest.json
{
  "manifest_version": 3,
  "name": "AssetNext Extension Harness (Denied)",
  "version": "0.0.1",
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": [
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "http://localhost:3000/console/extension-harness*",
        "http://127.0.0.1:3000/console/extension-harness*"
      ],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ]
}
```

```js
// dev/extension-harness/allowed/background.js
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "assetnext-extension-harness:request") {
    return undefined;
  }

  fetch(message.payload.url, {
    method: message.payload.method,
    headers: message.payload.headers,
    body: message.payload.body ? JSON.stringify(message.payload.body) : undefined,
    credentials: "include",
  })
    .then(async (response) => {
      const text = await response.text();
      let body;

      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }

      sendResponse({
        body,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        status: response.status,
      });
    })
    .catch((error) => {
      sendResponse({
        body: {
          error: {
            code: "HARNESS_RUNTIME_ERROR",
            message: error instanceof Error ? error.message : "Unknown extension runtime error.",
          },
        },
        headers: {},
        ok: false,
        status: 0,
      });
    });

  return true;
});
```

```js
// dev/extension-harness/allowed/content-script.js
window.addEventListener("message", async (event) => {
  if (event.source !== window || event.data?.source !== "assetnext-extension-harness-page") {
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "assetnext-extension-harness:request",
    payload: event.data.payload,
  });

  window.postMessage(
    {
      source: "assetnext-extension-harness-extension",
      type: "result",
      response,
    },
    window.location.origin,
  );
});

window.postMessage(
  {
    extensionId: chrome.runtime.id,
    source: "assetnext-extension-harness-extension",
    type: "ready",
  },
  window.location.origin,
);
```

```js
// dev/extension-harness/denied/background.js
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "assetnext-extension-harness:request") {
    return undefined;
  }

  fetch(message.payload.url, {
    method: message.payload.method,
    headers: message.payload.headers,
    body: message.payload.body ? JSON.stringify(message.payload.body) : undefined,
    credentials: "include",
  })
    .then(async (response) => {
      const text = await response.text();
      let body;

      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }

      sendResponse({
        body,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        status: response.status,
      });
    })
    .catch((error) => {
      sendResponse({
        body: {
          error: {
            code: "HARNESS_RUNTIME_ERROR",
            message: error instanceof Error ? error.message : "Unknown extension runtime error.",
          },
        },
        headers: {},
        ok: false,
        status: 0,
      });
    });

  return true;
});
```

```js
// dev/extension-harness/denied/content-script.js
window.addEventListener("message", async (event) => {
  if (event.source !== window || event.data?.source !== "assetnext-extension-harness-page") {
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "assetnext-extension-harness:request",
    payload: event.data.payload,
  });

  window.postMessage(
    {
      source: "assetnext-extension-harness-extension",
      type: "result",
      response,
    },
    window.location.origin,
  );
});

window.postMessage(
  {
    extensionId: chrome.runtime.id,
    source: "assetnext-extension-harness-extension",
    type: "ready",
  },
  window.location.origin,
);
```

```md
<!-- dev/extension-harness/README.md -->
# Extension Harness Dev Variants

## Allowed variant
- Load `dev/extension-harness/allowed/`
- Salin `chrome.runtime.id` yang muncul di browser ke env `EXTENSION_ALLOWED_IDS`
- Pastikan `EXTENSION_ALLOWED_ORIGINS` memuat `chrome-extension://<allowed-id>`

## Denied variant
- Load `dev/extension-harness/denied/`
- Jangan tambahkan ID atau origin variant ini ke allowlist runtime

## Fixed scenario device IDs
- `m11-allowed-primary`
- `m11-allowed-secondary`
- `m11-denied-origin`
```

- [ ] **Step 4: Jalankan ulang manifest test**

Run: `pnpm vitest run tests/unit/dev/extension-harness/manifests.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit slice ini**

```bash
git add dev/extension-harness/allowed/manifest.json dev/extension-harness/allowed/background.js dev/extension-harness/allowed/content-script.js dev/extension-harness/denied/manifest.json dev/extension-harness/denied/background.js dev/extension-harness/denied/content-script.js dev/extension-harness/README.md tests/unit/dev/extension-harness/manifests.test.ts
git commit -m "feat: add extension harness companion variants"
```

## Task 7: Jalankan quality gates, browser proof, dan backend verification

**Files:**
- Modify: working tree verification only

- [ ] **Step 1: Jalankan targeted test suite untuk semua slice M11**

Run:

```bash
pnpm vitest run \
  tests/unit/lib/cookies.test.ts \
  tests/unit/lib/extension-api/errors.test.ts \
  tests/unit/modules/extension/schemas.test.ts \
  tests/unit/modules/extension/queries.test.ts \
  tests/unit/modules/extension/services.test.ts \
  tests/unit/app/api/extension/route-handlers.test.ts \
  tests/unit/app/extension-harness/page.test.ts \
  tests/unit/app/extension-harness/state.test.ts \
  tests/unit/dev/extension-harness/manifests.test.ts
```

Expected: PASS.

- [ ] **Step 2: Jalankan repo quality gates penuh**

Run:

```bash
pnpm check:fix
pnpm lint
pnpm typecheck
pnpm test
```

Expected: semua PASS tanpa error relevan.

- [ ] **Step 3: Jalankan dev server dan verifikasi runtime Next.js**

Run: `pnpm dev`

Expected: dev server hidup tanpa compilation error.

Setelah server hidup:

- gunakan Next.js DevTools MCP untuk memastikan tidak ada runtime atau compilation error relevan di route baru
- cek `.next/dev/logs/*.log` dan pastikan tidak ada error relevan dari route extension atau harness

- [ ] **Step 4: Jalankan browser proof Milestone 11 via `agent-browser`**

Checklist browser yang wajib dijalankan dari browser profile yang sama dengan companion extension:

- login sebagai `seed.active.browser@assetnext.dev` lalu jalankan `Session Success`
- login sebagai `seed.processed.browser@assetnext.dev` lalu jalankan `Session Processed`
- jalankan `Asset Success` memakai nonce dari response session
- jalankan `Asset Missing Nonce`
- jalankan `Asset Invalid Nonce`
- ulang template `Asset Success` setelah nonce dibiarkan lewat 60 detik untuk membuktikan `NONCE_INVALID`
- jalankan `Track Success` dengan `deviceId = "m11-allowed-primary"`
- jalankan `Track Different Identity` dengan `deviceId = "m11-allowed-secondary"`
- jalankan `Missing Extension Header`
- aktifkan companion variant `denied`, lalu jalankan `Denied Origin` dengan `deviceId = "m11-denied-origin"`
- logout lalu ulang template `Session Success` untuk membuktikan `SESSION_MISSING`
- login di browser profile kedua untuk akun yang sama, lalu ulang request dari profile pertama untuk membuktikan `SESSION_REVOKED`
- login sebagai akun seed `expired`, `canceled`, dan `none` lalu pastikan `SUBSCRIPTION_EXPIRED`
- ban satu user test lalu pastikan `USER_BANNED`
- buka `/admin/userlogs` dan pastikan heartbeat yang sukses muncul di tab `Extension Track`

Expected: semua skenario mengembalikan status dan kode error yang sesuai plan/spec.

- [ ] **Step 5: Jalankan backend verification read-only via InsForge CLI**

Run:

```bash
npx @insforge/cli whoami
npx @insforge/cli current
npx @insforge/cli db query "select p.email, s.id, s.revoked_at, s.last_seen_at, s.created_at from public.app_sessions s join public.profiles p on p.user_id = s.user_id where p.email = 'seed.active.browser@assetnext.dev' order by s.created_at desc" --json
npx @insforge/cli db query "select public.get_user_console_snapshot((select user_id from public.profiles where email = 'seed.active.browser@assetnext.dev')) as snapshot" --json
npx @insforge/cli db query "select p.email, et.extension_id, et.device_id, et.session_id, et.extension_version, et.ip_address, et.city, et.country, et.browser, et.os, et.first_seen_at, et.last_seen_at from public.extension_tracks et join public.profiles p on p.user_id = et.user_id where p.email = 'seed.active.browser@assetnext.dev' and et.device_id in ('m11-allowed-primary', 'm11-allowed-secondary', 'm11-denied-origin') order by et.last_seen_at desc" --json
```

Expected:

- `whoami` dan `current` menunjuk project runtime yang benar
- session lama yang direvoke tetap tercatat tetapi tidak lagi aktif
- snapshot console tetap hanya memuat asset valid
- `extension_tracks` menunjukkan row update untuk `m11-allowed-primary`
- `extension_tracks` menunjukkan row baru untuk `m11-allowed-secondary`
- tidak ada row baru untuk `m11-denied-origin` karena request `Denied Origin` harus ditolak sebelum write path berjalan

- [ ] **Step 6: Commit hasil akhir setelah semua gate hijau**

```bash
git add src/lib/cookies.ts src/lib/extension-api/errors.ts src/modules/extension/types.ts src/modules/extension/schemas.ts src/modules/extension/repositories.ts src/modules/extension/queries.ts src/modules/extension/services.ts src/app/api/extension/session/route.ts src/app/api/extension/asset/route.ts src/app/api/extension/track/route.ts "src/app/(extension-dev)/console/extension-harness/page.tsx" "src/app/(extension-dev)/console/extension-harness/_components/extension-harness-shell.tsx" "src/app/(extension-dev)/console/extension-harness/_components/extension-harness-state.ts" "src/app/(extension-dev)/console/extension-harness/_components/extension-request-panel.tsx" "src/app/(extension-dev)/console/extension-harness/_components/extension-response-viewer.tsx" "src/app/(extension-dev)/console/extension-harness/_components/extension-scenario-list.tsx" dev/extension-harness/allowed/manifest.json dev/extension-harness/allowed/background.js dev/extension-harness/allowed/content-script.js dev/extension-harness/denied/manifest.json dev/extension-harness/denied/background.js dev/extension-harness/denied/content-script.js dev/extension-harness/README.md tests/unit/lib/cookies.test.ts tests/unit/lib/extension-api/errors.test.ts tests/unit/modules/extension/schemas.test.ts tests/unit/modules/extension/queries.test.ts tests/unit/modules/extension/services.test.ts tests/unit/app/api/extension/route-handlers.test.ts tests/unit/app/extension-harness/page.test.ts tests/unit/app/extension-harness/state.test.ts tests/unit/dev/extension-harness/manifests.test.ts
git commit -m "feat: add extension API verification flow"
```

## Self-Review Notes

### Spec coverage
- `/api/extension/session` tercakup di Task 2, Task 3, Task 4, dan Task 7.
- `/api/extension/asset` tercakup di Task 2, Task 3, Task 4, dan Task 7.
- `/api/extension/track` tercakup di Task 3, Task 4, Task 6, dan Task 7.
- hybrid harness route + companion extension tercakup di Task 5, Task 6, dan Task 7.
- `Origin`, `x-extension-id`, `app_session`, `requestNonce`, banned state, subscription state, dan standard error response tercakup di Task 1, Task 3, Task 4, dan Task 7.
- backend verification via `npx @insforge/cli` tercakup di Task 7.

### Placeholder scan
- tidak ada placeholder dinamis yang menggantung
- query CLI memakai email seed dan `deviceId` deterministik, bukan placeholder UUID bebas

### Type consistency
- `requestNonce` selalu memakai `value` dan `expiresAt`
- response asset selalu memakai `accessKey`, `assetType`, `platform`, `expiresAt`, `account`, `proxy`, `note`, `asset`
- history harness memakai key storage tetap `console.extension-harness.history.v1`
