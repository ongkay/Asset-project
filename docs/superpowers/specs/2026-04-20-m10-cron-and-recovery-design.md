---
title: Milestone 10 Cron And Recovery Design
version: 1.0
date_created: 2026-04-20
last_updated: 2026-04-20
owner: AssetProject
tags: [design, cron, recovery, reconciliation, subscriptions, assets, milestone-10]
---

# Introduction
This document defines the approved design direction for Milestone 10 `Cron and Recovery`. It translates the milestone scope from `docs/IMPLEMENTATION_PLAN.md`, the business rules from `docs/PRD.md`, and the existing repo state after Milestone 9 into an implementation-ready design contract.

The milestone goal is to close the gap between mutation-time recovery and background reconciliation so that invalid access no longer survives in active read paths. The design keeps the existing SQL baseline as the source of truth for reconciliation behavior while adding the missing trusted cron trigger layer, repo-managed scheduling, and repeatable browser plus CLI proof paths.

This design intentionally stays within Milestone 10 scope only:
- trusted cron triggers for subscription expiry and invalid-asset reconciliation
- repo-managed one-minute scheduler wiring
- proof that active web read paths stay correct after disable, delete, expiry, or status change
- proof that trusted cron routes are not callable by regular browser users

This design does not pull Milestone 11 work into the current slice. It does not create `/api/extension/*` routes early. It only preserves the contract that extension read paths must remain compatible with the same invalid-asset enforcement rules when Milestone 11 is implemented.

## 1. Source Of Truth And Current Repo State

### 1.1 Source Documents
This design must remain consistent with:
- `docs/PRD.md`
- `docs/DB.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`

### 1.2 Existing Repo Facts This Design Builds On
The current repo already contains part of the recovery foundation:
- `src/modules/assets/services.ts` already triggers `recheck_subscription_after_asset_change` when an in-use asset is disabled
- `src/modules/assets/services.ts` already triggers immediate recheck when an in-use asset becomes instantly expired after edit
- `src/modules/assets/repositories.ts` already delegates hard delete to `delete_asset_safely`
- `src/modules/console/queries.ts` already reads `/console` data from baseline RPCs instead of direct broad table reads
- `src/config/env.server.ts` already contains `CRON_SECRET`

The main missing piece is the trusted cron route and scheduler layer. The repo currently has no `src/app/api/*` route handlers and no scheduler config file in the root.

### 1.3 Explicit Milestone Boundary
The user approved that Milestone 10 remains a pure cron-and-recovery slice.

Approved boundary:
- implement trusted cron routes now
- implement repo-managed scheduler now
- prove web read-path correctness now
- do not implement extension routes yet

Implication:
- Milestone 10 locks the recovery contract that Milestone 11 must honor
- Milestone 11 remains responsible for actual extension route delivery and browser-harness proof for extension API contracts

## 2. Design Goals

### 2.1 Primary Goals
- Make natural subscription expiry and natural asset invalidation reconcile without manual SQL intervention.
- Ensure invalid assets disappear from active member read paths immediately when mutation-time recovery already exists, and at most by the next cron cycle for natural expiry.
- Keep cron execution on a trusted server-side path that is independent from browser session state.
- Make verification repeatable from browser flow plus InsForge CLI diagnostics.

### 2.2 Non-Goals
- No new public internal REST API for web UI beyond trusted cron routes.
- No rewrite of the SQL reconciliation engine.
- No scheduler abstraction layer beyond what is needed for the chosen deployment platform.
- No premature `/api/extension/*` implementation.

## 3. Architecture And Route Ownership

### 3.1 Route Shape
Milestone 10 adds two dedicated route handlers:

