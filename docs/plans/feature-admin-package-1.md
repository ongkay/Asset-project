---
goal: Phase 2 Admin Package Delivery Plan
version: 1.0
date_created: 2026-04-14
last_updated: 2026-04-14
owner: AssetProject
status: Planned
tags: [feature, process, admin, package, nextjs, insforge, phase-2]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the executable implementation sequence for Phase 2 Admin Package. The target outcome is a guarded admin `/admin/package` flow that can create, edit, search, filter, paginate, and enable or disable packages using server-side mutations and a server-computed `total used` read model.

## 1. Requirements & Constraints

### Source Alignment

| Source | Relevant References | Required Impact |
| --- | --- | --- |
| `docs/PRD.md` | `7.6 Package Management`, `7.6` package entitlement rules, `3.10` admin/history rules | Package CRUD must preserve exact entitlement semantics, disable/enable behavior, and history integrity. |
| `docs/IMPLEMENTATION_PLAN.md` | Phase 2 section, lines `272-307` | Scope must remain limited to admin package management and the associated verification checklist. |
| `docs/DB.md` | `5.4 packages`, `5.6 subscriptions`, `7.1` current subscription view | `total used`, active-state semantics, and data contracts must follow database-backed definitions. |
| `docs/spec/spec-process-phase-2-admin-package.md` | Sections `3`-`5` | The spec is the local execution contract for all Phase 2 tasks. |
| `migrations/003_core_helpers.sql` | `is_valid_access_key`, `is_valid_access_keys_json` | Package entitlement validation must reject invalid or duplicate access keys. |
| `migrations/011_catalog_tables.sql` | `public.packages` schema | Package data must persist to the baseline catalog table without schema drift. |
| `migrations/012_subscription_tables.sql` | `public.subscriptions` schema | `total used` must count only running subscriptions. |
| `migrations/024_views.sql` | `v_current_subscriptions` | The read model should prefer the current-subscription view when computing current usage. |
| `migrations/030_rpc.sql` | `get_package_summary` | Package summary must be derived from the entitlement snapshot, not manually entered. |

- **REQ-001**: Implement Phase 2 only for the package-management domain and its direct admin route.
- **REQ-002**: Keep all mutations server-side and do not introduce a public REST endpoint for the admin UI.
- **REQ-003**: Preserve the separation between `public.packages.id` and `public.packages.code`.
- **REQ-004**: Treat `access_keys_json` as a non-empty unique subset of valid access keys and store it in canonical sorted order.
- **REQ-005**: Compute `summary` from `access_keys_json` and use it only for badge, filter, and reporting.
- **REQ-006**: Compute `total used` from running subscriptions only.
- **REQ-007**: Use `react-hook-form` and `zod` for the create/edit UI contract.
- **REQ-008**: Use `next-safe-action` or the repo-standard server-action path for create/edit/toggle actions.
- **REQ-009**: Use `adminActionClient` from `src/modules/auth/action-client.ts` for package mutations so admin access is enforced consistently with the existing codebase.
- **SEC-001**: Do not read or write package data from the client with privileged database credentials.
- **SEC-002**: Enforce admin-only access on `/admin/package` and its actions.
- **CON-001**: Keep `src/app/**` thin and route-composition only.
- **CON-002**: Put package business logic in `src/modules/packages/**`.
- **CON-003**: Put admin read-model logic in `src/modules/admin/packages/**`.
- **CON-004**: Reuse existing UI primitives from `src/components/ui/**` before adding new ones.
- **GUD-001**: Normalize blank `checkoutUrl` input to `null`.
- **GUD-002**: Default newly created packages to `is_active = true` unless a concrete server-side failure blocks creation.
- **GUD-003**: Prefill edit state from server data, including access keys and immutable identifiers.
- **PAT-001**: Keep `src/app/(admin)/admin/package/page.tsx` as route composition only.
- **PAT-002**: Place route-local package UI in `src/app/(admin)/admin/package/_components/**`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Establish the package domain contract, repository layer, and server-side read model.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `src/modules/packages/types.ts` with `PackageRow`, `PackageEditorData`, `PackageTableResult`, `PackageFormInput`, and `PackageToggleInput` so the package contract has one shared type home. |  |  |
| TASK-002 | Create `src/modules/packages/schemas.ts` with `packageFormSchema`, `packageTableFilterSchema`, and `packageToggleSchema`; validate `name` trim/non-empty, `amountRp` safe integer `>= 0`, `durationDays` safe integer `> 0`, optional `checkoutUrl` normalization to `null`, `isExtended` boolean, and `accessKeys` as unique valid access keys sorted canonically. |  |  |
| TASK-003 | Create `src/modules/packages/repositories.ts` with explicit data access functions for `public.packages`, `public.subscriptions`, `public.v_current_subscriptions`, and `public.get_package_summary`; implement `listPackages`, `getPackageById`, `getPackageEditorData`, `createPackageRow`, `updatePackageRow`, `togglePackageActiveRow`, and `countPackageTotalUsed` using the running-subscription predicate `status in ('active', 'processed') and end_at > now()`. |  |  |
| TASK-004 | Create `src/modules/packages/services.ts` with `createPackage`, `updatePackage`, `togglePackageActive`, `generatePackageCode`, `derivePackageSummary`, and `buildPackageAdminRow`; `generatePackageCode` must retry on unique conflict, `derivePackageSummary` must wrap `public.get_package_summary`, and `buildPackageAdminRow` must return the table fields defined in the spec. |  |  |
| TASK-005 | Create `src/modules/admin/packages/types.ts` and `src/modules/admin/packages/queries.ts`; `getPackageTablePage` must accept `search`, `summary`, `page`, and `pageSize`, and `getPackageEditorData` must return `id`, `code`, `name`, `amountRp`, `durationDays`, `checkoutUrl`, `isExtended`, `isActive`, and canonical-sorted `accessKeys`. |  |  |

