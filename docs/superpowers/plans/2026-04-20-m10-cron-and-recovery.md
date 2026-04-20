# Milestone 10 Cron And Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trusted cron routes, repo-managed one-minute scheduling, and repeatable verification for subscription expiry plus invalid-asset reconciliation without pulling extension-route delivery into Milestone 10.

**Architecture:** Keep the SQL baseline as the reconciliation engine, and add the missing app-layer trigger surface around it. Two thin App Router route handlers under `src/app/api/cron/**` authenticate a trusted bearer secret, delegate into new subscriptions-domain cron services, and return small JSON payloads. A root `vercel.json` file owns the one-minute schedule for each route so natural expiry and reconciliation no longer depend on manual replay.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript strict, Vitest, InsForge admin database adapter, Vercel cron config, pnpm.

---

## File Map

- Create: `src/lib/cron.ts`
- Create: `src/app/api/cron/expire-subscriptions/route.ts`
- Create: `src/app/api/cron/reconcile-invalid-assets/route.ts`
- Create: `tests/unit/lib/cron.test.ts`
- Create: `tests/unit/modules/subscriptions/cron-repositories.test.ts`
- Create: `tests/unit/modules/subscriptions/cron-services.test.ts`
- Create: `tests/unit/app/api/cron/route-handlers.test.ts`
- Create: `tests/unit/app/api/cron/vercel-config.test.ts`
- Create: `vercel.json`
- Modify: `src/modules/subscriptions/types.ts`
- Modify: `src/modules/subscriptions/repositories.ts`
- Modify: `src/modules/subscriptions/services.ts`

## Task 1: Add Trusted Cron Helper

**Files:**
- Create: `src/lib/cron.ts`
- Test: `tests/unit/lib/cron.test.ts`

- [ ] **Step 1: Write the failing helper test**

```ts
import { describe, expect, it } from "vitest";

import { CronAuthorizationError, assertTrustedCronRequest, buildCronErrorResponse } from "@/lib/cron";

describe("lib/cron", () => {
  it("accepts the configured bearer token", () => {
    const request = new Request("https://assetnext.dev/api/cron/expire-subscriptions", {
      headers: {
        authorization: "Bearer cron-secret",
      },
    });

    expect(() => assertTrustedCronRequest(request)).not.toThrow();
  });

  it("throws a CronAuthorizationError when the bearer token is missing", () => {
    const request = new Request("https://assetnext.dev/api/cron/expire-subscriptions");

    expect(() => assertTrustedCronRequest(request)).toThrow(CronAuthorizationError);
  });

  it("maps authorization failures to a 401 JSON response", async () => {
    const response = buildCronErrorResponse(new CronAuthorizationError());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "CRON_UNAUTHORIZED",
        message: "Unauthorized cron request.",
      },
    });
  });

  it("maps unexpected failures to a 500 JSON response", async () => {
    const response = buildCronErrorResponse(new Error("rpc exploded"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "CRON_JOB_FAILED",
        message: "Cron job failed.",
      },
    });
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run: `pnpm vitest run tests/unit/lib/cron.test.ts`

Expected: FAIL because `@/lib/cron` does not exist yet.

- [ ] **Step 3: Implement the minimal cron helper**

```ts
import "server-only";

import { env } from "@/config/env.server";

export class CronAuthorizationError extends Error {
  constructor() {
    super("Unauthorized cron request.");
    this.name = "CronAuthorizationError";
  }
}

export function assertTrustedCronRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const expectedAuthorization = `Bearer ${env.CRON_SECRET}`;

  if (authorization !== expectedAuthorization) {
    throw new CronAuthorizationError();
  }
}

export function buildCronErrorResponse(error: unknown) {
  if (error instanceof CronAuthorizationError) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CRON_UNAUTHORIZED",
          message: "Unauthorized cron request.",
        },
      },
      { status: 401 },
    );
  }

  return Response.json(
    {
      ok: false,
      error: {
        code: "CRON_JOB_FAILED",
        message: "Cron job failed.",
      },
    },
    { status: 500 },
  );
}
```

- [ ] **Step 4: Run the helper test again**

Run: `pnpm vitest run tests/unit/lib/cron.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the helper slice**

