# Milestone 9 Admin Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `/admin` placeholder with a real admin dashboard that uses the repo's React Query admin-page pattern, reuses the existing `get_admin_dashboard_stats` aggregate, and renders summary metrics, charts, range controls, and a truthful `Recent Users` activity table.

**Architecture:** Keep `src/app/(admin)/admin/page.tsx` thin, move all dashboard read-model logic into `src/modules/admin/dashboard/*`, and use one server-backed snapshot query for the whole page. The route server-loads the initial snapshot, the client owns range state and React Query refetch, and all visual composition stays route-local under `src/app/(admin)/admin/_components/*` while visually referencing `src/app/(main)/dashboard/default/*` and `src/app/(main)/dashboard/crm/*`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, next-safe-action, @tanstack/react-query, Recharts via `src/components/ui/chart`, Vitest, InsForge server database client.

---

## File Map

- Modify: `src/modules/admin/dashboard/types.ts`
  Purpose: define the canonical dashboard filter, series, summary, and recent-user types.
- Create: `src/modules/admin/dashboard/schemas.ts`
  Purpose: normalize `preset/from/to` search params, validate custom ranges, and resolve default `30d` state.
- Modify: `src/modules/admin/dashboard/queries.ts`
  Purpose: expand the current RPC-only read into one full dashboard snapshot query using `get_admin_dashboard_stats`, `transactions`, `profiles`, `subscriptions`, `v_current_subscriptions`, and `v_live_users`.
- Create: `src/modules/admin/dashboard/actions.ts`
  Purpose: expose one admin-safe read action for React Query refetches.
- Modify: `src/app/(admin)/admin/page.tsx`
  Purpose: guard the route, parse dashboard search params, load the initial snapshot, and render the new page component.
- Delete: `src/app/(admin)/admin/_components/admin-overview-page.tsx`
  Purpose: remove the placeholder hub after the real dashboard page exists.
- Create: `src/app/(admin)/admin/_components/admin-dashboard-page.tsx`
  Purpose: own the client page shell, useQuery wiring, loading/error UI, and final layout.
- Create: `src/app/(admin)/admin/_components/admin-dashboard-query.ts`
  Purpose: define the React Query key and the safe-action fetch wrapper.
- Create: `src/app/(admin)/admin/_components/use-admin-dashboard-state.ts`
  Purpose: manage range preset, custom date state, URL sync, and derived effective filters.
- Create: `src/app/(admin)/admin/_components/admin-dashboard-sales-chart.tsx`
  Purpose: render the hero sales chart plus shared range controls.
- Create: `src/app/(admin)/admin/_components/admin-dashboard-member-growth-chart.tsx`
  Purpose: render the member growth chart.
- Create: `src/app/(admin)/admin/_components/admin-dashboard-transactions-chart.tsx`
  Purpose: render successful transaction count over time.
- Create: `src/app/(admin)/admin/_components/admin-dashboard-subscription-composition-card.tsx`
  Purpose: render the donut composition for `private/share/mixed` plus explicit numeric labels.
- Create: `src/app/(admin)/admin/_components/admin-dashboard-recent-users-table.tsx`
  Purpose: render the `Recent Users` mini table with avatar, role, active package, and absolute/relative last seen.
- Create: `tests/unit/modules/admin/dashboard/schemas.test.ts`
  Purpose: lock search-param defaults and custom range validation.
- Create: `tests/unit/modules/admin/dashboard/queries.test.ts`
  Purpose: lock snapshot aggregation, chart bucketing, and recent-user mapping.
- Create: `tests/unit/modules/admin/dashboard/actions.test.ts`
  Purpose: lock the stable safe-action envelope.
- Create: `tests/unit/app/admin/page.test.ts`
  Purpose: lock the route guard, server initial load, and fallback snapshot behavior.
- Create: `tests/unit/app/admin/use-admin-dashboard-state.test.ts`
  Purpose: lock URL serialization and default-state omission.
- Create: `tests/unit/app/admin/admin-dashboard-page.test.tsx`
  Purpose: lock the visible layout contract and error/empty state rendering.

---

### Task 1: Lock Dashboard Filter And Type Contract

**Files:**
- Modify: `src/modules/admin/dashboard/types.ts`
- Create: `src/modules/admin/dashboard/schemas.ts`
- Test: `tests/unit/modules/admin/dashboard/schemas.test.ts`

- [ ] **Step 1: Write the failing schema tests**

```ts
import { describe, expect, it } from "vitest";

import {
  parseAdminDashboardSearchParams,
  resolveAdminDashboardRange,
} from "@/modules/admin/dashboard/schemas";

describe("admin/dashboard/schemas", () => {
  it("defaults to the 30d preset when no search params are present", () => {
    expect(parseAdminDashboardSearchParams({})).toEqual({
      preset: "30d",
      from: null,
      to: null,
    });
  });

  it("keeps a valid custom range and rejects a reversed custom range", () => {
    expect(
      parseAdminDashboardSearchParams({
        preset: "custom",
        from: "2026-04-01",
        to: "2026-04-30",
      }),
    ).toEqual({
      preset: "custom",
      from: "2026-04-01",
      to: "2026-04-30",
    });

    expect(
      parseAdminDashboardSearchParams({
        preset: "custom",
        from: "2026-04-30",
        to: "2026-04-01",
      }),
    ).toEqual({
      preset: "30d",
      from: null,
      to: null,
    });
  });

  it("resolves preset windows into inclusive UTC boundaries", () => {
    const range = resolveAdminDashboardRange(
      { preset: "90d", from: null, to: null },
      new Date("2026-04-20T12:00:00.000Z"),
    );

    expect(range.label).toBe("90 hari");
    expect(range.fromIso).toBe("2026-01-21T00:00:00.000Z");
    expect(range.toIso).toBe("2026-04-20T23:59:59.999Z");
  });
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `pnpm test -- tests/unit/modules/admin/dashboard/schemas.test.ts`
Expected: FAIL with `Cannot find module '@/modules/admin/dashboard/schemas'`.

- [ ] **Step 3: Write the minimal dashboard filter types and parser**

```ts
// src/modules/admin/dashboard/types.ts
export type AdminDashboardPreset = "30d" | "90d" | "custom";

