# Extension Real v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah `asset-ext/` dari template demo menjadi extension runtime nyata yang memakai endpoint Milestone 11 untuk bootstrap session, asset detail, heartbeat, dan logout sinkron dengan web app.

**Architecture:** Next.js tetap menjadi source of truth untuk auth, session, nonce, asset access, dan logout melalui route handler tipis di `/api/extension/*`. Di `asset-ext/`, popup dan options page menjadi presentation layer yang berbagi state lewat `chrome.storage.local`, sementara background service worker mengorkestrasi fetch, heartbeat `chrome.alarms`, dan lifecycle nonce.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Vitest, React 19, Vite + CRXJS Manifest V3, Chrome extension APIs (`storage`, `alarms`), Tailwind CSS, `pnpm`, agent-browser/manual browser verification.

---

## File Map

- Create: `src/app/api/extension/logout/route.ts`
- Create: `asset-ext/vitest.config.ts`
- Create: `asset-ext/src/test/setup.ts`
- Create: `asset-ext/lib/runtime/contracts.ts`
- Create: `asset-ext/lib/runtime/types.ts`
- Create: `asset-ext/lib/runtime/messages.ts`
- Create: `asset-ext/lib/storage/extension-cache.ts`
- Create: `asset-ext/lib/extension-api/client.ts`
- Create: `asset-ext/lib/runtime/background-controller.ts`
- Create: `asset-ext/lib/components/extension/extension-session-panels.tsx`
- Create: `asset-ext/lib/runtime/contracts.test.ts`
- Create: `asset-ext/lib/runtime/manifest.test.ts`
- Create: `asset-ext/lib/storage/extension-cache.test.ts`
- Create: `asset-ext/lib/extension-api/client.test.ts`
- Create: `asset-ext/lib/runtime/background-controller.test.ts`
- Create: `asset-ext/src/App.test.tsx`
- Create: `asset-ext/src/options.test.tsx`
- Modify: `src/modules/extension/types.ts`
- Modify: `src/modules/extension/services.ts`
- Modify: `tests/unit/modules/extension/services.test.ts`
- Modify: `tests/unit/app/api/extension/route-handlers.test.ts`
- Modify: `asset-ext/package.json`
- Modify: `asset-ext/manifest.json`
- Modify: `asset-ext/src/background.ts`
- Modify: `asset-ext/src/App.tsx`
- Modify: `asset-ext/src/options.tsx`
- Modify: `asset-ext/README.md`
- Delete: `asset-ext/package-lock.json`
- Delete: `asset-ext/tests/preflight-isolation.spec.ts`

## Task 1: Refine Next.js Extension Bootstrap Contract And Add Logout Route

**Files:**
- Create: `src/app/api/extension/logout/route.ts`
- Modify: `src/modules/extension/types.ts`
- Modify: `src/modules/extension/services.ts`
- Test: `tests/unit/modules/extension/services.test.ts`
- Test: `tests/unit/app/api/extension/route-handlers.test.ts`

- [ ] **Step 1: Write the failing unit tests for session bootstrap, heartbeat without asset access, and logout route**

```ts
// tests/unit/modules/extension/services.test.ts
// Add the new hoisted mocks below the existing mock declarations, then append these cases
// to the current describe("extension services", ...) block.
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

const consoleQueryMocks = vi.hoisted(() => ({
  getConsoleStateSnapshot: vi.fn(),
}));

const extensionRepositoryMocks = vi.hoisted(() => ({
  upsertExtensionTrackHeartbeat: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  createSessionBoundRequestNonce: vi.fn(),
  revokeActiveAppSession: vi.fn(),
  touchActiveAppSessionLastSeen: vi.fn(),
  validateActiveAppSession: vi.fn(),
  verifySessionBoundRequestNonce: vi.fn(),
}));

vi.mock("@/config/env.server", () => ({
  env: {
    EXTENSION_ALLOWED_IDS: ["allowed-id"],
    EXTENSION_ALLOWED_ORIGINS: ["chrome-extension://allowed-id"],
    TRUSTED_PROXY_CITY_HEADER: "x-vercel-ip-city",
    TRUSTED_PROXY_COUNTRY_HEADER: "x-vercel-ip-country",
    TRUSTED_PROXY_IP_HEADER: "x-forwarded-for",
  },
}));

vi.mock("@/lib/cookies", () => ({
  readAppSessionCookie: cookieMocks.readAppSessionCookie,
}));

vi.mock("@/modules/auth/repositories", () => ({
  readProfileByUserId: authRepositoryMocks.readProfileByUserId,
}));

vi.mock("@/modules/console/queries", () => ({
  getConsoleStateSnapshot: consoleQueryMocks.getConsoleStateSnapshot,
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
    revokeActiveAppSession: sessionServiceMocks.revokeActiveAppSession,
    touchActiveAppSessionLastSeen: sessionServiceMocks.touchActiveAppSessionLastSeen,
    validateActiveAppSession: sessionServiceMocks.validateActiveAppSession,
    verifySessionBoundRequestNonce: sessionServiceMocks.verifySessionBoundRequestNonce,
  };
});

describe("extension services bootstrap contract", () => {
  beforeEach(() => {
    cookieMocks.readAppSessionCookie.mockReset();
    authRepositoryMocks.readProfileByUserId.mockReset();
    consoleQueryMocks.getConsoleStateSnapshot.mockReset();
    extensionQueryMocks.doesExtensionAssetExist.mockReset();
    extensionQueryMocks.getExtensionAssetDetailForUser.mockReset();
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockReset();
    extensionRepositoryMocks.upsertExtensionTrackHeartbeat.mockReset();
    sessionServiceMocks.createSessionBoundRequestNonce.mockReset();
    sessionServiceMocks.revokeActiveAppSession.mockReset();
    sessionServiceMocks.touchActiveAppSessionLastSeen.mockReset();
    sessionServiceMocks.validateActiveAppSession.mockReset();
    sessionServiceMocks.verifySessionBoundRequestNonce.mockReset();
  });

  it("returns user identity plus a 'none' subscription summary without issuing requestNonce", async () => {
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
      assets: [],
      subscription: null,
    });
    consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({
      latestSubscription: null,
      state: "none",
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
      subscription: {
        assets: [],
        daysLeft: null,
        endAt: null,
        packageName: null,
        status: "none",
      },
      user: {
        email: "seed.none.browser@assetnext.dev",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        publicId: "MEM-001",
        username: "seed-none-browser",
      },
    });

    expect(sessionServiceMocks.createSessionBoundRequestNonce).not.toHaveBeenCalled();
  });

  it("still records heartbeat for a logged-in user whose subscription is expired", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.expired.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-404",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-expired-browser",
    });
    extensionRepositoryMocks.upsertExtensionTrackHeartbeat.mockResolvedValue({
      firstSeenAt: "2026-04-22T09:00:00.000Z",
      id: "track-1",
      lastSeenAt: "2026-04-22T09:00:00.000Z",
    });

    const { createExtensionTrackResponse } = await import("@/modules/extension/services");

    await expect(
      createExtensionTrackResponse({
        heartbeat: {
          browser: "Chrome",
          deviceId: "assetku-device-1",
          extensionVersion: "0.1.0",
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
  });

  it("revokes the current web session through the extension logout service", async () => {
    sessionServiceMocks.revokeActiveAppSession.mockResolvedValue(1);

    const { createExtensionLogoutResponse } = await import("@/modules/extension/services");

    await expect(
      createExtensionLogoutResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      redirectTo: "/login",
      success: true,
    });
  });
});
```

