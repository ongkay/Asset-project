---
goal: Milestone 4 Admin Subscriptions Delivery Plan
version: 1.0
date_created: 2026-04-16
last_updated: 2026-04-16
owner: AssetProject
status: In Progress
tags: [feature, process, admin, subscriptions, nextjs, insforge, milestone-4]
---
# Introduction
![Status: In Progress](https://img.shields.io/badge/status-In_Progress-yellow)
This plan defines the executable implementation sequence for Milestone 4 Admin Subscriptions. The target outcome is a guarded admin `/admin/subscriber` flow that can search, filter, paginate, open add or edit subscriber dialogs, resolve exact-entitlement candidate assets, quick-add private assets inside the dialog, create consistent `admin_manual` transactions and subscription outcomes through the shared activation service, and cancel running subscriptions without violating the one-running-subscription or exact-access-key invariants.

## Status Update
- Last implementation review: `2026-04-16`.
- Phase 1 implementation tasks are complete.
- Phase 2 implementation tasks are complete.
- Phase 3 is partially complete: unit coverage and repo quality gates are done, but integration coverage and the full browser or backend verification matrix are still pending.
- Milestone 4 should still be treated as `In Progress` until the remaining verification work is finished.

## 1. Requirements & Constraints

### Source Alignment
| Source | Relevant References | Required Impact |
|------|-------------|-----------|
| `docs/works/m4-admin-subscriptions-spec.md` | Full spec, especially sections `3`, `4`, `5`, `10` | The plan must implement only the documented M4 contract, including local implementation decisions already locked in the spec. |
| `docs/IMPLEMENTATION_PLAN.md` | Milestone 4 section, checklist, backend verification lines | The route, browser checklist, and backend verification requirements must be fully represented as executable tasks. |
| `docs/PRD.md` | `3.5`, `3.6`, `3.7`, `3.9`, `7.3`, `10` | The implementation must preserve `is_extended` semantics, exact-entitlement assignment, `active/processed` derivation, cancellation behavior, and admin-only access. |
| `docs/DB.md` | `5.4` to `5.8`, `7.1` to `7.5`, `8`, `9` | The implementation must rely on baseline tables, views, triggers, and DB functions that already exist, and must keep non-backed lifecycle orchestration in app-layer services. |
| `migrations/011_catalog_tables.sql` | `public.packages`, `public.assets` | Package and asset reads must use baseline schema fields and `is_active` rules. |
| `migrations/012_subscription_tables.sql` | `public.subscriptions`, `public.asset_assignments`, `public.transactions` | Manual activation, assignment, cancellation, and transaction persistence must stay aligned with the baseline schema and partial unique indexes. |
| `migrations/021_rls_policies.sql` | admin policies for `packages`, `assets`, `subscriptions`, `asset_assignments`, `transactions`, `cd_keys` | All admin reads and mutations must execute server-side after the app-layer admin session guard passes. |
| `migrations/022_subscription_engine.sql` | `assign_best_asset`, `apply_subscription_status`, `normalize_running_subscriptions_before_write`, `validate_asset_assignment` | Assignment and status recalculation must reuse baseline DB engine primitives instead of duplicating tuple-validation logic. |
| `migrations/023_triggers.sql` | `subscriptions_normalize_running_before_write`, `asset_assignments_validate_before_write` | The plan may rely on active trigger wiring for normalization and assignment validation. |
| `migrations/024_views.sql` | current subscription, current asset access, transaction list views | Read models should reuse baseline views where they fit, but must still compose admin-specific aggregates in the app layer. |
| `src/app/(admin)/admin/assets/**` | shipped Milestone 3 route-local UI pattern | M4 route, query adapter, toolbar, column persistence, and page composition must stay structurally consistent with M3. |
| `src/modules/admin/assets/**` | shipped Milestone 3 admin read-model pattern | M4 must mirror the query, schema, type, and action layering already used in M3. |
- **REQ-001**: Implement Milestone 4 only for admin subscription management and its direct route.
- **REQ-002**: Keep all mutations server-side and do not introduce a public REST endpoint for admin subscription UI.
- **REQ-003**: Reuse the shared activation service direction already mandated by Milestone 0 and Milestone 4; do not create admin-only activation logic that diverges from later `payment_dummy` or `cdkey` flows.
- **REQ-004**: Use `react-hook-form` and `zod` for add, edit, cancel, and quick-add forms or action payloads that originate from UI inputs.
- **REQ-005**: Use exact `access_key` entitlement matching for candidate lookup, manual overrides, fallback fulfillment, and persisted assignments.
- **REQ-006**: Keep `subscriptions.access_keys_json` as the final subscription snapshot and never use package summary `private/share/mixed` for authorization.
- **REQ-007**: Keep one running subscription per user and one active share assignment per platform per user.
- **REQ-008**: Same-package `is_extended = true` must extend the same subscription row; replacement paths must close the old running row as `canceled` and create a new running row.
- **REQ-009**: Quick Add Asset must create only `private` assets, convert `durationDays` into `expiresAt`, and delegate actual asset creation to the canonical asset domain.
- **REQ-010**: Browser verification, read-only InsForge CLI verification, and project quality gates are mandatory completion work, not optional follow-up work.
- **REQ-011**: Admin user cells in the subscriber table must render `avatar + username + email`, and null avatars must fall back to initials with a deterministic background color consistent with repo admin-table rules.
- **REQ-012**: Candidate lookup, manual override validation, and persisted assignments must preserve the baseline private-asset invariant that one `private` asset can have only one active assignment globally at a time.
- **SEC-001**: Admin subscription data must never be read or written from the client with privileged database credentials; all access must pass through `requireAdminShellAccess()` for pages or `adminActionClient` for browser-callable actions.
- **SEC-002**: Client components must not import `src/modules/admin/subscriptions/queries.ts` directly; they must use browser-callable admin read actions and the route-local query adapter.
- **SEC-003**: Sensitive asset fields such as `account`, `proxy`, and `asset_json` must stay out of the subscriber table payload and appear only in controlled dialog or quick-add flows where necessary.
- **CON-001**: Keep `src/app/**` thin and route-composition only.
- **CON-002**: Put core subscription write logic in `src/modules/subscriptions/**`.
- **CON-003**: Put admin subscriber read-model logic in `src/modules/admin/subscriptions/**`.
- **CON-004**: Reuse existing shared UI primitives, admin table helpers, filter helpers, and `next-safe-action` setup before introducing any new primitive or transport.
- **CON-005**: Prefer the current baseline SQL objects before adding a new migration.
- **CON-006**: Do not introduce HeroUI.
- **GUD-001**: Match Milestone 3 route structure: guarded server page, direct initial server query, route-local `_components`, route-local React Query adapter, local URL-search-param state, and localStorage-backed column visibility.
- **GUD-002**: Keep subscriber summary cards optional; if added, define them explicitly as current-page or current-filter summaries and do not introduce hidden aggregate queries.
- **PAT-001**: Use `src/app/(admin)/admin/subscriber/page.tsx` for page composition only.
- **PAT-002**: Use `src/app/(admin)/admin/subscriber/_components/**` for route-local UI and state.
- **PAT-003**: Use `src/modules/admin/subscriptions/{types,schemas,queries,actions}.ts` as the canonical read-model boundary.
- **PAT-004**: Use `src/modules/subscriptions/{types,schemas,repositories,services,actions}.ts` as the canonical write-domain boundary.
- **PAT-005**: Follow the M3 `assets-query.ts` transport contract: route-local query adapters unwrap successful read-action payloads and throw `Error` on validation or `{ ok: false }` failures.

## 2. Implementation Steps
### Implementation Phase 1
- GOAL-001: Establish deterministic subscription-domain contracts, repositories, services, and admin read-model contracts before wiring the route UI.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `src/modules/subscriptions/types.ts` with explicit domain contracts for `AdminManualActivationFormValues`, `AdminManualActivationInput`, `SubscriberQuickAddAssetValues`, `SubscriberQuickAddAssetInput`, `SubscriberCancelInput`, `SubscriptionActivationResult`, `SubscriptionReplacementMode`, and any row-level repository payloads needed by services. The file must encode the locked M4 decisions: replacement closure state `canceled`, same-row extension for same package plus `is_extended = true`, and atomic write expectations. | Yes | 2026-04-16 |
| TASK-002 | Create `src/modules/subscriptions/schemas.ts` with Zod schemas for admin manual activation, quick-add asset, and cancel actions. The schema set must validate positive `durationDays`, required `userId`, required `packageId`, normalized `manualAssignmentsByAccessKey`, required quick-add `platform`, `account`, `assetJsonText`, and server-side conversion of `durationDays` to `expiresAt`. Add explicit validation that quick-add derives `platform:private` and fails when that access key is not present in the selected package entitlement snapshot. | Yes | 2026-04-16 |
| TASK-003 | Create `src/modules/subscriptions/repositories.ts` as the canonical server-only write-data boundary. Add explicit data-access helpers for reading packages, current or historical subscriptions, current assignments, transactions, and candidate asset state; inserting or updating subscription rows; inserting transaction rows; generating and persisting the required unique `transactions.code`; revoking assignment rows; and invoking baseline DB functions such as `assign_best_asset(...)` and `apply_subscription_status(...)`. Keep repository functions composable and free of UI concerns. | Yes | 2026-04-16 |
| TASK-004 | Create `src/modules/subscriptions/services.ts` with the canonical business logic for `activateSubscriptionManually`, `cancelSubscription`, `buildQuickAddAssetInput`, and any helper needed to resolve same-row extension versus replacement. The service must reject inactive packages before inserting any subscription or transaction rows, enforce one-running-subscription semantics, close replacement rows as `canceled`, revoke the old running row's active assignments before replacement fulfillment begins, reuse the same subscription row on same-package extension, preserve immutable subscription snapshot fields on same-row extension, call fallback fulfillment for unassigned entitlements, call `apply_subscription_status(...)` after assignment insert or revoke paths whenever status may change, create exactly one `admin_manual` transaction with a unique `code`, `status = 'success'`, non-null `paid_at`, and `amount_rp` snapped from package price even when `durationDays` is overridden, keep transaction and subscription snapshot fields mutually consistent, and remain rollback-safe if any write step fails. | Yes | 2026-04-16 |
| TASK-005 | Create `src/modules/subscriptions/actions.ts` with admin-guarded server actions `activateSubscriptionManuallyAction`, `quickAddSubscriberAssetAction`, and `cancelSubscriptionAction`. These actions must use `adminActionClient`, validate raw input through the new schemas, delegate all business logic to `src/modules/subscriptions/services.ts`, and return exact deterministic success payloads: `activateSubscriptionManuallyAction -> { ok: true, subscriptionId: string, transactionId: string }`, `quickAddSubscriberAssetAction -> { ok: true, assetId: string, accessKey: string }`, and `cancelSubscriptionAction -> { ok: true, subscriptionId: string }`; failure payloads must use `{ ok: false, message: string }`. | Yes | 2026-04-16 |
| TASK-006 | Create `src/modules/admin/subscriptions/types.ts` with read-model contracts such as `SubscriberTableFilters`, `SubscriberAdminRow`, `SubscriberTableResult`, `SubscriberUserOption`, `SubscriberPackageOption`, `SubscriberCurrentAssignment`, `SubscriberCandidateAsset`, `SubscriberCandidateGroup`, `SubscriberEditorData`, and `SubscriberActivationDraft`. These types must preserve the spec’s locked row-shape decision: one row per member, running subscription if present, otherwise latest historical row. | Yes | 2026-04-16 |
| TASK-007 | Create `src/modules/admin/subscriptions/schemas.ts` with `parseSubscriberTableSearchParams`, canonical table filter validation, editor bootstrap input validation, user-picker search validation, and activation-draft input validation. The table filter schema must accept `search`, `assetType`, `status`, `expiresFrom`, `expiresTo`, `page`, and `pageSize`; use `yyyy-MM-dd` date strings; reject reversed date ranges in the canonical query contract; and safely normalize malformed route params without crashing the page. | Yes | 2026-04-16 |
| TASK-008 | Create `src/modules/admin/subscriptions/queries.ts` with canonical server-side reads `getSubscriberTablePage`, `getSubscriberEditorData`, `searchSubscriberUsers`, and `getSubscriberActivationDraft`. `getSubscriberTablePage` must implement the locked row-shape and ordering contract; compute `totalSpentRp` from successful transactions; keep the main table payload free of sensitive asset fields; preserve historical package snapshot visibility even after the source package is disabled; and use the baseline views or base tables only where they fit the admin projection. Candidate-asset reads must exclude `private` assets that already have an active assignment for another user while still allowing the current active assignment already attached to the same running subscription being edited. | Yes | 2026-04-16 |
| TASK-009 | Create `src/modules/admin/subscriptions/actions.ts` with read actions `getSubscriberTablePageAction`, `getSubscriberEditorDataAction`, `searchSubscriberUsersAction`, and `getSubscriberActivationDraftAction`. Each action must use `adminActionClient`, validate input with the new admin schemas, delegate to `src/modules/admin/subscriptions/queries.ts`, and return exact deterministic success payloads: `getSubscriberTablePageAction -> { ok: true, tablePage: SubscriberTableResult }`, `getSubscriberEditorDataAction -> { ok: true, editorData: SubscriberEditorData }`, `searchSubscriberUsersAction -> { ok: true, users: SubscriberUserOption[], totalCount: number }`, and `getSubscriberActivationDraftAction -> { ok: true, draft: SubscriberActivationDraft }`; failure payloads must use `{ ok: false, message: string }`. | Yes | 2026-04-16 |
| TASK-010 | Extend `src/modules/assets/{types,schemas,repositories,services}.ts` only where necessary to support M4 quick-add reuse or candidate-asset metadata reuse. Keep all asset creation canonical in the asset domain. Do not create a second asset-write path in the subscriptions module. | No |  |

Completion criteria:
- `src/modules/subscriptions/**` exists and owns all M4 write-domain logic.
- `src/modules/admin/subscriptions/**` exists and owns all M4 read-model logic.
- The canonical contracts for table filters, user search, candidate grouping, manual activation, quick add, and cancel flows are explicit and validated.
- No route file or client component contains subscription business logic.

### Implementation Phase 2
- GOAL-002: Replace the subscriber placeholder route with a full admin page and route-local UI that matches the Milestone 3 assets structure and transport pattern.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Replace the placeholder implementation in `src/app/(admin)/admin/subscriber/page.tsx` with a real server page that calls `requireAdminShellAccess()` from `src/modules/users/services.ts`, resolves `searchParams`, parses them through `parseSubscriberTableSearchParams`, loads the initial table page through `getSubscriberTablePage`, and renders a route-local page shell with safe error fallback state. | Yes | 2026-04-16 |
| TASK-012 | Create `src/app/(admin)/admin/subscriber/_components/subscriber-page.tsx` and `subscriber-page-types.ts` as the route-local entry shell for the feature. This page shell must accept the initial server result, table filters, and any route-local bootstrap payloads, then coordinate the table, dialogs, local route state, and React Query refresh behavior. | Yes | 2026-04-16 |
| TASK-013 | Create `src/app/(admin)/admin/subscriber/_components/subscriber-query.ts` that imports the new admin read actions, unwraps successful payloads, and converts validation or `{ ok: false, message }` outcomes into thrown `Error` objects for React Query, exactly mirroring the Milestone 3 `assets-query.ts` behavior. Add stable query-key builders for table data, editor bootstrap, user search, and activation draft data. | Yes | 2026-04-16 |
| TASK-014 | Create `src/app/(admin)/admin/subscriber/_components/use-subscriber-table-state.ts` to own route-local URL search-param state, pagination state, and localStorage-backed column visibility. Keep dialog open or close state in `subscriber-page.tsx`, matching the state-boundary pattern already used by Milestone 3. The `actions` column must remain visible and non-hideable. | Yes | 2026-04-16 |
| TASK-015 | Create the route-local table group under `src/app/(admin)/admin/subscriber/_components/subscriber-table/**`, at minimum `subscriber-table.tsx`, `subscriber-columns.tsx`, `subscriber-row-actions.tsx`, `subscriber-toolbar.tsx`, and `subscriber-filter-popover.tsx`. The table must render the required columns, support clearable search, asset-type filter, status filter, expiry date range filter, server-side pagination, stable browser refreshes, and the locked admin user-cell rendering contract `avatar + username + email` with deterministic initials fallback when `avatarUrl` is null. | Yes | 2026-04-16 |
| TASK-016 | Create the route-local dialog group in Milestone-3-style subfolders under `src/app/(admin)/admin/subscriber/_components/`, at minimum `subscriber-dialog/subscriber-dialog.tsx`, `subscriber-dialog/subscriber-dialog-package-panel.tsx`, `subscriber-dialog/subscriber-dialog-candidate-groups.tsx`, `subscriber-dialog/subscriber-dialog-user-picker.tsx`, `subscriber-cancel-dialog/subscriber-cancel-dialog.tsx`, and `subscriber-quick-add-asset-dialog/subscriber-quick-add-asset-dialog.tsx`. The dialog set must support create and edit modes, server-backed bootstrap, active-package picker, member-only user picker, exact-entitlement candidate grouping, manual override selection, quick-add private asset flow, cancel confirmation, and must expose cancel only for rows whose selected subscription is currently running. | Yes | 2026-04-16 |
| TASK-017 | Implement the subscriber table row-shape and filter semantics in the route-local UI exactly as the canonical admin query contract exposes them. Search must be case-insensitive over `userId`, `username`, and `email`. The asset-type filter must operate over the selected subscription `access_keys_json`. The date-range filter must target `end_at` and preserve the M3 route-safe malformed-param behavior. | Yes | 2026-04-16 |
| TASK-018 | Implement dialog save flows that call `activateSubscriptionManuallyAction`, `quickAddSubscriberAssetAction`, and `cancelSubscriptionAction`, then invalidate the relevant React Query keys and refresh the table. Quick Add success must also refresh the candidate groups and auto-bind the newly created asset into the unsaved dialog draft for its matching `access_key` so the admin does not need to reselect it manually. The UI must never mutate cached subscription state directly in a way that can bypass the canonical server response. | Yes | 2026-04-16 |
| TASK-019 | Keep all sensitive asset values out of the table payload and route state. Candidate rows and quick-add flows may surface only the fields needed to let the admin reason about entitlements and inputs. Any detail state that requires more data must be fetched from the canonical server read path on demand. | Yes | 2026-04-16 |
| TASK-020 | Preserve M3 accessibility and responsive behavior standards in the route-local UI: desktop and mobile layouts must both work; dialogs and toolbar controls must be keyboard navigable; icon-only actions must have accessible labels; failed submits must move focus to the first relevant error; and empty, loading, and error states must be explicit. | Partial | 2026-04-16 |

Completion criteria:
- `/admin/subscriber` is no longer a placeholder and matches the M3 route and UI composition pattern.
- Search, filters, pagination, column persistence, add or edit dialogs, quick add, cancel flow, and browser refresh behavior all work from the real route.
- Client components depend only on route-local transport helpers and action contracts, never directly on server queries.
- The route-local UI remains structurally isolated under `_components`.

### Implementation Phase 3
- GOAL-003: Verify M4 behavior end-to-end with automated tests, browser verification, backend inspection, and project quality gates.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Create automated unit coverage under `tests/unit/modules/admin/subscriptions/{schemas,queries,actions}.test.ts` for search-param parsing, reversed date-range rejection in canonical contracts, user-picker search validation, table-row selection logic, candidate grouping, and read-action error unwrapping. Also add `tests/unit/modules/admin/subscriptions/subscriber-query.test.ts` to cover route-local query-adapter behavior in `src/app/(admin)/admin/subscriber/_components/subscriber-query.ts`, especially successful payload unwrapping and thrown `Error` behavior for validation or `{ ok: false, message }` failures, while staying aligned with the module-scoped M3 unit-test organization pattern. | Yes | 2026-04-16 |
| TASK-022 | Create automated unit coverage under `tests/unit/modules/subscriptions/{schemas,services,actions}.test.ts` for manual activation input validation, quick-add `durationDays -> expiresAt` normalization, exact-entitlement override validation, same-row extension immutability, replacement closure as `canceled`, no-double-running-subscription enforcement, share-per-platform enforcement, cancel side effects, and rollback-safe failure handling. | Yes | 2026-04-16 |
| TASK-023 | Create integration-oriented automated coverage under `tests/integration/modules/admin/subscriptions/*.test.ts` and `tests/integration/modules/subscriptions/*.test.ts` using the existing Vitest runner. Cover admin query composition, candidate grouping with repository-backed data, quick-add delegation into the asset domain, activation atomicity across subscription plus transaction plus assignment writes, replacement revocation side effects, and cancel side effects. If any repo helper fixture is needed, add it under `tests/integration/**` instead of inventing a second test runner. | No |  |
| TASK-024 | Run the Milestone 4 browser checklist against `/admin/subscriber` using `agent-browser` and the seed admin account. The verification record must include deterministic identifiers for the affected user, package, subscription, transaction, and any quick-added asset so later CLI checks can target exact rows. Explicitly prove: search by username, user ID, and email; filter by asset type, subscription status, and date range; create a `processed` subscription; create an `active` subscription; valid manual override success; invalid exact-tuple override rejection; Quick Add followed by final subscription save; disabled-package activation rejection; cancel from admin; `total spent (Rp)` correctness in the UI; same-package `is_extended = true` extension; different-package `is_extended = true` replacement; `is_extended = false` replacement without carry-over; edit of an already running subscription without creating a second running row; reload consistency; guest or member direct-URL denial; disabled-package historical row visibility; desktop and mobile layout; light and dark readability; keyboard access; first-error focus; empty states; and column-visibility persistence including non-hideable `actions`. | Partial | 2026-04-16 |
| TASK-025 | Start every read-only InsForge CLI verification session with `npx @insforge/cli whoami` and `npx @insforge/cli current` to prove the CLI target matches the runtime app project. Then run row-specific verification tied to the exact browser-created or browser-updated rows. Verify `transactions.source = 'admin_manual'`, `transactions.status = 'success'`, non-null `transactions.paid_at`, presence and uniqueness of `transactions.code`, package-price `amount_rp` snapshot even when `durationDays` is overridden, transaction and subscription snapshot consistency, one running subscription only, exact `subscriptions.access_keys_json` and `asset_assignments.access_key` alignment, private-asset single-active-assignment enforcement, share-per-platform invariant, quick-add private asset creation, cancel side effects, and `totalSpentRp` correctness for the affected user. | Partial | 2026-04-16 |
| TASK-026 | Run direct negative-contract checks against the server-side actions for reversed date range, invalid manual override tuple, disabled package activation, quick-add access-key mismatch, and failure cases that must not leave partial success rows. These checks must prove that invalid writes do not persist inconsistent transaction, subscription, or assignment state, that inactive packages are rejected before row creation, and that invalid private-asset reuse attempts are rejected before or at canonical write validation. | No |  |
| TASK-027 | Run the repo quality gates and runtime diagnostics required for completion: `pnpm test`, `pnpm test:unit:coverage`, `pnpm lint`, `pnpm build`, `pnpm check`, and `pnpm markdown:check` only if Markdown under `docs/*` changes. Initialize Next.js DevTools MCP, inspect the running dev server through `next-devtools_nextjs_index`, and inspect relevant runtime or compilation errors for `/admin/subscriber` through `next-devtools_nextjs_call`. If any failure is caused by M4 work, fix only the relevant M4 implementation files and rerun the gates. | Partial | 2026-04-16 |

Completion criteria:
- Automated coverage exists where the repo supports it for the critical M4 contracts.
- Browser verification matches the Milestone 4 checklist in `docs/IMPLEMENTATION_PLAN.md`.
- Read-only backend inspection confirms UI behavior and DB invariants for the affected rows.
- Project quality gates and runtime diagnostics are clean.

### Deferred Verification Coverage
- Milestone 4 closes the admin manual-subscription route, write-path invariants, and direct admin browser proofs required by the milestone checklist, but it does not claim end-to-end member-facing proof for all downstream read paths.
- Deferred to Milestone 6: member `/console` visibility and history reflection for `admin_manual` transactions and subscriptions.
- Deferred to Milestone 10: reconciliation and recovery permutations after later asset disable, delete, or natural expiry events that affect already running subscriptions.
- Deferred to Milestone 11: extension-facing read-path proof for subscriptions and assignments produced by the shared activation service.

## 3. Alternatives
- **ALT-001**: Implementing admin subscriptions through new public `/api/*` routes was rejected because internal admin UI must use server-side layers or Server Actions, not new public REST surfaces.
- **ALT-002**: Embedding admin-manual activation logic inside `src/modules/admin/subscriptions/**` was rejected because M4 explicitly requires reuse of the shared activation service that later payment and CD-Key flows will also use.
- **ALT-003**: Building a client-only subscriber table that fetches data directly from the database was rejected because admin reads and writes must remain server-side and use the existing app admin session boundary.
- **ALT-004**: Treating replacement closure state as implicit was rejected because the M4 spec now locks replacement closures to `canceled` and the plan must stay deterministic.
- **ALT-005**: Re-implementing asset creation inside subscriptions for Quick Add was rejected because the asset domain already owns canonical asset-write logic and must remain the single asset creation path.

## 4. Dependencies
- **DEP-001**: Next.js App Router with the existing `(admin)` route group.
- **DEP-002**: `next-safe-action` shared setup in `src/lib/safe-action/client.ts`.
- **DEP-003**: `adminActionClient` from `src/modules/auth/action-client.ts`.
- **DEP-004**: `requireAdminShellAccess()` and authenticated session helpers in `src/modules/users/services.ts`.
- **DEP-005**: Existing asset-domain module under `src/modules/assets/**` for canonical asset creation and related helper reuse.
- **DEP-006**: Existing admin table and route-local UI pattern under `src/app/(admin)/admin/assets/**`.
- **DEP-007**: Existing admin read-model pattern under `src/modules/admin/assets/**`.
- **DEP-008**: Baseline DB tables `packages`, `assets`, `subscriptions`, `asset_assignments`, `transactions`, and `profiles`.
- **DEP-009**: Baseline DB functions `assign_best_asset(...)`, `apply_subscription_status(...)`, and trigger-backed normalization or validation surfaces from `migrations/022_subscription_engine.sql` and `023_triggers.sql`.
- **DEP-010**: Seed admin and member accounts plus runtime database access for browser and CLI verification.

## 5. Files
- **FILE-001**: `src/app/(admin)/admin/subscriber/page.tsx` - replace placeholder page with guarded route composition.
- **FILE-002**: `src/app/(admin)/admin/subscriber/_components/subscriber-page.tsx` - route-local page shell for the subscriber experience.
- **FILE-003**: `src/app/(admin)/admin/subscriber/_components/subscriber-page-types.ts` - route-local UI props and state contracts.
- **FILE-004**: `src/app/(admin)/admin/subscriber/_components/subscriber-query.ts` - route-local React Query transport adapter for admin read actions.
- **FILE-005**: `src/app/(admin)/admin/subscriber/_components/use-subscriber-table-state.ts` - route-local URL, pagination, column, and dialog state coordination.
- **FILE-006**: `src/app/(admin)/admin/subscriber/_components/subscriber-table/subscriber-table.tsx` - route-local table composition.
- **FILE-007**: `src/app/(admin)/admin/subscriber/_components/subscriber-table/subscriber-columns.tsx` - route-local column definitions.
- **FILE-008**: `src/app/(admin)/admin/subscriber/_components/subscriber-table/subscriber-row-actions.tsx` - route-local row actions for edit and cancel.
- **FILE-009**: `src/app/(admin)/admin/subscriber/_components/subscriber-table/subscriber-toolbar.tsx` - route-local search, filter, and view controls.
- **FILE-010**: `src/app/(admin)/admin/subscriber/_components/subscriber-table/subscriber-filter-popover.tsx` - route-local filter UI for `assetType`, `status`, and date range.
- **FILE-011**: `src/app/(admin)/admin/subscriber/_components/subscriber-dialog/subscriber-dialog.tsx` - add or edit subscriber dialog shell.
- **FILE-012**: `src/app/(admin)/admin/subscriber/_components/subscriber-dialog/subscriber-dialog-user-picker.tsx` - member-only user search UI.
- **FILE-013**: `src/app/(admin)/admin/subscriber/_components/subscriber-dialog/subscriber-dialog-package-panel.tsx` - package snapshot display and duration override UI.
- **FILE-014**: `src/app/(admin)/admin/subscriber/_components/subscriber-dialog/subscriber-dialog-candidate-groups.tsx` - exact-entitlement candidate asset grouping and manual override UI.
- **FILE-015**: `src/app/(admin)/admin/subscriber/_components/subscriber-quick-add-asset-dialog/subscriber-quick-add-asset-dialog.tsx` - quick-add private asset flow inside the subscriber experience.
- **FILE-016**: `src/app/(admin)/admin/subscriber/_components/subscriber-cancel-dialog/subscriber-cancel-dialog.tsx` - cancel confirmation UI.
- **FILE-017**: `src/modules/admin/subscriptions/types.ts` - admin read-model contracts.
- **FILE-018**: `src/modules/admin/subscriptions/schemas.ts` - route parser, filter validation, and admin read-input schemas.
- **FILE-019**: `src/modules/admin/subscriptions/queries.ts` - canonical admin table, bootstrap, user search, and draft reads.
- **FILE-020**: `src/modules/admin/subscriptions/actions.ts` - admin browser-callable read actions.
- **FILE-021**: `src/modules/subscriptions/types.ts` - write-domain contracts.
- **FILE-022**: `src/modules/subscriptions/schemas.ts` - activation, quick-add, and cancel input schemas.
- **FILE-023**: `src/modules/subscriptions/repositories.ts` - subscription-domain data access and DB function wrappers.
- **FILE-024**: `src/modules/subscriptions/services.ts` - canonical activation, quick-add orchestration, and cancellation business logic.
- **FILE-025**: `src/modules/subscriptions/actions.ts` - admin-manual write actions.
- **FILE-026**: `src/modules/assets/{types,schemas,repositories,services}.ts` - optional small extensions needed for canonical quick-add asset reuse.
- **FILE-027**: `tests/unit/modules/admin/subscriptions/{schemas,queries,actions}.test.ts` - admin read-model coverage.
- **FILE-028**: `tests/unit/modules/subscriptions/{schemas,services,actions}.test.ts` - write-domain coverage.
- **FILE-029**: `tests/unit/modules/admin/subscriptions/subscriber-query.test.ts` - route-local admin read-adapter coverage for payload unwrapping and error translation while staying aligned with the module-scoped M3 test organization pattern.
- **FILE-030**: `tests/integration/modules/admin/subscriptions/*.test.ts` - integration-oriented admin read-model coverage using the existing Vitest runner.
- **FILE-031**: `tests/integration/modules/subscriptions/*.test.ts` - integration-oriented write-path coverage for activation, replacement, and cancellation flows.

## 6. Testing
- **TEST-001**: Unit-test `parseSubscriberTableSearchParams` and the canonical table filter schema for malformed params, reversed date ranges, pagination defaults, and deterministic `expiresFrom` or `expiresTo` behavior.
- **TEST-002**: Unit-test `getSubscriberTablePage` for one-row-per-member selection, deterministic ordering, total-spent aggregation, asset-type filtering by exact entitlement snapshot, and exclusion of sensitive asset fields from the list payload.
- **TEST-003**: Unit-test `searchSubscriberUsers` so it returns only members and supports case-insensitive lookup by `userId`, `username`, and `email`.
- **TEST-004**: Unit-test candidate asset grouping and eligibility rules, including exact tuple matching, valid inventory filtering, private-asset exclusion, current-assignment inclusion for edit flows, and share-per-platform enforcement.
- **TEST-005**: Unit-test `activateSubscriptionManually` for all `is_extended` branches, same-row extension immutability, replacement closure as `canceled`, correct `end_at` formulas, post-write `apply_subscription_status(...)` usage, required `transactions.code` generation, and single running subscription enforcement.
- **TEST-006**: Unit-test quick-add normalization so `durationDays` becomes `expiresAt`, `platform:private` is derived correctly, and mismatched entitlement requests fail before persistence.
- **TEST-007**: Unit-test `cancelSubscription` so it applies status `canceled`, revokes active assignments, and creates no new transaction row.
- **TEST-008**: Integration-oriented tests using the existing Vitest runner must cover admin query composition, candidate grouping with repository-backed data, quick-add delegation into the asset domain, activation atomicity, replacement revocation side effects, and cancel side effects.
- **TEST-009**: Manual browser verification with `agent-browser` for `/admin/subscriber`, including search, filters, add, edit, edit of an already running subscription, quick add, cancel, disabled-package historical row visibility, desktop and mobile responsiveness, light and dark readability, keyboard access, accessible action labels, and empty states.
- **TEST-010**: Manual browser verification must also prove guest and member direct URL denial for `/admin/subscriber`, Quick Add draft auto-bind behavior, and column-visibility persistence with non-hideable `actions`.
- **TEST-011**: Read-only InsForge CLI verification must begin with `npx @insforge/cli whoami` and `npx @insforge/cli current`, then prove `transactions`, `subscriptions`, `asset_assignments`, and any quick-added asset rows match the browser flow, including `status = success`, non-null `paid_at`, unique `transactions.code`, price snapshot correctness, transaction-subscription consistency, private-asset single-active-assignment enforcement, and share-per-platform enforcement.
- **TEST-012**: Route-local query-adapter unit coverage for `subscriber-query.ts` must prove successful payload unwrapping and thrown `Error` behavior for validation or `{ ok: false, message }` responses.
- **TEST-013**: Project gates `pnpm test`, `pnpm test:unit:coverage`, `pnpm lint`, `pnpm build`, `pnpm check`, conditional `pnpm markdown:check`, and Next.js runtime or compilation inspection through Next.js DevTools MCP.

## 7. Risks & Assumptions
- **RISK-001**: The current `/admin/subscriber` route is only a placeholder, so route replacement must preserve the existing admin shell behavior and navigation expectations.
- **RISK-002**: The admin table row-shape is a deterministic local implementation decision; if implemented inconsistently across query, filter, pagination, and edit bootstrap, the route behavior will drift.
- **RISK-003**: The baseline DB does not expose a single atomic function for transaction plus subscription orchestration, so app-layer activation code can leave partial state if not wrapped carefully.
- **RISK-004**: Quick Add Asset can drift from canonical asset creation if the implementation duplicates asset-write logic instead of delegating to `src/modules/assets/**`.
- **RISK-005**: Candidate grouping and user search can become expensive if implemented as naive client-side filtering instead of canonical server-side queries.
- **RISK-006**: Replacement closure and same-row extension rules affect history semantics; any mismatch from the locked M4 spec will create cross-milestone drift when M6 reuses the same activation service.
- **ASSUMPTION-001**: The runtime database used for browser verification and InsForge CLI inspection is the same database referenced by `DATABASE_URL`.
- **ASSUMPTION-002**: The repo continues to use the existing M3 admin table stack, React Query provider, and safe-action setup without structural changes before M4 implementation starts.
- **ASSUMPTION-003**: The baseline trigger wiring in `migrations/023_triggers.sql` is active in the runtime database, so normalization and assignment validation triggers are present.
- **ASSUMPTION-004**: No new migration is required for Milestone 4 if the implementation reuses the current baseline tables, views, functions, and triggers as planned.

## 8. Related Specifications / Further Reading
- `docs/works/m4-admin-subscriptions-spec.md`
- `docs/works/m3-admin-asset-plan.md`
- `docs/works/m3-admin-asset-spec.md`
- `docs/PRD.md`
- `docs/DB.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`
- `migrations/011_catalog_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/021_rls_policies.sql`
- `migrations/022_subscription_engine.sql`
- `migrations/023_triggers.sql`
- `migrations/024_views.sql`
- `migrations/030_rpc.sql`