```bash
git add src/lib/cron.ts tests/unit/lib/cron.test.ts
git commit -m "feat: add trusted cron request helper"
```

## Task 2: Add Subscription Cron Repository And Service Contracts

**Files:**
- Modify: `src/modules/subscriptions/types.ts`
- Modify: `src/modules/subscriptions/repositories.ts`
- Modify: `src/modules/subscriptions/services.ts`
- Test: `tests/unit/modules/subscriptions/cron-repositories.test.ts`
- Test: `tests/unit/modules/subscriptions/cron-services.test.ts`

- [ ] **Step 1: Write the failing repository and service tests**

```ts
// tests/unit/modules/subscriptions/cron-repositories.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

describe("subscriptions cron repositories", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("returns the processed count from expire_subscriptions_job", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 2, error: null });
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { runExpireSubscriptionsJobRpc } = await import("@/modules/subscriptions/repositories");

    await expect(runExpireSubscriptionsJobRpc()).resolves.toBe(2);
    expect(rpc).toHaveBeenCalledWith("expire_subscriptions_job");
  });

  it("returns the processed count from reconcile_invalid_assets_job", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 5, error: null });
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { runReconcileInvalidAssetsJobRpc } = await import("@/modules/subscriptions/repositories");

    await expect(runReconcileInvalidAssetsJobRpc()).resolves.toBe(5);
    expect(rpc).toHaveBeenCalledWith("reconcile_invalid_assets_job");
  });
});
```

```ts
// tests/unit/modules/subscriptions/cron-services.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/subscriptions/repositories", () => ({
  runExpireSubscriptionsJobRpc: vi.fn(),
  runReconcileInvalidAssetsJobRpc: vi.fn(),
}));

import * as subscriptionRepositories from "@/modules/subscriptions/repositories";

describe("subscriptions cron services", () => {
  const mockedRunExpireSubscriptionsJobRpc = vi.mocked(subscriptionRepositories.runExpireSubscriptionsJobRpc);
  const mockedRunReconcileInvalidAssetsJobRpc = vi.mocked(subscriptionRepositories.runReconcileInvalidAssetsJobRpc);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
    mockedRunExpireSubscriptionsJobRpc.mockReset();
    mockedRunReconcileInvalidAssetsJobRpc.mockReset();
  });

  it("builds the expire-subscriptions cron payload", async () => {
    mockedRunExpireSubscriptionsJobRpc.mockResolvedValue(2);

    const { runExpireSubscriptionsCronJob } = await import("@/modules/subscriptions/services");

    await expect(runExpireSubscriptionsCronJob()).resolves.toEqual({
      ok: true,
      job: "expire-subscriptions",
      processedCount: 2,
      executedAt: "2026-04-20T12:00:00.000Z",
    });
  });

  it("builds the reconcile-invalid-assets cron payload", async () => {
    mockedRunReconcileInvalidAssetsJobRpc.mockResolvedValue(3);

    const { runReconcileInvalidAssetsCronJob } = await import("@/modules/subscriptions/services");

    await expect(runReconcileInvalidAssetsCronJob()).resolves.toEqual({
      ok: true,
      job: "reconcile-invalid-assets",
      processedCount: 3,
      executedAt: "2026-04-20T12:00:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Run the repository and service tests to verify they fail**

Run: `pnpm vitest run tests/unit/modules/subscriptions/cron-repositories.test.ts tests/unit/modules/subscriptions/cron-services.test.ts`

Expected: FAIL because the new repository and service exports do not exist yet.

- [ ] **Step 3: Implement the minimal subscription cron contracts**

```ts
// src/modules/subscriptions/types.ts
export type SubscriptionCronJobName = "expire-subscriptions" | "reconcile-invalid-assets";

export type SubscriptionCronJobResult = {
  ok: true;
  job: SubscriptionCronJobName;
  processedCount: number;
  executedAt: string;
};
```

```ts
// src/modules/subscriptions/repositories.ts
export async function runExpireSubscriptionsJobRpc(): Promise<number> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database.rpc("expire_subscriptions_job");

  if (error) {
    throw error;
  }

  return typeof data === "number" ? data : 0;
}