export type AdminDashboardFilters = {
  preset: AdminDashboardPreset;
  from: string | null;
  to: string | null;
};

export type AdminDashboardResolvedRange = {
  preset: AdminDashboardPreset;
  from: string;
  to: string;
  fromIso: string;
  toIso: string;
  label: string;
};

export type AdminDashboardSummary = {
  totalMembers: number;
  totalSubscribedMembers: number;
  totalAssets: number;
  totalSuccessAmountRp: number;
};

export type AdminDashboardSeriesPoint = {
  bucketKey: string;
  bucketLabel: string;
};

export type AdminDashboardRecentUserRow = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: "member";
  activePackageName: string | null;
  lastSeenAt: string;
};

export type AdminDashboardSnapshot = {
  summary: AdminDashboardSummary;
  salesSeries: Array<AdminDashboardSeriesPoint & { amountRp: number }>;
  memberGrowthSeries: Array<AdminDashboardSeriesPoint & { newMembers: number; subscribedMembers: number }>;
  transactionSeries: Array<AdminDashboardSeriesPoint & { successCount: number }>;
  subscriptionComposition: {
    private: number;
    share: number;
    mixed: number;
  };
  recentUsers: AdminDashboardRecentUserRow[];
  range: AdminDashboardResolvedRange;
};
```

```ts
// src/modules/admin/dashboard/schemas.ts
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { z } from "zod";

import type { AdminDashboardFilters, AdminDashboardPreset, AdminDashboardResolvedRange } from "./types";

const presetSchema = z.enum(["30d", "90d", "custom"]);
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const adminDashboardFilterSchema = z.object({
  preset: presetSchema.default("30d"),
  from: dateOnlySchema.nullable().default(null),
  to: dateOnlySchema.nullable().default(null),
});

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminDashboardSearchParams(searchParams: Record<string, string | string[] | undefined>): AdminDashboardFilters {
  const preset = presetSchema.safeParse(readSingleSearchParam(searchParams.preset)).success
    ? (readSingleSearchParam(searchParams.preset) as AdminDashboardPreset)
    : "30d";
  const from = dateOnlySchema.safeParse(readSingleSearchParam(searchParams.from)).success
    ? readSingleSearchParam(searchParams.from)!
    : null;
  const to = dateOnlySchema.safeParse(readSingleSearchParam(searchParams.to)).success
    ? readSingleSearchParam(searchParams.to)!
    : null;

  if (preset !== "custom" || !from || !to || from > to) {
    return { preset: preset === "90d" ? "90d" : "30d", from: null, to: null };
  }

  return { preset: "custom", from, to };
}

export function resolveAdminDashboardRange(filters: AdminDashboardFilters, now = new Date()): AdminDashboardResolvedRange {
  if (filters.preset === "custom" && filters.from && filters.to) {
    const fromDate = startOfDay(new Date(`${filters.from}T00:00:00.000Z`));
    const toDate = endOfDay(new Date(`${filters.to}T00:00:00.000Z`));

    return {
      preset: "custom",
      from: filters.from,
      to: filters.to,
      fromIso: fromDate.toISOString(),
      toIso: toDate.toISOString(),
      label: `${format(fromDate, "d MMM yyyy")} - ${format(toDate, "d MMM yyyy")}`,
    };
  }

  const days = filters.preset === "90d" ? 89 : 29;
  const fromDate = startOfDay(subDays(now, days));
  const toDate = endOfDay(now);

  return {
    preset: filters.preset,
    from: format(fromDate, "yyyy-MM-dd"),
    to: format(toDate, "yyyy-MM-dd"),
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
    label: filters.preset === "90d" ? "90 hari" : "30 hari",
  };
}
```

- [ ] **Step 4: Run the schema test to verify it passes**

Run: `pnpm test -- tests/unit/modules/admin/dashboard/schemas.test.ts`
Expected: PASS with 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin/dashboard/types.ts src/modules/admin/dashboard/schemas.ts tests/unit/modules/admin/dashboard/schemas.test.ts
git commit -m "test: lock admin dashboard filter contract"
```

### Task 2: Build The Server Dashboard Snapshot And Safe Action

**Files:**
- Modify: `src/modules/admin/dashboard/queries.ts`
- Create: `src/modules/admin/dashboard/actions.ts`
- Test: `tests/unit/modules/admin/dashboard/queries.test.ts`
- Test: `tests/unit/modules/admin/dashboard/actions.test.ts`

- [ ] **Step 1: Write the failing snapshot and action tests**

```ts
// tests/unit/modules/admin/dashboard/queries.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeServerDatabase: vi.fn(),
}));

const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  validateActiveAppSession: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeServerDatabase: databaseMocks.createInsForgeServerDatabase,
}));

vi.mock("@/modules/auth/repositories", () => ({
  readProfileByUserId: authRepositoryMocks.readProfileByUserId,
}));

vi.mock("@/modules/sessions/services", () => ({
  validateActiveAppSession: sessionServiceMocks.validateActiveAppSession,
}));

describe("admin/dashboard/queries", () => {
  beforeEach(() => {
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({ sessionId: "session-1", userId: "admin-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({ role: "admin" });
  });

  it("builds one dashboard snapshot from rpc, transactions, subscriptions, and recent users", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        from: "2026-03-22T00:00:00.000Z",
        to: "2026-04-20T23:59:59.999Z",
        totalAssets: 12,
        totalMembers: 8,
        totalMixedSubscriptions: 2,
        totalPrivateSubscriptions: 3,
        totalShareSubscriptions: 1,
        totalSubscribedMembers: 4,
        totalSuccessAmountRp: 500000,
      },
      error: null,
    });

    const from = vi
      .fn()
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              lte: () => ({
                order: () => Promise.resolve({
                  data: [
                    { created_at: "2026-04-01T10:00:00.000Z", amount_rp: 200000, status: "success", user_id: "member-1" },
                    { created_at: "2026-04-02T11:00:00.000Z", amount_rp: 300000, status: "success", user_id: "member-2" },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            lte: () => Promise.resolve({
              data: [
                { user_id: "member-1", created_at: "2026-04-01T09:00:00.000Z" },
                { user_id: "member-2", created_at: "2026-04-02T09:00:00.000Z" },
              ],
              error: null,
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          in: () => Promise.resolve({
            data: [
              { user_id: "member-1", package_name: "Starter", status: "active" },
            ],
            error: null,
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          in: () => ({
            order: () => ({
              limit: () => Promise.resolve({
                data: [
                  {
                    user_id: "member-1",
                    username: "alpha",
                    email: "alpha@example.com",
                    avatar_url: null,
                    last_seen_at: "2026-04-20T11:00:00.000Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }));

    databaseMocks.createInsForgeServerDatabase.mockReturnValue({ rpc, from });

    const { getAdminDashboardSnapshot } = await import("@/modules/admin/dashboard/queries");
    const result = await getAdminDashboardSnapshot({ preset: "30d", from: null, to: null });

    expect(result.summary.totalSuccessAmountRp).toBe(500000);
    expect(result.subscriptionComposition).toEqual({ private: 3, share: 1, mixed: 2 });
    expect(result.salesSeries.find((point) => point.bucketKey === "2026-04-01")?.amountRp).toBe(200000);
    expect(result.transactionSeries.find((point) => point.bucketKey === "2026-04-02")?.successCount).toBe(1);
    expect(result.recentUsers).toHaveLength(1);
    expect(result.recentUsers[0]).toMatchObject({ username: "alpha", activePackageName: "Starter" });
  });
});
```

