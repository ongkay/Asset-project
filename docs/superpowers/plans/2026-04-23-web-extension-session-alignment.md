# Web And Extension Session Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menjadikan `app_session` sebagai source of truth auth untuk web member dan extension tanpa merusak policy single-device atau flow extension API yang sudah ada.

**Architecture:** Hapus dependency guard umum terhadap `insforge_access_token` dari shell member, console read path, package read path, dan extension repository. Semua read-path internal aplikasi berpindah ke trusted server-side repository yang menentukan authority dari `activeSession.userId` dan memakai adapter server-side tepercaya.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Zod, InsForge SDK, next-safe-action.

---

## File Map

- Modify: `src/modules/users/services.ts`
  - menghapus syarat token provider dari `getAuthenticatedAppUser()`
- Modify: `tests/unit/modules/users/services.test.ts`
  - regression test bahwa member tetap authenticated dengan `app_session` aktif walau token provider hilang
- Create: `src/modules/console/repositories.ts`
  - trusted read repository untuk snapshot console, asset detail, dan subscription state
- Modify: `src/modules/console/queries.ts`
  - mengganti read-path berbasis token provider ke repository trusted server-side
- Modify: `tests/unit/modules/console/query-read-paths.test.ts`
  - regression test bahwa console read path tetap jalan tanpa token provider
- Modify: `src/modules/packages/repositories.ts`
  - member package reads memakai session aktif + trusted server-side database
- Modify: `tests/unit/modules/packages/repositories.test.ts`
  - regression test member package reads tanpa token provider
- Modify: `src/app/(member)/paymentdummy/page.tsx`
  - hapus redirect `/login` yang bergantung pada token provider stale
- Modify: `tests/unit/app/member/paymentdummy-page.test.ts`
  - regression test page tidak salah menganggap member logout hanya karena token provider hilang
- Modify: `src/modules/extension/repositories.ts`
  - extension repository memakai trusted server-side database, bukan cookie access token
- Create: `tests/unit/modules/extension/repositories.test.ts`
  - regression test extension repositories tetap bekerja tanpa token provider browser

## Task 1: Remove Provider Token From Member Shell Guard

**Files:**
- Modify: `tests/unit/modules/users/services.test.ts`
- Modify: `src/modules/users/services.ts`

- [ ] **Step 1: Write the failing test**

Replace the existing stale-token test in `tests/unit/modules/users/services.test.ts`:

- remove: `it("treats a member app session without a valid InsForge token as unauthenticated", ...)`
- add the new regression below in its place:

```ts
  it("keeps a member authenticated when the app session is valid but the provider token is missing", async () => {
    mockedValidateActiveAppSession.mockResolvedValue({
      createdAt: "2026-04-19T00:00:00.000Z",
      lastSeenAt: "2026-04-19T00:00:00.000Z",
      revokedAt: null,
      sessionId: "session-1",
      userId: "91000000-0000-4000-8000-000000000002",
    });
    mockedReadValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue(null);
    vi.spyOn(userRepositories, "findUserProfileById").mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-BRW-01",
      role: "member",
      userId: "91000000-0000-4000-8000-000000000002",
      username: "seed-active-browser",
    });

    await expect(getAuthenticatedAppUser()).resolves.toEqual({
      profile: {
        avatarUrl: null,
        email: "seed.active.browser@assetnext.dev",
        isBanned: false,
        publicId: "MEM-BRW-01",
        role: "member",
        userId: "91000000-0000-4000-8000-000000000002",
        username: "seed-active-browser",
      },
      session: {
        createdAt: "2026-04-19T00:00:00.000Z",
        lastSeenAt: "2026-04-19T00:00:00.000Z",
        revokedAt: null,
        sessionId: "session-1",
        userId: "91000000-0000-4000-8000-000000000002",
      },
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/modules/users/services.test.ts -t "keeps a member authenticated when the app session is valid but the provider token is missing"`