```ts
// tests/unit/app/api/extension/route-handlers.test.ts
// Extend the existing mocked service module and append the new logout/bootstrap tests
// without removing the current asset and track assertions.
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/extension/services", () => ({
  createExtensionLogoutResponse: vi.fn(),
  createExtensionTrackResponse: vi.fn(),
  getExtensionAssetResponse: vi.fn(),
  getExtensionSessionResponse: vi.fn(),
}));

import { GET as getExtensionAsset } from "@/app/api/extension/asset/route";
import { POST as postExtensionLogout } from "@/app/api/extension/logout/route";
import { GET as getExtensionSession } from "@/app/api/extension/session/route";
import { POST as postExtensionTrack } from "@/app/api/extension/track/route";
import { ExtensionApiError } from "@/lib/extension-api/errors";
import {
  createExtensionLogoutResponse,
  createExtensionTrackResponse,
  getExtensionAssetResponse,
  getExtensionSessionResponse,
} from "@/modules/extension/services";

const mockedGetExtensionSessionResponse = vi.mocked(getExtensionSessionResponse);
const mockedGetExtensionAssetResponse = vi.mocked(getExtensionAssetResponse);
const mockedCreateExtensionTrackResponse = vi.mocked(createExtensionTrackResponse);
const mockedCreateExtensionLogoutResponse = vi.mocked(createExtensionLogoutResponse);

describe("extension route handlers", () => {
  it("returns the bootstrap session payload with extended user fields", async () => {
    mockedGetExtensionSessionResponse.mockResolvedValue({
      subscription: {
        assets: [],
        daysLeft: null,
        endAt: null,
        packageName: null,
        status: "none",
      },
      user: {
        email: "seed.none.browser@assetnext.dev",
        id: "user-1",
        publicId: "MEM-001",
        username: "seed-none-browser",
      },
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
      subscription: {
        assets: [],
        daysLeft: null,
        endAt: null,
        packageName: null,
        status: "none",
      },
      user: {
        email: "seed.none.browser@assetnext.dev",
        id: "user-1",
        publicId: "MEM-001",
        username: "seed-none-browser",
      },
    });
  });

  it("returns the extension logout payload", async () => {
    mockedCreateExtensionLogoutResponse.mockResolvedValue({
      redirectTo: "/login",
      success: true,
    });

    const response = await postExtensionLogout(
      new Request("http://localhost/api/extension/logout", {
        method: "POST",
        headers: {
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      redirectTo: "/login",
      success: true,
    });
  });
});
```

- [ ] **Step 2: Run the targeted root tests to verify they fail on the current contract**

Run: `pnpm vitest run tests/unit/modules/extension/services.test.ts tests/unit/app/api/extension/route-handlers.test.ts`

Expected: FAIL because `getExtensionSessionResponse()` still throws `SUBSCRIPTION_EXPIRED` for `subscription: null`, `createExtensionTrackResponse()` still requires subscription access, `createExtensionLogoutResponse()` and `POST /api/extension/logout` do not exist, and the session payload does not include `email`/`publicId`.

- [ ] **Step 3: Implement the minimal Next.js contract refinement and idempotent extension logout route**

```ts
// src/modules/extension/types.ts
export type ExtensionSubscriptionStatus = "none" | "active" | "processed" | "expired" | "canceled";

export type ExtensionSessionResponse = {
  requestNonce?: {
    expiresAt: string;
    value: string;
  };
  subscription: {
    assets: Array<{
      accessKey: string;
      assetType: "private" | "share";
      expiresAt: string;
      id: string;
      platform: "tradingview" | "fxreplay" | "fxtester";
    }>;
    daysLeft: number | null;
    endAt: string | null;
    packageName: string | null;
    status: ExtensionSubscriptionStatus;
  };
  user: {
    email: string;
    id: string;
    publicId: string;
    username: string;
  };
};
```

```ts
// src/modules/extension/services.ts
import { getConsoleStateSnapshot } from "@/modules/console/queries";
import {
  createSessionBoundRequestNonce,
  revokeActiveAppSession,
  touchActiveAppSessionLastSeen,
  validateActiveAppSession,
  verifySessionBoundRequestNonce,
} from "@/modules/sessions/services";

function hasExtensionAssetAccess(status: "none" | "active" | "processed" | "expired" | "canceled") {
  return status === "active" || status === "processed";
}

async function requireAuthenticatedExtensionContext(requestHeaders: Headers) {
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

  return {
    extensionRequest,
    profile,
    session: activeSession,
  };
}

async function buildExtensionSubscriptionSummary(userId: string) {
  const [snapshot, stateSnapshot] = await Promise.all([
    getExtensionConsoleSnapshotForUser({ userId }),
    getConsoleStateSnapshot({ userId }),
  ]);

  if (stateSnapshot.state === "active" || stateSnapshot.state === "processed") {
    return {
      assets: snapshot.assets,
      daysLeft: snapshot.subscription?.daysLeft ?? null,
      endAt: snapshot.subscription?.endAt ?? stateSnapshot.latestSubscription?.endAt ?? null,
      packageName: snapshot.subscription?.packageName ?? stateSnapshot.latestSubscription?.packageName ?? null,
      status: stateSnapshot.state,
    };
  }

  return {
    assets: [],
    daysLeft: stateSnapshot.latestSubscription ? 0 : null,
    endAt: stateSnapshot.latestSubscription?.endAt ?? null,
    packageName: stateSnapshot.latestSubscription?.packageName ?? null,
    status: stateSnapshot.state,
  };
}

export async function getExtensionSessionResponse(input: { requestHeaders: Headers }) {
  const context = await requireAuthenticatedExtensionContext(input.requestHeaders);
  const subscription = await buildExtensionSubscriptionSummary(context.session.userId);
  await touchActiveAppSessionLastSeen();

  const requestNonce = hasExtensionAssetAccess(subscription.status)
    ? await createSessionBoundRequestNonce({
        sessionId: context.session.sessionId,
        userId: context.session.userId,
      })
    : undefined;

  return {
    ...(requestNonce ? { requestNonce } : {}),
    subscription,
    user: {
      email: context.profile.email,
      id: context.session.userId,
      publicId: context.profile.publicId,
      username: context.profile.username,
    },
  };
}

export async function createExtensionTrackResponse(input: { heartbeat: unknown; requestHeaders: Headers }) {
  const context = await requireAuthenticatedExtensionContext(input.requestHeaders);
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

  await revokeActiveAppSession();

  return {
    redirectTo: "/login" as const,
    success: true as const,
  };
}
```

```ts
// src/app/api/extension/logout/route.ts
import { buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";
import { createExtensionLogoutResponse } from "@/modules/extension/services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await createExtensionLogoutResponse({
      requestHeaders: request.headers,
    });

    return Response.json(payload);
  } catch (error) {
    return buildExtensionApiErrorResponse(error);
  }
}
```

- [ ] **Step 4: Run the targeted root tests again**

Run: `pnpm vitest run tests/unit/modules/extension/services.test.ts tests/unit/app/api/extension/route-handlers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the Next.js contract slice**

```bash
git add src/app/api/extension/logout/route.ts src/modules/extension/types.ts src/modules/extension/services.ts tests/unit/modules/extension/services.test.ts tests/unit/app/api/extension/route-handlers.test.ts
git commit -m "feat: refine extension bootstrap contract"
```

## Task 2: Align `asset-ext/` Tooling, Manifest, And Runtime Contracts

**Files:**
- Create: `asset-ext/vitest.config.ts`
- Create: `asset-ext/src/test/setup.ts`
- Create: `asset-ext/lib/runtime/contracts.ts`
- Create: `asset-ext/lib/runtime/types.ts`
- Create: `asset-ext/lib/runtime/contracts.test.ts`
- Create: `asset-ext/lib/runtime/manifest.test.ts`
- Modify: `asset-ext/package.json`
- Modify: `asset-ext/manifest.json`
- Delete: `asset-ext/package-lock.json`
- Delete: `asset-ext/tests/preflight-isolation.spec.ts`

- [ ] **Step 1: Write the failing unit tests for runtime constants and manifest permissions**

```ts
// asset-ext/lib/runtime/contracts.test.ts
import { describe, expect, it } from "vitest";