```ts
// tests/unit/modules/admin/dashboard/actions.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    id: "admin-1",
    profile: { isBanned: false, role: "admin", userId: "admin-1" },
    session: { id: "session-1", userId: "admin-1" },
  }),
}));

vi.mock("@/modules/admin/dashboard/queries", () => ({
  getAdminDashboardSnapshot: vi.fn(),
}));

import * as dashboardQueries from "@/modules/admin/dashboard/queries";
import { getAdminDashboardSnapshotAction } from "@/modules/admin/dashboard/actions";

const mockedGetAdminDashboardSnapshot = vi.mocked(dashboardQueries.getAdminDashboardSnapshot);

describe("admin/dashboard/actions", () => {
  beforeEach(() => mockedGetAdminDashboardSnapshot.mockReset());

  it("returns a stable success envelope for valid filters", async () => {
    mockedGetAdminDashboardSnapshot.mockResolvedValueOnce({
      summary: { totalMembers: 1, totalSubscribedMembers: 1, totalAssets: 1, totalSuccessAmountRp: 100000 },
      salesSeries: [],
      memberGrowthSeries: [],
      transactionSeries: [],
      subscriptionComposition: { private: 1, share: 0, mixed: 0 },
      recentUsers: [],
      range: {
        preset: "30d",
        from: "2026-03-22",
        to: "2026-04-20",
        fromIso: "2026-03-22T00:00:00.000Z",
        toIso: "2026-04-20T23:59:59.999Z",
        label: "30 hari",
      },
    });

    const result = await getAdminDashboardSnapshotAction({ preset: "30d", from: null, to: null });
    expect(result?.data?.ok).toBe(true);
    expect(result?.data?.snapshot.summary.totalMembers).toBe(1);
  });
});
```

- [ ] **Step 2: Run the query and action tests to verify they fail**

Run: `pnpm test -- tests/unit/modules/admin/dashboard/queries.test.ts tests/unit/modules/admin/dashboard/actions.test.ts`
Expected: FAIL because `getAdminDashboardSnapshot` and `getAdminDashboardSnapshotAction` do not exist yet.

- [ ] **Step 3: Implement the dashboard snapshot query and action**