Expected: FAIL because `getAuthenticatedAppUser()` currently resolves `null` for a member when `readValidatedInsForgeAccessTokenForActiveAppSession()` returns `null`.

- [ ] **Step 3: Write minimal implementation**

In `src/modules/users/services.ts`, remove the provider-token dependency from `getAuthenticatedAppUser()`.

Replace the current member-specific token branch with this implementation body:

```ts
export async function getAuthenticatedAppUser(): Promise<AuthenticatedAppUser | null> {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  const profile = await findUserProfileById(activeSession.userId);

  if (!profile) {
    await revokeActiveAppSession();
    return null;
  }

  return {
    profile,
    session: activeSession,
  };
}
```

Also remove this import because it is no longer needed in this file:

```ts
import { readValidatedInsForgeAccessTokenForActiveAppSession } from "@/modules/auth/services";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/modules/users/services.test.ts`

Expected: PASS with the new regression test green and no regressions in the existing user-service tests.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/modules/users/services.test.ts src/modules/users/services.ts
git commit -m "fix: stop member shell logout on stale provider token"
```

## Task 2: Move Console Read Paths To Trusted Server-Side Repositories

**Files:**
- Create: `src/modules/console/repositories.ts`
- Modify: `src/modules/console/queries.ts`
- Modify: `tests/unit/modules/console/query-read-paths.test.ts`

- [ ] **Step 1: Write the failing tests**

Update `tests/unit/modules/console/query-read-paths.test.ts` so the console query path no longer depends on `readValidatedInsForgeAccessTokenForActiveAppSession()`.

Rewrite these existing tests to be session-centric instead of token-centric:

- replace `returns an empty snapshot instead of throwing when the member token is unavailable`
- replace `returns null for asset detail when the member token is unavailable`
- replace `returns none for console state instead of throwing when the member token is unavailable`

The new fallback condition should be `validateActiveAppSession()` returning `null`, not the provider token being unavailable.

Use this mock shape at the top of the file:

```ts
const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));
```

Remove the old provider-token mock setup from this file because the new implementation must not depend on it:

```ts
const authServiceMocks = vi.hoisted(() => ({
  readValidatedInsForgeAccessTokenForActiveAppSession: vi.fn(),
}));

vi.mock("@/modules/auth/services", () => ({
  readValidatedInsForgeAccessTokenForActiveAppSession:
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession,
}));
```

Add this regression test for `getConsoleSnapshot()`:

```ts
  it("uses the trusted admin database path for getConsoleSnapshot when the app session is active", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        assets: [],
        subscription: null,
        transactions: [],
      },
      error: null,
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { getConsoleSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleSnapshot()).resolves.toEqual({
      assets: [],
      subscription: null,
      transactions: [],
    });

    expect(databaseMocks.createInsForgeAdminDatabase).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_user_console_snapshot", {
      p_user_id: "11111111-1111-4111-8111-111111111111",
    });
  });
