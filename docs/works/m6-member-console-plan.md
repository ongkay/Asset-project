---
goal: Milestone 6 Member Console and Payment Dummy Implementation Plan
version: 1.3
date_created: 2026-04-18
last_updated: 2026-04-18
owner: AssetProject
status: Planned
tags: [feature, member, console, payment-dummy, cdkey, subscriptions, nextjs, milestone-6]
---

# Introduction
![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the implementation sequence for Milestone 6 Member Console and Payment Dummy across `/console` and `/paymentdummy`. The plan is intentionally structured for `executing-plans`: phases are sequential, tasks are atomic, dependencies are explicit inside each task description, and every phase ends with concrete verification so execution can stop safely on the first blocker.

Implementation status: planned. No phase in this document has been executed yet.

The implementation must remain consistent with `docs/works/m6-member-console-spec.md`, `docs/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DB.md`, `docs/agent-rules/folder-structure.md`, `docs/agent-rules/ui-ux-rules.md`, baseline SQL in `migrations/`, the current member shell under `src/app/(member)/**`, the current console query baseline in `src/modules/console/**`, and the authenticated-app visual language under `src/app/(main)/dashboard/**` as a visual reference only. If the old dashboard demo copy, IA, or placeholder behavior conflicts with PRD/spec, PRD/spec wins.

## 1. Requirements & Constraints
- **REQ-001**: Implement Milestone 6 exactly as specified in `docs/works/m6-member-console-spec.md`.
- **REQ-002**: Preserve App Router boundaries: `src/app/**` stays thin; route-local UI for `/console` must live under `src/app/(member)/console/_components/**`; route-local UI for `/paymentdummy` must live under `src/app/(member)/paymentdummy/_components/**`; business logic lives in `src/modules/**`.
- **REQ-003**: `src/modules/console/queries.ts` must remain the member-console read adapter and gain the additional `getConsoleStateSnapshot()` contract required by the accepted spec.
- **REQ-003A**: Because `src/modules/console/queries.ts` already exposes self-read plus optional admin-targeted read semantics through its sibling helpers, the new `getConsoleStateSnapshot()` helper must either preserve the same `{ userId?: string }` contract and target-user resolution rules or explicitly document why it is intentionally self-only. Do not leave the helper contract ambiguous.
- **REQ-003B**: `getConsoleStateSnapshot()` must classify a non-running row with `end_at <= now()` as effective `expired` even if the persisted row still says `active` or `processed`, so `/console` does not depend on cron freshness to render the correct non-running state.
- **REQ-004**: `src/modules/packages/services.ts` becomes the source of truth for the active member-purchasable package catalog used by `/console` and `/paymentdummy`. Reuse and tighten the existing issuable package snapshot contract there where it already matches M6 instead of introducing a second parallel member package-snapshot path under another domain.
- **REQ-004A**: Member-facing package-catalog reads must stay on a member-safe server-side read path that preserves member policy semantics. Prefer a session-bound server database path or authenticated RPC/helper where feasible; do not satisfy M6 by pointing member page reads at `createInsForgeAdminDatabase()` just because the existing admin CRUD repository happens to do so.
- **REQ-004B**: The existing package snapshot lookup in `src/modules/subscriptions/repositories.ts#getPackageById` is a legacy admin-manual helper, not the target source of truth for new member reads. Do not widen that subscriptions-local package helper for `/console`, `/paymentdummy`, or member checkout revalidation; member flows must read active package state from `src/modules/packages/services.ts`, and any touched admin-manual path should migrate toward the package domain instead of deepening duplicate package-snapshot logic.
- **REQ-004C**: Before M6 depends on `createInsForgeServerDatabase()` for member package or console-state reads, Phase 1 must explicitly prove that the normal `/login` runtime still reaches InsForge with authenticated context after the app-shell guard succeeds. If the current `app_session` shell and InsForge auth context are not actually aligned in this repo/runtime, stop and use an explicit authenticated helper/RPC plan instead of silently falling back to admin-database reads.
- **REQ-005**: `src/modules/subscriptions/services.ts` must own the shared activation core for `payment_dummy`, `cdkey`, and `admin_manual`, but the core itself must be transaction-agnostic and must not become another source of truth for new member-flow transaction writes.
- **REQ-005A**: Shared activation-core replacement branches must explicitly revoke active assignments on the prior running subscription. Do not assume setting `subscriptions.status = 'canceled'` auto-revokes assignments at the database layer.
- **REQ-005B**: Activation-core extraction must preserve existing `admin_manual` capabilities that are not part of the member UI, especially duration override and `manualAssignmentsByAccessKey`. Do not simplify the shared contract in a way that regresses Milestone 4 admin behavior while making it reusable for Milestone 6.
- **REQ-006**: Member-triggered mutations must use server actions with `next-safe-action`; do not add internal REST endpoints.
- **REQ-007**: Shared member action middleware must live under `src/lib/safe-action/*`, not in route files or feature components.
- **REQ-007A**: Because `src/lib/**` may not import `src/modules/**` under the repo boundary rules, Phase 2 must resolve the current `src/modules/auth/action-client.ts` baseline with a boundary-safe split: keep generic safe-action builders/helpers in `src/lib/safe-action/*`, and keep any concrete `getAuthenticatedAppUser()`-based composition in `src/modules/auth/action-client.ts` only if that is the smallest way to avoid a forbidden `src/lib -> src/modules` import. Do not solve M6 by importing `src/modules/users/services.ts` directly into `src/lib/safe-action/*`, and do not leave duplicated authenticated-app-user middleware in two places.
- **REQ-007B**: Member-facing clients that invoke `memberActionClient` must preserve shell-style unauthorized recovery. If a member action returns stable `Unauthorized.` or `Forbidden.` server errors, the UI must re-enter the `(member)` shell guard path via refresh/navigation instead of ending on a generic inline toast or stale dialog state.
- **REQ-008**: The plan must keep `requireMemberShellAccess()` as the route-shell access entry point for `(member)` pages; do not duplicate route redirect logic in individual page components.
- **REQ-008A**: `src/app/(member)/layout.tsx` may be visually updated for the final M6 member experience, but it must preserve `requireMemberShellAccess()` as the sole route-shell guard entry point. Placeholder shell copy, phase text, or guest-auth navigation links should not survive into the final member UX if they conflict with `/console` and `/paymentdummy` production quality.
- **REQ-009**: The implementation must not assume current member RLS can write `transactions`, `subscriptions`, `asset_assignments`, or `cd_keys`. Member checkout and redeem must use a trusted server-side write path.
- **REQ-010**: The implementation must preserve existing `admin_manual` behavior unless a touched code path makes a small compatibility refactor necessary. Full `admin_manual` transaction-path migration is not required to close Milestone 6.
- **REQ-010A**: If Phase 3 extracts a shared activation core out of `activateSubscriptionManually()`, keep the current admin-manual orchestration surface as a thin wrapper or compatibility layer so existing admin route/action contracts remain stable while the new core becomes transaction-agnostic.
- **REQ-011**: `/console` must render explicit states for `active`, `processed`, `expired`, `canceled`, and `none` without guessing from transaction rows only.
- **REQ-011A**: `History Subscription` on `/console` must preserve transaction status rendering for `pending`, `success`, `failed`, and `canceled` whenever those rows exist for the member being viewed.
- **REQ-012**: `/paymentdummy` must honor the accepted route contract: guard first, then `packageId` validation, then redirect back to `/console?paymentError=...` only for authorized member traffic.
- **REQ-013**: Asset detail must be loaded on demand and must not leak raw asset payloads in the console snapshot itself.
- **REQ-013A**: Member-facing error surfaces for `paymentError`, payment dummy checkout failure, redeem failure, used/invalid CD-Key, and asset-unavailable states must follow the accepted message contract in `docs/works/m6-member-console-spec.md` section `4.9`; do not invent extra member-facing status labels that drift from the spec.
- **REQ-014**: Browser verification must include `/console`, `/paymentdummy`, and the post-redeem confirmation step on `/admin/cdkey`.
- **REQ-015**: The plan must account for the fact that `041_dev_seed_loginable_users.sql` does not provide a banned loginable member; banned-route verification requires trusted test setup beyond baseline browser seeds.
- **REQ-016**: `/console` must expose a package-picker purchase entry point not only for running subscriptions, but also for `none`, `expired`, and `canceled` states, reusing the same package-selection path that leads to `/paymentdummy`.
- **SEC-001**: The member browser must never use `project_admin`, service credentials, or direct privileged database credentials client-side.
- **SEC-002**: CD-Key reservation must be atomic, must guard unused and still-active key state in the same critical write path, and must not allow two concurrent successful redeems for the same key.
- **SEC-003**: Exact entitlement matching must remain strict: assignment may only occur for the exact `platform + asset_type` tuples present in the package snapshot.
- **SEC-004**: Successful `payment_dummy` and `cdkey` transactions must persist `paid_at`; failed or canceled member flows must keep `paid_at = null` and persist auditable `failure_reason` when a transaction row has already been created.
- **CON-001**: Use `pnpm` only.
- **CON-002**: Use repo-approved stack only: Next.js App Router, Tailwind, existing UI primitives, `react-hook-form`, `zod`, `@tanstack/react-query`, `@tanstack/react-table`, and existing InsForge adapters.
- **CON-003**: Do not add a migration unless implementation reaches a concrete blocker that cannot be solved with the current schema, policies, views, triggers, existing SQL helpers, and current server-only privileged app-layer adapters.
- **CON-004**: Keep existing repo patterns unless a concrete Milestone 6 requirement forces a divergence.
- **CON-005**: `/console` and `/paymentdummy` must remain member-only routes under `(member)`; URL paths may not change.
- **GUD-001**: Prefer the smallest correct set of new files. Do not introduce DTO or mapper layers unless file size or reuse pressure makes them necessary.
- **GUD-002**: Reuse existing table/dialog/query patterns where they fit, but do not copy business logic into route-local code.
- **GUD-003**: Keep dialog URL restoration optional. The baseline plan may use local component state for dialogs unless a later task proves URL-restorable dialogs are necessary.
- **PAT-001**: Mirror the route composition pattern already used in repo server pages: guard/session access in route or layout, parse search params, call module queries/services, and render a client page shell.
- **PAT-001A**: For member reads, prefer `createInsForgeServerDatabase()` or authenticated RPC wrappers inside the owning member read module when current RLS already supports the read. Reserve admin-database helpers for trusted writes or concrete read cases that cannot be served through the session-bound path.
- **PAT-001B**: After `searchParams` are resolved, server-route reads for `/console` and `/paymentdummy` should be composed with `Promise.all` where they are independent so the milestone does not introduce avoidable query waterfalls.
- **PAT-001C**: `/paymentdummy` confirmation summary must reuse a member-safe read source, preferably `getConsoleSnapshot().subscription` or another console/member-safe helper. Do not pull current subscription context for the member route from `src/modules/subscriptions/repositories.ts#getRunningSubscriptionByUserId`, because that repository is admin-backed today.
- **PAT-002**: Baseline M6 member pages should prefer server bootstrap props plus `router.refresh()` for non-navigating post-action refreshes on `/console` and other in-place member interactions. Do not introduce a member-side React Query transport layer unless a concrete blocker forces a follow-up plan update. Payment-dummy happy path remains client-side navigation to the structured redirect target returned by the action.
- **PAT-003**: Keep `/console` visually aligned with the authenticated dashboard language from `src/app/(main)/dashboard/**`, not with admin assets-page visual density.
- **PAT-003A**: The authenticated dashboard demo under `src/app/(main)/dashboard/**` is a visual-language reference only. Do not copy its placeholder copy, fake data, or route semantics into final `/console` and `/paymentdummy` implementation.
- **PAT-004**: Keep all form inputs introduced in member UI aligned with repo UI rules, including visible labels, left-side icons, inline errors, loading state, accessible button labels, and reuse of repo primitives such as `Alert`, `Empty`, `Dialog`, `Field`, `FieldGroup`, and `InputGroup` where they fit.

## 2. Implementation Steps

### Implementation Phase 1
- GOAL-001: Establish the missing M6 contracts for console state, active package catalog, and member write boundaries so later route and UI work can consume stable shapes without embedding business logic in pages.
- Entry Criteria: `docs/works/m6-member-console-spec.md` is accepted as the source of truth for Milestone 6.
- Completion Criteria: Console types, package-catalog helper contracts, and member-action boundary contracts are explicit in code or placeholder-safe surfaces, and later phases can wire routes without placeholder data guesses.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Extend `src/modules/console/types.ts` with the additional M6 contracts required by the spec: a `ConsoleStateSnapshot` shape for `active/processed/expired/canceled/none`, any supporting `ConsoleState` alias, and any extra payload contracts needed so `/console` can distinguish non-running states without overloading the existing snapshot type. Depend on `docs/works/m6-member-console-spec.md` section `4.2`. |  |  |
| TASK-002 | Extend `src/modules/packages/types.ts`, `src/modules/packages/repositories.ts`, and `src/modules/packages/services.ts` with a deterministic server-side helper for listing active purchasable packages for member flows. Prefer tightening or reusing the existing issuable package snapshot contract where it already matches the M6 catalog shape (`id`, `name`, `amountRp`, `durationDays`, `isExtended`, `accessKeys`, non-null `summary`) instead of creating a second parallel member package type. Implement the member-facing read on a member-safe server-side path, preferring session-bound server database or authenticated helper/RPC semantics where feasible, and do not widen the existing admin-database CRUD repository behavior. Reject disabled packages from the result set. Depend on TASK-001 contracts only where shared types are needed. |  |  |
| TASK-003 | Extend `src/modules/console/queries.ts` with `getConsoleStateSnapshot()` as a companion read helper separate from `getConsoleSnapshot()`. Implement it through a new companion query path in the console module using `createInsForgeServerDatabase()` and member-readable subscriptions data, or a new authenticated RPC only if a concrete blocker appears, so `expired`, `canceled`, and `none` can be identified without changing the meaning of `get_user_console_snapshot`. Reuse the existing target-user resolution semantics from the console module so the new helper contract does not drift from sibling read helpers, do not satisfy this by importing admin-backed subscriptions repository reads into the member console path, and classify any latest row whose `end_at <= now()` as effective `expired` unless it is already `canceled`. Keep `getConsoleSnapshot()` and `getConsoleAssetDetail()` behavior stable. Depend on TASK-001. |  |  |
| TASK-004 | Create `src/modules/console/schemas.ts` with deterministic Zod schemas and helpers for `/console` route-level `paymentError` parsing, `/paymentdummy` `packageId` search-param parsing, and `getConsoleAssetDetailAction` payload validation (`assetId`). Keep the file limited to search-param parsing and transport-safe payload validation only. Accepted `paymentError` keys must map to the known route-level contract and accepted member-facing messages, while unknown keys are ignored without breaking page render. Depend on TASK-002 and TASK-003. |  |  |
| TASK-005 | Verify Phase 1 by running TypeScript-aware checks on the touched console/packages contract files and ensuring the route layer can read package catalog, console snapshot, console state, `paymentError`, and asset-detail action payload contracts without inventing placeholder field names or silently falling back to admin-database member reads. This verification must also prove the intended member-safe read path is genuinely authenticated under the current `/login` runtime before later phases depend on it. Stop here if non-running console-state semantics or server-auth alignment remain unclear. |  |  |

### Implementation Phase 2
- GOAL-002: Establish the shared member-safe action boundary and the transaction-domain write APIs required by new member flows.
- Entry Criteria: Phase 1 contracts exist and are stable enough to support backend orchestration.
- Completion Criteria: A shared member-safe action boundary exists across `src/lib/safe-action/*` and the concrete auth-aware composition point, transaction-domain services support create/link/success/failure transitions for member flows, and later member actions can rely on these boundaries without route-local auth checks or import-boundary violations.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Refactor the shared safe-action auth composition so M6 gains a shared `memberActionClient` without violating the repo import boundary that forbids `src/lib -> src/modules`. Use the current `getAuthenticatedAppUser()`-based pattern in `src/modules/auth/action-client.ts` as the starting baseline, move only boundary-neutral middleware builders/helpers into `src/lib/safe-action/*`, and keep existing admin exports stable via a thin compatibility layer if needed. Depend on the current `actionClient` and the accepted M6 spec. Stop if this cannot be implemented without an explicit import-boundary decision, and document the exact blocker before proceeding. |  |  |
| TASK-007 | Update or refactor the authenticated-user lookup contract used by safe actions only as much as required so `memberActionClient` and the existing `adminActionClient` both reuse the exact session/role/banned semantics of `getAuthenticatedAppUser()`. Resolve the `src/lib/safe-action/*` versus `src/modules/auth/action-client.ts` split without duplicating validation branches, and keep `Unauthorized.` / `Forbidden.` action-error semantics stable enough for member UI to re-enter shell-style guard behavior on failure. Do not change `requireMemberShellAccess()` redirect behavior. Depend on TASK-006. |  |  |
| TASK-008 | Create `src/modules/console/actions.ts` with a member-guarded, Zod-validated server action for on-demand asset detail reads, for example `getConsoleAssetDetailAction`. The action must call `getConsoleAssetDetail()` server-side, return the accepted unavailable state for invalid assets, and avoid adding any public `/api/*` transport. Depend on TASK-004, TASK-006, and TASK-007. |  |  |
| TASK-009 | Extend `src/modules/transactions/types.ts`, `src/modules/transactions/repositories.ts`, and `src/modules/transactions/services.ts` with the target member-flow APIs required by the spec: create transaction, attach to subscription, mark success with `paid_at`, and mark failed or canceled with auditable `failure_reason` while preserving the existing `transactions_paid_at_consistency` rule that only `success` may keep `paid_at`. Keep this scoped to member-flow readiness; do not force a full `admin_manual` migration in this phase, and do not route new member flows through `src/modules/subscriptions/repositories.ts#createTransactionRow`. Depend on TASK-006/TASK-007 only where action middleware or service contracts intersect. |  |  |
| TASK-010 | Verify Phase 2 by checking the new shared action-client surface, asset-detail read transport action, and transaction-domain API signatures. Confirm there is a stable path to create/link/finalize member transactions, no duplicated authenticated-app-user middleware split between `src/lib/safe-action/*` and `src/modules/auth/action-client.ts`, no member-flow dependency on the legacy subscriptions transaction helper, and a browser-callable server boundary for asset detail without route-local auth checks or direct client-side privileged credentials. Stop if any of those conditions are still false. |  |  |

### Implementation Phase 3
- GOAL-003: Extract the shared activation core and implement trusted server-side orchestration for `payment_dummy` and `cdkey` member flows.
- Entry Criteria: Phase 2 action and transaction boundaries exist.
- Completion Criteria: Member payment and redeem flows can create/finalize transactions through the transaction domain, call the same activation core as admin manual, and preserve all M6 business rules including `is_extended`, exact entitlement, and CD-Key atomic reservation.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Refactor `src/modules/subscriptions/services.ts` and any dependent types/repositories so the shared activation core is transaction-agnostic and reusable by `admin_manual`, `payment_dummy`, and `cdkey`. Preserve existing admin-manual behavior unless a touched path needs a minimal compatibility refactor, keep `activateSubscriptionManually()` or an equivalent admin orchestration surface as a thin wrapper if that is the safest compatibility path, explicitly keep replacement branches responsible for revoking prior active assignments, and preserve admin-only capabilities such as duration override and `manualAssignmentsByAccessKey`. Do not let the extraction introduce a third transaction-persistence surface beside `src/modules/transactions/*` and the isolated legacy helper. Depend on TASK-009. |  |  |
| TASK-012 | Extend `src/modules/subscriptions/schemas.ts` and `src/modules/subscriptions/actions.ts` with the member payment dummy action contract from the spec. The action must live in `src/modules/subscriptions/actions.ts`, use `memberActionClient`, re-validate the selected package against the current active package helper in `src/modules/packages/services.ts` at submit time instead of trusting page bootstrap props or widening the legacy subscriptions-local package lookup, create the member transaction through `src/modules/transactions/*` before activation orchestration, invoke the shared activation core, attach the transaction to the resulting subscription, return structured result data with success `{ ok: true, subscriptionId, transactionId, redirectTo: "/console" }` and accepted error-code/message states, never call `redirect()` directly, and finalize any transient member transaction to `success` or `failed` within the same request. Depend on TASK-006, TASK-009, and TASK-011. |  |  |
| TASK-013 | Extend `src/modules/cdkeys/schemas.ts`, `src/modules/cdkeys/repositories.ts`, `src/modules/cdkeys/services.ts`, and `src/modules/cdkeys/actions.ts` with the member redeem flow. Implement atomic reservation of `cd_keys.used_by/used_at` that guards both unused state and `is_active = true` in the same critical write path, create the redeem transaction with `cd_key_id` after reservation and before activation orchestration, map disabled-key rejection to the accepted `code-invalid` surface while keeping `code-used` as a distinct action error code with the same accepted member-facing message, keep redeem eligibility anchored to the immutable `cd_keys` snapshot instead of current `packages.is_active`, rollback on failure after reservation, and success finalization with `paid_at` plus the structured action result contract from the spec. Depend on TASK-006, TASK-009, and TASK-011. |  |  |
| TASK-014 | Align shared package snapshot and activation input/output contracts across `src/modules/packages/types.ts`, `src/modules/subscriptions/types.ts`, `src/modules/transactions/types.ts`, and `src/modules/cdkeys/types.ts` so `payment_dummy` and `cdkey` consume one stable activation contract without duplicating amount/duration/access-key semantics, while `admin_manual` retains explicit duration override and manual-assignment inputs. The shared activation result must stay transaction-agnostic and therefore must not carry `transactionId`. Depend on TASK-011 through TASK-013. |  |  |
| TASK-015 | Verify Phase 3 with targeted backend-oriented checks: `is_extended` same-package extension, package-switch carry-over, non-extended replacement, explicit revoke of old assignments on replacement branches, atomic CD-Key reservation failure, disabled-key rejection including active-state race handling, redeem success from a still-valid key whose master package is now disabled, transaction `paid_at`/`failure_reason` consistency, and exact entitlement preservation. Stop if the current app-layer trusted write path cannot satisfy these rules without a concrete schema blocker. |  |  |

### Implementation Phase 4
- GOAL-004: Replace the member route placeholders with real server-route composition for `/console` and `/paymentdummy`.
- Entry Criteria: Shared read helpers and member write actions are available from earlier phases.
- Completion Criteria: Both routes are real guarded pages under `(member)`, page files stay thin, and route-level redirects/errors follow the accepted M6 contract.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Replace the placeholder in `src/app/(member)/console/page.tsx` with a thin server route that relies on the existing `(member)` layout guard, awaits `searchParams`, reads `paymentError`, loads `getConsoleSnapshot()`, `getConsoleStateSnapshot()`, and the active package catalog in parallel where possible, then renders a client `console-page` component with explicit initial props. In the same phase, update `src/app/(member)/layout.tsx` only as needed to remove placeholder member-shell chrome that would undermine the final M6 UX while preserving the existing guard entry point. Depend on TASK-002, TASK-003, and TASK-004. |  |  |
| TASK-017 | Create `src/app/(member)/paymentdummy/page.tsx` as a thin guarded server route that awaits `searchParams`, reads `searchParams.packageId`, validates only after member guard has already run through the layout, resolves the selected package from the server-side package helper, loads current running-subscription context for the confirmation summary in parallel where possible from a member-safe read source, and redirects back to `/console?paymentError=...` for missing/invalid/disabled package states. Do not source the current-subscription summary for this member route from the admin-backed subscriptions repository. Keep route composition independent from client-side payment action wiring so package validation can be verified before Phase 5 UI work. Depend on TASK-002 and TASK-004. |  |  |
| TASK-018 | Create exact route-local bootstrap files `src/app/(member)/console/_components/console-page.tsx`, `src/app/(member)/console/_components/console-page-types.ts`, `src/app/(member)/paymentdummy/_components/paymentdummy-page.tsx`, and `src/app/(member)/paymentdummy/_components/paymentdummy-page-types.ts` so server pages remain composition-only and client code receives explicit typed props. Depend on TASK-016 and TASK-017. |  |  |
| TASK-019 | Verify Phase 4 by opening `/console` and `/paymentdummy?packageId=<valid>` through the real app route tree, plus invalid/missing/disabled package scenarios. Confirm page files remain thin, direct route entry is stable, and route-level redirects follow the exact query contract from the accepted spec. Stop if route files begin to absorb orchestration logic. |  |  |

### Implementation Phase 5
- GOAL-005: Build the member-console and paymentdummy UI surfaces, dialogs, and on-demand detail interactions with production-quality UX and repo-consistent styling.
- Entry Criteria: Phase 4 routes load real data and member actions are callable.
- Completion Criteria: `/console` and `/paymentdummy` render the full milestone UX, with correct sections, dialogs, inline errors, action wiring, and accessible interaction feedback.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Create exact route-local UI files for `/console`: `src/app/(member)/console/_components/console-overview-card.tsx`, `src/app/(member)/console/_components/console-asset-table/console-asset-table.tsx`, and `src/app/(member)/console/_components/console-history-table/console-history-table.tsx`. The page must show all required columns, explicit state messaging for `processed`, `expired`, `canceled`, and `none`, a stable `paymentError` surface that maps exact spec messages, and history-status rendering that remains correct for `pending`, `success`, `failed`, and `canceled` transaction rows when present. Use the transaction rows already provided by the console snapshot bootstrap instead of introducing a second history read path, and prefer repo primitives such as `Alert`, `Empty`, `Card`, and existing table shell patterns over ad-hoc markup. Depend on TASK-018. |  |  |
| TASK-021 | Create exact member action UI files for `/console`: `src/app/(member)/console/_components/console-extend-dialog/console-extend-dialog.tsx` and `src/app/(member)/console/_components/console-redeem-dialog/console-redeem-dialog.tsx`. Reuse the same package-picker path for running and non-running states (`none`, `expired`, `canceled`) so all of them can reach `/paymentdummy`. Use `react-hook-form` + `zod`, left-side icons on inputs, inline validation, and active-package-only selection, composed with existing form primitives such as `Field`, `FieldGroup`, `InputGroup`, and related repo UI building blocks rather than raw form markup. Depend on TASK-012, TASK-013, and TASK-018. |  |  |
| TASK-022 | Create `src/app/(member)/console/_components/console-asset-detail-dialog/console-asset-detail-dialog.tsx` and wire it to `getConsoleAssetDetailAction` so detail is fetched only when `View` is requested, renders raw asset safely, and supports `Copy JSON` with accessible labeling and invalid-asset fallback UI. Depend on TASK-008 and TASK-020. |  |  |
| TASK-023 | Create the `/paymentdummy` confirmation UI in `src/app/(member)/paymentdummy/_components/paymentdummy-page.tsx` plus any exact companion file needed for summary rendering. The route must show package summary, nominal, and current subscription context, then trigger the payment action, render structured failure states inline, and navigate to the returned `redirectTo` on success instead of relying on refresh-only behavior. Depend on TASK-012, TASK-017, and TASK-018. |  |  |
| TASK-024 | Use server bootstrap props plus `router.refresh()` as the default post-action refresh strategy for `/console` and other in-place member interactions. Do not add a member-side React Query transport layer in M6. Payment-dummy success remains client-side navigation to `/console` via the structured action result, and member action handlers must recover `Unauthorized.` / `Forbidden.` failures by re-entering shell guard behavior instead of leaving the user on a stale inline error surface. Depend on TASK-020 through TASK-023. |  |  |
| TASK-025 | Verify Phase 5 in the browser for interaction quality, responsive layout, copy clarity, and accessibility: explicit state rendering, non-running-state purchase entry points, no marketing-style filler content, no leftover placeholder shell copy in the `(member)` layout, clear banner for `paymentError`, no horizontal scroll, input labels and left icons, stable action/loading states, invalid-asset unavailable handling, functional `Copy JSON`, and correct unauthorized-action recovery back through shell guard behavior. Stop if the UI drifts from the repo’s authenticated-app visual baseline or if route-local code starts to own business logic. |  |  |

### Implementation Phase 6
- GOAL-006: Finish milestone verification, invariant proof, and documentation-level consistency checks for a clean execution handoff.
- Entry Criteria: Phases 1 through 5 are implemented and browser flows are callable.
- Completion Criteria: Quality gates, browser verification, backend invariant verification, and source-of-truth consistency checks are complete for Milestone 6.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-026 | Run `pnpm lint`, `pnpm check`, and `pnpm test`. Fix any failures introduced by the Milestone 6 implementation without broad unrelated refactors. |  |  |
| TASK-027 | Run browser verification for the M6 checklist from `docs/IMPLEMENTATION_PLAN.md` plus accepted-spec additions via `agent-browser` as the default verification path: `/console` state coverage for `active/processed/expired/canceled/none`, history-table source rendering for `payment_dummy/cdkey/admin_manual` where rows exist, history-table status rendering for `pending/success/failed/canceled` where seeded rows exist, package picker active-only behavior, purchase-start coverage from `seed.none.browser@assetnext.dev`, `/paymentdummy` happy path and route-level errors, same-package extend, package-switch carry-over, non-extended replacement, redeem valid/invalid/used, `/admin/cdkey` post-redeem visibility, guest/admin/banned route denial, `Copy JSON` behavior, and no leftover placeholder member-shell chrome on authenticated member pages. Use the runtime database state expected by the milestone docs, including a trusted banned-member setup outside `041` when verifying the banned-route path. |  |  |
| TASK-028 | Run backend invariant verification against the runtime-linked database using the read-only InsForge CLI path mandated by `docs/IMPLEMENTATION_PLAN.md`. Start with `npx @insforge/cli whoami` and `npx @insforge/cli current`, then verify running-state console data via `get_user_console_snapshot`, non-running states via the new companion helper or specific historical subscription queries, transaction row status/`paid_at`/`failure_reason` plus `cd_key_id` linkage for redeem success, exact entitlement assignment correctness, `cd_keys.used_by/used_at`, and `app_sessions.last_seen_at` advancement after authenticated route requests. Use the correct CLI auth context for each proof step: authenticated admin context for helper RPC verification, and read-only admin or equivalent trusted read context for direct table checks. |  |  |
| TASK-029 | Check Next.js runtime/compilation state for `/console` and `/paymentdummy`, then scan `.next/dev/logs/*.log` and require zero relevant Milestone 6 errors before closure. Perform the final consistency pass against `docs/works/m6-member-console-spec.md`, `docs/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DB.md`, `docs/agent-rules/folder-structure.md`, `docs/agent-rules/ui-ux-rules.md`, the current member-shell baseline under `src/app/(member)/layout.tsx`, and the authenticated-app visual language under `src/app/(main)/dashboard/**`. Explicitly confirm the final member read path does not regress to admin-database helpers for package catalog or console-state reads where the session-bound path is available. Only after all evidence is green should the implementation be considered ready for `finishing-a-development-branch`. |  |  |

## 3. Alternatives
- **ALT-001**: Keep `/console` as a placeholder shell and defer the real page until Milestone 8. Rejected because Milestone 6 explicitly owns the final member console.
- **ALT-002**: Add new internal `/api/member/*` endpoints for payment dummy and redeem. Rejected because internal web UI must use server components and server actions instead of new public REST endpoints.
- **ALT-003**: Implement payment dummy and redeem by duplicating admin-manual activation logic directly in each module. Rejected because the spec and PRD require shared activation rules across all sources.
- **ALT-004**: Force a full `admin_manual` transaction-path refactor as part of Milestone 6. Rejected because M6 only needs new member flows to use the new transaction-domain path; broad admin refactor is unnecessary unless a touched path requires it.
- **ALT-005**: Make URL-restorable dialogs mandatory for `/console`. Rejected because the accepted spec treats this as optional/recommended, not as a milestone gate.
- **ALT-006**: Add new security-definer SQL migration immediately for member checkout/redeem. Rejected because the accepted spec allows current server-only privileged adapters unless a concrete blocker proves migration is required.

## 4. Dependencies
- **DEP-001**: `docs/works/m6-member-console-spec.md` for all milestone contracts.
- **DEP-002**: `docs/PRD.md` sections `3.4` through `3.10`, section `6.3`, and section `8` for product behavior.
- **DEP-003**: `docs/IMPLEMENTATION_PLAN.md` Milestone 6 for browser and backend verification criteria.
- **DEP-003A**: `docs/DB.md` for transaction, CD-Key, subscription, and assignment semantics.
- **DEP-004**: `docs/agent-rules/folder-structure.md` for module and route boundaries.
- **DEP-005**: `docs/agent-rules/ui-ux-rules.md` for authenticated-app visual baseline and interaction requirements.
- **DEP-006**: Baseline migrations `001` through `030`, with direct M6 dependency focus on `011_catalog_tables.sql`, `012_subscription_tables.sql`, `020_admin_access_helpers.sql`, `021_rls_policies.sql`, `022_subscription_engine.sql`, `023_triggers.sql`, `024_views.sql`, `025_table_grants.sql`, and `030_rpc.sql`.
- **DEP-006A**: Verification seed files `040_dev_seed_full.sql` and `041_dev_seed_loginable_users.sql`, plus trusted setup for one banned loginable member when browser verification covers the banned-route path.
- **DEP-006B**: Constraint details in `012_subscription_tables.sql`, especially `transactions_paid_at_consistency` and `cd_keys` usage consistency, because M6 member flows must satisfy these invariants without schema drift.
- **DEP-007**: Existing member layout guard in `src/app/(member)/layout.tsx` and `src/modules/users/services.ts`.
- **DEP-007A**: Existing auth-aware safe-action baseline in `src/modules/auth/action-client.ts`, which already composes `getAuthenticatedAppUser()` and must be treated as the compatibility starting point for Phase 2.
- **DEP-008**: Existing console read wrappers in `src/modules/console/queries.ts`.
- **DEP-009**: Existing package snapshot helpers in `src/modules/packages/services.ts`, plus the new member package-list helper that must live beside them instead of under another domain.
- **DEP-010**: Existing transaction-domain scaffolding in `src/modules/transactions/services.ts` and `src/modules/transactions/repositories.ts`.
- **DEP-010A**: Existing legacy transaction insert helper in `src/modules/subscriptions/repositories.ts`, which is the migration boundary that member flows must not reuse.
- **DEP-011**: Existing admin-manual subscription implementation in `src/modules/subscriptions/**` as the starting point for extracting the shared activation core.
- **DEP-012**: Existing authenticated-app visual language in `src/app/(main)/dashboard/**`.
- **DEP-012A**: Existing admin CD-Key table and detail surfaces under `src/app/(admin)/admin/cdkey/**`, which already expose `used`, `used_by`, and `used_at` for post-redeem browser verification.

## 5. Files
- **FILE-000**: Modify `src/app/(member)/layout.tsx` only as much as needed to remove placeholder shell chrome while preserving `requireMemberShellAccess()` as the route-shell guard entry point.
- **FILE-001**: Modify `src/app/(member)/console/page.tsx`.
- **FILE-002**: Create `src/app/(member)/console/_components/console-page.tsx`.
- **FILE-003**: Create `src/app/(member)/console/_components/console-page-types.ts`.
- **FILE-004**: Create `src/app/(member)/console/_components/console-overview-card.tsx`.
- **FILE-005**: Create `src/app/(member)/console/_components/console-asset-table/console-asset-table.tsx`.
- **FILE-006**: Create `src/app/(member)/console/_components/console-history-table/console-history-table.tsx`.
- **FILE-007**: Create `src/app/(member)/console/_components/console-extend-dialog/console-extend-dialog.tsx`.
- **FILE-008**: Create `src/app/(member)/console/_components/console-redeem-dialog/console-redeem-dialog.tsx`.
- **FILE-009**: Create `src/app/(member)/console/_components/console-asset-detail-dialog/console-asset-detail-dialog.tsx`.
- **FILE-010**: Create `src/app/(member)/paymentdummy/page.tsx`.
- **FILE-011**: Create `src/app/(member)/paymentdummy/_components/paymentdummy-page.tsx`.
- **FILE-012**: Create `src/app/(member)/paymentdummy/_components/paymentdummy-page-types.ts`.
- **FILE-013**: Modify `src/modules/console/types.ts`.
- **FILE-014**: Create `src/modules/console/schemas.ts`.
- **FILE-015**: Modify `src/modules/console/queries.ts`.
- **FILE-016**: Create `src/modules/console/actions.ts`.
- **FILE-017**: Modify `src/modules/packages/types.ts` only if member catalog contracts need explicit shared types.
- **FILE-018**: Modify `src/modules/packages/repositories.ts`.
- **FILE-019**: Modify `src/modules/packages/services.ts`.
- **FILE-019A**: Modify `src/lib/insforge/database.ts` only if a small helper extraction is needed so member package or console-state reads can stay on the intended member-safe server-side path without disturbing existing admin-database helpers.
- **FILE-020**: Modify `src/lib/safe-action/client.ts` only for shared base or boundary-neutral safe-action support required by `memberActionClient`; do not force concrete auth-aware imports from `src/modules/**` into this file.
- **FILE-020A**: Modify `src/lib/safe-action/middleware.ts` only if boundary-neutral safe-action middleware builders or stable member-action error helpers belong there.
- **FILE-020B**: Modify `src/modules/auth/action-client.ts` if it remains the concrete auth-aware composition point for `memberActionClient` and compatibility exports in order to respect the `src/lib -> src/modules` import boundary.
- **FILE-021**: Modify `src/modules/transactions/types.ts`.
- **FILE-022**: Modify `src/modules/transactions/repositories.ts`.
- **FILE-023**: Modify `src/modules/transactions/services.ts`.
- **FILE-024**: Modify `src/modules/subscriptions/types.ts` only if activation-core result contracts need adjustment.
- **FILE-025**: Modify `src/modules/subscriptions/schemas.ts`.
- **FILE-026**: Modify `src/modules/subscriptions/repositories.ts` only if the activation-core extraction needs new data-access helpers.
- **FILE-027**: Modify `src/modules/subscriptions/services.ts`.
- **FILE-028**: Modify `src/modules/subscriptions/actions.ts`.
- **FILE-029**: Modify `src/modules/cdkeys/types.ts` only if redeem contracts need explicit shared result types.
- **FILE-030**: Modify `src/modules/cdkeys/schemas.ts`.
- **FILE-031**: Modify `src/modules/cdkeys/repositories.ts`.
- **FILE-032**: Modify `src/modules/cdkeys/services.ts`.
- **FILE-033**: Modify `src/modules/cdkeys/actions.ts`.
- **FILE-034**: Modify `src/modules/users/services.ts` only if the shared authenticated-app-user contract needs a small extraction to support `memberActionClient` without changing route redirect behavior.

## 6. Testing
- **TEST-001**: Unit or focused service tests for non-running console-state derivation (`expired`, `canceled`, `none`), including a stale ended row whose persisted status is still `active` or `processed` but whose effective console state must render as `expired`.
- **TEST-002**: Unit or focused service tests for the active purchasable-package catalog helper, including disabled-package exclusion, non-null summary output, and reuse of the existing package snapshot contract where applicable.
- **TEST-003**: Integration test for `memberActionClient` member-only access rules, banned-user rejection, stable `Unauthorized.` / `Forbidden.` semantics for client recovery, and no regression to the existing `adminActionClient` contract after the shared safe-action refactor.
- **TEST-004**: Integration test for payment-dummy orchestration, including structured success result with `redirectTo: "/console"`, inline failure result, submit-time package revalidation against current active package state, transaction success finalization, and `paid_at` persistence.
- **TEST-005**: Integration test for shared activation-core branches: create-new, extend-existing, replace-with-carry-over, replace-immediately, plus admin-manual parity for duration override and `manualAssignmentsByAccessKey` after the shared-core extraction.
- **TEST-006**: Integration test for redeem orchestration, including disabled-key rejection, used-key rejection, atomic reservation with same-step active-state guard, rollback on failure, redeem success from a valid CD-Key snapshot whose package master is now disabled, and `paid_at` persistence.
- **TEST-007**: Integration test for transaction-domain create/link/success/failure transitions, `failure_reason` auditability, and `paid_at` consistency across success versus non-success terminal states.
- **TEST-008**: Browser verification via `agent-browser` for `/console` and `/paymentdummy` matching the Milestone 6 checklist in `docs/IMPLEMENTATION_PLAN.md`, plus the accepted-spec additions for direct route denial, `paymentError` handling, history-table rendering of `payment_dummy/cdkey/admin_manual` sources and `pending/success/failed/canceled` statuses where rows exist, and absence of leftover placeholder member-shell chrome in the authenticated member experience.
- **TEST-009**: Browser verification via `agent-browser` of `/admin/cdkey` after successful redeem to confirm `used`, `used_by`, and `used_at` visibility.
- **TEST-010**: Read-only `npx @insforge/cli` verification starting with `whoami` and `current`, then running-state, non-running-state, transaction including redeem `cd_key_id` linkage, CD-Key, exact-entitlement, and `last_seen_at` checks using the appropriate authenticated admin or equivalent trusted read context per proof step.
- **TEST-011**: Run `pnpm lint`.
- **TEST-012**: Run `pnpm check`.
- **TEST-013**: Run `pnpm test`.
- **TEST-014**: Check Next.js runtime/compilation diagnostics for `/console` and `/paymentdummy`.
- **TEST-015**: Scan `.next/dev/logs/*.log` and require zero relevant Milestone 6 errors before closure.

## 7. Risks & Assumptions
- **RISK-001**: Adding `memberActionClient` under `src/lib/safe-action/*` while the current auth-aware client composition already lives in `src/modules/auth/action-client.ts` can create a split-source-of-truth problem if the refactor is not reduced to one shared middleware path.
- **RISK-001A**: A naive move of `getAuthenticatedAppUser()`-based middleware directly into `src/lib/safe-action/*` would violate the repo import boundary (`src/lib` must not import `src/modules`) and create architectural churn inside a milestone that otherwise prefers minimal change.
- **RISK-002**: The current transactions domain is incomplete; success/failure finalization work may expose hidden coupling with `subscriptions`, and a partial refactor can accidentally leave member flows on `src/modules/transactions/*` while hidden writes still happen through `src/modules/subscriptions/*`.
- **RISK-003**: Shared activation-core extraction can accidentally break admin-manual behavior if the refactor is broader than necessary, especially around duration override and manual-assignment inputs that are not exposed by the new member UI.
- **RISK-004**: Console-state derivation for `expired/canceled/none` can drift from milestone semantics if implemented as ad-hoc heuristics rather than explicit historical subscription reads.
- **RISK-005**: Browser verification will give false negatives if the runtime database does not match the expected seed/setup state, especially for banned-route checks that require an extra trusted fixture.
- **RISK-006**: Paymentdummy route behavior can become inconsistent if page-level validation bypasses the `(member)` layout guard order.
- **RISK-007**: CD-Key lookup plus reservation can remain race-prone if active-state validation happens only before reservation, not inside the same atomic write path.
- **RISK-008**: A blanket post-action `router.refresh()` rule can regress paymentdummy UX if success navigation is not handled through the structured action result.
- **RISK-009**: Existing packages and subscriptions repositories default to `createInsForgeAdminDatabase()`, so a careless reuse for member read paths can silently bypass policy semantics the plan expects member routes to honor, including package catalog, console-state reads, and current-subscription summary reads on `/paymentdummy`.
- **RISK-010**: The current repo uses `app_session` for shell access but member-safe database reads depend on authenticated InsForge context. If those two auth layers are not actually aligned after the normal `/login` flow, `createInsForgeServerDatabase()` assumptions in M6 will fail or tempt an unsafe fallback to admin-database reads.
- **ASSUMPTION-001**: Current server-only privileged InsForge adapters are sufficient for member checkout and redeem without adding a new migration, unless a concrete blocker proves otherwise.
- **ASSUMPTION-002**: Member UI can stay simpler with server bootstrap props and local component state unless React Query is clearly needed for refresh behavior.
- **ASSUMPTION-003**: Existing M5 admin CD-Key route already exposes the browser-visible fields needed for post-redeem confirmation; no M6 admin-page refactor is planned unless browser verification proves otherwise.
- **ASSUMPTION-004**: The member shell layout remains the only route-level guard location for `(member)` pages, while member actions use `memberActionClient` for mutation-time access checks.

## 8. Related Specifications / Further Reading
- `docs/works/m6-member-console-spec.md`
- `docs/PRD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DB.md`
- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`
- `migrations/README.md`
- `migrations/011_catalog_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/020_admin_access_helpers.sql`
- `migrations/021_rls_policies.sql`
- `migrations/022_subscription_engine.sql`
- `migrations/023_triggers.sql`
- `migrations/024_views.sql`
- `migrations/025_table_grants.sql`
- `migrations/030_rpc.sql`
- `src/app/(member)/layout.tsx`
- `src/app/(main)/dashboard/**`
- `src/modules/console/queries.ts`
- `src/modules/packages/services.ts`
- `src/modules/subscriptions/services.ts`
- `src/modules/transactions/services.ts`
- `src/modules/cdkeys/services.ts`