import {
  APP_ORIGIN,
  EXTENSION_API_URLS,
  HEARTBEAT_ALARM_NAME,
  NONCE_EXPIRY_SKEW_MS,
  POPUP_REVALIDATE_INTERVAL_MS,
} from "@lib/runtime/contracts";

describe("extension runtime contracts", () => {
  it("locks all extension endpoints to the local Next.js app origin", () => {
    expect(APP_ORIGIN).toBe("http://localhost:3000");
    expect(EXTENSION_API_URLS.session).toBe("http://localhost:3000/api/extension/session");
    expect(EXTENSION_API_URLS.track).toBe("http://localhost:3000/api/extension/track");
    expect(EXTENSION_API_URLS.logout).toBe("http://localhost:3000/api/extension/logout");
    expect(EXTENSION_API_URLS.asset("TV-001")).toBe(
      "http://localhost:3000/api/extension/asset?id=TV-001",
    );
  });

  it("uses explicit runtime timing constants for popup refresh and nonce safety", () => {
    expect(POPUP_REVALIDATE_INTERVAL_MS).toBe(5000);
    expect(NONCE_EXPIRY_SKEW_MS).toBe(5000);
    expect(HEARTBEAT_ALARM_NAME).toBe("assetku-heartbeat");
  });
});
```

```ts
// asset-ext/lib/runtime/manifest.test.ts
import { describe, expect, it } from "vitest";

import manifest from "../../manifest.json";

describe("extension manifest", () => {
  it("requests only the permissions needed for runtime extension flows", () => {
    expect(manifest.permissions).toEqual(["storage", "alarms"]);
    expect(manifest.host_permissions).toEqual(["http://localhost:3000/*"]);
  });

  it("removes the template content script and activeTab demo surface", () => {
    expect(manifest).not.toHaveProperty("content_scripts");
    expect(manifest.permissions).not.toContain("activeTab");
  });
});
```

- [ ] **Step 2: Run the asset extension tests to verify the current template still fails this contract**

Run: `pnpm --dir asset-ext exec vitest run lib/runtime/contracts.test.ts lib/runtime/manifest.test.ts`

Expected: FAIL because Vitest is not configured yet, `@lib/runtime/contracts` and `@lib/runtime/types` do not exist, the manifest still uses `activeTab`, and the template still injects a content script.

- [ ] **Step 3: Implement the test harness, runtime contracts, and manifest cleanup with `pnpm` only**

Run: `pnpm --dir asset-ext add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

```json
// asset-ext/package.json
{
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint . --max-warnings=0",
    "preview": "vite preview",
    "setup": "node scripts/setup.js",
    "test": "vitest run",
    "test:e2e": "playwright test --pass-with-no-tests"
  }
}
```

```ts
// asset-ext/vitest.config.ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@lib": resolve(__dirname, "./lib"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

```ts
// asset-ext/src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

```ts
// asset-ext/lib/runtime/contracts.ts
export const APP_ORIGIN = "http://localhost:3000";

export const EXTENSION_API_URLS = {
  asset: (assetId: string) => `${APP_ORIGIN}/api/extension/asset?id=${encodeURIComponent(assetId)}`,
  logout: `${APP_ORIGIN}/api/extension/logout`,
  session: `${APP_ORIGIN}/api/extension/session`,
  track: `${APP_ORIGIN}/api/extension/track`,
} as const;

export const HEARTBEAT_ALARM_NAME = "assetku-heartbeat";
export const POPUP_REVALIDATE_INTERVAL_MS = 5_000;
export const NONCE_EXPIRY_SKEW_MS = 5_000;
export const STORAGE_KEYS = {
  runtimeCache: "assetku.runtime-cache",
} as const;
```

```ts
// asset-ext/lib/runtime/types.ts
export type ExtensionSubscriptionStatus = "none" | "active" | "processed" | "expired" | "canceled";

export type ExtensionSessionAsset = {
  accessKey: string;
  assetType: "private" | "share";
  expiresAt: string;
  id: string;
  platform: "tradingview" | "fxreplay" | "fxtester";
};

export type ExtensionSessionSnapshot = {
  requestNonce?: {
    expiresAt: string;
    value: string;
  };
  subscription: {
    assets: ExtensionSessionAsset[];
    daysLeft: number | null;
    endAt: string | null;
    packageName: string | null;
    status: ExtensionSubscriptionStatus;
  };
  user: {
    email: string;
    id: string;
    publicId: string;
    username: string;
  };
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
};

export type ExtensionRuntimeCache = {
  lastError: string | null;
  lastHeartbeatAt: string | null;
  lastSyncedAt: string | null;
  selectedAsset: ExtensionAssetDetail | null;
  session: ExtensionSessionSnapshot | null;
};
```

```json
// asset-ext/manifest.json
{
  "manifest_version": 3,
  "name": "Assetku",
  "description": "Runtime extension for Assetku subscription access",
  "version": "0.1.0",
  "action": {
    "default_title": "Open popup",
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "permissions": ["storage", "alarms"],
  "host_permissions": ["http://localhost:3000/*"],
  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  }
}
```

- [ ] **Step 4: Run the asset extension tests and build after the foundation slice lands**

Run:
- `pnpm --dir asset-ext test -- lib/runtime/contracts.test.ts lib/runtime/manifest.test.ts`
- `pnpm --dir asset-ext build`

Expected: PASS. `asset-ext/dist` builds without referencing the deleted preflight/content-script demo flow.

- [ ] **Step 5: Commit the `asset-ext` foundation slice**

```bash
git add asset-ext/package.json asset-ext/manifest.json asset-ext/vitest.config.ts asset-ext/src/test/setup.ts asset-ext/lib/runtime/contracts.ts asset-ext/lib/runtime/types.ts asset-ext/lib/runtime/contracts.test.ts asset-ext/lib/runtime/manifest.test.ts
git rm asset-ext/package-lock.json asset-ext/tests/preflight-isolation.spec.ts
git commit -m "chore: align asset extension runtime foundation"
```

## Task 3: Add Shared Extension API Client And Persistent Runtime Cache

**Files:**
- Create: `asset-ext/lib/storage/extension-cache.ts`
- Create: `asset-ext/lib/extension-api/client.ts`
- Create: `asset-ext/lib/storage/extension-cache.test.ts`
- Create: `asset-ext/lib/extension-api/client.test.ts`

- [ ] **Step 1: Write failing unit tests for storage persistence and API transport headers**

```ts
// asset-ext/lib/storage/extension-cache.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@lib/runtime/contracts";

const storageState: Record<string, unknown> = {};

beforeEach(() => {
  for (const key of Object.keys(storageState)) {
    delete storageState[key];
  }

  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn((keys: string[], callback: (value: Record<string, unknown>) => void) => {
          callback({ [keys[0]]: storageState[keys[0]] });
        }),
        remove: vi.fn((key: string, callback?: () => void) => {
          delete storageState[key];
          callback?.();
        }),
        set: vi.fn((value: Record<string, unknown>, callback?: () => void) => {
          Object.assign(storageState, value);
          callback?.();
        }),
      },
    },
  });
});

describe("extension runtime cache", () => {
  it("returns an empty cache shape when storage is still blank", async () => {
    const { DEFAULT_RUNTIME_CACHE, readRuntimeCache } = await import("@lib/storage/extension-cache");

    await expect(readRuntimeCache()).resolves.toEqual(DEFAULT_RUNTIME_CACHE);
  });

  it("persists session and selected asset details under a single storage key", async () => {
    const { patchRuntimeCache, readRuntimeCache } = await import("@lib/storage/extension-cache");

    await patchRuntimeCache({
      lastSyncedAt: "2026-04-22T09:00:00.000Z",
      session: {
        subscription: {
          assets: [],
          daysLeft: null,
          endAt: null,
          packageName: null,
          status: "none",
        },
        user: {
          email: "seed.none.browser@assetnext.dev",
          id: "user-1",
          publicId: "MEM-001",
          username: "seed-none-browser",
        },
      },
    });

    await expect(readRuntimeCache()).resolves.toMatchObject({
      lastSyncedAt: "2026-04-22T09:00:00.000Z",
      session: {
        user: {
          email: "seed.none.browser@assetnext.dev",
        },
      },
    });

    expect(storageState[STORAGE_KEYS.runtimeCache]).toBeDefined();
  });
});
```

