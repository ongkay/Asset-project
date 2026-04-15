---
goal: Milestone 3 Admin Asset Delivery Plan
version: 1.0
date_created: 2026-04-15
last_updated: 2026-04-15
owner: AssetProject
status: Planned
tags: [feature, process, admin, asset, nextjs, insforge, milestone-3]
---

# Introduction
![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the executable implementation sequence for Milestone 3 Admin Asset. The target outcome is a guarded admin `/admin/assets` flow that can create, inspect, edit, search, filter, paginate, enable or disable, and safely delete asset inventory using server-side mutations, server-computed status, and the baseline safe-delete and recovery engine.

## 1. Requirements & Constraints

### Source Alignment
| Source                                   | Relevant References                                                                                                  | Required Impact                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `docs/PRD.md`                            | `3.8` asset invalidation and recheck, `3.10` admin and history rules, `7.7 Assets Management`, `10` acceptance rules | Asset CRUD, derived status, safe delete, and current-user visibility must preserve exact inventory and history behavior. |
| `docs/IMPLEMENTATION_PLAN.md`            | Milestone 3 section                                                                                                  | Scope must remain limited to admin asset inventory and the associated verification checklist.                            |
| `docs/DB.md`                             | `5.5 assets`, `5.7 asset_assignments`, `7.2 v_current_asset_access`, `7.3 v_asset_status`, `8` DB functions          | Read model and mutation behavior must stay aligned with status derivation, active usage, and snapshot-preserving delete. |
| `migrations/011_catalog_tables.sql`      | `public.assets` schema                                                                                               | Asset data must persist to the baseline inventory table without schema drift.                                            |
| `migrations/012_subscription_tables.sql` | `public.asset_assignments`, `public.subscriptions` schema                                                            | `total used`, current users, and delete side effects must respect active assignment rules and history snapshots.         |
| `migrations/021_rls_policies.sql`        | `assets_admin_*`, `asset_assignments_admin_*`                                                                        | Admin asset read and write paths must operate with the normal authenticated admin session.                               |
| `migrations/022_subscription_engine.sql` | `recheck_subscription_after_asset_change`, `delete_asset_safely`                                                     | Disable and delete flows must use the baseline recovery engine instead of hand-rolled mutation logic.                    |
| `migrations/023_triggers.sql`            | `assets_set_updated_at`, assignment validation trigger                                                               | Asset updates must preserve baseline `updated_at` behavior and downstream assignment invariants.                         |
| `migrations/024_views.sql`               | `v_asset_status`                                                                                                     | The admin asset table should derive status from the baseline view or an exact equivalent.                                |

- **REQ-001**: Implement Milestone 3 only for the admin asset-management domain and its direct route.
- **REQ-002**: Keep all mutations server-side and do not introduce a public REST endpoint for the admin UI.
- **REQ-003**: Treat `public.assets` as current inventory only; deleted assets must leave the table.
- **REQ-004**: Treat `status` as derived, not user-authored.
- **REQ-005**: Use `public.recheck_subscription_after_asset_change(asset_id)` for disable side effects.
- **REQ-006**: Use `public.delete_asset_safely(asset_id)` for hard delete.
- **REQ-007**: Use `react-hook-form` and `zod` for the create and detail-edit UI contract.
- **REQ-008**: Use `next-safe-action` for admin mutations only, with admin route entrypoints in `src/modules/admin/assets/actions.ts` delegating to `src/modules/assets/services.ts`.
- **REQ-009**: Use the existing repo stack with `@tanstack/react-query`, `@tanstack/react-table`, and `src/components/shared/**` primitives.
- **REQ-010**: Use the shared date-range filter contract with `yyyy-MM-dd` strings, and apply that filter to `expires_at`.
- **REQ-011**: Keep the asset table read model one-row-per-asset even when username or email search matches multiple active users on a `share` asset.
- **REQ-012**: Verification must cover direct route access, negative paths, and Next.js runtime or compilation health in addition to happy-path admin CRUD.
- **SEC-001**: Do not read or write asset data from the client with privileged database credentials.
- **SEC-002**: Enforce admin-only access on `/admin/assets` and all related actions.
- **SEC-003**: Keep raw `account`, `proxy`, and `asset_json` in detail payloads only; do not expose them in the asset-list payload, column-visibility config, or URL state.
- **CON-001**: Keep `src/app/**` thin and route-composition only.
- **CON-002**: Put asset business logic in `src/modules/assets/**`.
- **CON-003**: Put admin asset read-model logic in `src/modules/admin/assets/**`.
- **CON-004**: Reuse existing UI primitives and shared table or filter components before adding new ones.
- **CON-005**: Prefer the current baseline SQL objects before adding a new migration.
- **GUD-001**: Default create-form expiry to 30 days ahead in the UI.
- **GUD-002**: Normalize blank `note` and `proxy` to `null`.
- **GUD-003**: Fetch detail-prefill data from the server on demand so sensitive fields do not depend on stale row cache.
- **PAT-001**: Keep `src/app/(admin)/admin/assets/page.tsx` as route composition only.
- **PAT-002**: Place route-local asset UI in `src/app/(admin)/admin/assets/_components/**`.

## 2. Implementation Steps

### Implementation Phase 1
- GOAL-001: Establish the asset domain contract, repository layer, and server-side admin read model.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create `src/modules/assets/types.ts` with domain-focused contracts such as `AssetRow`, `AssetFormValues`, `AssetFormInput`, `AssetToggleInput`, and `AssetDeleteInput` so the asset mutation and persistence contract has one shared type home.                                                                                                                                                                                                                                                                                                    |           |      |
| TASK-002 | Create `src/modules/assets/schemas.ts` with `assetFormSchema`, `assetToggleSchema`, `assetDeleteSchema`, `assetEditorInputSchema`, and JSON parsing helpers; validate `platform`, `assetType`, required trimmed `account`, optional trimmed `note` and `proxy`, parsed `assetJson` with top-level `array` or `object`, and required `expiresAt`.                                                                                                                                                                                                   |           |      |
| TASK-003 | Create `src/modules/assets/repositories.ts` with explicit data-access functions for `public.assets`, `public.asset_assignments`, `public.subscriptions`, `public.profiles`, `public.v_asset_status`, `public.recheck_subscription_after_asset_change`, and `public.delete_asset_safely`; implement domain-oriented helpers such as `getAssetById`, `getAssetUsageSummary`, `createAssetRow`, `updateAssetRow`, `disableAssetRow`, `enableAssetRow`, and `deleteAssetRowSafely` without making this file the canonical admin read-model home. |           |      |
| TASK-004 | Create `src/modules/assets/services.ts` with `createAsset`, `updateAsset`, `toggleAssetDisabled`, `deleteAssetSafely`, and `buildDefaultAssetExpiry`; `toggleAssetDisabled` must call the baseline recheck function when disabling, `deleteAssetSafely` must wrap the baseline safe-delete function instead of deleting rows directly, `updateAsset` must reject `platform` or `assetType` changes whenever the asset still has active non-revoked assignments, `createAsset` and `updateAsset` must accept already-expired `expiresAt` values and rely on derived status to mark the asset `expired`, and `updateAsset` must call the baseline recheck function when editing `expiresAt` makes an in-use asset immediately invalid. |           |      |
| TASK-005 | Create `src/modules/admin/assets/types.ts`, `src/modules/admin/assets/schemas.ts`, and `src/modules/admin/assets/queries.ts`; `src/modules/admin/assets/types.ts` must own admin-facing contracts such as `AssetAdminRow`, `AssetEditorData`, `AssetActiveUserRow`, and `AssetTableResult`; `getAssetTablePage` must accept `search`, `assetType`, `status`, `expiresFrom`, `expiresTo`, `page`, and `pageSize`, must return one row per asset, and must implement username or email matching through a distinct-safe predicate such as `exists` over active assignments plus profiles so `items` and `totalCount` stay aligned; `getAssetEditorData` must return the detail payload including active-user rows; and the current-user list, username-or-email search predicate, and `totalUsed` computation must share the same active-assignment predicate, with private assets capped at at most one active current user in detail. |           |      |

Completion criteria:
- `src/modules/assets/**` exposes deterministic schemas, services, and repositories for asset CRUD and recovery side effects.
- The read model can return paginated asset rows with server-computed `status` and `total used`.
- Detail-prefill data includes sensitive edit fields and active-user rows without overloading the main table payload.
- Shared asset and admin asset type contracts exist in explicit `types.ts` files.

### Implementation Phase 2
- GOAL-002: Wire the `/admin/assets` route, actions, table UI, detail UI, and persisted table preferences using the existing shared admin-table stack already present in the repo.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-006 | Create `src/modules/admin/assets/actions.ts` with `createAssetAction`, `updateAssetAction`, `toggleAssetDisabledAction`, and `deleteAssetAction`; these actions must use the shared `next-safe-action` client rooted in `src/lib/safe-action/client.ts` and must delegate business logic to `src/modules/assets/services.ts`.                                                                                                                                                                                                                                                                                     |           |      |
| TASK-007 | If client-side React Query needs a browser-callable fetcher for table refreshes, create route-local query adapters `src/app/(admin)/admin/assets/_components/assets-query.ts` and `src/app/(admin)/admin/assets/_components/assets-query.server.ts`; the server file must delegate to `src/modules/admin/assets/queries.ts`, the client file must remain a transport-only React Query helper, canonical read logic must stay in `src/modules/admin/assets/queries.ts`, and these adapters must not introduce a new `/api/*` endpoint. If the route works correctly with Server Components plus local invalidation only, skip these files. |           |      |
| TASK-008 | Replace the placeholder implementation in `src/app/(admin)/admin/assets/page.tsx` with a real server page that calls `requireAdminShellAccess()` from `src/modules/users/services.ts`, parses `searchParams` through `src/modules/admin/assets/schemas.ts`, loads the first table page through `getAssetTablePage`, and renders the route-local asset page component with error fallback state.                                                                                                                                                                                                                   |           |      |
| TASK-009 | Add route-local UI files under `src/app/(admin)/admin/assets/_components/` for `assets-page.tsx`, `assets-table/assets-table.tsx`, `assets-table/assets-columns.tsx`, `assets-table/assets-row-actions.tsx`, `assets-table/assets-toolbar.tsx`, `asset-detail-dialog/asset-detail-dialog.tsx`, `asset-detail-dialog/asset-detail-users.tsx`, `asset-form-dialog/asset-form-dialog.tsx`, `assets-query.ts`, `assets-query.server.ts`, `assets-page-types.ts`, and `use-assets-table-state.ts`; keep URL-search-param state, localStorage column preferences, and dialog state inside this route-local UI boundary. |           |      |
| TASK-010 | Implement table interactions in the route-local UI using the existing shared components: render the required columns `platform`, `expires at`, `note`, `asset type`, `status`, `total used`, `created at`, `updated at`, and `actions`; support clearable search over platform, note, username, and email; filter selects for asset type and status; date-range filter for `expires_at` with UTC-inclusive boundaries; React Query fetch state; React Table column rendering; URL synchronization; pagination controls that keep `AssetTableResult.totalCount` authoritative; and safe handling for malformed or reversed date-range params so the page does not crash. |           |      |
| TASK-011 | Implement create and detail-edit modal flows: the create flow must default `expiresAt` to `now + 30 days`; the form must submit raw `assetJsonText` and parse it server-side into validated `assetJson`; create and edit flows must accept already-expired `expiresAt` values and surface the resulting `expired` status correctly after save; the detail flow must fetch prefill data on demand; the detail content must render `account`, `proxy`, `note`, `assetJson`, and active-user rows with `avatar + username + email`; the edit flow must surface clear errors when `platform` or `assetType` is changed on an in-use asset; and row actions must support `View Details`, `Disable/Enable`, and `Delete` with correct loading, empty, and error states. |           |      |

Completion criteria:
- `/admin/assets` renders a real asset-management experience for admin users.
- Create, detail, edit, search, filter, pagination, column persistence, enable or disable, and delete all work from the browser route.
- Sensitive fields `account`, `proxy`, and `asset_json` stay in detail flows, while the main table, column-state config, and URL state stay lightweight.
- Asset mutations are protected by the existing admin action client and page guard helper.

### Implementation Phase 3
- GOAL-003: Verify the implementation against the browser checklist, runtime database, and project quality gates.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-012 | Run the Milestone 3 browser checklist with `agent-browser` against the live `/admin/assets` route using the admin seed account. The create flows must use notes `milestone-3-admin-asset-private-001`, `milestone-3-admin-asset-share-001`, and `milestone-3-admin-asset-delete-001`, but the verification record must capture the created UUIDs returned by the UI or detail flow as `<created-private-asset-id>`, `<created-share-asset-id>`, and `<created-delete-asset-id>`; all follow-up verification must key on those IDs, not on note text alone. The third row must stay unused and be the row deleted in the browser flow. The flow must also open detail, edit one asset field, verify direct unauthenticated or non-admin access is denied, toggle disable or enable on an unexpired asset, and verify search, filters, reversed-date-range handling, and column persistence.                                                                                                                                                                                                                                                                                                                                                 |           |      |
| TASK-013 | Run read-only verification of the canonical query and mutation contracts with `npx @insforge/cli whoami`, `npx @insforge/cli current`, `npx @insforge/cli db query "select id, platform, asset_type, account, note, proxy, asset_json, expires_at, disabled_at from public.assets where id in ('<created-private-asset-id>','<created-share-asset-id>') order by created_at desc" --json`, `npx @insforge/cli db query "select asset_id, platform, asset_type, expires_at, disabled_at, active_use, status from public.v_asset_status where asset_id in ('<created-private-asset-id>','<created-share-asset-id>') order by expires_at asc" --json`, `npx @insforge/cli db query "select id from public.assets where id = '<created-delete-asset-id>'" --json`, plus direct server-side contract checks that reversed `expiresFrom` and `expiresTo` are rejected and malformed mutation payloads are rejected without persisting invalid rows. |           |      |
| TASK-014 | Record deferred verification coverage for later milestones: in-use disable and in-use delete recovery permutations, cron reconciliation, and active-read-path enforcement remain owned by Milestone 10 and Milestone 11 even though Milestone 3 must keep its mutation boundaries compatible with those flows. |           |      |
| TASK-015 | Add or update automated coverage where the repo test stack already supports it: prioritize Zod validation for create or edit payloads, JSON parsing, acceptance of already-expired `expiresAt` with derived `expired` status, tuple-change rejection on in-use assets, invalid-expiry recheck triggers, reversed-date validation, and admin read-model filter behavior; if the relevant automated test harness is not available in the repo for one of these layers, document that limitation in the implementation notes instead of pretending the coverage exists. |           |      |
| TASK-016 | Run `pnpm lint`, `pnpm build`, `pnpm check`, discover the running Next.js dev server with `next-devtools_nextjs_index`, and inspect relevant runtime or compilation errors with `next-devtools_nextjs_call`; if any failure is caused by Milestone 3 work, fix the issue only in the asset or admin implementation files and repeat the gates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |           |      |

Completion criteria:
- Browser verification matches the Milestone 3 checklist in `docs/IMPLEMENTATION_PLAN.md`, including negative-path route access and error-state checks.
- Read-only backend verification shows stored asset data and derived status that match the UI state.
- Project quality gates complete successfully.
- Verification steps are repeatable without diagnostic-time database writes outside the browser flow itself.

## 3. Alternatives
- **ALT-001**: Client-only asset CRUD was rejected because the plan must keep mutations server-side and cannot expose privileged browser access.
- **ALT-002**: Adding a new public REST API for asset management was rejected because the repo rules prefer Server Actions or server-side layers for internal web UI.
- **ALT-003**: Deleting asset rows directly with plain table delete was rejected because PRD and the baseline SQL require snapshot-preserving safe delete behavior.
- **ALT-004**: Storing asset status as a mutable column was rejected because the baseline design derives status from timestamps and active usage.

## 4. Dependencies
- **DEP-001**: Next.js App Router with the existing `(admin)` route group and admin shell.
- **DEP-002**: `next-safe-action` shared setup in `src/lib/safe-action/client.ts`.
- **DEP-003**: `src/lib/safe-action/client.ts` for shared `next-safe-action` setup used by admin asset mutations.
- **DEP-004**: `src/modules/users/services.ts` for `requireAdminShellAccess()` and authenticated session validation.
- **DEP-005**: `react-hook-form` and `zod` for create and edit forms.
- **DEP-006**: Existing UI primitives in `src/components/ui/**`.
- **DEP-007**: Existing shared admin table and filter helpers in `src/components/shared/**`.
- **DEP-008**: `public.assets`, `public.asset_assignments`, `public.subscriptions`, `public.profiles`, `public.v_asset_status`, `public.recheck_subscription_after_asset_change`, and `public.delete_asset_safely`.
- **DEP-009**: Admin seed account and runtime database used by `agent-browser` and InsForge CLI verification.
- **DEP-010**: A runtime database that supports direct read-only verification of canonical query and mutation contracts after browser actions.

## 5. Files
- **FILE-001**: `src/modules/assets/schemas.ts` - Zod schemas and normalization helpers for create, edit, toggle, delete, and parsed JSON input.
- **FILE-002**: `src/modules/assets/types.ts` - shared asset domain types.
- **FILE-003**: `src/modules/assets/repositories.ts` - asset, assignment, profile, and status data access functions.
- **FILE-004**: `src/modules/assets/services.ts` - asset business logic, status-safe mutation orchestration, and default expiry helper.
- **FILE-005**: `src/modules/admin/assets/actions.ts` - admin mutation actions for the `/admin/assets` route.
- **FILE-006**: `src/modules/admin/assets/types.ts` - admin read-model and detail contracts.
- **FILE-007**: `src/modules/admin/assets/schemas.ts` - table filter parsing and search-param normalization.
- **FILE-008**: `src/modules/admin/assets/queries.ts` - admin list query and detail-prefill query.
- **FILE-010**: `src/app/(admin)/admin/assets/page.tsx` - replace placeholder page composition with the real route page.
- **FILE-011**: `src/app/(admin)/admin/assets/_components/assets-query.ts` - optional route-local React Query transport helper that delegates to canonical module queries when browser-callable fetchers are needed.
- **FILE-012**: `src/app/(admin)/admin/assets/_components/assets-query.server.ts` - optional route-local server adapter for browser-callable query refreshes.
- **FILE-013**: `src/app/(admin)/admin/assets/_components/*` - feature-prefixed table, toolbar, dialogs, filters, query hooks, and row actions for the admin UI.

## 6. Testing
- **TEST-001**: Manual browser verification with `agent-browser` for create private asset, create share asset, default expiry, detail view, edit, search, filter, pagination, column persistence, disable or enable, and delete.
- **TEST-002**: Automated coverage where the repo supports it for payload validation, JSON parsing, tuple-change rejection, invalid-expiry recheck triggers, and admin read-model filters.
- **TEST-003**: Read-only InsForge CLI verification for persisted asset rows, `asset_json`, `disabled_at`, `v_asset_status`, hard-delete row removal, reversed-date validation, and malformed-mutation rejection.
- **TEST-004**: Project gates `pnpm lint`, `pnpm build`, `pnpm check`, and Next.js runtime or compilation inspection through Next.js DevTools MCP.

## 7. Risks & Assumptions
- **RISK-001**: The current `/admin/assets` route is only a placeholder, so route replacement must preserve admin shell behavior without breaking navigation.
- **RISK-002**: If the read model computes `status` differently from `public.v_asset_status`, the UI can drift from the baseline database engine; the plan pins status to the baseline view logic.
- **RISK-003**: Detail payloads can accidentally leak sensitive fields into the list query if the table and detail contracts are not separated; the plan keeps them distinct.
- **RISK-004**: Disable and delete flows can leave subscriptions inconsistent if they bypass the baseline SQL functions; the plan explicitly wraps those functions at the mutation boundary even though exhaustive recovery proof is deferred.
- **RISK-005**: Search by username or email can become expensive if implemented as a naive full-table client filter; the plan keeps search in the server-side read model.
- **ASSUMPTION-001**: The runtime database and seed data used for verification are the same database referenced by `DATABASE_URL`.
- **ASSUMPTION-002**: The repo already provides or can reuse the existing admin table primitives, React Query provider, and safe-action setup from earlier milestones.
- **ASSUMPTION-003**: The shared date-range filter using `yyyy-MM-dd` values is acceptable for the asset expiry filter contract.

## 8. Related Specifications / Further Reading
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