```txt
src/app/api/cron/
|- expire-subscriptions/route.ts
`- reconcile-invalid-assets/route.ts
```

Each route has one job only:
- `/api/cron/expire-subscriptions` calls `expire_subscriptions_job()`
- `/api/cron/reconcile-invalid-assets` calls `reconcile_invalid_assets_job()`

The routes remain thin and do not embed business logic beyond request authentication and response formatting.

### 3.2 Service And Repository Ownership
The route handlers delegate into the subscriptions domain rather than calling the database directly.

Proposed ownership:

```txt
src/modules/subscriptions/
|- repositories.ts   # RPC wrappers for cron jobs
|- services.ts       # orchestration and response-ready job execution
`- types.ts          # small shared job result types if needed

src/lib/
`- cron.ts           # technical request-auth helper only
```

Responsibility split:
- `route.ts`: read headers, authenticate trusted caller, call service, return JSON
- `repositories.ts`: execute baseline RPCs through `createInsForgeAdminDatabase()`
- `services.ts`: orchestrate execution and stable result shape
- `src/lib/cron.ts`: validate secret and build denial behavior without owning domain logic

### 3.3 Why Separate Routes Instead Of One Orchestrator Route
Two routes are intentionally preferred over a single combined cron route.

Reasons:
- failure isolation is clearer
- retry behavior is more granular
- schedule logs remain job-specific
- backend invariant proof can map directly to each SQL function
- later tuning can change schedule cadence per job without redesigning the contract

## 4. Trusted Cron Security Model

### 4.1 Request Authentication
Each cron route must require a trusted secret from server-side infrastructure.

Approved contract:
- request carries a secret derived from `CRON_SECRET`
- route rejects missing or incorrect secret
- route does not rely on `app_session`
- route does not rely on admin browser role
- route is callable only by trusted scheduler or manual trusted replay

The exact header name can be finalized in implementation planning, but it must be explicit and consistent across both routes.

### 4.2 Caller Independence From Browser Auth
The cron routes are not admin browser tools. They are trusted server-side endpoints.

Therefore:
- authenticated member browser requests must still be denied
- authenticated admin browser requests without the cron secret must still be denied
- the route must not read user cookies to decide authorization

This keeps cron execution separate from the app-session model described in Milestone 0 and Milestone 1.

### 4.3 Response Contract
Route responses should be intentionally small and audit-friendly.

Target shape:

```ts
type CronJobResult = {
  ok: true;
  job: "expire-subscriptions" | "reconcile-invalid-assets";
  processedCount: number;
  executedAt: string;
};
```

Denied requests return `401` or `403` with a minimal JSON body. Unexpected failures return `500` with a generic error payload that is sufficient for logs but does not expose sensitive internals.

## 5. Scheduler Design

### 5.1 Repo-Managed Schedule Is Required
The user approved repo-managed scheduling rather than leaving scheduler setup as an undocumented manual deploy step.

This means Milestone 10 must add a scheduler config artifact to the repo root that:
- defines one schedule for `expire-subscriptions`
- defines one schedule for `reconcile-invalid-assets`
- runs each schedule every 1 minute
- points each schedule to its own trusted route

### 5.2 Platform Binding Rule
The current repo does not yet contain a scheduler config file. The implementation plan may choose the exact root file required by the active deployment platform, but the design contract is fixed:
- scheduler config must live in the repo
- config must be versioned with the milestone work
- config must express both routes separately

Examples of acceptable realization:
- `vercel.json`
- another root deployment config file if the runtime platform is not Vercel

### 5.3 Manual Replay Still Matters
Even with repo-managed schedule, the routes must stay replayable for verification and diagnosis.

Reasoning:
- browser proof covers user-visible behavior
- InsForge CLI covers invariant reads
- trusted replay makes job execution deterministic during troubleshooting without waiting a full minute every time

## 6. Data Flow By Scenario

### 6.1 Disable Asset That Is Still In Use
This path is already partially wired in the repo and remains part of Milestone 10 proof.

Flow:
1. admin disables an assigned asset from the existing admin flow
2. asset service calls `recheck_subscription_after_asset_change(asset_id)`
3. existing assignment is revoked
4. system attempts replacement for the same access key
5. subscription status is recomputed
6. `/console` read path no longer exposes the invalid asset

Expected result:
- replacement available -> replacement appears and subscription remains valid
- replacement unavailable -> subscription becomes `processed`

### 6.2 Edit Asset So It Becomes Immediately Expired
This path also already exists in current service wiring for in-use assets.

Flow:
1. admin edits `expires_at` to a past time
2. asset service detects immediate invalidation
3. service triggers `recheck_subscription_after_asset_change(asset_id)`
4. replacement or partial-status fallback occurs immediately

Milestone 10 must prove this path from browser plus CLI instead of redesigning it.

### 6.3 Hard Delete Asset That Is Still Assigned
This path already uses baseline SQL helper semantics.

Flow:
1. admin deletes an assigned asset
2. `delete_asset_safely` revokes active assignments
3. system attempts fulfillment replacement for affected access keys
4. assignment history snapshots remain available
5. asset master row is deleted
6. subscription status is recomputed

Expected result:
- no active assignment points to a deleted asset
- deleted asset no longer appears in active inventory reads
- history remains readable from assignment snapshot data

### 6.4 Natural Asset Expiry
This is the first scenario that depends on the new cron route plus scheduler.

Flow:
1. an assigned asset naturally passes `expires_at`
2. scheduler hits `/api/cron/reconcile-invalid-assets`
3. route authenticates the trusted caller
4. service calls `reconcile_invalid_assets_job()`
5. invalid assigned assets are rechecked one by one through baseline engine
6. affected subscriptions recover or fall back to `processed`

Expected timing rule:
- natural expiry must be handled no later than the next one-minute cycle

### 6.5 Natural Subscription Expiry
This is the second new cron scenario.

Flow:
1. a running subscription naturally passes `end_at`
2. scheduler hits `/api/cron/expire-subscriptions`
3. route authenticates the trusted caller
4. service calls `expire_subscriptions_job()`
5. expired subscriptions move to `expired`
6. active assignments tied to them are revoked
7. `/console` no longer shows active access for that subscription

## 7. Read-Path Enforcement Rules

### 7.1 Web Read Path
Milestone 10 must preserve the rule that active member reads do not wait for cron to hide invalid inventory.

Approved rule:
- `/console` read path only returns assets that are still valid in active inventory
- an asset that is disabled or already expired must not remain visible in active asset lists even if reconciliation has not yet run

The repo already leans on baseline RPCs for this. Milestone 10 must preserve and verify that behavior.

### 7.2 Extension Compatibility Contract
Milestone 10 does not implement extension routes, but it locks a compatibility rule for Milestone 11:
- extension session and asset-detail endpoints must obey the same invalid-inventory filtering rule
- the later extension layer must not reintroduce disabled or expired assets just because cron has not run yet

This keeps M10 and M11 aligned without forcing premature API delivery.

## 8. Proof Matrix

### 8.1 Browser Proof Required For Milestone Completion
The milestone is not done unless the following flows are proven from real browser routes:

1. disable an in-use asset and verify the old asset disappears from `/console`
2. verify replacement appears when available
3. verify subscription becomes `processed` when replacement is unavailable
4. hard delete an in-use asset and verify recovery plus preserved history behavior
5. make an assigned asset naturally expire, wait one cron cycle, and verify reconciled result in `/console` or `/admin/subscriber`
6. verify an expired subscription no longer grants active asset access
7. verify a normal browser user cannot successfully execute trusted cron routes

The extension-specific browser checklist remains a contract item for Milestone 11, not a blocking implementation requirement for Milestone 10.

### 8.2 InsForge CLI Proof Required For Milestone Completion
The milestone is not done unless CLI verification proves:

1. `expire_subscriptions_job()` changes over-time subscriptions to `expired`
2. `expire_subscriptions_job()` revokes active assignments for affected subscriptions
3. `reconcile_invalid_assets_job()` handles disabled or expired assets according to replacement-versus-processed rules
4. disabling an in-use asset already triggers immediate recheck without waiting for cron
5. scheduler configuration and execution logs are inspectable if the runtime platform exposes them through `npx @insforge/cli schedules *`

### 8.3 Proof Mapping To Design Elements
- immediate disable proof -> existing asset service wiring plus current SQL helper
- hard delete proof -> existing `delete_asset_safely` path
- natural asset expiry proof -> new reconcile cron route plus scheduler
- natural subscription expiry proof -> new expire cron route plus scheduler
- cron denial proof -> new route secret validation

## 9. Proposed File Shape

```txt
src/app/api/cron/
|- expire-subscriptions/
|  `- route.ts
`- reconcile-invalid-assets/
   `- route.ts

src/modules/subscriptions/
|- repositories.ts
|- services.ts
`- types.ts