```

Add this regression test for `getConsoleStateSnapshot()`:

```ts
  it("derives console state through the trusted admin database path when the app session is active", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        created_at: "2026-04-01T00:00:00.000Z",
        end_at: "2026-05-01T00:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        package_id: "55555555-5555-4555-8555-555555555555",
        package_name: "Paket 5",
        start_at: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });
    const eqUserId = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq: eqUserId });
    const from = vi.fn().mockReturnValue({ select });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from });

    const { getConsoleStateSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshot()).resolves.toEqual({
      latestSubscription: {
        endAt: "2026-05-01T00:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        packageId: "55555555-5555-4555-8555-555555555555",
        packageName: "Paket 5",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/modules/console/query-read-paths.test.ts`

Expected: FAIL because the current implementation still imports the provider-token path and still expects `createInsForgeServerDatabase({ accessToken })`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/console/repositories.ts` with the trusted read helpers:

```ts
import "server-only";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

function createConsoleRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

export async function readConsoleSnapshotByUserId(userId: string) {
  const { data, error } = await createConsoleRepositoryDatabase().rpc("get_user_console_snapshot", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function readConsoleAssetDetailByUserId(input: { assetId: string; userId: string }) {
  const { data, error } = await createConsoleRepositoryDatabase().rpc("get_user_asset_detail", {
    p_asset_id: input.assetId,
    p_user_id: input.userId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function readLatestConsoleSubscriptionByUserId(userId: string) {
  const { data, error } = await createConsoleRepositoryDatabase()
    .from("subscriptions")
    .select("id, package_id, package_name, status, start_at, end_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
```

Then update `src/modules/console/queries.ts` to depend on the active app session rather than the provider token. Use this shape:

```ts
import {
  readConsoleAssetDetailByUserId,
  readConsoleSnapshotByUserId,
  readLatestConsoleSubscriptionByUserId,
} from "./repositories";

async function resolveConsoleReadContext(input: { userId?: string }) {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  const requesterProfile = await readProfileByUserId(activeSession.userId);

  if (!requesterProfile) {
    throw new Error("An active app session is required.");
  }

  const targetUserId = input.userId ?? activeSession.userId;

  if (targetUserId !== activeSession.userId && requesterProfile.role !== "admin") {
    throw new Error("Admin access is required to read another user's console snapshot.");
  }

  return {
    requesterProfile,
    targetUserId,
  };
}
```

Use `resolveConsoleReadContext()` inside `getConsoleSnapshot()`, `getConsoleAssetDetail()`, and `getConsoleStateSnapshot()`, and return the existing empty fallbacks when `resolveConsoleReadContext()` returns `null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/modules/console/query-read-paths.test.ts`

Expected: PASS with the console read-path tests green and no remaining expectations around provider-token database calls.

- [ ] **Step 5: Commit**

```bash
git add src/modules/console/repositories.ts src/modules/console/queries.ts tests/unit/modules/console/query-read-paths.test.ts
git commit -m "fix: align console reads with app sessions"
```

## Task 3: Move Member Package Reads And PaymentDummy Guard Off Provider Tokens

**Files:**
- Modify: `src/modules/packages/repositories.ts`
- Modify: `tests/unit/modules/packages/repositories.test.ts`
- Modify: `src/app/(member)/paymentdummy/page.tsx`
- Modify: `tests/unit/app/member/paymentdummy-page.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this regression test to `tests/unit/modules/packages/repositories.test.ts`:

First, expand the mock setup at the top of `tests/unit/modules/packages/repositories.test.ts` to include the session and profile reads used by the new member path:

```ts
const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  validateActiveAppSession: vi.fn(),
}));

vi.mock("@/modules/auth/repositories", () => ({
  readProfileByUserId: authRepositoryMocks.readProfileByUserId,
}));

vi.mock("@/modules/sessions/services", () => ({
  validateActiveAppSession: sessionServiceMocks.validateActiveAppSession,
}));
```

Remove the old provider-token mock setup from this file because the new member package path must not depend on it:

```ts
const authServiceMocks = vi.hoisted(() => ({
  readValidatedInsForgeAccessTokenForActiveAppSession: vi.fn(),
}));