```ts
// src/modules/admin/dashboard/queries.ts
import "server-only";

import { eachDayOfInterval, format } from "date-fns";
import { z } from "zod";

import { createInsForgeServerDatabase } from "@/lib/insforge/database";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { validateActiveAppSession } from "@/modules/sessions/services";

import { adminDashboardFilterSchema, resolveAdminDashboardRange } from "./schemas";

import type { AdminDashboardFilters, AdminDashboardSnapshot } from "./types";

const adminDashboardStatsSchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  totalAssets: z.number().int().nonnegative(),
  totalMembers: z.number().int().nonnegative(),
  totalMixedSubscriptions: z.number().int().nonnegative(),
  totalPrivateSubscriptions: z.number().int().nonnegative(),
  totalShareSubscriptions: z.number().int().nonnegative(),
  totalSubscribedMembers: z.number().int().nonnegative(),
  totalSuccessAmountRp: z.number().int().nonnegative(),
});

async function assertAdminDashboardAccess() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) throw new Error("An active app session is required.");

  const profile = await readProfileByUserId(activeSession.userId);
  if (!profile || profile.role !== "admin") throw new Error("Admin role is required to read dashboard stats.");
}

function buildEmptyDailySeries(fromIso: string, toIso: string) {
  return eachDayOfInterval({ start: new Date(fromIso), end: new Date(toIso) }).map((date) => ({
    bucketKey: format(date, "yyyy-MM-dd"),
    bucketLabel: format(date, "dd MMM"),
    amountRp: 0,
    successCount: 0,
    newMembers: 0,
    subscribedMembers: 0,
  }));
}

export async function getAdminDashboardSnapshot(input: AdminDashboardFilters): Promise<AdminDashboardSnapshot> {
  const parsedFilters = adminDashboardFilterSchema.parse(input);
  const range = resolveAdminDashboardRange(parsedFilters);

  await assertAdminDashboardAccess();

  const database = createInsForgeServerDatabase();
  const [{ data: statsData, error: statsError }, transactionsResult, profilesResult, currentSubscriptionsResult] =
    await Promise.all([
      database.rpc("get_admin_dashboard_stats", { p_from: range.fromIso, p_to: range.toIso }),
      database.from("transactions").select("user_id, amount_rp, created_at, status").eq("status", "success").gte("created_at", range.fromIso).lte("created_at", range.toIso).order("created_at"),
      database.from("profiles").select("user_id, username, email, avatar_url, created_at, role").eq("role", "member").lte("created_at", range.toIso).order("created_at"),
      database.from("v_current_subscriptions").select("user_id, package_name, status, start_at, end_at"),
    ]);

  if (statsError || transactionsResult.error || profilesResult.error || currentSubscriptionsResult.error) {
    throw statsError ?? transactionsResult.error ?? profilesResult.error ?? currentSubscriptionsResult.error;
  }

  const stats = adminDashboardStatsSchema.parse(statsData);
  const memberProfiles = profilesResult.data ?? [];
  const memberProfileByUserId = new Map(memberProfiles.map((profile) => [profile.user_id, profile]));
  const liveUsersResult = await database
    .from("v_live_users")
    .select("user_id, username, email, avatar_url, last_seen_at")
    .in("user_id", Array.from(memberProfileByUserId.keys()))
    .order("last_seen_at", { ascending: false })
    .limit(50);

  if (liveUsersResult.error) {
    throw liveUsersResult.error;
  }
  const series = buildEmptyDailySeries(range.fromIso, range.toIso);
  const byBucket = new Map(series.map((point) => [point.bucketKey, point]));

  for (const transaction of transactionsResult.data ?? []) {
    const bucketKey = format(new Date(transaction.created_at), "yyyy-MM-dd");
    const bucket = byBucket.get(bucketKey);
    if (!bucket) continue;
    bucket.amountRp += transaction.amount_rp;
    bucket.successCount += 1;
  }

  const currentSubscriptions = currentSubscriptionsResult.data ?? [];

  for (const profile of memberProfiles) {
    const createdBucket = byBucket.get(format(new Date(profile.created_at), "yyyy-MM-dd"));
    if (createdBucket) createdBucket.newMembers += 1;
  }

  for (const point of series) {
    const bucketEndIso = new Date(`${point.bucketKey}T23:59:59.999Z`).toISOString();
    point.subscribedMembers = new Set(
      currentSubscriptions
        .filter((row) => row.start_at <= bucketEndIso && row.end_at >= bucketEndIso)
        .map((row) => row.user_id),
    ).size;
  }

  const packageNameByUserId = new Map((currentSubscriptionsResult.data ?? []).map((row) => [row.user_id, row.package_name]));

  return {
    summary: {
      totalMembers: stats.totalMembers,
      totalSubscribedMembers: stats.totalSubscribedMembers,
      totalAssets: stats.totalAssets,
      totalSuccessAmountRp: stats.totalSuccessAmountRp,
    },
    salesSeries: series.map(({ bucketKey, bucketLabel, amountRp }) => ({ bucketKey, bucketLabel, amountRp })),
    memberGrowthSeries: series.map(({ bucketKey, bucketLabel, newMembers, subscribedMembers }) => ({ bucketKey, bucketLabel, newMembers, subscribedMembers })),
    transactionSeries: series.map(({ bucketKey, bucketLabel, successCount }) => ({ bucketKey, bucketLabel, successCount })),
    subscriptionComposition: {
      private: stats.totalPrivateSubscriptions,
      share: stats.totalShareSubscriptions,
      mixed: stats.totalMixedSubscriptions,
    },
    recentUsers: (liveUsersResult.data ?? []).map((row) => ({
      userId: row.user_id,
      username: row.username,
      email: row.email,
      avatarUrl: row.avatar_url,
      role: "member" as const,
      activePackageName: packageNameByUserId.get(row.user_id) ?? null,
      lastSeenAt: row.last_seen_at,
    })),
    range,
  };
}
```

```ts
// src/modules/admin/dashboard/actions.ts
"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import { getAdminDashboardSnapshot } from "./queries";
import { adminDashboardFilterSchema } from "./schemas";

export const getAdminDashboardSnapshotAction = adminActionClient
  .metadata({ actionName: "admin.dashboard.get-snapshot" })
  .inputSchema(adminDashboardFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const snapshot = await getAdminDashboardSnapshot(parsedInput);

      return {
        ok: true as const,
        snapshot,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load admin dashboard.",
      };
    }
  });
```

- [ ] **Step 4: Run the server dashboard tests to verify they pass**

Run: `pnpm test -- tests/unit/modules/admin/dashboard/queries.test.ts tests/unit/modules/admin/dashboard/actions.test.ts`
Expected: PASS with the snapshot and action tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin/dashboard/queries.ts src/modules/admin/dashboard/actions.ts tests/unit/modules/admin/dashboard/queries.test.ts tests/unit/modules/admin/dashboard/actions.test.ts
git commit -m "feat(admin): add dashboard snapshot read model"
```

### Task 3: Wire The Route Entry And Initial Server Load

**Files:**
- Modify: `src/app/(admin)/admin/page.tsx`
- Test: `tests/unit/app/admin/page.test.ts`

- [ ] **Step 1: Write the failing route test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/dashboard/queries", () => ({
  getAdminDashboardSnapshot: vi.fn(),
}));

vi.mock("@/modules/admin/dashboard/schemas", () => ({
  parseAdminDashboardSearchParams: vi.fn(),
}));

vi.mock("@/modules/users/services", () => ({
  requireAdminShellAccess: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/_components/admin-dashboard-page", () => ({
  AdminDashboardPage: vi.fn(() => null),
}));

import * as dashboardQueries from "@/modules/admin/dashboard/queries";
import * as dashboardSchemas from "@/modules/admin/dashboard/schemas";
import * as userServices from "@/modules/users/services";

import AdminRoutePage from "@/app/(admin)/admin/page";

describe("app/admin/page", () => {
  beforeEach(() => {
    vi.mocked(dashboardQueries.getAdminDashboardSnapshot).mockReset();
    vi.mocked(dashboardSchemas.parseAdminDashboardSearchParams).mockReset();
    vi.mocked(userServices.requireAdminShellAccess).mockReset();
    vi.mocked(userServices.requireAdminShellAccess).mockResolvedValue({ profile: { userId: "admin-1" } } as never);
  });

  it("guards access, parses dashboard filters, and loads the initial snapshot", async () => {
    vi.mocked(dashboardSchemas.parseAdminDashboardSearchParams).mockReturnValue({ preset: "90d", from: null, to: null });
    vi.mocked(dashboardQueries.getAdminDashboardSnapshot).mockResolvedValueOnce({
      summary: { totalMembers: 8, totalSubscribedMembers: 4, totalAssets: 12, totalSuccessAmountRp: 500000 },
      salesSeries: [],
      memberGrowthSeries: [],
      transactionSeries: [],
      subscriptionComposition: { private: 3, share: 1, mixed: 2 },
      recentUsers: [],
      range: {
        preset: "90d",
        from: "2026-01-21",
        to: "2026-04-20",
        fromIso: "2026-01-21T00:00:00.000Z",
        toIso: "2026-04-20T23:59:59.999Z",
        label: "90 hari",
      },
    });

    const element = await AdminRoutePage({ searchParams: Promise.resolve({ preset: "90d" }) });

    expect(vi.mocked(userServices.requireAdminShellAccess)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(dashboardSchemas.parseAdminDashboardSearchParams)).toHaveBeenCalledWith({ preset: "90d" });
    expect(vi.mocked(dashboardQueries.getAdminDashboardSnapshot)).toHaveBeenCalledWith({ preset: "90d", from: null, to: null });
    expect(element.props.initialFilters).toEqual({ preset: "90d", from: null, to: null });
    expect(element.props.initialError).toBeNull();
  });
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `pnpm test -- tests/unit/app/admin/page.test.ts`
Expected: FAIL because the route still renders `AdminOverviewPage`.

- [ ] **Step 3: Replace the placeholder route with the dashboard route entry**

```tsx
// src/app/(admin)/admin/page.tsx
import { getAdminDashboardSnapshot } from "@/modules/admin/dashboard/queries";
import { parseAdminDashboardSearchParams, resolveAdminDashboardRange } from "@/modules/admin/dashboard/schemas";
import { requireAdminShellAccess } from "@/modules/users/services";