export async function runReconcileInvalidAssetsJobRpc(): Promise<number> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database.rpc("reconcile_invalid_assets_job");

  if (error) {
    throw error;
  }

  return typeof data === "number" ? data : 0;
}
```

```ts
// src/modules/subscriptions/services.ts
import {
  runExpireSubscriptionsJobRpc,
  runReconcileInvalidAssetsJobRpc,
} from "./repositories";

import type { SubscriptionCronJobName, SubscriptionCronJobResult } from "./types";

function buildSubscriptionCronJobResult(
  job: SubscriptionCronJobName,
  processedCount: number,
  now = new Date(),
): SubscriptionCronJobResult {
  return {
    ok: true,
    job,
    processedCount,
    executedAt: now.toISOString(),
  };
}

export async function runExpireSubscriptionsCronJob(now = new Date()): Promise<SubscriptionCronJobResult> {
  const processedCount = await runExpireSubscriptionsJobRpc();
  return buildSubscriptionCronJobResult("expire-subscriptions", processedCount, now);
}

export async function runReconcileInvalidAssetsCronJob(now = new Date()): Promise<SubscriptionCronJobResult> {
  const processedCount = await runReconcileInvalidAssetsJobRpc();
  return buildSubscriptionCronJobResult("reconcile-invalid-assets", processedCount, now);
}
```

- [ ] **Step 4: Run the repository and service tests again**

Run: `pnpm vitest run tests/unit/modules/subscriptions/cron-repositories.test.ts tests/unit/modules/subscriptions/cron-services.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the subscription cron slice**

```bash
git add src/modules/subscriptions/types.ts src/modules/subscriptions/repositories.ts src/modules/subscriptions/services.ts tests/unit/modules/subscriptions/cron-repositories.test.ts tests/unit/modules/subscriptions/cron-services.test.ts
git commit -m "feat: add subscription cron job services"
```

## Task 3: Add Trusted Cron Route Handlers

**Files:**
- Create: `src/app/api/cron/expire-subscriptions/route.ts`
- Create: `src/app/api/cron/reconcile-invalid-assets/route.ts`
- Test: `tests/unit/app/api/cron/route-handlers.test.ts`

- [ ] **Step 1: Write the failing route-handler test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/subscriptions/services", () => ({
  runExpireSubscriptionsCronJob: vi.fn(),
  runReconcileInvalidAssetsCronJob: vi.fn(),
}));

import * as subscriptionServices from "@/modules/subscriptions/services";