vi.mock("@/modules/auth/services", () => ({
  readValidatedInsForgeAccessTokenForActiveAppSession:
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession,
}));
```

Reset these mocks inside `beforeEach()`:

```ts
authRepositoryMocks.readProfileByUserId.mockReset();
sessionServiceMocks.validateActiveAppSession.mockReset();
```

Then replace the two old token-centric tests:

- remove `returns an empty package list when the member token is unavailable`
- remove `returns null for package-by-id when the member token is unavailable`

with the following session-centric regressions:

```ts
  it("returns active packages for an authenticated member even when the provider token is unavailable", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "20000000-0000-0000-0000-000000000003",
          code: "PKG-1",
          name: "Legacy Package",
          amount_rp: 120000,
          duration_days: 30,
          checkout_url: null,
          is_extended: true,
          is_active: true,
          access_keys_json: ["tradingview:private"],
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from });
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "member@example.com",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "11111111-1111-4111-8111-111111111111",
      username: "member-1",
    });

    const { listActivePackageRowsForMember } = await import("@/modules/packages/repositories");

    await expect(listActivePackageRowsForMember()).resolves.toHaveLength(1);
  });

  it("returns an active package by id for an authenticated member even when the provider token is unavailable", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "20000000-0000-0000-0000-000000000003",
        code: "PKG-1",
        name: "Legacy Package",
        amount_rp: 120000,
        duration_days: 30,
        checkout_url: null,
        is_extended: true,
        is_active: true,
        access_keys_json: ["tradingview:private"],
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      error: null,
    });
    const eqIsActive = vi.fn().mockReturnValue({ maybeSingle });
    const eqId = vi.fn().mockReturnValue({ eq: eqIsActive });
    const select = vi.fn().mockReturnValue({ eq: eqId });
    const from = vi.fn().mockReturnValue({ select });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from });
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "member@example.com",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "11111111-1111-4111-8111-111111111111",
      username: "member-1",
    });

    const { getActivePackageRowByIdForMember } = await import("@/modules/packages/repositories");

    await expect(getActivePackageRowByIdForMember("20000000-0000-0000-0000-000000000003")).resolves.toMatchObject({
      id: "20000000-0000-0000-0000-000000000003",
      isActive: true,
    });
  });
```

Add this regression test to `tests/unit/app/member/paymentdummy-page.test.ts` by replacing the stale-auth expectation:

Also remove the provider-token mock from this page test because the route must stop importing it:

```ts
vi.mock("@/modules/auth/services", () => ({
  readValidatedInsForgeAccessTokenForActiveAppSession: vi.fn(),
}));

import * as authServices from "@/modules/auth/services";