Completion criteria:

- `src/modules/packages/**` exposes deterministic schemas, services, and repositories for package CRUD.
- The read model can return paginated package rows with server-computed `summary` and `total used`.
- Edit-prefill data includes the exact current package state and preserves `id` and `code` as separate identifiers.
- Shared package and admin package type contracts exist in explicit `types.ts` files.

### Implementation Phase 2

- GOAL-002: Wire the `/admin/package` route, actions, table UI, dialogs, and persisted table preferences.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `src/modules/packages/actions.ts` with `createPackageAction`, `updatePackageAction`, and `togglePackageActiveAction` using `adminActionClient` from `src/modules/auth/action-client.ts`; each action must return the mutated package row on success and structured action errors on validation failure. |  |  |
| TASK-007 | Replace the placeholder implementation in `src/app/(admin)/admin/package/page.tsx` with a real server page that calls `requireAdminShellAccess()` from `src/modules/users/services.ts`, reads `searchParams` for `search`, `summary`, `page`, and `pageSize`, normalizes `search` by trimming whitespace, defaults `page` to `1`, clamps invalid `page` to `1`, defaults `pageSize` to `10`, clamps invalid `pageSize` to `10`, ignores invalid `summary` values, and renders the package page component with the `getPackageTablePage` result. `requireAdminShellAccess()` must preserve the existing redirect behavior: unauthenticated users go to `/login`, banned or non-admin users go to `/unauthorized`, and valid admins continue to the page. |  |  |
| TASK-008 | Add route-local UI files under `src/app/(admin)/admin/package/_components/` for `admin-package-page.tsx`, `admin-package-table.tsx`, `admin-package-toolbar.tsx`, `admin-package-filter-bar.tsx`, `admin-package-form-dialog.tsx`, `admin-package-columns.tsx`, `admin-package-row-actions.tsx`, and `admin-package-types.ts`; keep URL-search-param state, localStorage column preferences, and dialog state inside this route-local UI boundary. |  |  |
| TASK-009 | Implement table interactions in the route-local UI: server-side search/filter/page navigation via URL query parameters, `router.refresh()` after successful mutations, clearable search input, summary filter dropdown, and pagination controls that keep `PackageTableResult.totalCount` authoritative. |  |  |
| TASK-010 | Implement create/edit modal flows: prefill from `getPackageEditorData`, render `id` and `code` as separate read-only identifiers, bind `accessKeys` to canonical-sorted multi-select state, normalize blank `checkoutUrl` to `null`, and close the dialog only after a successful action response. |  |  |
| TASK-011 | Implement row actions and table states: `Enable/Disable` buttons must call `togglePackageActiveAction`, the table must show loading, empty, and error states, and the UI must remain stable after repeated create/edit/toggle cycles. |  |  |

Completion criteria:

- `/admin/package` renders a real package-management experience for admin users.
- Create, edit, enable, disable, search, filter, and pagination all work from the browser route.
- Column preferences survive reload and edit state is prefilled from the server.
- Package mutations are protected by the existing admin action client and the page guard helper.

### Implementation Phase 3

- GOAL-003: Verify the implementation against the browser checklist, runtime database, and project quality gates.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Run the Phase 2 browser checklist with `agent-browser` against the live `/admin/package` route using the admin seed account, covering create, edit, search, filter, pagination, column persistence, and enable/disable flows; the first create flow must use the deterministic package name `phase-2-admin-package-e2e-001` and access keys `['tradingview:share']` so the created row can be queried later without manual interpretation. |  |  |
| TASK-013 | Run read-only InsForge CLI checks against the runtime database with `npx @insforge/cli whoami`, `npx @insforge/cli current`, `npx @insforge/cli db query "select id, code, access_keys_json, public.get_package_summary(access_keys_json) as summary from public.packages where name = 'phase-2-admin-package-e2e-001' order by created_at desc limit 1" --json`, `npx @insforge/cli db query "select id, code, name, amount_rp, duration_days, is_extended, access_keys_json, checkout_url, is_active from public.packages where name = 'phase-2-admin-package-e2e-001' order by created_at desc limit 1" --json`, and `npx @insforge/cli db query "select count(*) from public.v_current_subscriptions vcs join public.packages p on p.id = vcs.package_id where p.name = 'phase-2-admin-package-e2e-001'" --json` to verify the persisted package row, the derived summary for the stored entitlement set, and `total used`. |  |  |
| TASK-014 | Run `pnpm lint`, `pnpm build`, and `pnpm check`; if any failure is caused by Phase 2 work, fix the issue only in the package/admin implementation files and repeat the gates. |  |  |