```ts
// asset-ext/lib/extension-api/client.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.stubGlobal("chrome", {
    runtime: {
      id: "allowed-id",
    },
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          subscription: {
            assets: [],
            daysLeft: null,
            endAt: null,
            packageName: null,
            status: "none",
          },
          user: {
            email: "seed.none.browser@assetnext.dev",
            id: "user-1",
            publicId: "MEM-001",
            username: "seed-none-browser",
          },
        }),
        { status: 200 },
      ),
    ),
  );
});

describe("extension api client", () => {
  it("sends credentials and x-extension-id when reading the bootstrap session", async () => {
    const { getExtensionSession } = await import("@lib/extension-api/client");

    await getExtensionSession();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/extension/session",
      expect.objectContaining({
        credentials: "include",
        headers: expect.any(Headers),
      }),
    );

    const requestInit = vi.mocked(fetch).mock.calls[0]?.[1];
    const headers = requestInit?.headers as Headers;
    expect(headers.get("x-extension-id")).toBe("allowed-id");
  });

  it("adds x-request-nonce when reading asset detail", async () => {
    const { getExtensionAssetDetail } = await import("@lib/extension-api/client");

    await getExtensionAssetDetail({
      assetId: "TV-001",
      requestNonce: "nonce-1",
    });

    const requestInit = vi.mocked(fetch).mock.calls[0]?.[1];
    const headers = requestInit?.headers as Headers;
    expect(headers.get("x-request-nonce")).toBe("nonce-1");
  });
});
```

- [ ] **Step 2: Run the targeted asset extension tests to confirm the shared runtime files are still missing**

Run: `pnpm --dir asset-ext test -- lib/storage/extension-cache.test.ts lib/extension-api/client.test.ts`

Expected: FAIL because `@lib/storage/extension-cache` and `@lib/extension-api/client` do not exist yet.

- [ ] **Step 3: Implement the cache layer and the HTTP client with explicit error mapping**

```ts
// asset-ext/lib/storage/extension-cache.ts
import { STORAGE_KEYS } from "@lib/runtime/contracts";
import type { ExtensionRuntimeCache } from "@lib/runtime/types";

export const DEFAULT_RUNTIME_CACHE: ExtensionRuntimeCache = {
  lastError: null,
  lastHeartbeatAt: null,
  lastSyncedAt: null,
  selectedAsset: null,
  session: null,
};

function readStorageValue<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key] as T | undefined));
  });
}

function writeStorageValue(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

export async function readRuntimeCache() {
  return (await readStorageValue<ExtensionRuntimeCache>(STORAGE_KEYS.runtimeCache)) ?? DEFAULT_RUNTIME_CACHE;
}

export async function patchRuntimeCache(partial: Partial<ExtensionRuntimeCache>) {
  const nextCache = {
    ...(await readRuntimeCache()),
    ...partial,
  } satisfies ExtensionRuntimeCache;

  await writeStorageValue(STORAGE_KEYS.runtimeCache, nextCache);
  return nextCache;
}

export async function clearRuntimeCache() {
  await new Promise<void>((resolve) => {
    chrome.storage.local.remove(STORAGE_KEYS.runtimeCache, () => resolve());
  });

  return DEFAULT_RUNTIME_CACHE;
}
```

```ts
// asset-ext/lib/extension-api/client.ts
import { EXTENSION_API_URLS } from "@lib/runtime/contracts";
import type { ExtensionAssetDetail, ExtensionSessionSnapshot } from "@lib/runtime/types";

export class ExtensionClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ExtensionClientError";
  }
}

function createRequestHeaders(extra: Record<string, string> = {}) {
  const headers = new Headers(extra);
  headers.set("x-extension-id", chrome.runtime.id);
  return headers;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as
    | T
    | {
        error?: {
          code?: string;
          message?: string;
        };
      };

  if (!response.ok) {
    throw new ExtensionClientError(
      (body as { error?: { code?: string } }).error?.code ?? "REQUEST_FAILED",
      (body as { error?: { message?: string } }).error?.message ?? "Extension request failed.",
      response.status,
    );
  }

  return body as T;
}

export async function getExtensionSession() {
  return parseJsonResponse<ExtensionSessionSnapshot>(
    await fetch(EXTENSION_API_URLS.session, {
      credentials: "include",
      headers: createRequestHeaders(),
    }),
  );
}

export async function getExtensionAssetDetail(input: { assetId: string; requestNonce: string }) {
  return parseJsonResponse<ExtensionAssetDetail>(
    await fetch(EXTENSION_API_URLS.asset(input.assetId), {
      credentials: "include",
      headers: createRequestHeaders({
        "x-request-nonce": input.requestNonce,
      }),
    }),
  );
}

export async function postExtensionTrack(heartbeat: {
  browser: string | null;
  deviceId: string;
  extensionVersion: string;
  os: string | null;
}) {
  return parseJsonResponse<{ success: true; timestamp: string }>(
    await fetch(EXTENSION_API_URLS.track, {
      method: "POST",
      credentials: "include",
      headers: createRequestHeaders({
        "content-type": "application/json",
      }),
      body: JSON.stringify(heartbeat),
    }),
  );
}

export async function postExtensionLogout() {
  return parseJsonResponse<{ redirectTo: "/login"; success: true }>(
    await fetch(EXTENSION_API_URLS.logout, {
      method: "POST",
      credentials: "include",
      headers: createRequestHeaders(),
    }),
  );
}
```

- [ ] **Step 4: Run the targeted asset extension tests again**

Run: `pnpm --dir asset-ext test -- lib/storage/extension-cache.test.ts lib/extension-api/client.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the shared runtime transport slice**

```bash
git add asset-ext/lib/storage/extension-cache.ts asset-ext/lib/extension-api/client.ts asset-ext/lib/storage/extension-cache.test.ts asset-ext/lib/extension-api/client.test.ts
git commit -m "feat: add extension runtime cache and api client"
```

## Task 4: Build The Background Controller And Wire The Manifest V3 Service Worker

**Files:**
- Create: `asset-ext/lib/runtime/messages.ts`
- Create: `asset-ext/lib/runtime/background-controller.ts`
- Create: `asset-ext/lib/runtime/background-controller.test.ts`
- Modify: `asset-ext/src/background.ts`

- [ ] **Step 1: Write failing unit tests for session refresh, asset detail opening, heartbeat alarms, and logout cache clearing**

```ts
// asset-ext/lib/runtime/background-controller.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExtensionClientError } from "@lib/extension-api/client";
import type { ExtensionRuntimeCache, ExtensionSessionSnapshot } from "@lib/runtime/types";