import { AdminDashboardPage } from "./_components/admin-dashboard-page";

import type { AdminDashboardFilters, AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

type AdminRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function createEmptyDashboardSnapshot(filters: AdminDashboardFilters): AdminDashboardSnapshot {
  const range = resolveAdminDashboardRange(filters);

  return {
    summary: { totalMembers: 0, totalSubscribedMembers: 0, totalAssets: 0, totalSuccessAmountRp: 0 },
    salesSeries: [],
    memberGrowthSeries: [],
    transactionSeries: [],
    subscriptionComposition: { private: 0, share: 0, mixed: 0 },
    recentUsers: [],
    range,
  };
}

export default async function AdminRoutePage({ searchParams }: AdminRoutePageProps) {
  await requireAdminShellAccess();

  const resolvedSearchParams = await searchParams;
  const filters = parseAdminDashboardSearchParams(resolvedSearchParams);

  let initialSnapshot = createEmptyDashboardSnapshot(filters);
  let initialError: string | null = null;

  try {
    initialSnapshot = await getAdminDashboardSnapshot(filters);
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Failed to load admin dashboard.";
  }

  return <AdminDashboardPage initialError={initialError} initialFilters={filters} initialSnapshot={initialSnapshot} />;
}
```

- [ ] **Step 4: Run the route test to verify it passes**

Run: `pnpm test -- tests/unit/app/admin/page.test.ts`
Expected: PASS with one green route test.

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/admin/page.tsx tests/unit/app/admin/page.test.ts
git commit -m "feat(admin): wire admin dashboard route entry"
```

### Task 4: Add The Client Query Adapter And URL-Synced Range State

**Files:**
- Create: `src/app/(admin)/admin/_components/admin-dashboard-query.ts`
- Create: `src/app/(admin)/admin/_components/use-admin-dashboard-state.ts`
- Test: `tests/unit/app/admin/use-admin-dashboard-state.test.ts`

- [ ] **Step 1: Write the failing state test**

```ts
import { describe, expect, it } from "vitest";

import {
  buildAdminDashboardUrl,
  getAdminDashboardCustomRangeError,
} from "@/app/(admin)/admin/_components/use-admin-dashboard-state";

describe("app/admin/use-admin-dashboard-state", () => {
  it("omits default 30d filters from the url", () => {
    expect(buildAdminDashboardUrl("/admin", { preset: "30d", from: null, to: null })).toBe("/admin");
  });

  it("serializes preset and custom date state", () => {
    expect(buildAdminDashboardUrl("/admin", { preset: "90d", from: null, to: null })).toBe("/admin?preset=90d");

    expect(
      buildAdminDashboardUrl("/admin", {
        preset: "custom",
        from: "2026-04-01",
        to: "2026-04-30",
      }),
    ).toBe("/admin?preset=custom&from=2026-04-01&to=2026-04-30");
  });

  it("returns an inline error for reversed custom ranges", () => {
    expect(getAdminDashboardCustomRangeError({ from: "2026-04-30", to: "2026-04-01" })).toBe(
      "Tanggal mulai tidak boleh melewati tanggal akhir.",
    );
  });
});
```

- [ ] **Step 2: Run the state test to verify it fails**

Run: `pnpm test -- tests/unit/app/admin/use-admin-dashboard-state.test.ts`
Expected: FAIL because the hook file does not exist.

- [ ] **Step 3: Implement the query adapter and state hook**

```ts
// src/app/(admin)/admin/_components/admin-dashboard-query.ts
"use client";

import { getAdminDashboardSnapshotAction } from "@/modules/admin/dashboard/actions";

import type { AdminDashboardFilters } from "@/modules/admin/dashboard/types";

export const ADMIN_DASHBOARD_QUERY_KEY = ["admin-dashboard"] as const;

export async function fetchAdminDashboardSnapshot(input: AdminDashboardFilters) {
  const result = await getAdminDashboardSnapshotAction(input);

  if (result?.data?.ok) {
    return result.data.snapshot;
  }

  throw new Error(result?.validationErrors?.formErrors?.[0] ?? result?.data?.message ?? "Failed to load admin dashboard.");
}

export function getAdminDashboardQueryKey(filters: AdminDashboardFilters) {
  return [...ADMIN_DASHBOARD_QUERY_KEY, filters] as const;
}
```

```ts
// src/app/(admin)/admin/_components/use-admin-dashboard-state.ts
"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import type { AdminDashboardFilters, AdminDashboardPreset } from "@/modules/admin/dashboard/types";

export function getAdminDashboardCustomRangeError(range: { from: string | null; to: string | null }) {
  if (range.from && range.to && range.from > range.to) {
    return "Tanggal mulai tidak boleh melewati tanggal akhir.";
  }

  return null;
}

function writeSearchParam(searchParams: URLSearchParams, key: string, value: string | null) {
  if (!value) {
    searchParams.delete(key);
    return;
  }

  searchParams.set(key, value);
}

export function buildAdminDashboardUrl(pathname: string, filters: AdminDashboardFilters, currentSearch = "") {
  const searchParams = new URLSearchParams(currentSearch);

  if (filters.preset === "30d") {
    searchParams.delete("preset");
    searchParams.delete("from");
    searchParams.delete("to");
  } else {
    writeSearchParam(searchParams, "preset", filters.preset);
    writeSearchParam(searchParams, "from", filters.preset === "custom" ? filters.from : null);
    writeSearchParam(searchParams, "to", filters.preset === "custom" ? filters.to : null);
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function useAdminDashboardState(initialFilters: AdminDashboardFilters) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [customRange, setCustomRange] = useState({ from: initialFilters.from, to: initialFilters.to });
  const customRangeError = getAdminDashboardCustomRangeError(customRange);

  useEffect(() => {
    window.history.replaceState(null, "", buildAdminDashboardUrl(pathname, filters, window.location.search));
  }, [filters, pathname]);

  useEffect(() => {
    if (filters.preset !== "custom") {
      return;
    }

    if (customRangeError || !customRange.from || !customRange.to) {
      return;
    }

    setFilters({ preset: "custom", from: customRange.from, to: customRange.to });
  }, [customRange, customRangeError, filters.preset]);

  function setPreset(preset: AdminDashboardPreset) {
    setFilters((current) => ({
      preset,
      from: preset === "custom" ? current.from : null,
      to: preset === "custom" ? current.to : null,
    }));
  }

  function setCustomDateRange(nextRange: { from: string | null; to: string | null }) {
    const nextRangeError = getAdminDashboardCustomRangeError(nextRange);
    setCustomRange(nextRange);
    setFilters((current) => ({
      preset: "custom",
      from: nextRangeError ? current.from : nextRange.from,
      to: nextRangeError ? current.to : nextRange.to,
    }));
  }

  return { filters, customRange, customRangeError, setPreset, setCustomDateRange };
}
```

- [ ] **Step 4: Run the state test to verify it passes**

Run: `pnpm test -- tests/unit/app/admin/use-admin-dashboard-state.test.ts`
Expected: PASS with the URL assertions and custom-range validation green.

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/admin/_components/admin-dashboard-query.ts src/app/(admin)/admin/_components/use-admin-dashboard-state.ts tests/unit/app/admin/use-admin-dashboard-state.test.ts
git commit -m "feat(admin): add dashboard query adapter and state"
```

### Task 5: Assemble The Dashboard UI And Replace The Placeholder Page

**Files:**
- Create: `src/app/(admin)/admin/_components/admin-dashboard-page.tsx`
- Create: `src/app/(admin)/admin/_components/admin-dashboard-sales-chart.tsx`
- Create: `src/app/(admin)/admin/_components/admin-dashboard-member-growth-chart.tsx`
- Create: `src/app/(admin)/admin/_components/admin-dashboard-transactions-chart.tsx`
- Create: `src/app/(admin)/admin/_components/admin-dashboard-subscription-composition-card.tsx`
- Create: `src/app/(admin)/admin/_components/admin-dashboard-recent-users-table.tsx`
- Delete: `src/app/(admin)/admin/_components/admin-overview-page.tsx`
- Test: `tests/unit/app/admin/admin-dashboard-page.test.tsx`

- [ ] **Step 1: Write the failing page-component test**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminDashboardPage } from "@/app/(admin)/admin/_components/admin-dashboard-page";

describe("app/admin/admin-dashboard-page", () => {
  it("renders summary cards, range controls, charts, and the Recent Users table", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AdminDashboardPage
          initialError={null}
          initialFilters={{ preset: "30d", from: null, to: null }}
          initialSnapshot={{
            summary: {
              totalMembers: 8,
              totalSubscribedMembers: 4,
              totalAssets: 12,
              totalSuccessAmountRp: 500000,
            },
            salesSeries: [{ bucketKey: "2026-04-01", bucketLabel: "01 Apr", amountRp: 200000 }],
            memberGrowthSeries: [{ bucketKey: "2026-04-01", bucketLabel: "01 Apr", newMembers: 1, subscribedMembers: 3 }],
            transactionSeries: [{ bucketKey: "2026-04-01", bucketLabel: "01 Apr", successCount: 2 }],
            subscriptionComposition: { private: 3, share: 1, mixed: 2 },
            recentUsers: [
              {
                userId: "member-1",
                username: "alpha",
                email: "alpha@example.com",
                avatarUrl: null,
                role: "member",
                activePackageName: "Starter",
                lastSeenAt: "2026-04-20T11:00:00.000Z",
              },
            ],
            range: {
              preset: "30d",
              from: "2026-03-22",
              to: "2026-04-20",
              fromIso: "2026-03-22T00:00:00.000Z",
              toIso: "2026-04-20T23:59:59.999Z",
              label: "30 hari",
            },
          }}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Total Member")).toBeInTheDocument();
    expect(screen.getByText("Sales Trend")).toBeInTheDocument();
    expect(screen.getByText("Member Growth")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Recent Users")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /30 hari/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /90 hari/i })).toBeInTheDocument();
    expect(screen.getByText("alpha@example.com")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the page-component test to verify it fails**

Run: `pnpm test -- tests/unit/app/admin/admin-dashboard-page.test.tsx`
Expected: FAIL because `AdminDashboardPage` does not exist.

- [ ] **Step 3: Implement the client page and visual widgets**

```tsx
// src/app/(admin)/admin/_components/admin-dashboard-page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

import { AdminDashboardMemberGrowthChart } from "./admin-dashboard-member-growth-chart";
import { fetchAdminDashboardSnapshot, getAdminDashboardQueryKey } from "./admin-dashboard-query";
import { AdminDashboardRecentUsersTable } from "./admin-dashboard-recent-users-table";
import { AdminDashboardSalesChart } from "./admin-dashboard-sales-chart";
import { AdminDashboardSubscriptionCompositionCard } from "./admin-dashboard-subscription-composition-card";
import { AdminDashboardTransactionsChart } from "./admin-dashboard-transactions-chart";
import { useAdminDashboardState } from "./use-admin-dashboard-state";

import type { AdminDashboardFilters, AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

type AdminDashboardPageProps = {
  initialError: string | null;
  initialFilters: AdminDashboardFilters;
  initialSnapshot: AdminDashboardSnapshot;
};

export function AdminDashboardPage({ initialError, initialFilters, initialSnapshot }: AdminDashboardPageProps) {
  const state = useAdminDashboardState(initialFilters);
  const dashboardQuery = useQuery({
    queryKey: getAdminDashboardQueryKey(state.filters),
    queryFn: () => fetchAdminDashboardSnapshot(state.filters),
    initialData: initialSnapshot,
    placeholderData: (previousData) => previousData,
  });

  const snapshot = dashboardQuery.data ?? initialSnapshot;
  const resolvedError = dashboardQuery.error instanceof Error ? dashboardQuery.error.message : initialError;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {resolvedError ? (
        <Alert>
          <AlertTitle>Dashboard gagal dimuat</AlertTitle>
          <AlertDescription>{resolvedError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60 shadow-xs"><CardContent className="p-5"><p className="text-muted-foreground text-sm">Total Member</p><p className="mt-2 font-semibold text-2xl tabular-nums">{snapshot.summary.totalMembers.toLocaleString("id-ID")}</p></CardContent></Card>
        <Card className="border-border/60 shadow-xs"><CardContent className="p-5"><p className="text-muted-foreground text-sm">Member Berlangganan</p><p className="mt-2 font-semibold text-2xl tabular-nums">{snapshot.summary.totalSubscribedMembers.toLocaleString("id-ID")}</p></CardContent></Card>
        <Card className="border-border/60 shadow-xs"><CardContent className="p-5"><p className="text-muted-foreground text-sm">Total Asset</p><p className="mt-2 font-semibold text-2xl tabular-nums">{snapshot.summary.totalAssets.toLocaleString("id-ID")}</p></CardContent></Card>
        <Card className="border-border/60 shadow-xs"><CardContent className="p-5"><p className="text-muted-foreground text-sm">Total Transaksi Sukses</p><p className="mt-2 font-semibold text-2xl tabular-nums">{formatCurrency(snapshot.summary.totalSuccessAmountRp, { currency: "IDR", locale: "id-ID", noDecimals: true })}</p></CardContent></Card>
      </div>

      <AdminDashboardSalesChart snapshot={snapshot} state={state} isFetching={dashboardQuery.isFetching} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <AdminDashboardMemberGrowthChart series={snapshot.memberGrowthSeries} />
        <AdminDashboardRecentUsersTable users={snapshot.recentUsers} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <AdminDashboardTransactionsChart series={snapshot.transactionSeries} />
        <AdminDashboardSubscriptionCompositionCard composition={snapshot.subscriptionComposition} />
      </div>
    </div>
  );
}
```

```tsx
// src/app/(admin)/admin/_components/admin-dashboard-sales-chart.tsx
"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { AdminTableDateRangeFilter } from "@/components/shared/table-filters/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

export function AdminDashboardSalesChart({ snapshot, state, isFetching }: { snapshot: AdminDashboardSnapshot; state: ReturnType<typeof import("./use-admin-dashboard-state").useAdminDashboardState>; isFetching: boolean }) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle>Sales Trend</CardTitle>
        <CardAction className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={state.filters.preset === "30d" ? "default" : "outline"} onClick={() => state.setPreset("30d")}>30 hari</Button>
          <Button type="button" size="sm" variant={state.filters.preset === "90d" ? "default" : "outline"} onClick={() => state.setPreset("90d")}>90 hari</Button>
          <AdminTableDateRangeFilter label="Custom range" value={state.customRange} onChange={state.setCustomDateRange} />
          {isFetching ? <span className="text-muted-foreground text-xs">Updating…</span> : null}
        </CardAction>
      </CardHeader>
      <CardContent>
        {state.customRangeError ? <p className="mb-3 text-destructive text-sm">{state.customRangeError}</p> : null}
        <ChartContainer className="h-72 w-full" config={{ amountRp: { label: "Sales", color: "var(--chart-1)" } }}>
          <AreaChart data={snapshot.salesSeries}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Area dataKey="amountRp" type="monotone" stroke="var(--color-amountRp)" fill="var(--color-amountRp)" fillOpacity={0.15} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/app/(admin)/admin/_components/admin-dashboard-recent-users-table.tsx
"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import type { AdminDashboardRecentUserRow } from "@/modules/admin/dashboard/types";

function formatAbsoluteDateTime(value: string) {
  return format(new Date(value), "dd/MM/yy HH:mm");
}

export function AdminDashboardRecentUsersTable({ users }: { users: AdminDashboardRecentUserRow[] }) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader><CardTitle>Recent Users</CardTitle></CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada aktivitas user yang bisa ditampilkan.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Paket Aktif</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 rounded-full">
                        <AvatarImage alt={user.username} src={user.avatarUrl ?? undefined} />
                        <AvatarFallback className={getAvatarToneClass(user.userId)}>{getInitials(user.username)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.username}</p>
                        <p className="truncate text-muted-foreground text-xs">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>{user.activePackageName ?? "Belum ada"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatAbsoluteDateTime(user.lastSeenAt)}</span>
                      <span className="text-muted-foreground text-xs">{formatDistanceToNowStrict(new Date(user.lastSeenAt), { addSuffix: true, locale: indonesiaLocale })}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/app/(admin)/admin/_components/admin-dashboard-member-growth-chart.tsx
"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

export function AdminDashboardMemberGrowthChart({ series }: { series: AdminDashboardSnapshot["memberGrowthSeries"] }) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader><CardTitle>Member Growth</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer
          className="h-72 w-full"
          config={{ newMembers: { label: "Member Baru", color: "var(--chart-2)" }, subscribedMembers: { label: "Member Berlangganan", color: "var(--chart-1)" } }}
        >
          <LineChart data={series}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Line type="monotone" dataKey="newMembers" stroke="var(--color-newMembers)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="subscribedMembers" stroke="var(--color-subscribedMembers)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/app/(admin)/admin/_components/admin-dashboard-transactions-chart.tsx
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

export function AdminDashboardTransactionsChart({ series }: { series: AdminDashboardSnapshot["transactionSeries"] }) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer className="h-72 w-full" config={{ successCount: { label: "Transaksi Sukses", color: "var(--chart-3)" } }}>
          <BarChart data={series}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="successCount" fill="var(--color-successCount)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/app/(admin)/admin/_components/admin-dashboard-subscription-composition-card.tsx
"use client";

import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type SubscriptionComposition = {
  private: number;
  share: number;
  mixed: number;
};

export function AdminDashboardSubscriptionCompositionCard({ composition }: { composition: SubscriptionComposition }) {
  const chartData = [
    { key: "private", label: "Private", value: composition.private, fill: "var(--chart-1)" },
    { key: "share", label: "Share", value: composition.share, fill: "var(--chart-2)" },
    { key: "mixed", label: "Mixed", value: composition.mixed, fill: "var(--chart-4)" },
  ];

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader><CardTitle>Subscription Composition</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer className="h-60 w-full" config={{ private: { label: "Private", color: "var(--chart-1)" }, share: { label: "Share", color: "var(--chart-2)" }, mixed: { label: "Mixed", color: "var(--chart-4)" } }}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Pie data={chartData} dataKey="value" innerRadius={56} outerRadius={88} paddingAngle={4}>
              {chartData.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 p-3"><p className="text-muted-foreground text-xs">Private</p><p className="mt-1 font-semibold tabular-nums">{composition.private}</p></div>
          <div className="rounded-xl border border-border/60 p-3"><p className="text-muted-foreground text-xs">Share</p><p className="mt-1 font-semibold tabular-nums">{composition.share}</p></div>
          <div className="rounded-xl border border-border/60 p-3"><p className="text-muted-foreground text-xs">Mixed</p><p className="mt-1 font-semibold tabular-nums">{composition.mixed}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run the page-component test to verify it passes**

Run: `pnpm test -- tests/unit/app/admin/admin-dashboard-page.test.tsx`
Expected: PASS with the dashboard surface rendered.

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/admin/_components/admin-dashboard-page.tsx src/app/(admin)/admin/_components/admin-dashboard-sales-chart.tsx src/app/(admin)/admin/_components/admin-dashboard-member-growth-chart.tsx src/app/(admin)/admin/_components/admin-dashboard-transactions-chart.tsx src/app/(admin)/admin/_components/admin-dashboard-subscription-composition-card.tsx src/app/(admin)/admin/_components/admin-dashboard-recent-users-table.tsx tests/unit/app/admin/admin-dashboard-page.test.tsx
git rm src/app/(admin)/admin/_components/admin-overview-page.tsx
git commit -m "feat(admin): build milestone 9 dashboard ui"
```

### Task 6: Run Repository Checks, Browser QA, And Backend Proof

**Files:**
- Verify: `.next/dev/logs/*.log`
- Verify: runtime `/admin`

- [ ] **Step 1: Run focused unit tests, then the repo quality gates**

Run:

```bash
pnpm test -- tests/unit/modules/admin/dashboard/schemas.test.ts tests/unit/modules/admin/dashboard/queries.test.ts tests/unit/modules/admin/dashboard/actions.test.ts tests/unit/app/admin/page.test.ts tests/unit/app/admin/use-admin-dashboard-state.test.ts tests/unit/app/admin/admin-dashboard-page.test.tsx
pnpm lint
pnpm typecheck
pnpm check
pnpm test
```

Expected:
- all dashboard-focused tests PASS first
- lint/typecheck/check/test finish green

- [ ] **Step 2: Run the Next.js runtime verification**

Use Next.js devtools MCP against the running dev server:

```text
next-devtools_init({ project_path: "/home/ongkay/coding/00/AssetProject" })
next-devtools_nextjs_index({})
next-devtools_nextjs_call({ port: "<detected-port>", toolName: "get_errors" })
```

Expected:
- the project indexes successfully
- `get_errors` returns no relevant `/admin` runtime or compilation error

- [ ] **Step 3: Run browser verification for the real route**

Use `agent-browser` first, or Playwright CLI only if agent-browser cannot complete a step.

Manual browser checklist:
- open `/login`
- sign in as `seed.admin.browser@assetnext.dev` with `Devpass123`
- confirm redirect to `/admin`
- verify the four summary cards render
- verify default range is `30 hari`
- switch to `90 hari` and confirm at least one metric or chart changes
- pick a valid custom range and confirm the dashboard refetches without layout breakage
- pick an invalid custom range and confirm the fetch is blocked locally
- verify `Recent Users` shows `avatar + username + email`, `role`, `paket aktif`, and formatted `last seen`
- log out, sign in as a non-admin member, and confirm `/admin` access is denied

- [ ] **Step 4: Check Next.js dev logs for relevant errors**

Run:

```bash
rg -n "error|exception|failed" .next/dev/logs
```

Expected:
- no relevant Milestone 9 errors remain for `/admin`

- [ ] **Step 5: Prove the backend aggregates against the runtime project**

Run:

```bash
npx @insforge/cli whoami
npx @insforge/cli current
npx @insforge/cli db rpc get_admin_dashboard_stats --data '{"p_from":"2026-03-22T00:00:00Z","p_to":"2026-04-20T23:59:59Z"}'
npx @insforge/cli db query "select user_id, username, email, last_seen_at from public.v_live_users order by last_seen_at desc limit 5" --json
```

Expected:
- CLI points to the same runtime project used by the app
- RPC output aligns with the summary card values for the same range
- `v_live_users` rows align with the `Recent Users` ordering used by the page

- [ ] **Step 6: Commit any last verification-driven fixes**

```bash
git add src/app/(admin)/admin/page.tsx src/app/(admin)/admin/_components src/modules/admin/dashboard tests/unit/app/admin tests/unit/modules/admin/dashboard
git commit -m "fix(admin): finish milestone 9 dashboard verification"
```