Completion criteria:

- Browser verification matches the Phase 2 checklist in `docs/IMPLEMENTATION_PLAN.md` and the contract in `docs/spec/spec-process-phase-2-admin-package.md`.
- Read-only backend verification shows stored package data that matches the UI state.
- Project quality gates complete successfully.
- Verification steps are repeatable without database writes during the diagnostic phase.

## 3. Alternatives

- **ALT-001**: Client-only package CRUD was rejected because the plan must keep mutations server-side and cannot expose privileged browser access.
- **ALT-002**: Adding a new public REST API for package management was rejected because the repo rules prefer Server Actions or server-side layers for internal web UI.
- **ALT-003**: Hard deleting packages was rejected because PRD and the package spec require history preservation through disable/enable.

## 4. Dependencies

- **DEP-001**: Next.js App Router with the existing `(admin)` route group and admin shell.
- **DEP-002**: `next-safe-action` shared setup in `src/lib/safe-action/client.ts`.
- **DEP-003**: `src/modules/auth/action-client.ts` for the existing authenticated/admin action middleware.
- **DEP-004**: `src/modules/users/services.ts` for `requireAdminShellAccess()` and authenticated session validation.
- **DEP-005**: `react-hook-form` and `zod` for package create/edit forms.
- **DEP-006**: Existing UI primitives in `src/components/ui/**`.
- **DEP-007**: `public.packages`, `public.subscriptions`, `public.v_current_subscriptions`, `public.get_package_summary`, `public.is_valid_access_key`, and `public.is_valid_access_keys_json`.
- **DEP-008**: Admin seed account and runtime database used by `agent-browser` and InsForge CLI verification.

## 5. Files

- **FILE-001**: `src/modules/packages/schemas.ts` - Zod schemas and normalization helpers for create/edit/toggle inputs.
- **FILE-002**: `src/modules/packages/types.ts` - shared package domain types.
- **FILE-003**: `src/modules/packages/repositories.ts` - package and subscription data access functions.
- **FILE-004**: `src/modules/packages/services.ts` - package business logic and read-model composition.
- **FILE-005**: `src/modules/packages/actions.ts` - server actions for package mutations.
- **FILE-006**: `src/modules/admin/packages/types.ts` - admin read-model and editor contracts.
- **FILE-007**: `src/modules/admin/packages/queries.ts` - admin list query and edit-prefill query.
- **FILE-008**: `src/app/(admin)/admin/package/page.tsx` - replace placeholder page composition with the real route page.
- **FILE-009**: `src/app/(admin)/admin/package/_components/*` - table, toolbar, dialogs, columns, and row actions for the admin UI.

## 6. Testing

- **TEST-001**: Manual browser verification with `agent-browser` for create, edit, search, filter, pagination, column persistence, and enable/disable.
- **TEST-002**: Read-only InsForge CLI verification for persisted package rows, `access_keys_json`, summary derivation, and `total used` consistency.
- **TEST-003**: Project gates `pnpm lint`, `pnpm build`, and `pnpm check`.

## 7. Risks & Assumptions

- **RISK-001**: The current `/admin/package` route is only a placeholder, so route replacement must preserve admin shell behavior without breaking navigation.
- **RISK-002**: `total used` can drift if the query uses historical subscriptions instead of the running-subscription predicate; the implementation must stay pinned to the contract.
- **RISK-003**: Edit prefill can become ambiguous if `id` and `code` are accidentally collapsed; the plan explicitly keeps them separate.
- **RISK-004**: Column persistence can become inconsistent if the table UI is not isolated from server state; the plan keeps it in route-local client state.
- **ASSUMPTION-001**: The runtime database and seed data used for verification are the same database referenced by `DATABASE_URL`.
- **ASSUMPTION-002**: The repo already provides or can reuse the existing admin table primitives and `next-safe-action` setup from Phase 0.

## 8. Related Specifications / Further Reading

- `docs/spec/spec-process-phase-2-admin-package.md`
- `docs/PRD.md`
- `docs/DB.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`
- `migrations/003_core_helpers.sql`
- `migrations/011_catalog_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/024_views.sql`
- `migrations/030_rpc.sql`