src/lib/
`- cron.ts

repo root/
`- vercel.json or equivalent root scheduler config
```

### 9.1 File Responsibilities
- `src/app/api/cron/*/route.ts`: trusted route entry points only
- `src/modules/subscriptions/repositories.ts`: baseline RPC wrappers for cron jobs
- `src/modules/subscriptions/services.ts`: orchestration and stable result shaping
- `src/modules/subscriptions/types.ts`: small job result contracts if needed
- `src/lib/cron.ts`: secret validation helper and small transport-only utilities
- root scheduler config: repo-managed one-minute job schedule

## 10. Error Handling And Observability

### 10.1 Route Failure Handling
If a cron RPC fails:
- route returns `500`
- response remains generic
- logs must still identify which job failed

This is sufficient for Milestone 10. Dedicated operational dashboards for cron internals are not in scope.

### 10.2 Why Job-Specific Responses Matter
Returning a job-specific `processedCount` matters because the browser cannot prove non-visible backend work by itself.

It helps with:
- manual trusted replay during verification
- quick diagnosis of whether the job touched any rows
- correlation with InsForge schedule logs

## 11. Impact On Milestone 11

Milestone 10 deliberately reduces later work instead of expanding scope now.

After this design is implemented:
- background reconciliation already has trusted execution paths
- repo-managed scheduling already exists
- web read-path filtering already has proof coverage
- Milestone 11 can focus on `/api/extension/session`, `/api/extension/asset`, and `/api/extension/track`

What Milestone 10 must not do:
- it must not create extension route handlers early
- it must not invent a second recovery engine outside the baseline SQL flow
- it must not move cron logic into generic app middleware or unrelated shared abstractions

## 12. Acceptance Contract

Milestone 10 is considered design-complete only if the implementation plan that follows preserves all of these rules:
- two trusted cron routes, one per SQL job
- repo-managed scheduler with one-minute cadence per route
- route authentication via server-only cron secret
- no dependency on browser session or admin role for cron authorization
- immediate disable and immediate forced-expiry recovery remain in the existing mutation path
- natural expiry reconciliation happens by the next cron cycle
- active web read paths do not expose disabled or expired assets while waiting for cron
- hard delete keeps history safe through assignment snapshots
- no extension route implementation is pulled into this milestone

## 13. Open Decisions Already Resolved In This Design
The following implementation-affecting decisions are now intentionally locked:
- Milestone 10 remains a pure cron-and-recovery milestone
- trusted cron routes are split per job instead of merged into one orchestrator route
- scheduler setup is repo-managed, not left as a manual deployment note
- web read-path proof is required now, extension route delivery stays in Milestone 11

This closes the design stage for Milestone 10 and provides a stable basis for implementation planning.