describe("cron route handlers", () => {
  const mockedRunExpireSubscriptionsCronJob = vi.mocked(subscriptionServices.runExpireSubscriptionsCronJob);
  const mockedRunReconcileInvalidAssetsCronJob = vi.mocked(subscriptionServices.runReconcileInvalidAssetsCronJob);

  beforeEach(() => {
    mockedRunExpireSubscriptionsCronJob.mockReset();
    mockedRunReconcileInvalidAssetsCronJob.mockReset();
  });

  it("returns 200 from expire-subscriptions when the bearer token is valid", async () => {
    mockedRunExpireSubscriptionsCronJob.mockResolvedValue({
      ok: true,
      job: "expire-subscriptions",
      processedCount: 4,
      executedAt: "2026-04-20T12:00:00.000Z",
    });

    const { GET } = await import("@/app/api/cron/expire-subscriptions/route");
    const response = await GET(
      new Request("https://assetnext.dev/api/cron/expire-subscriptions", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      job: "expire-subscriptions",
      processedCount: 4,
      executedAt: "2026-04-20T12:00:00.000Z",
    });
  });

  it("returns 401 from expire-subscriptions when the bearer token is missing", async () => {
    const { GET } = await import("@/app/api/cron/expire-subscriptions/route");
    const response = await GET(new Request("https://assetnext.dev/api/cron/expire-subscriptions"));

    expect(response.status).toBe(401);
  });

  it("returns 200 from reconcile-invalid-assets when the bearer token is valid", async () => {
    mockedRunReconcileInvalidAssetsCronJob.mockResolvedValue({
      ok: true,
      job: "reconcile-invalid-assets",
      processedCount: 1,
      executedAt: "2026-04-20T12:00:00.000Z",
    });

    const { GET } = await import("@/app/api/cron/reconcile-invalid-assets/route");
    const response = await GET(
      new Request("https://assetnext.dev/api/cron/reconcile-invalid-assets", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      job: "reconcile-invalid-assets",
      processedCount: 1,
      executedAt: "2026-04-20T12:00:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Run the route-handler test to verify it fails**

Run: `pnpm vitest run tests/unit/app/api/cron/route-handlers.test.ts`

Expected: FAIL because the cron route files do not exist yet.

- [ ] **Step 3: Implement the cron route handlers**

```ts
// src/app/api/cron/expire-subscriptions/route.ts
import { buildCronErrorResponse, assertTrustedCronRequest } from "@/lib/cron";
import { runExpireSubscriptionsCronJob } from "@/modules/subscriptions/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertTrustedCronRequest(request);
    const result = await runExpireSubscriptionsCronJob();
    return Response.json(result);
  } catch (error) {
    return buildCronErrorResponse(error);
  }
}
```

```ts
// src/app/api/cron/reconcile-invalid-assets/route.ts
import { buildCronErrorResponse, assertTrustedCronRequest } from "@/lib/cron";
import { runReconcileInvalidAssetsCronJob } from "@/modules/subscriptions/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertTrustedCronRequest(request);
    const result = await runReconcileInvalidAssetsCronJob();
    return Response.json(result);
  } catch (error) {
    return buildCronErrorResponse(error);
  }
}
```

- [ ] **Step 4: Run the route-handler test again**

Run: `pnpm vitest run tests/unit/app/api/cron/route-handlers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the route-handler slice**

```bash
git add src/app/api/cron/expire-subscriptions/route.ts src/app/api/cron/reconcile-invalid-assets/route.ts tests/unit/app/api/cron/route-handlers.test.ts
git commit -m "feat: add trusted cron route handlers"
```

## Task 4: Add Repo-Managed Scheduler Config

**Files:**
- Create: `vercel.json`
- Test: `tests/unit/app/api/cron/vercel-config.test.ts`

- [ ] **Step 1: Write the failing scheduler-config test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("vercel cron config", () => {
  it("registers both cron routes on one-minute schedules", () => {
    const raw = readFileSync(resolve(process.cwd(), "vercel.json"), "utf8");
    const config = JSON.parse(raw) as {
      $schema: string;
      crons: Array<{ path: string; schedule: string }>;
    };

    expect(config).toEqual({
      $schema: "https://openapi.vercel.sh/vercel.json",
      crons: [
        {
          path: "/api/cron/expire-subscriptions",
          schedule: "* * * * *",
        },
        {
          path: "/api/cron/reconcile-invalid-assets",
          schedule: "* * * * *",
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Run the scheduler-config test to verify it fails**

Run: `pnpm vitest run tests/unit/app/api/cron/vercel-config.test.ts`

Expected: FAIL because `vercel.json` does not exist yet.

- [ ] **Step 3: Add the repo-managed Vercel cron config**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/expire-subscriptions",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/reconcile-invalid-assets",
      "schedule": "* * * * *"
    }
  ]
}
```

- [ ] **Step 4: Run the scheduler-config test again**

Run: `pnpm vitest run tests/unit/app/api/cron/vercel-config.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the scheduler slice**

```bash
git add vercel.json tests/unit/app/api/cron/vercel-config.test.ts
git commit -m "chore: add repo-managed cron schedules"
```

## Task 5: Run Regression, Browser, And CLI Verification

**Files:**
- Test: `tests/unit/lib/cron.test.ts`
- Test: `tests/unit/modules/subscriptions/cron-repositories.test.ts`
- Test: `tests/unit/modules/subscriptions/cron-services.test.ts`
- Test: `tests/unit/app/api/cron/route-handlers.test.ts`
- Test: `tests/unit/app/api/cron/vercel-config.test.ts`

- [ ] **Step 1: Run the focused cron regression suite**

Run: `pnpm vitest run tests/unit/lib/cron.test.ts tests/unit/modules/subscriptions/cron-repositories.test.ts tests/unit/modules/subscriptions/cron-services.test.ts tests/unit/app/api/cron/route-handlers.test.ts tests/unit/app/api/cron/vercel-config.test.ts tests/unit/modules/assets/services.test.ts tests/unit/modules/console/query-read-paths.test.ts`

Expected: PASS. This confirms the new cron surface works and that the existing immediate-recheck plus console read-path guards still hold.

- [ ] **Step 2: Run the repo quality gates**

Run: `pnpm lint && pnpm typecheck && pnpm test`

Expected: all commands PASS.

- [ ] **Step 3: Run browser verification on the impacted flows**

Run: `pnpm dev`

Expected: the app boots locally without runtime errors.

Then use `agent-browser` against the local dev server and execute this exact Milestone 10 checklist:
- log in as `seed.admin.browser@assetnext.dev`
- disable an asset currently used by an active member and refresh that member’s `/console`
- verify the old asset disappears immediately from the active read path
- verify a replacement asset appears when inventory allows it
- verify the subscription falls back to `processed` when replacement inventory is unavailable
- hard delete an in-use asset and verify history remains visible while active access is repaired or downgraded
- set up a naturally expired assigned asset, wait one cron cycle, then refresh `/console` or `/admin/subscriber`
- verify a naturally expired subscription no longer exposes active assets
- open `/api/cron/expire-subscriptions` in a normal browser tab without the bearer secret and verify the response is denied
- open `/api/cron/reconcile-invalid-assets` in a normal browser tab without the bearer secret and verify the response is denied

- [ ] **Step 4: Run the InsForge CLI invariant checks**

Run: `npx @insforge/cli whoami`

Expected: the CLI resolves the active identity for the same runtime project.

Run: `npx @insforge/cli current`

Expected: the linked project matches the app runtime target.

Run: `npx @insforge/cli db rpc expire_subscriptions_job --json`

Expected: JSON output with a numeric processed count.

Run: `npx @insforge/cli db rpc reconcile_invalid_assets_job --json`

Expected: JSON output with a numeric processed count.

Run: `npx @insforge/cli db query "select status, end_at from public.subscriptions where status = 'expired' order by updated_at desc limit 10" --json`

Expected: at least one recent `expired` row after the expiry job runs.

Run: `npx @insforge/cli db query "select subscription_id, access_key, revoked_at, revoke_reason from public.asset_assignments where revoked_at is not null order by revoked_at desc limit 20" --json`

Expected: recent revoked assignments with reasons such as `subscription_expired`, `asset_unavailable`, or `asset_deleted`.

Run: `npx @insforge/cli schedules list`

Expected: schedule entries for both cron routes are visible.

- [ ] **Step 5: Commit the verified milestone slice**

```bash
git add src/lib/cron.ts src/app/api/cron/expire-subscriptions/route.ts src/app/api/cron/reconcile-invalid-assets/route.ts src/modules/subscriptions/types.ts src/modules/subscriptions/repositories.ts src/modules/subscriptions/services.ts tests/unit/lib/cron.test.ts tests/unit/modules/subscriptions/cron-repositories.test.ts tests/unit/modules/subscriptions/cron-services.test.ts tests/unit/app/api/cron/route-handlers.test.ts tests/unit/app/api/cron/vercel-config.test.ts vercel.json
git commit -m "feat: implement milestone 10 cron and recovery"
```

## Self-Review Checklist

- Spec coverage:
  - trusted cron route per job -> Tasks 1 through 3
  - repo-managed one-minute scheduler -> Task 4
  - immediate disable/edit expiry regression proof -> Task 5 focused test suite plus browser proof
  - natural asset expiry proof -> Task 5 browser and CLI verification
  - natural subscription expiry proof -> Task 5 browser and CLI verification
  - browser denial of trusted routes -> Task 3 tests plus Task 5 browser check
  - Milestone 11 kept out of scope -> no `/api/extension/*` file changes in the file map
- Placeholder scan: no `TODO`, `TBD`, or unresolved path markers remain in this plan.
- Type consistency:
  - `SubscriptionCronJobName` only uses `expire-subscriptions` and `reconcile-invalid-assets`
  - repositories export `runExpireSubscriptionsJobRpc` and `runReconcileInvalidAssetsJobRpc`
  - services export `runExpireSubscriptionsCronJob` and `runReconcileInvalidAssetsCronJob`