const mockedReadValidatedInsForgeAccessTokenForActiveAppSession = vi.mocked(
  authServices.readValidatedInsForgeAccessTokenForActiveAppSession,
);
```

```ts
  it("redirects to the console instead of /login when a valid package exists but the legacy provider token is missing", async () => {
    mockedParsePaymentDummyPackageIdSearchParam.mockReturnValueOnce({
      packageId: "11111111-1111-4111-8111-111111111111",
      paymentError: null,
    });
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(null);
    mockedGetConsoleSnapshot.mockResolvedValueOnce({
      assets: [],
      subscription: null,
      transactions: [],
    });
    mockedGetPackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 120000,
      checkoutUrl: null,
      code: "PKG-STARTER",
      createdAt: "2026-04-01T00:00:00.000Z",
      durationDays: 30,
      id: "11111111-1111-4111-8111-111111111111",
      isActive: true,
      isExtended: true,
      name: "Starter",
      updatedAt: "2026-04-01T00:00:00.000Z",
    });

    await expect(
      PaymentDummyRoutePage({
        searchParams: Promise.resolve({ packageId: "11111111-1111-4111-8111-111111111111" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/console?paymentError=invalid-package");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/modules/packages/repositories.test.ts tests/unit/app/member/paymentdummy-page.test.ts`

Expected: FAIL because member package reads still require `readValidatedInsForgeAccessTokenForActiveAppSession()`, and the page still redirects to `/login` from the stale-token branch.

- [ ] **Step 3: Write minimal implementation**

In `src/modules/packages/repositories.ts`, add a small session-based access helper and switch member package reads to the trusted admin database:

```ts
import { readProfileByUserId } from "@/modules/auth/repositories";
import { validateActiveAppSession } from "@/modules/sessions/services";

async function requireMemberPackageReadAccess() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile || profile.isBanned || profile.role !== "member") {
    return null;
  }

  return activeSession;
}

export async function listActivePackageRowsForMember(): Promise<PackageRow[]> {
  const activeSession = await requireMemberPackageReadAccess();

  if (!activeSession) {
    return [];
  }

  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("packages")
    .select(PACKAGE_BASE_SELECT_FIELDS)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return parsePackageDatabaseRows(data).map(mapPackageDatabaseRow);
}
```

Use the same `requireMemberPackageReadAccess()` guard in `getActivePackageRowByIdForMember()`.

In `src/app/(member)/paymentdummy/page.tsx`, remove the import and fallback branch that still depends on `readValidatedInsForgeAccessTokenForActiveAppSession()`. Keep only the redirect-to-console decision:

```ts
  if (!selectedPackage) {
    const packageRow = await getPackageById(packageId);
    redirectToConsole(packageRow?.isActive === false ? "disabled-package" : "invalid-package");
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/modules/packages/repositories.test.ts tests/unit/app/member/paymentdummy-page.test.ts`

Expected: PASS with member package reads green and the payment dummy page no longer redirecting to `/login` from a stale provider-token path.

- [ ] **Step 5: Commit**

```bash
git add src/modules/packages/repositories.ts tests/unit/modules/packages/repositories.test.ts src/app/(member)/paymentdummy/page.tsx tests/unit/app/member/paymentdummy-page.test.ts
git commit -m "fix: stop member package reads from depending on provider tokens"
```

## Task 4: Move Extension Repositories To Trusted Server-Side Database Access

**Files:**
- Modify: `src/modules/extension/repositories.ts`
- Create: `tests/unit/modules/extension/repositories.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/modules/extension/repositories.test.ts` with this coverage:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createAuthenticatedInsForgeServerDatabase: vi.fn(),
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createAuthenticatedInsForgeServerDatabase: databaseMocks.createAuthenticatedInsForgeServerDatabase,
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

describe("extension/repositories", () => {
  beforeEach(() => {
    databaseMocks.createAuthenticatedInsForgeServerDatabase.mockReset();
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("reads the extension console snapshot through the trusted admin database", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { assets: [], subscription: null },
      error: null,
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { readExtensionConsoleSnapshotRpc } = await import("@/modules/extension/repositories");

    await expect(readExtensionConsoleSnapshotRpc("11111111-1111-4111-8111-111111111111")).resolves.toEqual({
      assets: [],
      subscription: null,
    });

    expect(databaseMocks.createAuthenticatedInsForgeServerDatabase).not.toHaveBeenCalled();
  });

  it("writes heartbeat through the trusted admin database", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        first_seen_at: "2026-04-21T00:00:00.000Z",
        id: "track-1",
        last_seen_at: "2026-04-21T00:01:00.000Z",
      },
      error: null,
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { upsertExtensionTrackHeartbeat } = await import("@/modules/extension/repositories");

    await expect(
      upsertExtensionTrackHeartbeat({
        heartbeat: {
          browser: "Chrome",
          deviceId: "device-1",
          extensionId: "allowed-id",
          extensionVersion: "1.0.0",
          os: "Linux",
          sessionId: "session-1",
          userId: "11111111-1111-4111-8111-111111111111",
        },
        network: {
          city: "Bandung",
          country: "ID",
          ipAddress: "127.0.0.1",
        },
      }),
    ).resolves.toEqual({
      firstSeenAt: "2026-04-21T00:00:00.000Z",
      id: "track-1",
      lastSeenAt: "2026-04-21T00:01:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/modules/extension/repositories.test.ts`

Expected: FAIL because `src/modules/extension/repositories.ts` still imports and uses `createAuthenticatedInsForgeServerDatabase()`.

- [ ] **Step 3: Write minimal implementation**

In `src/modules/extension/repositories.ts`, replace the authenticated server database import and calls with the trusted admin database path:

```ts
import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

function createExtensionRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

export async function upsertExtensionTrackHeartbeat(input: {
  heartbeat: ExtensionTrackHeartbeatWriteInput;
  network: ExtensionNetworkMetadata;
}): Promise<ExtensionTrackHeartbeatRecord> {
  const database = createExtensionRepositoryDatabase();
  const { data, error } = await database.rpc("upsert_extension_track", {
    p_browser: input.heartbeat.browser,
    p_city: input.network.city,
    p_country: input.network.country,
    p_device_id: input.heartbeat.deviceId,
    p_extension_id: input.heartbeat.extensionId,
    p_extension_version: input.heartbeat.extensionVersion,
    p_ip_address: input.network.ipAddress,
    p_os: input.heartbeat.os,
    p_session_id: input.heartbeat.sessionId,
    p_user_id: input.heartbeat.userId,
  });
```

Use `createExtensionRepositoryDatabase()` the same way in `readExtensionConsoleSnapshotRpc()`, `readExtensionAssetDetailRpc()`, and `readExtensionAssetExistence()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/modules/extension/repositories.test.ts tests/unit/modules/extension/services.test.ts`

Expected: PASS with the new repository tests green and the existing extension service contract unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/modules/extension/repositories.ts tests/unit/modules/extension/repositories.test.ts
git commit -m "fix: align extension repositories with app sessions"
```

## Task 5: Final Verification And Remaining Dependency Audit

**Files:**
- Modify: `src/modules/users/services.ts`
- Modify: `src/modules/console/repositories.ts`
- Modify: `src/modules/console/queries.ts`
- Modify: `src/modules/packages/repositories.ts`
- Modify: `src/app/(member)/paymentdummy/page.tsx`
- Modify: `src/modules/extension/repositories.ts`
- Modify: `tests/unit/modules/users/services.test.ts`
- Modify: `tests/unit/modules/console/query-read-paths.test.ts`
- Modify: `tests/unit/modules/packages/repositories.test.ts`
- Modify: `tests/unit/app/member/paymentdummy-page.test.ts`
- Modify: `tests/unit/modules/extension/repositories.test.ts`
- Modify: `tests/unit/modules/extension/services.test.ts`

- [ ] **Step 1: Audit remaining member and extension dependencies on provider-token validation**

Run: `rg "readValidatedInsForgeAccessTokenForActiveAppSession|createAuthenticatedInsForgeServerDatabase" src tests`

Expected: no remaining hits in member shell, console read path, package member read path, paymentdummy page, or extension repositories. Remaining hits should only be in explicit auth-focused paths or legacy tests that are intentionally still scoped there.

- [ ] **Step 2: Run targeted regression suite for touched areas**

Run: `pnpm vitest run tests/unit/modules/users/services.test.ts tests/unit/modules/console/query-read-paths.test.ts tests/unit/modules/packages/repositories.test.ts tests/unit/app/member/paymentdummy-page.test.ts tests/unit/modules/extension/repositories.test.ts tests/unit/modules/extension/services.test.ts`

Expected: PASS

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: exit code `0`

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: exit code `0`

- [ ] **Step 5: Run full unit test suite**

Run: `pnpm test`

Expected: PASS

- [ ] **Step 6: Run browser verification for the affected flows**

Verify these flows in a real browser session:

```text
1. Login sebagai member lalu buka /console.
2. Reload /console setelah token provider lama seharusnya stale.
3. Pastikan user tetap berada di shell member selama app_session masih aktif.
4. Buka extension session bootstrap dan pastikan data session/subscription masih muncul.
5. Login user yang sama di browser/device lain.
6. Kembali ke browser/device lama dan pastikan web + extension sama-sama gagal dengan session revoked.
```

Expected: web member dan extension tetap hidup selama `app_session` valid, lalu keduanya sama-sama invalid setelah login baru merevoke session lama.

- [ ] **Step 7: Commit final stabilization changes if verification required any follow-up patch**

```bash
git add src/modules/users/services.ts src/modules/console/repositories.ts src/modules/console/queries.ts src/modules/packages/repositories.ts "src/app/(member)/paymentdummy/page.tsx" src/modules/extension/repositories.ts tests/unit/modules/users/services.test.ts tests/unit/modules/console/query-read-paths.test.ts tests/unit/modules/packages/repositories.test.ts tests/unit/app/member/paymentdummy-page.test.ts tests/unit/modules/extension/repositories.test.ts tests/unit/modules/extension/services.test.ts
git commit -m "test: verify session alignment across web and extension"
```