function createSession(status: ExtensionSessionSnapshot["subscription"]["status"]): ExtensionSessionSnapshot {
  return {
    ...(status === "active" || status === "processed"
      ? {
          requestNonce: {
            expiresAt: "2999-04-22T09:00:00.000Z",
            value: "nonce-1",
          },
        }
      : {}),
    subscription: {
      assets:
        status === "active" || status === "processed"
          ? [
              {
                accessKey: "tradingview:private",
                assetType: "private",
                expiresAt: "2999-05-01T00:00:00.000Z",
                id: "TV-001",
                platform: "tradingview",
              },
            ]
          : [],
      daysLeft: status === "none" ? null : 12,
      endAt: status === "none" ? null : "2999-05-01T00:00:00.000Z",
      packageName: status === "none" ? null : "Starter",
      status,
    },
    user: {
      email: "seed.active.browser@assetnext.dev",
      id: "user-1",
      publicId: "MEM-001",
      username: "seed-active-browser",
    },
  };
}

describe("background controller", () => {
  const cacheState: ExtensionRuntimeCache = {
    lastError: null,
    lastHeartbeatAt: null,
    lastSyncedAt: null,
    selectedAsset: null,
    session: null,
  };

  const deps = {
    api: {
      getAssetDetail: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn(),
      track: vi.fn(),
    },
    cache: {
      clear: vi.fn(async () => ({ ...cacheState, selectedAsset: null, session: null })),
      patch: vi.fn(async (partial: Partial<ExtensionRuntimeCache>) => ({ ...cacheState, ...partial })),
      read: vi.fn(async () => ({ ...cacheState })),
    },
    manifestVersion: "0.1.0",
    now: vi.fn(() => new Date("2026-04-22T09:00:00.000Z")),
    openOptionsPage: vi.fn(),
    openTab: vi.fn(),
    runtimeId: "allowed-id",
    userAgent: "Chrome/135.0 macOS",
  };

  beforeEach(() => {
    deps.api.getAssetDetail.mockReset();
    deps.api.getSession.mockReset();
    deps.api.logout.mockReset();
    deps.api.track.mockReset();
    deps.cache.clear.mockClear();
    deps.cache.patch.mockClear();
    deps.cache.read.mockClear();
    deps.openOptionsPage.mockClear();
    deps.openTab.mockClear();
  });

  it("refreshes the cache from the session endpoint and strips stale selected asset when access is gone", async () => {
    deps.api.getSession.mockResolvedValue(createSession("none"));
    deps.cache.read.mockResolvedValue({
      ...cacheState,
      selectedAsset: {
        accessKey: "tradingview:private",
        account: "tv@example.com",
        asset: { login: "demo" },
        assetType: "private",
        expiresAt: "2999-05-01T00:00:00.000Z",
        id: "TV-001",
        note: null,
        platform: "tradingview",
        proxy: null,
      },
    });

    const { createBackgroundController } = await import("@lib/runtime/background-controller");
    const controller = createBackgroundController(deps);

    await controller.refreshSession();

    expect(deps.cache.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedAsset: null,
        session: expect.objectContaining({
          subscription: expect.objectContaining({ status: "none" }),
        }),
      }),
    );
  });

  it("opens options page after fetching the selected asset detail", async () => {
    deps.api.getSession.mockResolvedValue(createSession("active"));
    deps.api.getAssetDetail.mockResolvedValue({
      accessKey: "tradingview:private",
      account: "tv@example.com",
      asset: { login: "demo" },
      assetType: "private",
      expiresAt: "2999-05-01T00:00:00.000Z",
      id: "TV-001",
      note: null,
      platform: "tradingview",
      proxy: null,
    });

    const { createBackgroundController } = await import("@lib/runtime/background-controller");
    const controller = createBackgroundController(deps);

    await controller.openAssetDetail("TV-001");

    expect(deps.api.getAssetDetail).toHaveBeenCalledWith({
      assetId: "TV-001",
      requestNonce: "nonce-1",
    });
    expect(deps.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  it("refreshes the session and retries asset detail once when the first nonce is rejected", async () => {
    deps.api.getSession.mockResolvedValue(createSession("active"));
    deps.api.getAssetDetail
      .mockRejectedValueOnce(new ExtensionClientError("NONCE_INVALID", "Request nonce is invalid.", 400))
      .mockResolvedValueOnce({
        accessKey: "tradingview:private",
        account: "tv@example.com",
        asset: { login: "demo" },
        assetType: "private",
        expiresAt: "2999-05-01T00:00:00.000Z",
        id: "TV-001",
        note: null,
        platform: "tradingview",
        proxy: null,
      });

    const { createBackgroundController } = await import("@lib/runtime/background-controller");
    const controller = createBackgroundController(deps);

    await controller.openAssetDetail("TV-001");

    expect(deps.api.getSession).toHaveBeenCalledTimes(2);
    expect(deps.api.getAssetDetail).toHaveBeenCalledTimes(2);
  });

  it("clears local cache after calling logout", async () => {
    deps.api.logout.mockResolvedValue({ redirectTo: "/login", success: true });

    const { createBackgroundController } = await import("@lib/runtime/background-controller");
    const controller = createBackgroundController(deps);

    await controller.logout();

    expect(deps.api.logout).toHaveBeenCalledTimes(1);
    expect(deps.cache.clear).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the targeted asset extension tests to verify the controller files do not exist yet**

Run: `pnpm --dir asset-ext test -- lib/runtime/background-controller.test.ts`

Expected: FAIL because `@lib/runtime/background-controller` and `@lib/runtime/messages` do not exist yet.

- [ ] **Step 3: Implement the controller, message contract, and thin background entry wiring**

```ts
// asset-ext/lib/runtime/messages.ts
export type ExtensionRuntimeMessage =
  | { type: "extension/session.get"; force?: boolean }
  | { type: "extension/options.get-state" }
  | { type: "extension/asset.open-detail"; assetId: string }
  | { type: "extension/auth.open-login" }
  | { type: "extension/auth.logout" };
```

```ts
// asset-ext/lib/runtime/background-controller.ts
import {
  APP_ORIGIN,
  HEARTBEAT_ALARM_NAME,
  NONCE_EXPIRY_SKEW_MS,
} from "@lib/runtime/contracts";
import {
  ExtensionClientError,
  getExtensionAssetDetail,
  getExtensionSession,
  postExtensionLogout,
  postExtensionTrack,
} from "@lib/extension-api/client";
import { clearRuntimeCache, patchRuntimeCache, readRuntimeCache } from "@lib/storage/extension-cache";

function hasAssetAccess(status: "none" | "active" | "processed" | "expired" | "canceled") {
  return status === "active" || status === "processed";
}

function hasUsableNonce(expiresAt: string | undefined) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() - NONCE_EXPIRY_SKEW_MS > Date.now();
}

export function createBackgroundController(input: {
  api?: {
    getAssetDetail: typeof getExtensionAssetDetail;
    getSession: typeof getExtensionSession;
    logout: typeof postExtensionLogout;
    track: typeof postExtensionTrack;
  };
  cache?: {
    clear: typeof clearRuntimeCache;
    patch: typeof patchRuntimeCache;
    read: typeof readRuntimeCache;
  };
  manifestVersion: string;
  now?: () => Date;
  openOptionsPage: () => Promise<void>;
  openTab: (options: { url: string }) => Promise<void>;
  runtimeId: string;
  userAgent: string;
}) {
  const api = input.api ?? {
    getAssetDetail: getExtensionAssetDetail,
    getSession: getExtensionSession,
    logout: postExtensionLogout,
    track: postExtensionTrack,
  };
  const cache = input.cache ?? {
    clear: clearRuntimeCache,
    patch: patchRuntimeCache,
    read: readRuntimeCache,
  };

  async function refreshSession() {
    try {
      const nextSession = await api.getSession();
      const nextCache = await cache.patch({
        lastError: null,
        lastSyncedAt: (input.now ?? (() => new Date()))().toISOString(),
        selectedAsset: hasAssetAccess(nextSession.subscription.status) ? (await cache.read()).selectedAsset : null,
        session: nextSession,
      });

      return nextCache;
    } catch (error) {
      if (
        error instanceof ExtensionClientError &&
        (error.code === "SESSION_MISSING" || error.code === "SESSION_REVOKED")
      ) {
        return cache.clear();
      }

      await cache.patch({
        lastError: error instanceof Error ? error.message : "Failed to refresh the extension session.",
      });
      throw error;
    }
  }

  async function getRuntimeState(force = false) {
    const currentCache = await cache.read();
    if (!force && currentCache.session) {
      return currentCache;
    }

    return refreshSession();
  }

  async function openLogin() {
    await input.openTab({ url: `${APP_ORIGIN}/login` });
  }

  async function openAssetDetail(assetId: string) {
    const currentCache = await getRuntimeState();
    const currentSession = currentCache.session;

    if (!currentSession || !hasAssetAccess(currentSession.subscription.status)) {
      throw new Error("Active or processed subscription is required to open asset detail.");
    }

    const sessionWithFreshNonce =
      currentSession.requestNonce && hasUsableNonce(currentSession.requestNonce.expiresAt)
        ? currentSession
        : (await refreshSession()).session;

    if (!sessionWithFreshNonce?.requestNonce) {
      throw new Error("A fresh request nonce is required to open asset detail.");
    }

    let detail;

    try {
      detail = await api.getAssetDetail({
        assetId,
        requestNonce: sessionWithFreshNonce.requestNonce.value,
      });
    } catch (error) {
      if (!(error instanceof ExtensionClientError) || error.code !== "NONCE_INVALID") {
        throw error;
      }

      const retriedSession = (await refreshSession()).session;

      if (!retriedSession?.requestNonce) {
        throw error;
      }

      detail = await api.getAssetDetail({
        assetId,
        requestNonce: retriedSession.requestNonce.value,
      });
    }

    await cache.patch({
      lastError: null,
      selectedAsset: detail,
    });

    await input.openOptionsPage();
    return detail;
  }

  async function sendHeartbeat() {
    try {
      const currentCache = await refreshSession();

      if (!currentCache.session) {
        return null;
      }

      const payload = {
        browser: "Chrome",
        deviceId: input.runtimeId,
        extensionVersion: input.manifestVersion,
        os: input.userAgent,
      };

      const result = await api.track(payload);

      await cache.patch({
        lastError: null,
        lastHeartbeatAt: result.timestamp,
      });

      return result;
    } catch (error) {
      await cache.patch({
        lastError: error instanceof Error ? error.message : "Heartbeat failed.",
      });

      return null;
    }
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      await cache.clear();
    }

    return {
      redirectTo: "/login" as const,
      success: true as const,
    };
  }

  return {
    getRuntimeState,
    heartbeatAlarmName: HEARTBEAT_ALARM_NAME,
    logout,
    openAssetDetail,
    openLogin,
    refreshSession,
    sendHeartbeat,
  };
}
```

```ts
// asset-ext/src/background.ts
import { HEARTBEAT_ALARM_NAME } from "@lib/runtime/contracts";
import type { ExtensionRuntimeMessage } from "@lib/runtime/messages";
import { createBackgroundController } from "@lib/runtime/background-controller";

const controller = createBackgroundController({
  manifestVersion: chrome.runtime.getManifest().version,
  openOptionsPage: () => chrome.runtime.openOptionsPage(),
  openTab: (options) => chrome.tabs.create(options).then(() => undefined),
  runtimeId: chrome.runtime.id,
  userAgent: navigator.userAgent,
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(HEARTBEAT_ALARM_NAME, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== HEARTBEAT_ALARM_NAME) {
    return;
  }

  await controller.sendHeartbeat();
});

chrome.runtime.onMessage.addListener((message: ExtensionRuntimeMessage, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "extension/session.get":
        sendResponse(await controller.getRuntimeState(Boolean(message.force)));
        return;
      case "extension/options.get-state":
        sendResponse(await controller.getRuntimeState(false));
        return;
      case "extension/auth.open-login":
        await controller.openLogin();
        sendResponse({ ok: true });
        return;
      case "extension/asset.open-detail":
        sendResponse(await controller.openAssetDetail(message.assetId));
        return;
      case "extension/auth.logout":
        sendResponse(await controller.logout());
        return;
    }
  })().catch((error) => {
    sendResponse({
      error: error instanceof Error ? error.message : "Unknown runtime error.",
      ok: false,
    });
  });

  return true;
});
```

- [ ] **Step 4: Run the controller tests and a focused build**

Run:
- `pnpm --dir asset-ext test -- lib/runtime/background-controller.test.ts`
- `pnpm --dir asset-ext build`

Expected: PASS. The background worker compiles with explicit `chrome.alarms` + runtime message wiring.

- [ ] **Step 5: Commit the background orchestration slice**

```bash
git add asset-ext/lib/runtime/messages.ts asset-ext/lib/runtime/background-controller.ts asset-ext/lib/runtime/background-controller.test.ts asset-ext/src/background.ts
git commit -m "feat: add extension background orchestration"
```

## Task 5: Replace The Popup Demo With The Real Session And Asset UI

**Files:**
- Create: `asset-ext/lib/components/extension/extension-session-panels.tsx`
- Create: `asset-ext/src/App.test.tsx`
- Modify: `asset-ext/src/App.tsx`

- [ ] **Step 1: Write failing UI tests for the popup login, summary, asset list, and logout flows**

```tsx
// asset-ext/src/App.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

const sendMessage = vi.fn();

beforeEach(() => {
  sendMessage.mockReset();
  vi.stubGlobal("chrome", {
    runtime: {
      openOptionsPage: vi.fn(),
      sendMessage,
    },
  });
});

describe("popup App", () => {
  it("renders a Login button when no active web session is cached", async () => {
    sendMessage.mockImplementation((message, callback) => {
      if (message.type === "extension/session.get") {
        callback({
          lastError: null,
          lastHeartbeatAt: null,
          lastSyncedAt: null,
          selectedAsset: null,
          session: null,
        });
      }
    });

    render(<App />);

    expect(await screen.findByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("renders user identity and no asset cards for a logged-in user without asset access", async () => {
    sendMessage.mockImplementation((message, callback) => {
      if (message.type === "extension/session.get") {
        callback({
          lastError: null,
          lastHeartbeatAt: "2026-04-22T09:00:00.000Z",
          lastSyncedAt: "2026-04-22T09:00:00.000Z",
          selectedAsset: null,
          session: {
            subscription: {
              assets: [],
              daysLeft: null,
              endAt: null,
              packageName: null,
              status: "none",
            },
            user: {
              email: "seed.none.browser@assetnext.dev",
              id: "user-1",
              publicId: "MEM-001",
              username: "seed-none-browser",
            },
          },
        });
      }
    });

    render(<App />);

    expect(await screen.findByText("seed-none-browser")).toBeInTheDocument();
    expect(screen.getByText("seed.none.browser@assetnext.dev")).toBeInTheDocument();
    expect(screen.getByText("MEM-001")).toBeInTheDocument();
    expect(screen.queryByText("tradingview:private")).not.toBeInTheDocument();
  });

  it("opens asset detail and logout actions through runtime messages", async () => {
    sendMessage.mockImplementation((message, callback) => {
      if (message.type === "extension/session.get") {
        callback({
          lastError: null,
          lastHeartbeatAt: "2026-04-22T09:00:00.000Z",
          lastSyncedAt: "2026-04-22T09:00:00.000Z",
          selectedAsset: null,
          session: {
            requestNonce: {
              expiresAt: "2999-04-22T09:01:00.000Z",
              value: "nonce-1",
            },
            subscription: {
              assets: [
                {
                  accessKey: "tradingview:private",
                  assetType: "private",
                  expiresAt: "2999-05-01T00:00:00.000Z",
                  id: "TV-001",
                  platform: "tradingview",
                },
              ],
              daysLeft: 12,
              endAt: "2999-05-01T00:00:00.000Z",
              packageName: "Starter",
              status: "active",
            },
            user: {
              email: "seed.active.browser@assetnext.dev",
              id: "user-1",
              publicId: "MEM-002",
              username: "seed-active-browser",
            },
          },
        });
        return;
      }

      callback({ ok: true });
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /tradingview:private/i }));
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        { assetId: "TV-001", type: "extension/asset.open-detail" },
        expect.any(Function),
      );
      expect(sendMessage).toHaveBeenCalledWith({ type: "extension/auth.logout" }, expect.any(Function));
    });
  });
});
```

- [ ] **Step 2: Run the popup tests to confirm the template UI still fails the real runtime contract**

Run: `pnpm --dir asset-ext test -- src/App.test.tsx`

Expected: FAIL because `src/App.tsx` still renders the old overlay/badge template, does not request runtime session state, and exposes no login/logout or asset UI.

- [ ] **Step 3: Implement the popup surface and shared presentation panels**

```tsx
// asset-ext/lib/components/extension/extension-session-panels.tsx
import type { ExtensionAssetDetail, ExtensionSessionSnapshot } from "@lib/runtime/types";

export function UserSummaryPanel(props: { session: ExtensionSessionSnapshot }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">User</p>
      <p className="mt-2 text-sm font-semibold text-slate-50">{props.session.user.username}</p>
      <p className="mt-1 text-xs text-slate-300">{props.session.user.email}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
        <span>ID: {props.session.user.id}</span>
        <span>Public ID: {props.session.user.publicId}</span>
      </div>
    </section>
  );
}

export function SubscriptionSummaryPanel(props: { session: ExtensionSessionSnapshot }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">Subscription</p>
      <div className="mt-2 space-y-1 text-sm text-slate-100">
        <p>Status: {props.session.subscription.status}</p>
        <p>Package: {props.session.subscription.packageName ?? "No package"}</p>
        <p>Ends: {props.session.subscription.endAt ?? "-"}</p>
        <p>Days Left: {props.session.subscription.daysLeft ?? "-"}</p>
      </div>
    </section>
  );
}

export function AssetListPanel(props: {
  onSelectAsset: (assetId: string) => void;
  session: ExtensionSessionSnapshot;
}) {
  if (props.session.subscription.assets.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-white/10 bg-slate-950/60 p-3 text-xs text-slate-400">
        No active assets are available for this account.
      </section>
    );
  }

  return (
    <section className="space-y-2">
      {props.session.subscription.assets.map((asset) => (
        <button
          key={asset.id}
          className="flex min-h-11 w-full flex-col rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-left transition hover:border-slate-500 hover:bg-slate-900"
          type="button"
          onClick={() => props.onSelectAsset(asset.id)}
        >
          <span className="text-sm font-medium text-slate-50">{asset.accessKey}</span>
          <span className="mt-1 text-xs text-slate-400">
            {asset.platform} · {asset.assetType} · {asset.expiresAt}
          </span>
        </button>
      ))}
    </section>
  );
}

export function DiagnosticsPanel(props: { lastError: string | null; lastHeartbeatAt: string | null; lastSyncedAt: string | null }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-[11px] text-slate-400">
      <p>Last sync: {props.lastSyncedAt ?? "-"}</p>
      <p>Last heartbeat: {props.lastHeartbeatAt ?? "-"}</p>
      <p>Error: {props.lastError ?? "none"}</p>
    </section>
  );
}

export function AssetDetailJsonPanel(props: { selectedAsset: ExtensionAssetDetail | null }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">Raw JSON</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-200">
        {JSON.stringify(props.selectedAsset?.asset ?? null, null, 2)}
      </pre>
    </section>
  );
}
```

```tsx
// asset-ext/src/App.tsx
import { useEffect, useState } from "react";

import {
  AssetListPanel,
  DiagnosticsPanel,
  SubscriptionSummaryPanel,
  UserSummaryPanel,
} from "@lib/components/extension/extension-session-panels";
import { POPUP_REVALIDATE_INTERVAL_MS } from "@lib/runtime/contracts";
import type { ExtensionRuntimeCache } from "@lib/runtime/types";

const EMPTY_RUNTIME_CACHE: ExtensionRuntimeCache = {
  lastError: null,
  lastHeartbeatAt: null,
  lastSyncedAt: null,
  selectedAsset: null,
  session: null,
};

function sendRuntimeMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: T) => resolve(response));
  });
}

export default function App() {
  const [runtimeCache, setRuntimeCache] = useState<ExtensionRuntimeCache>(EMPTY_RUNTIME_CACHE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function refresh(force = true) {
      const nextState = await sendRuntimeMessage<ExtensionRuntimeCache>({
        force,
        type: "extension/session.get",
      });

      if (isMounted) {
        setRuntimeCache(nextState);
        setIsLoading(false);
      }
    }

    void refresh(true);
    const intervalId = window.setInterval(() => void refresh(true), POPUP_REVALIDATE_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (isLoading) {
    return <div className="w-[360px] bg-slate-950 px-4 py-5 text-sm text-slate-300">Loading extension state...</div>;
  }

  if (!runtimeCache.session) {
    return (
      <div className="w-[360px] space-y-4 bg-slate-950 px-4 py-5 text-slate-50">
        <div>
          <h1 className="text-base font-semibold">Assetku Extension</h1>
          <p className="mt-1 text-xs text-slate-400">Use your existing web session to continue.</p>
        </div>
        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-green-400"
          type="button"
          onClick={() => void sendRuntimeMessage({ type: "extension/auth.open-login" })}
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-[360px] space-y-3 bg-slate-950 px-4 py-5 text-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Assetku Extension</h1>
          <p className="mt-1 text-xs text-slate-400">Minimal runtime for Milestone 11 endpoints.</p>
        </div>
        <button
          className="min-h-11 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
          type="button"
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          Details
        </button>
      </div>

      <UserSummaryPanel session={runtimeCache.session} />
      <SubscriptionSummaryPanel session={runtimeCache.session} />
      <AssetListPanel
        session={runtimeCache.session}
        onSelectAsset={(assetId) => void sendRuntimeMessage({ assetId, type: "extension/asset.open-detail" })}
      />
      <DiagnosticsPanel
        lastError={runtimeCache.lastError}
        lastHeartbeatAt={runtimeCache.lastHeartbeatAt}
        lastSyncedAt={runtimeCache.lastSyncedAt}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          className="min-h-11 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          type="button"
          onClick={() => void sendRuntimeMessage({ force: true, type: "extension/session.get" }).then(setRuntimeCache)}
        >
          Refresh
        </button>
        <button
          className="min-h-11 rounded-xl border border-red-500/40 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
          type="button"
          onClick={() =>
            void sendRuntimeMessage<{ redirectTo: "/login"; success: true }>({ type: "extension/auth.logout" }).then(() =>
              setRuntimeCache(EMPTY_RUNTIME_CACHE),
            )
          }
        >
          Logout
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the popup tests and a targeted lint pass**

Run:
- `pnpm --dir asset-ext test -- src/App.test.tsx`
- `pnpm --dir asset-ext lint`

Expected: PASS.

- [ ] **Step 5: Commit the popup UI slice**

```bash
git add asset-ext/lib/components/extension/extension-session-panels.tsx asset-ext/src/App.tsx asset-ext/src/App.test.tsx
git commit -m "feat: build extension popup runtime ui"
```

## Task 6: Build The Options Page, Finalize Docs, And Run Full Verification

**Files:**
- Create: `asset-ext/src/options.test.tsx`
- Modify: `asset-ext/src/options.tsx`
- Modify: `asset-ext/README.md`

- [ ] **Step 1: Write failing UI tests for the options page asset detail and diagnostics layout**

```tsx
// asset-ext/src/options.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OptionsApp } from "./options";

const sendMessage = vi.fn();

beforeEach(() => {
  sendMessage.mockReset();
  vi.stubGlobal("chrome", {
    runtime: {
      getManifest: vi.fn(() => ({ name: "Assetku", version: "0.1.0" })),
      sendMessage,
    },
  });
});

describe("OptionsApp", () => {
  it("renders the cached selected asset JSON when a popup card has been opened", async () => {
    sendMessage.mockImplementation((message, callback) => {
      if (message.type === "extension/options.get-state") {
        callback({
          lastError: null,
          lastHeartbeatAt: "2026-04-22T09:00:00.000Z",
          lastSyncedAt: "2026-04-22T09:00:00.000Z",
          selectedAsset: {
            accessKey: "tradingview:private",
            account: "tv@example.com",
            asset: { login: "demo@example.com", password: "secret" },
            assetType: "private",
            expiresAt: "2999-05-01T00:00:00.000Z",
            id: "TV-001",
            note: "seed asset",
            platform: "tradingview",
            proxy: null,
          },
          session: {
            subscription: {
              assets: [],
              daysLeft: 12,
              endAt: "2999-05-01T00:00:00.000Z",
              packageName: "Starter",
              status: "active",
            },
            user: {
              email: "seed.active.browser@assetnext.dev",
              id: "user-1",
              publicId: "MEM-001",
              username: "seed-active-browser",
            },
          },
        });
      }
    });

    render(<OptionsApp />);

    expect(await screen.findByText(/"login": "demo@example.com"/)).toBeInTheDocument();
    expect(screen.getByText("seed-active-browser")).toBeInTheDocument();
    expect(screen.getByText(/Last heartbeat: 2026-04-22T09:00:00.000Z/)).toBeInTheDocument();
  });

  it("shows an empty detail state before any asset has been opened", async () => {
    sendMessage.mockImplementation((message, callback) => {
      if (message.type === "extension/options.get-state") {
        callback({
          lastError: null,
          lastHeartbeatAt: null,
          lastSyncedAt: null,
          selectedAsset: null,
          session: null,
        });
      }
    });

    render(<OptionsApp />);

    expect(await screen.findByText(/No asset detail selected yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the options tests to confirm the current settings page is still template-only**

Run: `pnpm --dir asset-ext test -- src/options.test.tsx`

Expected: FAIL because `src/options.tsx` still renders the old reset-badge template and does not export `OptionsApp` or read runtime state.

- [ ] **Step 3: Implement the options page detail view and document the real extension workflow**

```tsx
// asset-ext/src/options.tsx
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@lib/styles/globals.css";

import {
  AssetDetailJsonPanel,
  DiagnosticsPanel,
  SubscriptionSummaryPanel,
  UserSummaryPanel,
} from "@lib/components/extension/extension-session-panels";
import type { ExtensionRuntimeCache } from "@lib/runtime/types";

const manifest = typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest() : null;
const extensionName = manifest?.name ?? "Assetku Extension";
const extensionVersion = manifest?.version ?? "0.0.0";

const EMPTY_RUNTIME_CACHE: ExtensionRuntimeCache = {
  lastError: null,
  lastHeartbeatAt: null,
  lastSyncedAt: null,
  selectedAsset: null,
  session: null,
};

function sendRuntimeMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: T) => resolve(response));
  });
}

export function OptionsApp() {
  const [runtimeCache, setRuntimeCache] = useState<ExtensionRuntimeCache>(EMPTY_RUNTIME_CACHE);

  useEffect(() => {
    void sendRuntimeMessage<ExtensionRuntimeCache>({ type: "extension/options.get-state" }).then(setRuntimeCache);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-4">
        <header>
          <h1 className="text-xl font-semibold">{extensionName} Details</h1>
          <p className="mt-1 text-sm text-slate-400">Version {extensionVersion}</p>
        </header>

        {runtimeCache.session ? (
          <div className="grid gap-4 md:grid-cols-2">
            <UserSummaryPanel session={runtimeCache.session} />
            <SubscriptionSummaryPanel session={runtimeCache.session} />
          </div>
        ) : null}

        {runtimeCache.selectedAsset ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section className="rounded-xl border border-white/10 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Selected Asset</p>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <p>ID: {runtimeCache.selectedAsset.id}</p>
                <p>Access Key: {runtimeCache.selectedAsset.accessKey}</p>
                <p>Platform: {runtimeCache.selectedAsset.platform}</p>
                <p>Account: {runtimeCache.selectedAsset.account}</p>
              </div>
            </section>
            <AssetDetailJsonPanel selectedAsset={runtimeCache.selectedAsset} />
          </div>
        ) : (
          <section className="rounded-xl border border-dashed border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
            No asset detail selected yet. Open an asset card from the popup to inspect the raw JSON payload here.
          </section>
        )}

        <DiagnosticsPanel
          lastError={runtimeCache.lastError}
          lastHeartbeatAt={runtimeCache.lastHeartbeatAt}
          lastSyncedAt={runtimeCache.lastSyncedAt}
        />
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <OptionsApp />
    </StrictMode>,
  );
}
```

```md
<!-- asset-ext/README.md -->
# Assetku Extension Runtime

## Local Development

```bash
pnpm --dir asset-ext install
pnpm --dir asset-ext build
```

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked `asset-ext/dist`
4. Make sure the Next.js app is running on `http://localhost:3000`
5. Log in on the web app first, then open the popup

## Runtime Features

- Popup shows login CTA when the web session is missing
- Popup shows user identity and subscription summary for any valid web session
- Asset cards appear only for `active` or `processed` subscriptions
- Clicking an asset opens the options page with raw JSON detail
- Background service worker sends heartbeat through `/api/extension/track`
- Logout from the popup revokes the shared web session
```

- [ ] **Step 4: Run the asset extension test suite, build, and repo-wide verification gates**

Run:
- `pnpm --dir asset-ext test`
- `pnpm --dir asset-ext lint`
- `pnpm --dir asset-ext build`
- `pnpm check:fix`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

Expected: PASS.

Then perform browser verification manually:

1. Start the app with `pnpm dev`.
2. Load `asset-ext/dist` as an unpacked extension.
3. Verify popup for `seed.none.browser@assetnext.dev` shows `username`, `email`, `publicId`, and no asset cards.
4. Verify popup for `seed.active.browser@assetnext.dev` shows asset cards.
5. Click an asset card and confirm the options page shows raw JSON from `GET /api/extension/asset`.
6. Click popup `Logout`, reload `/console`, and confirm the web app now requires login again.
7. Log in again, then logout from the web app directly and keep the popup open; confirm the popup falls back to `Login` within one revalidation interval.
8. Verify `POST /api/extension/track` writes rows that are visible in `/admin/userlogs` or via InsForge CLI read-only verification.

- [ ] **Step 5: Commit the options/docs/verification slice**

```bash
git add asset-ext/src/options.tsx asset-ext/src/options.test.tsx asset-ext/README.md
git commit -m "feat: add extension options asset detail view"
```

## Self-Review

### Spec coverage
- Session bootstrap for logged-in users with and without subscription access: Task 1 + Task 5.
- Extra user fields `email` and `publicId`: Task 1.
- Asset detail in options page: Task 4 + Task 6.
- Background heartbeat: Task 4.
- Logout sync extension + web: Task 1 + Task 4 + Task 6.
- `asset-ext/` boilerplate alignment: Task 2.

### Placeholder scan
- No unresolved placeholders remain in the plan.
- All new runtime files and routes have exact file paths.
- All verification commands and manual checks are explicit.

### Type consistency
- `ExtensionSessionSnapshot` is the source of truth for popup/options session rendering.
- `ExtensionRuntimeCache` is the storage shape for popup/options/background.
- `ExtensionClientError` is the transport-layer failure shape used by the background controller.
