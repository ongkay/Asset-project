---
goal: Milestone 8 User Logs Implementation Plan
version: 1.0
date_created: 2026-04-19
last_updated: 2026-04-19
owner: AssetProject
status: Planned
tags: [feature, admin, observability, logs, transactions, nextjs, milestone-8]
---

# Introduction
![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the implementation sequence for Milestone 8 User Logs at `/admin/userlogs`. The plan is intentionally structured for `executing-plans`: phases are sequential, tasks are atomic, dependencies are explicit inside each task description, and every phase ends with concrete verification so execution can stop safely on the first blocker.

Implementation status: planned on `2026-04-19`. No execution steps in this document have been marked complete yet.

The implementation must remain consistent with `docs/works/m8-user-logs-spec.md`, `docs/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DB.md`, `docs/agent-rules/folder-structure.md`, `docs/agent-rules/ui-ux-rules.md`, baseline SQL in `migrations/`, the current admin shell under `src/app/(admin)/**`, the current admin page baselines under `src/app/(admin)/admin/assets/**` and `src/app/(admin)/admin/users/**`, and the current shared admin table primitives under `src/components/shared/data-table/**` and `src/components/shared/table-filters/**`.

## 1. Requirements & Constraints
- **REQ-001**: Implement Milestone 8 exactly as specified in `docs/works/m8-user-logs-spec.md`.
- **REQ-002**: Preserve App Router boundaries: `src/app/**` stays thin; route-local UI for `/admin/userlogs` must live under `src/app/(admin)/admin/userlogs/_components/**`; server-side read models live under `src/modules/admin/userlogs/**`.
- **REQ-003**: `src/modules/admin/userlogs/queries.ts` must become the canonical server-side read orchestration boundary for this milestone.
- **REQ-004**: Because current login, extension, and transaction history reads already exist in `src/modules/admin/users/**` as user-detail slices, the M8 plan must avoid leaving diverging row-shape logic in both features. For exact overlapping login/extension/transaction row-shape concerns, extract one canonical server-only helper path so duplicate parsing/mapping logic is not left in both modules. Keep feature-scoped `/admin/users` reads that are not exact overlap (for example capped user-detail slices) and enforce parity via targeted regression checks.
- **REQ-005**: All browser-triggered reads for `/admin/userlogs` must use server actions with `next-safe-action`; do not add internal REST endpoints.
- **REQ-006**: `/admin/userlogs` is strictly read-only. Do not introduce create, edit, revoke, retry, cancel, or delete actions in this milestone.
- **REQ-007**: The page must follow the admin visual baseline in `src/app/(admin)/admin/assets/**`, especially route composition, card shell, toolbar density, sticky table header, dialog treatment, and footer pagination behavior.
- **REQ-008**: Reuse `src/components/shared/data-table/**` and `src/components/shared/table-filters/**` as the first-choice table/filter building blocks unless a concrete blocker requires a route-local wrapper.
- **REQ-009**: Column visibility for `/admin/userlogs` must persist in browser `localStorage` per data tab (`Login History`, `Extension Track`, `Transactions`) using stable keys `admin.userlogs.login.columns.v1`, `admin.userlogs.extension.columns.v1`, and `admin.userlogs.transactions.columns.v1`.
- **REQ-010**: Tab filter state must be namespaced in URL search params exactly as accepted in the M8 spec: `login*`, `extension*`, and `transaction*` keys plus the top-level `tab` key.
- **REQ-011**: Search-param normalization for route parsing and action schemas must follow the current admin baseline: invalid filter enum values normalize to `null`, invalid `tab` values normalize to `login`, invalid pages/page sizes normalize to defaults, invalid date strings normalize to `null`, and reversed date ranges clear both ends rather than swapping automatically.
- **REQ-012**: Login History must read from `public.login_logs`, not from `app_sessions` or any derived aggregate.
- **REQ-013**: Extension Track must read from `public.extension_tracks` and preserve the DB uniqueness semantics `user_id + device_id + ip_address + extension_id`.
- **REQ-014**: Transactions must preserve the visible semantics of `public.v_transaction_list`, but M8 must not rely on that view alone because the route also needs `subscription_id`, `public_id`, and `avatar_url`. The canonical transaction query must therefore read from `public.transactions` plus `public.profiles`, or from an equivalent extended server-side projection that includes those fields.
- **REQ-015**: The required linked-history surface on `/admin/userlogs` must read deleted-asset history from `public.asset_assignments` snapshots, not from the current `public.assets` row.
- **REQ-015A**: Linked-history reads must keep snapshot rows readable when `asset_id` is `null`; `asset_deleted_at` is optional metadata and must not be treated as the sole validity signal.
- **REQ-016**: The linked-history surface must be reachable from the transactions tab without navigating away from `/admin/userlogs`.
- **REQ-017**: If a transaction has `subscription_id = null`, the linked-history surface must still open and show an explicit empty state rather than hiding the interaction or attempting fallback joins.
- **REQ-018**: All browser and OS values shown in M8 must come from persisted `login_logs` and `extension_tracks` values; do not re-derive them at read time from `src/lib/request-metadata.ts` or current user-agent strings.
- **REQ-019**: Any filter-option lists backed by stored values must not be limited to the current paginated slice. The active filter value must remain selectable and visible after refresh.
- **REQ-020**: Dynamic browser/OS filter-option lists must be derived from distinct persisted DB values relevant to each tab and must never be limited to the current paginated slice; the active selected value must stay available after refresh.
- **REQ-021**: Transactions source and status filters must use the stored enum-backed values already defined by the runtime schema, and parser/action schemas must enforce that allowed set.
- **REQ-022**: User cells must follow the global admin rule `avatar + username + email`; unresolved login-history rows must still render a readable fallback identity using the raw login email plus neutral copy indicating no linked profile.
- **REQ-023**: Fallback avatar tone must remain deterministic per user and reuse the current helper in `src/lib/avatar.ts`.
- **REQ-024**: The implementation must not expose `asset_json`, asset `account`, asset `proxy`, auth metadata, or any other sensitive secret material in route payloads or UI.
- **REQ-025**: Do not add a migration unless implementation reaches a concrete blocker that cannot be solved with the current schema, views, policies, triggers, and server-side query composition.
- **REQ-026**: Browser verification must use the runtime seed/setup expected by `docs/IMPLEMENTATION_PLAN.md`, including the deleted-asset snapshot scenario already seeded in `040_dev_seed_full.sql` via `delete_asset_safely()`.
- **REQ-027**: All M8 route-level reads, query composition, and browser-triggered refetches must execute inside an authenticated admin app context on the server side, matching the current admin-page pattern already used in the repo.
- **REQ-028A**: Changing search, any filter, or page size must reset that tab's page to `1`.
- **REQ-028B**: All minimum columns required by the accepted M8 spec must be visible by default on first load before any localStorage override exists.
- **SEC-001**: The admin browser must never use `project_admin`, service credentials, or direct privileged database credentials client-side.
- **SEC-002**: The required linked-history surface must not depend on a live `public.assets` join as the sole source of deleted-asset data.
- **SEC-003**: The linked-history surface must never expose `account`, `proxy`, or `asset_json`, even when the current asset row still exists.
- **CON-001**: Use `pnpm` only.
- **CON-002**: Use repo-approved stack only: Next.js App Router, Tailwind, existing UI primitives, `zod`, `@tanstack/react-query`, `@tanstack/react-table`, and the current InsForge adapters.
- **CON-003**: Keep table-toolbar filters on the repo's current route-local state hook + URL sync + Zod parser pattern. Do not introduce `react-hook-form` for simple tab toolbar filters.
- **CON-004**: Keep existing repo patterns unless a concrete Milestone 8 requirement forces a divergence.
- **PAT-001**: Mirror the route composition pattern already used by `src/app/(admin)/admin/assets/page.tsx` and `src/app/(admin)/admin/users/page.tsx`: guard access, await `searchParams`, parse filters in the module layer, load initial server data, and render a client page component.
- **PAT-002**: Mirror the route-local query adapter pattern already used by `src/app/(admin)/admin/assets/_components/assets-query.ts` and `src/app/(admin)/admin/users/_components/users-query.ts`.
- **PAT-003**: Prefer `Dialog` for the required linked-history surface so it stays aligned with `user-detail-dialog` and `asset-detail-dialog` patterns in the current admin UI.
- **PAT-004**: The route may server-render only the selected tab's initial dataset and lazy-load the other tabs after activation via React Query. This is the preferred implementation shape for M8, but not a product-level requirement outside this plan.

## 2. Implementation Steps

### Implementation Phase 1
- GOAL-001: Lock the M8 contracts for route state, tab filters, page payloads, and linked-history payloads so later repository and UI work can consume stable shapes without guessing field names or normalization behavior.
- Entry Criteria: `docs/works/m8-user-logs-spec.md` is accepted as the source of truth for Milestone 8.
- Completion Criteria: Admin-userlogs types and schemas exist, parser behavior is explicit, and later phases can implement repositories, actions, and UI without inventing undocumented filter semantics.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `src/modules/admin/userlogs/types.ts` with the stable contracts required by the accepted spec and this plan: `AdminUserLogsActiveTab`, `AdminLoginHistoryFilters`, `AdminExtensionTrackFilters`, `AdminTransactionsFilters`, `AdminUserLogsRouteState`, all row/page payloads, `AdminTransactionRevenueSummary`, `AdminAssignmentSnapshotRow`, and `AdminTransactionDetail`. Include any extra payload fields needed for filter-option lists, such as `availableOsValues` for Login History, while keeping the browser-visible contract explicit and non-sensitive. | No | — |
| TASK-002 | Create `src/modules/admin/userlogs/schemas.ts` with Zod schemas for the `tab` param, each namespaced filter set, and `transactionId` input for the linked-history surface. Implement `parseAdminUserLogsSearchParams()` with the exact normalization contract from the accepted M8 spec: invalid enum/date/page/pageSize handling, reversed date-range clearing, and namespaced tab-state preservation. | No | — |
| TASK-003 | Lock the concrete option-source strategy in module contracts before data-access work begins: login-history OS filter options, extension browser/OS filter options, and fixed transaction source/status enums. Encode those choices in `src/modules/admin/userlogs/types.ts` and `schemas.ts` so later UI work does not guess where filter options come from. Transaction enums must follow the accepted spec values. | No | — |
| TASK-004 | Verify Phase 1 by checking the new M8 type and schema contracts in isolation: route search params can be parsed deterministically, each tab's state can be represented without ambiguity, and the required linked-history payload has an explicit place for `subscription_id = null` empty-state handling. Stop here if any field name or normalization rule remains uncertain. | No | — |

### Implementation Phase 2
- GOAL-002: Build the canonical admin-userlogs data-access layer and eliminate the risk of diverging history row-shape logic between `/admin/userlogs` and the current `/admin/users` detail dialog.
- Entry Criteria: Phase 1 contracts are stable.
- Completion Criteria: Server-only repositories exist for login, extension, transaction, revenue, and assignment-history reads; overlapping admin-users history reads point to one canonical helper path where practical.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Introduce `src/modules/admin/userlogs/repositories.ts` as a server-only repository only for reads that are not already cleanly reusable from existing domain/admin repositories. Add low-level read helpers for paginated Login History, paginated Extension Track, paginated Transactions, transaction revenue summary, distinct extension browser/OS values, distinct login OS values when required by the chosen option strategy, and linked assignment-history reads by `subscription_id`. Any DB client used here must execute in authenticated admin server context and remain aligned with app-policy constraints; keep output parsing behind Zod row schemas in this file. | No | — |
| TASK-006 | Implement the Login History repository path in TASK-005 against `public.login_logs` plus profile joins only where resolvable. Preserve unresolved rows with raw email fallback, keep ordering `created_at desc, id desc`, and keep browser/OS values sourced from stored columns rather than fresh derivation. Depend on TASK-001 and TASK-002. | No | — |
| TASK-007 | Implement the Extension Track repository path in TASK-005 against `public.extension_tracks` plus `public.profiles`. Preserve ordering `last_seen_at desc, first_seen_at desc, id desc`, use stored browser/OS/city/country values, and keep filter-option queries independent from the current paginated slice. Depend on TASK-001 and TASK-002. | No | — |
| TASK-008 | Implement the Transactions repository path in TASK-005 using `public.transactions` plus `public.profiles` as the canonical base query, while preserving the visible row semantics of `public.v_transaction_list`. Do not rely on the view alone because the page also needs `subscription_id`, `public_id`, and `avatar_url`. Keep ordering `created_at desc, updated_at desc, transaction PK desc`. Depend on TASK-001 and TASK-002. | No | — |
| TASK-009 | Implement the linked-history repository path in TASK-005 against `public.asset_assignments` keyed by `subscription_id`. The query must read snapshot fields only, must not require a live `public.assets` join to stay meaningful, must keep rows readable when `asset_id` is `null`, must return all relevant assignment snapshot rows for the subscription (not latest-only), and must preserve ordering `assigned_at desc, id desc`. Depend on TASK-008. | No | — |
| TASK-010 | Refactor `src/modules/admin/users/repositories.ts` and `src/modules/admin/users/queries.ts` only for exact overlapping login/extension/transaction row-shape logic so both features can delegate to one canonical server-only helper path. Keep capped detail-specific reads and other non-overlapping user-detail concerns in `admin/users`, and apply extraction incrementally to avoid destabilizing the existing user-detail dialog. Depend on TASK-005 through TASK-009. | No | — |
| TASK-011 | Verify Phase 2 with targeted server-side checks on the new repository helpers: login-history rows still resolve null `user_id`, extension rows stay aligned with `extension_tracks`, transaction rows include `subscriptionId/publicId/avatarUrl` without losing `v_transaction_list` semantics, revenue summary excludes non-success statuses, linked-history rows still return useful snapshots when the asset row is gone, and `asset_deleted_at` is not treated as the sole validity gate. Stop if the new repository layer still depends on current `assets` rows for deleted-history readability. | No | — |

### Implementation Phase 3
- GOAL-003: Implement the canonical query composition and thin admin read transport actions for the three tabs and the required linked-history surface.
- Entry Criteria: Phase 2 repositories exist and are trustworthy.
- Completion Criteria: `/admin/userlogs` can load any tab plus the linked-history surface through server-side queries and thin admin actions without route-local business logic.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Create `src/modules/admin/userlogs/queries.ts` with server-only query entry points `getAdminLoginHistoryPage(filters)`, `getAdminExtensionTrackPage(filters)`, `getAdminTransactionsPage(filters)`, and `getAdminTransactionDetail({ transactionId })`. Compose each one from TASK-005 through TASK-009 repository helpers, preserve accepted filter semantics, and keep user-facing mapping in the query layer rather than in route components. Depend on TASK-005 through TASK-010. | No | — |
| TASK-013 | In `src/modules/admin/userlogs/queries.ts`, compute the transaction-tab revenue summary from the full filtered non-pagination dataset, not from the current page slice. Ensure `status = success` is the only contributor to the revenue number and that a zero-success dataset returns `0` cleanly. Depend on TASK-008 and TASK-012. | No | — |
| TASK-014 | In `src/modules/admin/userlogs/queries.ts`, implement the required linked-history empty-state behavior: if the transaction has `subscription_id = null`, or if no assignment snapshots exist for that subscription, return a deterministic empty detail payload rather than forcing the route-local UI to infer missing-state rules. Depend on TASK-009 and TASK-012. | No | — |
| TASK-015 | Create `src/modules/admin/userlogs/actions.ts` as thin admin read actions only. Mirror the envelope style used by `src/modules/admin/assets/actions.ts` and `src/modules/admin/users/actions.ts`. Add actions for the three tab pages and the linked-history detail surface, gate them through `adminActionClient`, and keep all real data composition inside `queries.ts`. Depend on TASK-012 through TASK-014. | No | — |
| TASK-016 | Verify Phase 3 by calling the new actions directly and confirming the action schemas, parser normalization, query mapping, and result envelopes line up with the accepted M8 contracts. Explicitly check search, date ranges, transaction summary, and linked-history detail with `subscription_id = null`. Stop if any browser-triggered read still depends on route-local business logic. | No | — |

### Implementation Phase 4
- GOAL-004: Replace the `/admin/userlogs` placeholder with the real guarded route, route-local query wrapper, and tabbed state shell that matches current admin-page patterns.
- Entry Criteria: Phase 3 queries and actions are available.
- Completion Criteria: The route renders a real client page shell with selected-tab initial server data, namespaced URL state, and per-tab column-visibility persistence.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Replace `src/app/(admin)/admin/userlogs/page.tsx` with the same route-level composition pattern used by `src/app/(admin)/admin/assets/page.tsx`: `requireAdminShellAccess()`, await `searchParams`, call `parseAdminUserLogsSearchParams()`, load the selected tab's initial dataset on the server, and render a client `AdminUserLogsPage` component with initial data and error props. Do not leave placeholder `AdminSectionPage` content in the route. Depend on TASK-012 and TASK-015. | No | — |
| TASK-018 | Create `src/app/(admin)/admin/userlogs/_components/userlogs-page-types.ts`, `userlogs-query.ts`, and `use-userlogs-state.ts`. Mirror the assets/users route-local patterns: React Query query keys and fetch wrappers in `userlogs-query.ts`, namespaced URL-sync plus per-tab column-visibility state in `use-userlogs-state.ts`, and consistent action-envelope error normalization (validation/server/domain message) in the route-local query adapter path. The hook must preserve each tab's independent filter state when switching tabs and reset page to `1` when search/filter/page-size changes. Depend on TASK-015 and the accepted M8 storage-key contract. | No | — |
| TASK-019 | Create `src/app/(admin)/admin/userlogs/_components/userlogs-page.tsx` as the tabbed page shell. It should own the selected-tab state, the per-tab query wiring, and the linked-history dialog state, while delegating table rendering to route-local tab components created later. Use the admin card-shell pattern from `/admin/assets` and `/admin/users`, not a custom layout. Depend on TASK-017 and TASK-018. | No | — |
| TASK-020 | Verify Phase 4 in the browser and at the component level: `/admin/userlogs` should render a real guarded shell, default to `Login History`, preserve namespaced search params across tab changes, and keep the route file composition-only. Stop if page-level business logic drifts back into `page.tsx` or if tab-state URL sync starts dropping unrelated tab params. | No | — |

### Implementation Phase 5
- GOAL-005: Build the three tabbed admin surfaces and the required linked-history surface with production-quality admin UX and stable server-driven data behavior.
- Entry Criteria: Phase 4 route and page shell are stable.
- Completion Criteria: The Login History, Extension Track, and Transactions tabs render complete milestone UI, and the linked-history surface exposes deleted-asset snapshots safely from `/admin/userlogs`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Create `src/app/(admin)/admin/userlogs/_components/login-history-table/login-history-table.tsx`, `login-history-columns.tsx`, and `login-history-toolbar.tsx`. Reuse shared admin table/filter primitives with baseline-consistent composition. The Login History tab must support user-oriented search, OS/date filtering, unresolved-user fallback display, required minimum columns visible by default on first load, and no exposure of extra sensitive fields. Depend on TASK-018 and TASK-019. | No | — |
| TASK-022 | Create `src/app/(admin)/admin/userlogs/_components/extension-track-table/extension-track-table.tsx`, `extension-track-columns.tsx`, and `extension-track-toolbar.tsx`. Reuse shared admin table/filter primitives with baseline-consistent composition. The Extension Track tab must support user-oriented search, browser/OS/date filters, required minimum columns visible by default on first load, and neutral placeholder copy for nullable city/country/browser/OS cells. Depend on TASK-018 and TASK-019. | No | — |
| TASK-023 | Create `src/app/(admin)/admin/userlogs/_components/transactions-table/transactions-table.tsx`, `transactions-columns.tsx`, `transactions-toolbar.tsx`, and `transactions-row-actions.tsx`. Reuse shared admin table/filter primitives with baseline-consistent composition. The Transactions tab must support search, source/status/date filters, required minimum columns visible by default on first load, the revenue summary card, and a row action such as `View History` that opens the required linked-history surface for every row. Depend on TASK-018 and TASK-019. | No | — |
| TASK-024 | Create `src/app/(admin)/admin/userlogs/_components/transaction-detail-dialog/transaction-detail-dialog.tsx`. Use `Dialog` as the default surface, show the transaction summary plus assignment snapshot history, and render explicit empty states for `subscription_id = null` or zero snapshots. Never render `account`, `proxy`, or `asset_json`, even if the current asset row still exists. Depend on TASK-015, TASK-019, and TASK-023. | No | — |
| TASK-025 | Wire `userlogs-page.tsx` to the Phase 5 tab components so each tab can refetch through React Query, the linked-history dialog can fetch detail on demand, and the selected-tab initial data is reused when filters match the server bootstrap state. Depend on TASK-021 through TASK-024. | No | — |
| TASK-026 | Verify Phase 5 in the browser for interaction quality and layout integrity: sticky headers, tab switching, clearable search, view-column persistence, responsive behavior, neutral placeholder copy, revenue summary placement, and the required linked-history dialog. Stop if the page drifts from the admin baseline or if the dialog leaks sensitive fields. | No | — |

### Implementation Phase 6
- GOAL-006: Finish milestone verification, runtime diagnostics, and final consistency checks so M8 is provably aligned with the spec, PRD, migrations, and current repo boundaries.
- Entry Criteria: Phases 1 through 5 are implemented.
- Completion Criteria: Quality gates pass, browser verification is complete, backend invariant verification is complete, and the final implementation remains consistent with the M8 spec and repo structure.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Run `pnpm lint`, `pnpm check`, and `pnpm test`. Fix any failures introduced by the Milestone 8 implementation without broad unrelated refactors. | No | — |
| TASK-028 | Run browser verification for the Milestone 8 checklist from `docs/IMPLEMENTATION_PLAN.md` via `agent-browser`: open `/admin/userlogs`, verify the `Login History` tab seed rows and filtering by user/date/OS, verify each tab resets to page `1` when search/filter/page-size changes, trigger one fresh member login and confirm a new login-history row appears, verify `Extension Track` seed rows and user-oriented filtering, verify `Transactions` rows plus date-range-driven revenue changes, open the required linked-history surface for a seeded transaction whose historical asset snapshot remains available after asset deletion, and verify direct access as guest/member is denied by route guard. Use the deleted-asset history seeded in `040_dev_seed_full.sql` instead of manual mid-flow DB edits. | No | — |
| TASK-029 | Run backend invariant verification against the runtime-linked database using the read-only InsForge CLI path mandated by `docs/IMPLEMENTATION_PLAN.md`. Start with `npx @insforge/cli whoami` and `npx @insforge/cli current`, confirm the CLI target matches the app runtime database, then verify: Login History reads from `login_logs`, Extension Track rows preserve the unique identity `user_id + device_id + ip_address + extension_id`, Transactions remain consistent with `transactions` and `v_transaction_list`, and linked-history data still comes from `asset_assignments` snapshots after asset deletion. | No | — |
| TASK-030 | Check Next.js runtime/compilation status for `/admin/userlogs`, then scan `.next/dev/logs/*.log` and require zero relevant Milestone 8 errors before closure. Perform the final consistency pass against `docs/works/m8-user-logs-spec.md`, `docs/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DB.md`, `docs/agent-rules/folder-structure.md`, `docs/agent-rules/ui-ux-rules.md`, the shared admin table primitives, and the current admin visual baseline under `src/app/(admin)/admin/assets/**` and `src/app/(admin)/admin/users/**`. Only after all evidence is green should the implementation be considered ready for `finishing-a-development-branch`. | No | — |

## 3. Alternatives
- **ALT-001**: Keep `/admin/userlogs` as a placeholder and defer the real observability page until Milestone 9. Rejected because Milestone 8 explicitly owns `/admin/userlogs`.
- **ALT-002**: Reuse only the current `src/modules/admin/users/**` recent-history queries for `/admin/userlogs`. Rejected because those reads are capped to detail-dialog usage and would create duplicate or stretched semantics for a full admin observability page.
- **ALT-003**: Read the Transactions tab solely from `public.v_transaction_list`. Rejected because M8 also needs `subscription_id`, `public_id`, and `avatar_url` for the required linked-history surface and admin user presentation.
- **ALT-004**: Read deleted-asset history by joining back to `public.assets`. Rejected because PRD, DB, and the accepted M8 spec require deleted-asset history to remain available from `asset_assignments` snapshots even when the `assets` row is gone.
- **ALT-005**: Add a new internal `/api/admin/userlogs/*` endpoint family. Rejected because internal admin reads should use server components, module queries, and server actions rather than new public REST endpoints.
- **ALT-006**: Split M8 into three separate admin routes instead of one tabbed page. Rejected because PRD and `docs/IMPLEMENTATION_PLAN.md` define one `/admin/userlogs` page with three tabs.

## 4. Dependencies
- **DEP-001**: `docs/works/m8-user-logs-spec.md` for all milestone contracts.
- **DEP-002**: `docs/PRD.md` section `7.8. Users Activity (/admin/userlogs)` for product behavior.
- **DEP-003**: `docs/IMPLEMENTATION_PLAN.md` Milestone 8 for browser and backend verification criteria.
- **DEP-003A**: `docs/DB.md` sections for `login_logs`, `transactions`, `asset_assignments`, `extension_tracks`, and `v_transaction_list` semantics.
- **DEP-004**: `docs/agent-rules/folder-structure.md` for route/module boundaries.
- **DEP-005**: `docs/agent-rules/ui-ux-rules.md` for admin visual and interaction baseline.
- **DEP-006**: Baseline migrations `001_extensions.sql` through `030_rpc.sql` applied in order per `migrations/README.md`.
- **DEP-006A**: Seed files `040_dev_seed_full.sql`, `041_dev_seed_loginable_users.sql`, and `042_dev_seed_admin_users.sql` for browser/runtime verification data.
- **DEP-006B**: Deleted-asset snapshot verification depends on `022_subscription_engine.sql` because `040_dev_seed_full.sql` uses `delete_asset_safely()`.
- **DEP-007**: Existing admin route and shell patterns in `src/app/(admin)/admin/assets/**` and `src/app/(admin)/admin/users/**`.
- **DEP-008**: Existing admin read action/query patterns in `src/modules/admin/assets/actions.ts`, `src/modules/admin/users/actions.ts`, `src/app/(admin)/admin/assets/_components/assets-query.ts`, and `src/app/(admin)/admin/users/_components/users-query.ts`.
- **DEP-009**: Existing admin shell route registration in `src/app/(admin)/_components/admin-shell/admin-shell-config.ts` and `src/app/(admin)/admin/_components/admin-overview-page.tsx`.
- **DEP-010**: Shared admin table and filter primitives in `src/components/shared/data-table/**` and `src/components/shared/table-filters/**`.
- **DEP-011**: Existing fallback-avatar helper in `src/lib/avatar.ts`.
- **DEP-012**: Existing stored browser/OS write path in `src/lib/request-metadata.ts`, `src/modules/auth/repositories.ts`, and the extension-track upsert flow defined in `migrations/030_rpc.sql`, only as data-shape reference for persisted values, not as a read-time derivation source.

## 5. Files
- **FILE-001**: Modify `src/app/(admin)/admin/userlogs/page.tsx`.
- **FILE-002**: Create `src/app/(admin)/admin/userlogs/_components/userlogs-page.tsx`.
- **FILE-003**: Create `src/app/(admin)/admin/userlogs/_components/userlogs-page-types.ts`.
- **FILE-004**: Create `src/app/(admin)/admin/userlogs/_components/userlogs-query.ts`.
- **FILE-005**: Create `src/app/(admin)/admin/userlogs/_components/use-userlogs-state.ts`.
- **FILE-006**: Create `src/app/(admin)/admin/userlogs/_components/login-history-table/login-history-table.tsx`.
- **FILE-007**: Create `src/app/(admin)/admin/userlogs/_components/login-history-table/login-history-columns.tsx`.
- **FILE-008**: Create `src/app/(admin)/admin/userlogs/_components/login-history-table/login-history-toolbar.tsx`.
- **FILE-009**: Create `src/app/(admin)/admin/userlogs/_components/extension-track-table/extension-track-table.tsx`.
- **FILE-010**: Create `src/app/(admin)/admin/userlogs/_components/extension-track-table/extension-track-columns.tsx`.
- **FILE-011**: Create `src/app/(admin)/admin/userlogs/_components/extension-track-table/extension-track-toolbar.tsx`.
- **FILE-012**: Create `src/app/(admin)/admin/userlogs/_components/transactions-table/transactions-table.tsx`.
- **FILE-013**: Create `src/app/(admin)/admin/userlogs/_components/transactions-table/transactions-columns.tsx`.
- **FILE-014**: Create `src/app/(admin)/admin/userlogs/_components/transactions-table/transactions-toolbar.tsx`.
- **FILE-015**: Create `src/app/(admin)/admin/userlogs/_components/transactions-table/transactions-row-actions.tsx`.
- **FILE-016**: Create `src/app/(admin)/admin/userlogs/_components/transaction-detail-dialog/transaction-detail-dialog.tsx`.
- **FILE-017**: Create `src/modules/admin/userlogs/types.ts`.
- **FILE-018**: Create `src/modules/admin/userlogs/schemas.ts`.
- **FILE-019**: Create `src/modules/admin/userlogs/repositories.ts` only if TASK-005 confirms non-reusable reads require new admin-userlogs repository helpers; otherwise compose from existing repositories via `src/modules/admin/userlogs/queries.ts`.
- **FILE-020**: Create `src/modules/admin/userlogs/queries.ts`.
- **FILE-021**: Create `src/modules/admin/userlogs/actions.ts`.
- **FILE-022**: Modify `src/modules/admin/users/repositories.ts` only if overlapping recent-history reads are extracted to the canonical M8 helper path.
- **FILE-023**: Modify `src/modules/admin/users/queries.ts` only if TASK-010 requires that detail-dialog history reads delegate to the new canonical helper path.
- **FILE-024**: Create `src/app/(admin)/admin/userlogs/_components/userlogs-action-feedback.ts` only if TASK-018 needs a dedicated route-local action-envelope normalizer shared by `userlogs-query.ts`.

## 6. Testing
- **TEST-001**: Unit test `parseAdminUserLogsSearchParams()` for namespaced tab state, invalid enum/date normalization, invalid page/pageSize normalization, and reversed date-range clearing.
- **TEST-002**: Integration test Login History query composition, including unresolved `user_id = null` rows, raw email fallback, and direct `login_logs` provenance.
- **TEST-003**: Integration test Extension Track query composition, including distinct browser/OS filter-option handling and preserved `user_id + device_id + ip_address + extension_id` semantics.
- **TEST-004**: Integration test Transactions query composition, including `transactions + profiles` join fields, `v_transaction_list` semantic parity for visible columns, and revenue summary excluding non-success rows.
- **TEST-005**: Integration test linked-history detail, including `subscription_id = null` empty state, zero-assignment empty state, and deleted-asset snapshot readability from `asset_assignments` without a live `assets` row.
- **TEST-006**: Integration or focused regression test that any extracted canonical M8 history helpers do not regress the existing `/admin/users` detail history sections.
- **TEST-007**: Browser verification for `/admin/userlogs` matching the Milestone 8 checklist in `docs/IMPLEMENTATION_PLAN.md`, including seed rows, user/date/OS filtering, a newly created login event, transaction revenue updates, and the required linked-history surface.
- **TEST-008**: Run `pnpm lint`.
- **TEST-009**: Run `pnpm check`.
- **TEST-010**: Run `pnpm test`.
- **TEST-011**: Read-only `npx @insforge/cli` verification starting with `whoami` and `current`, then targeted checks for `login_logs`, `extension_tracks`, `transactions`/`v_transaction_list`, and deleted-asset snapshot rows in `asset_assignments`.
- **TEST-012**: Check Next.js runtime/compilation diagnostics for `/admin/userlogs`.
- **TEST-013**: Scan `.next/dev/logs/*.log` and require zero relevant Milestone 8 errors before closure.
- **TEST-014**: Verify each tab resets pagination to page `1` when search/filter/page-size changes.
- **TEST-015**: Verify direct URL access and read-action usage for `/admin/userlogs` is denied for guest/member users.

## 7. Risks & Assumptions
- **RISK-001**: Canonicalizing history reads in `src/modules/admin/userlogs/**` can accidentally break the current `/admin/users` detail dialog if shared row-shape extraction is broader than necessary.
- **RISK-002**: Transactions-tab implementation can drift if developers rely too heavily on `v_transaction_list` and forget the additional fields required for the linked-history surface.
- **RISK-003**: Namespaced tab state plus per-tab localStorage visibility adds more client-state surface area than previous admin pages; sloppy URL merging can silently drop another tab's params.
- **RISK-004**: Distinct browser/OS option queries can become inconsistent with page data if they are computed from the wrong filter scope or only from the current paginated slice.
- **RISK-005**: The linked-history surface can accidentally leak sensitive asset data if it queries current assets rows too broadly instead of staying on assignment snapshots.
- **RISK-006**: Browser verification may produce false negatives if the runtime database is not the same seeded database expected by `docs/IMPLEMENTATION_PLAN.md`, especially for deleted-asset history seeded in `040_dev_seed_full.sql`.
- **ASSUMPTION-001**: No migration is required for Milestone 8 because the needed tables, views, policies, and seed data already exist in baseline SQL.
- **ASSUMPTION-002**: The current admin shell navigation and overview cards already expose `/admin/userlogs`, so route-discovery work is minimal and does not require a separate admin-shell phase.
- **ASSUMPTION-003**: React Query remains the correct client read-state transport for M8 because the repo already uses it for admin pages with server-bootstrapped initial data.

## 8. Related Specifications / Further Reading
- `docs/works/m8-user-logs-spec.md`
- `docs/PRD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DB.md`
- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`
- `migrations/010_profiles_and_auth_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/021_rls_policies.sql`
- `migrations/024_views.sql`
- `migrations/030_rpc.sql`
- `migrations/040_dev_seed_full.sql`
- `migrations/041_dev_seed_loginable_users.sql`
- `migrations/042_dev_seed_admin_users.sql`
- `src/app/(admin)/admin/assets/page.tsx`
- `src/app/(admin)/admin/assets/_components/assets-page.tsx`
- `src/app/(admin)/admin/users/page.tsx`
- `src/app/(admin)/admin/users/_components/users-page.tsx`
- `src/modules/admin/users/actions.ts`
- `src/modules/admin/users/queries.ts`
- `src/modules/admin/users/repositories.ts`
