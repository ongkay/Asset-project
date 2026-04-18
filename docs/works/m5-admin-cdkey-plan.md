---
goal: Milestone 5 Admin CD-Key Delivery Plan
version: 1.0
date_created: 2026-04-16
last_updated: 2026-04-18
owner: AssetProject
status: Completed
tags: [feature, process, admin, cdkey, nextjs, insforge, milestone-5]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan defines the executable implementation sequence for Milestone 5 Admin CD-Key. The target outcome is a guarded admin `/admin/cdkey` flow that can issue CD-Keys with manual or generated codes, persist package snapshot fields into `public.cd_keys`, search and filter the issued-key table, inspect read-only key details, and prove browser plus backend outcomes without conflicting with the locked Milestone 5 specification.

## 1. Requirements & Constraints

### Source Alignment

| Source | Relevant References | Required Impact |
|------|-------------|-----------|
| `docs/works/m5-admin-cdkey-spec.md` | Full spec, especially sections `3`, `4`, `5`, `10` | The implementation plan must cover every locked M5 contract, including local implementation decisions already resolved by the spec. |
| `docs/IMPLEMENTATION_PLAN.md` | Milestone 5 section, browser checklist, backend verification lines `417-452` | The route, table columns, issuance rules, browser checklist, and CLI verification requirements must be represented as executable tasks. |
| `docs/PRD.md` | `2.4` ringkasan package, `3.10` admin history rules, `7.1` global admin table rules, `7.5` CD-Key Management, `10` acceptance rules | The implementation must preserve admin-only access, exact snapshot persistence, `used` or `unused` status, disabled-package issuance rejection, and admin user-display rules. |
| `docs/agent-rules/folder-structure.md` | `src/app` thin-route rules, `src/modules/<domain>` ownership, `src/modules/admin/*` read-model boundaries, route-local `_components` naming rules | The plan must keep issuance business logic in `src/modules/cdkeys/**`, keep admin read models in `src/modules/admin/cdkeys/**`, and keep route state or UI under `src/app/(admin)/admin/cdkey/_components/**`. |
| `migrations/012_subscription_tables.sql` | `public.cd_keys`, `public.transactions` | The implementation must persist `package_id`, `duration_days`, `is_extended`, `access_keys_json`, `amount_rp`, `created_by`, `used_by`, and `used_at` exactly as the baseline schema defines them. |
| `migrations/021_rls_policies.sql` | `cd_keys_admin_select`, `cd_keys_admin_insert`, `cd_keys_admin_update` | All admin reads and writes must execute server-side after the app-layer admin session guard passes. |
| `migrations/030_rpc.sql` | `public.seed_cd_key(...)` | The plan must explicitly avoid using the seed helper for live UI issuance because it performs `on conflict do update`. |
| `migrations/040_dev_seed_full.sql` | disabled package fixture and existing `used` or `unused` CD-Key fixtures | Browser and CLI verification must target a runtime dataset that includes active packages, a disabled package, and legacy CD-Key rows. |
| `src/app/(admin)/admin/package/**` | shipped admin package route composition, query adapter, toolbar, filters, form dialog, route keying pattern | The CD-Key route must mirror the current admin UI composition already used by `/admin/package`. |
| `src/modules/packages/**` | current package domain reads plus access-key or summary helpers | The CD-Key issuance write path must hydrate package snapshot data from canonical package-domain code rather than from admin read models, and M5 must add the dedicated issuance snapshot helper there. |
| `src/modules/auth/action-client.ts` | `adminActionClient` middleware with `currentAppUser` context | Actor identity for `created_by` must be injected from the authenticated admin action context and never accepted from browser input. |

- **REQ-001**: Implement Milestone 5 only for the admin CD-Key issuance and inspection domain.
- **REQ-002**: Keep all mutations server-side and do not introduce a public REST endpoint for internal admin CD-Key UI.
- **REQ-003**: Keep `public.cd_keys` as the source of persisted issuance snapshots for `package_id`, `duration_days`, `is_extended`, `access_keys_json`, and `amount_rp`.
- **REQ-004**: Reject issuance from packages whose current `is_active = false` before any new `cd_keys` row is created.
- **REQ-005**: Use `react-hook-form` and `zod` for UI-originated issue input.
- **REQ-006**: Manual code validation must follow the locked Milestone 5 spec decision: normalize to uppercase alphanumeric and enforce length `8..12` after normalization.
- **REQ-007**: Server-side generated codes must satisfy the source-doc rule `8..12` uppercase alphanumeric characters and must follow the locked Milestone 5 implementation decision to generate exactly 10 characters within that allowed range.
- **REQ-008**: Existing legacy seed rows such as `DEV-P1-UNUSED` must remain readable even though new create validation is stricter.
- **REQ-009**: The admin table must support search, filter, pagination, and localStorage-backed show or hide column persistence.
- **REQ-010**: The minimum table columns are `code`, `package`, `status`, `used by`, `created by`, `created at`, and `updated at`.
- **REQ-011**: User cells for `used by` and `created by` must render `avatar + username + email` with initials fallback and deterministic background when `avatarUrl` is null.
- **REQ-012**: The implementation must provide a read-only detail surface that exposes the stored snapshot fields and allows the override amount outcome to be inspected.
- **REQ-013**: The initial server page load must preserve the admin shell and card-wrapped table surface even if the first table query fails.
- **REQ-014**: The plan must preserve the M5 rule that admin table `status` is derived from `used_at` as `used` or `unused`, not from `is_active`.
- **REQ-015**: The plan must not redefine member redeem semantics for inactive CD-Keys during Milestone 5.
- **REQ-016**: Browser verification, read-only InsForge CLI verification, route runtime verification, and repo quality gates are mandatory completion work.
- **SEC-001**: All browser-callable admin read and write actions must use `adminActionClient` and derive `created_by` from `ctx.currentAppUser.profile.userId` or the equivalent authenticated admin session field, never from browser payload.
- **SEC-002**: Client components must not import `src/modules/admin/cdkeys/queries.ts` directly; they must use browser-callable read actions plus the route-local query adapter.
- **SEC-003**: The live admin issuance write path must not use `public.seed_cd_key(...)` or any update-on-conflict helper that can mutate an existing key row.
- **CON-001**: Keep `src/app/**` thin and route-composition only.
- **CON-002**: Put CD-Key issuance business logic in `src/modules/cdkeys/**`.
- **CON-003**: Put admin CD-Key read-model logic in `src/modules/admin/cdkeys/**`.
- **CON-004**: Reuse existing shared UI primitives, admin table helpers, filter helpers, and `next-safe-action` setup before introducing any new primitive or transport.
- **CON-005**: Prefer the current baseline tables, policies, triggers, and package-domain helpers before adding any new migration.
- **CON-006**: Do not introduce HeroUI.
- **GUD-001**: Match `/admin/package` route structure: guarded server page, direct initial server query, route-local `_components`, route-local React Query adapter, local URL-search-param state, localStorage-backed column visibility, and stable route remount key derived from parsed filters.
- **GUD-002**: Keep summary cards optional; if added, define them explicitly as current-page or current-filter summaries and do not introduce hidden aggregate queries.
- **PAT-001**: Use `src/app/(admin)/admin/cdkey/page.tsx` for page composition only.
- **PAT-002**: Use `src/app/(admin)/admin/cdkey/_components/**` for route-local UI and state.
- **PAT-003**: Use `src/modules/admin/cdkeys/{types,schemas,queries}.ts` as the canonical read-model boundary. `src/modules/admin/cdkeys/actions.ts` may exist only as a thin `adminActionClient` transport wrapper over `queries.ts` for browser refresh needs.
- **PAT-004**: Use `src/modules/cdkeys/{types,schemas,repositories,services,actions}.ts` as the canonical write-domain boundary.
- **PAT-005**: Follow the `/admin/package` transport contract: route-local query adapters unwrap successful read-action payloads and throw `Error` on validation or `{ ok: false }` failures.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Establish deterministic package-snapshot helpers, CD-Key domain contracts, issuance services, and admin read-model contracts before wiring the route UI.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Extend `src/modules/packages/types.ts` with an explicit package snapshot contract for CD-Key issuance such as `PackageIssuableSnapshot`, containing `id`, `name`, `amountRp`, `durationDays`, `isExtended`, `accessKeys`, and derived summary. Keep this type in the package domain because the M5 spec requires snapshot hydration from canonical package-domain code. | Yes | 2026-04-18 |
| TASK-002 | Extend `src/modules/packages/repositories.ts` with a repository-only helper such as `getPackageRowById(packageId: string)` or an equivalent narrow read that fetches the canonical package row without applying issuance business rules. Keep repository responsibility limited to data access. | Yes | 2026-04-18 |
| TASK-003 | Extend `src/modules/packages/services.ts` with a canonical server-only helper such as `getIssuablePackageSnapshotById(packageId: string)`. The service must call the repository helper, reject missing packages, reject inactive packages, canonical-sort `access_keys_json`, derive the package summary, and return the exact snapshot contract required by M5 issuance. | Yes | 2026-04-18 |
| TASK-004 | Create `src/modules/cdkeys/schemas.ts` with Zod schemas and normalization helpers for admin issuance input. The schema set must validate required `packageId`, optional manual `code`, optional `amountRpOverride`, non-negative safe integer override amounts, the locked M5 manual-code normalization contract, and blank-to-null handling for both optional fields. | Yes | 2026-04-18 |
| TASK-005 | Extend `src/modules/cdkeys/types.ts` with explicit issuance-domain contracts such as `CdKeyIssueFormInput`, `CdKeyIssueInput`, `CdKeyIssueResult`, `CdKeyIssueRecord`, `CdKeyCodeStatus`, and any row-mapper payloads needed by repositories or services. Preserve the existing `CdKeyActivationSnapshot` contract used by later milestones and do not redefine member redeem semantics in this phase. | Yes | 2026-04-18 |
| TASK-006 | Extend `src/modules/cdkeys/repositories.ts` with create-only server data helpers for M5 issuance. Add deterministic helpers such as `createCdKeyRow` and any narrow write-path lookup needed by issuance. `createCdKeyRow` must insert exactly one new `public.cd_keys` row with `created_by`, `used_by = null`, `used_at = null`, and `is_active = true`; it must not call `public.seed_cd_key(...)` and must surface unique-code conflicts as errors instead of mutating an existing row. Keep admin list or detail read responsibilities out of this repository. | Yes | 2026-04-18 |
| TASK-007 | Extend `src/modules/cdkeys/services.ts` with canonical issuance logic such as `createCdKey`, `generateCdKeyCode`, and any supporting helper needed to combine normalized input with the package snapshot. The service must derive `created_by` from the authenticated admin action context, choose `amount_rp` from override or package snapshot, retry generated-code collisions deterministically, generate exactly 10 uppercase alphanumeric characters while still satisfying the broader `8..12` source-doc rule, and keep the create path atomic so any failure after validation leaves no partial `public.cd_keys` row behind. | Yes | 2026-04-18 |
| TASK-008 | Create `src/modules/cdkeys/actions.ts` with the admin-guarded mutation action `createCdKeyAction`. The action must use `adminActionClient`, validate raw input through the new CD-Key schema, delegate issuance business logic to `src/modules/cdkeys/services.ts`, and return either `{ ok: true, row: CdKeyIssueResult }` or `{ ok: false, message: string }`. | Yes | 2026-04-18 |
| TASK-009 | Create `src/modules/admin/cdkeys/types.ts` with read-model contracts such as `CdKeyTableFilters`, `CdKeyAdminRow`, `CdKeyUserIdentity`, `CdKeyTableResult`, `CdKeyPackageOption`, and `CdKeyDetailSnapshot`. `CdKeyAdminRow` must explicitly include `isActive` for admin read-model completeness even though table `status` remains derived from `used_at`. The contracts must encode the M5 decision that admin reads may defensively allow `packageName: null` if join data is unexpectedly unavailable, and in that defensive case the admin read model must not substitute CD-Key `code`. | Yes | 2026-04-18 |
| TASK-010 | Create `src/modules/admin/cdkeys/schemas.ts` with `parseCdKeyTableSearchParams`, canonical table filter validation, detail-input validation, and issue-dialog bootstrap validation. The table filter schema must accept `search`, `status`, `packageId`, `packageSummary`, `page`, and `pageSize`, constrain `packageSummary` to `private | share | mixed`, normalize malformed route params safely, and keep the route resilient when unknown search params are present. | Yes | 2026-04-18 |
| TASK-011 | Create `src/modules/admin/cdkeys/queries.ts` with canonical server-side reads `getCdKeyTablePage`, `getCdKeyDetailSnapshot`, and `listIssuablePackages`. `getCdKeyTablePage` must implement case-insensitive search over code, package label, used-by username, and used-by email; support package and summary filters where summary values are exactly `private | share | mixed`; use stable ordering `created_at desc, id desc`; and keep the list payload free of non-list-only data. The package-filter option set for the table must include packages referenced by existing `cd_keys` rows, including currently disabled packages, so historical rows remain inspectable. `listIssuablePackages` must return active packages only and must reuse canonical package-domain snapshot reads instead of duplicating package business logic. | Yes | 2026-04-18 |
| TASK-012 | Create `src/modules/admin/cdkeys/actions.ts` as an optional thin browser-callable transport layer over `src/modules/admin/cdkeys/queries.ts` for `getCdKeyTablePageAction`, `getCdKeyDetailSnapshotAction`, and `listIssuablePackagesAction`. Each action must use `adminActionClient`, validate input with the new admin schemas, delegate to `queries.ts`, and return exact deterministic success payloads plus `{ ok: false, message: string }` failures. | Yes | 2026-04-18 |

### Implementation Phase 2

- GOAL-002: Replace the placeholder `/admin/cdkey` route with a full admin page and route-local UI that matches the shipped `/admin/package` structure and transport pattern.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Replace the placeholder implementation in `src/app/(admin)/admin/cdkey/page.tsx` with a real server page that calls `requireAdminShellAccess()` from `src/modules/users/services.ts`, resolves `searchParams`, parses them through `parseCdKeyTableSearchParams`, loads the initial table page through `getCdKeyTablePage`, catches initial query errors, and renders a route-local page shell with empty fallback state plus `tableError` message instead of crashing the route. | Yes | 2026-04-18 |
| TASK-014 | Create `src/app/(admin)/admin/cdkey/_components/cdkey-page.tsx` and `cdkey-page-types.ts` as the route-local entry shell for the feature. The page shell must accept the initial server result, parsed filters, `tableError`, and any route-local bootstrap payloads, then coordinate the table, dialogs, detail surface, and React Query refresh behavior. | Yes | 2026-04-18 |
| TASK-015 | Create `src/app/(admin)/admin/cdkey/_components/cdkey-query.ts` that imports the thin admin read transport actions, unwraps successful payloads, and converts validation or `{ ok: false, message }` outcomes into thrown `Error` objects for React Query, exactly mirroring the `/admin/package` transport behavior. Add stable query-key builders for table data, detail data, and issuable-package options. | Yes | 2026-04-18 |
| TASK-016 | Create `src/app/(admin)/admin/cdkey/_components/use-cdkey-table-state.ts` to own route-local URL search-param state, pagination state, and localStorage-backed column visibility. Keep dialog open or close state in `cdkey-page.tsx`, matching the package-page boundary pattern. The `actions` column must remain visible and non-hideable. | Yes | 2026-04-18 |
| TASK-017 | Create the route-local table group under `src/app/(admin)/admin/cdkey/_components/cdkey-table/`, at minimum `cdkey-table.tsx`, `cdkey-table-columns.tsx`, `cdkey-table-row-actions.tsx`, `cdkey-table-toolbar.tsx`, and `cdkey-table-filter-bar.tsx`. The table must render the required columns, support clearable search, usage-status filter, package filter, package-summary filter, server-side pagination, stable browser refreshes, and the locked admin user-cell rendering contract with deterministic initials fallback. The package-filter UI must surface packages referenced by existing CD-Key rows, including disabled packages, so historical rows remain inspectable. When `used_by` is null, the `used by` cell must render a clear empty state such as `Unused` or `-`. | Yes | 2026-04-18 |
| TASK-018 | Create the route-local issue-dialog group under `src/app/(admin)/admin/cdkey/_components/cdkey-form-dialog/`, at minimum `cdkey-form-dialog.tsx`, `cdkey-form-fields.tsx`, and `cdkey-form-dialog-types.ts`. The dialog must support package selection from active packages only, optional manual code input, optional amount override input, explicit copy explaining generated-code behavior, and a readable package snapshot preview before submit. | Yes | 2026-04-18 |
| TASK-019 | Create the route-local read-only detail surface under `src/app/(admin)/admin/cdkey/_components/cdkey-detail-dialog/`, at minimum `cdkey-detail-dialog.tsx` and any small presentational helper required to render snapshot metadata. The detail surface must expose `code`, `packageId`, current package label, derived summary, `amountRp`, `durationDays`, `isExtended`, `accessKeys`, `createdBy`, `usedBy`, `usedAt`, `createdAt`, and `updatedAt`, and must include a code-copy affordance. When `createdBy` or `usedBy` is rendered, the detail surface must use the same `avatar + username + email` contract with initials fallback and deterministic background as the table. | Yes | 2026-04-18 |
| TASK-020 | Implement the route remount pattern in `src/app/(admin)/admin/cdkey/page.tsx` so the route-local `cdkey-page.tsx` receives a stable `key` derived from parsed filters or search params, matching the `/admin/package` behavior and preventing stale client-only table state during URL-driven navigation. | Yes | 2026-04-18 |
| TASK-021 | Implement the route-local filter semantics exactly as the canonical admin query contract exposes them. Search must be case-insensitive over code, package label, used-by username, and used-by email. Status filter must operate over derived `used` or `unused`. Package-summary filter values must be exactly `private | share | mixed`, derived from the stored `access_keys_json` snapshot instead of live package summary labels. | Yes | 2026-04-18 |
| TASK-022 | Implement the issue flow so `createCdKeyAction` is called from the route-local dialog, successful responses invalidate the `/admin/cdkey` React Query table cache using the route-local query key, and the newly created row appears in the table without a full route reload. The UI must keep the dialog open on validation or conflict failures and must not directly mutate cached table rows outside canonical server responses. | Yes | 2026-04-18 |
| TASK-023 | Preserve route-level accessibility and responsive behavior standards in the route-local UI: desktop and mobile layouts must both work; dialogs, table controls, and row actions must be keyboard navigable; icon-only actions must have accessible labels; failed submits must move focus to the first relevant error; and empty, loading, and error states must be explicit. | Yes | 2026-04-18 |

### Implementation Phase 3

- GOAL-003: Verify Milestone 5 behavior end-to-end with automated tests, browser verification, backend inspection, project quality gates, and Next.js runtime diagnostics.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-024 | Create automated unit coverage under `tests/unit/modules/cdkeys/{schemas,services,actions}.test.ts` for manual-code normalization, generated-code formatting, duplicate-code conflict handling, override amount normalization, inactive-package rejection, `created_by` session derivation at the action boundary, and the rule that `public.seed_cd_key(...)` is not used for live issuance. | Yes | 2026-04-18 |
| TASK-025 | Create automated unit coverage under `tests/unit/modules/admin/cdkeys/{schemas,queries,actions}.test.ts` for filter parsing, route-safe malformed params, case-insensitive search predicates over used-by username and used-by email, package-summary derivation from snapshot `access_keys_json`, defensive `packageName: null` handling in the admin read model, and detail payload mapping. | Yes | 2026-04-18 |
| TASK-026 | Create unit coverage under `tests/unit/modules/admin/cdkeys/cdkey-query.test.ts` for route-local query-adapter behavior in `src/app/(admin)/admin/cdkey/_components/cdkey-query.ts`, especially successful payload unwrapping and thrown `Error` behavior for validation or `{ ok: false, message }` failures. | Yes | 2026-04-18 |
| TASK-027 | Create integration-oriented automated coverage under `tests/integration/modules/cdkeys/*.test.ts` and `tests/integration/modules/admin/cdkeys/*.test.ts` using the existing Vitest runner. Cover package snapshot hydration from canonical package-domain code, create-only insert semantics, generated-code collision retries, disabled-package rejection with no row creation, admin table query composition, and detail-query correctness. | Yes | 2026-04-18 |
| TASK-028 | Run the Milestone 5 browser checklist against `/admin/cdkey` using `agent-browser` and the seed admin account. The verification record must capture deterministic identifiers for the created package, new CD-Key rows, and any inspected legacy rows. Explicitly prove: open `/admin/cdkey`; verify unauthenticated and non-admin direct access to `/admin/cdkey` is denied and no CD-Key data is rendered; create a manual-code row; create an auto-generated-code row; verify generated code is uppercase alphanumeric with length inside `8..12` and the implementation-chosen length `10`; enter an amount override and inspect the stored override from the detail surface; filter `used` and `unused`; search by code, package, used-by username, and used-by email; reject issuance for a disabled package; verify desktop and mobile layout; verify light and dark readability; verify keyboard access; verify first-error focus; verify accessible icon-only labels; verify table error state behavior; and verify column-visibility persistence with non-hideable `actions`. | Yes | 2026-04-18 |
| TASK-029 | Run read-only InsForge CLI verification against the same runtime database referenced by `DATABASE_URL`. Start with `npx @insforge/cli whoami` and `npx @insforge/cli current`, then query the exact created rows to prove `package_id`, `duration_days`, `is_extended`, `access_keys_json`, `amount_rp`, `created_by`, `used_by`, and `used_at` match the browser flow. Add a row-specific negative verification that disabled-package issuance did not create an invalid row. | Yes | 2026-04-18 |
| TASK-030 | Run direct negative-contract checks against the server-side issuance action for invalid manual code format, duplicate manual code, malformed amount override, inactive package issuance, malformed payloads that bypass the UI, and direct guest or non-admin access to the route. These checks must prove that invalid writes do not create partial `public.cd_keys` rows, do not mutate existing key rows, and do not expose admin CD-Key data to unauthorized users. | Yes | 2026-04-18 |
| TASK-031 | Run the repo quality gates and runtime diagnostics required for completion: `pnpm test`, `pnpm lint`, `pnpm check`, browser verification through `agent-browser`, and relevant Next.js runtime or compilation inspection through `next-devtools_init`, `next-devtools_nextjs_index`, and `next-devtools_nextjs_call`. If any failure is caused by M5 work, fix only the relevant Milestone 5 implementation files and rerun the failing verification steps. | Yes | 2026-04-18 |

## 3. Alternatives

- **ALT-001**: Implementing admin CD-Key issuance through new public `/api/*` routes was rejected because internal admin UI must use server-side layers or Server Actions, not new public REST surfaces.
- **ALT-002**: Hydrating package snapshot data from `src/modules/admin/packages/**` was rejected because the M5 spec locks package snapshot reads to canonical package-domain code and keeps admin modules read-model only.
- **ALT-003**: Reusing `public.seed_cd_key(...)` for live issuance was rejected because it performs an upsert on code conflict and would silently mutate an existing row instead of failing create-only issuance.
- **ALT-004**: Treating `is_active` as the admin table status source was rejected because the M5 spec locks status to `used` or `unused` derived from `used_at`.
- **ALT-005**: Loading the entire CD-Key catalog into the client and filtering in memory was rejected because the route must stay server-paginated and deterministic under the existing admin-table pattern.

## 4. Dependencies

- **DEP-001**: Next.js App Router with the existing `(admin)` route group and admin shell.
- **DEP-002**: `next-safe-action` shared setup in `src/lib/safe-action/client.ts`.
- **DEP-003**: `adminActionClient` from `src/modules/auth/action-client.ts`.
- **DEP-004**: `requireAdminShellAccess()` and authenticated session helpers in `src/modules/users/services.ts`.
- **DEP-005**: Existing package-domain module under `src/modules/packages/**` as the canonical extension point for M5 package snapshot hydration.
- **DEP-006**: Existing admin UI route pattern under `src/app/(admin)/admin/package/**`.
- **DEP-007**: Existing admin package read-model pattern under `src/modules/admin/packages/**` for structural reference only, not for issuance business logic.
- **DEP-008**: Baseline DB tables `packages`, `cd_keys`, `profiles`, and any joined data needed for admin identity display.
- **DEP-009**: Existing RLS policies for `public.cd_keys` and `public.packages` as baseline DB safety, combined with the repo runtime pattern of server-only reads or writes guarded by `requireAdminShellAccess()` and `adminActionClient`.
- **DEP-010**: Runtime seed dataset from `migrations/040_dev_seed_full.sql` or an equivalent dataset for browser and CLI verification.

## 5. Files

- **FILE-001**: `src/modules/packages/types.ts` - add canonical package snapshot contract for issuance.
- **FILE-002**: `src/modules/packages/repositories.ts` - add narrow package-row read helper by id for canonical snapshot hydration; active or inactive eligibility stays in `src/modules/packages/services.ts`.
- **FILE-003**: `src/modules/packages/services.ts` - expose canonical package snapshot service for CD-Key issuance.
- **FILE-004**: `src/modules/cdkeys/types.ts` - extend CD-Key domain contracts for issuance and shared CD-Key rules only.
- **FILE-005**: `src/modules/cdkeys/schemas.ts` - add Zod schemas and normalization helpers for issue input.
- **FILE-006**: `src/modules/cdkeys/repositories.ts` - add create-only issuance insert helpers and narrow write-path lookups only.
- **FILE-007**: `src/modules/cdkeys/services.ts` - add generated-code, issuance, and snapshot orchestration logic while preserving existing activation helpers.
- **FILE-008**: `src/modules/cdkeys/actions.ts` - add admin-guarded create action for issuance.
- **FILE-009**: `src/modules/admin/cdkeys/types.ts` - admin read-model contracts for table, detail, and package options.
- **FILE-010**: `src/modules/admin/cdkeys/schemas.ts` - table filter parsing and admin read-input validation.
- **FILE-011**: `src/modules/admin/cdkeys/queries.ts` - canonical admin list, detail, table-filter option, and issuable-package reads.
- **FILE-012**: `src/modules/admin/cdkeys/actions.ts` - optional thin browser-callable admin read transport wrappers over `src/modules/admin/cdkeys/queries.ts`.
- **FILE-013**: `src/app/(admin)/admin/cdkey/page.tsx` - replace placeholder route composition with the real guarded page.
- **FILE-014**: `src/app/(admin)/admin/cdkey/_components/cdkey-page.tsx` - route-local page shell for the admin CD-Key experience.
- **FILE-015**: `src/app/(admin)/admin/cdkey/_components/cdkey-page-types.ts` - route-local UI prop and state contracts.
- **FILE-016**: `src/app/(admin)/admin/cdkey/_components/cdkey-query.ts` - route-local React Query adapter for table, detail, and package bootstrap reads.
- **FILE-017**: `src/app/(admin)/admin/cdkey/_components/use-cdkey-table-state.ts` - route-local URL, pagination, filter, and column-state coordination.
- **FILE-018**: `src/app/(admin)/admin/cdkey/_components/cdkey-table/cdkey-table.tsx` - route-local CD-Key table composition.
- **FILE-019**: `src/app/(admin)/admin/cdkey/_components/cdkey-table/cdkey-table-columns.tsx` - route-local column definitions.
- **FILE-020**: `src/app/(admin)/admin/cdkey/_components/cdkey-table/cdkey-table-row-actions.tsx` - route-local row actions for detail and issue interactions.
- **FILE-021**: `src/app/(admin)/admin/cdkey/_components/cdkey-table/cdkey-table-toolbar.tsx` - route-local search, filter, and view controls.
- **FILE-022**: `src/app/(admin)/admin/cdkey/_components/cdkey-table/cdkey-table-filter-bar.tsx` - route-local filter UI for status, package, and package summary.
- **FILE-023**: `src/app/(admin)/admin/cdkey/_components/cdkey-form-dialog/cdkey-form-dialog.tsx` - issue dialog shell.
- **FILE-024**: `src/app/(admin)/admin/cdkey/_components/cdkey-form-dialog/cdkey-form-fields.tsx` - issue-form fields and package snapshot preview UI.
- **FILE-025**: `src/app/(admin)/admin/cdkey/_components/cdkey-form-dialog/cdkey-form-dialog-types.ts` - issue-dialog form-value helpers.
- **FILE-026**: `src/app/(admin)/admin/cdkey/_components/cdkey-detail-dialog/cdkey-detail-dialog.tsx` - read-only snapshot detail surface with code-copy affordance.
- **FILE-027**: `tests/unit/modules/cdkeys/{schemas,services,actions}.test.ts` - issuance-domain coverage.
- **FILE-028**: `tests/unit/modules/admin/cdkeys/{schemas,queries,actions}.test.ts` - admin read-model coverage.
- **FILE-029**: `tests/unit/modules/admin/cdkeys/cdkey-query.test.ts` - route-local query-adapter coverage.
- **FILE-030**: `tests/integration/modules/cdkeys/*.test.ts` - issuance integration coverage using the existing Vitest runner.
- **FILE-031**: `tests/integration/modules/admin/cdkeys/*.test.ts` - admin read-model integration coverage using the existing Vitest runner.

## 6. Testing

- **TEST-001**: Unit-test issue input normalization for uppercase conversion, blank-to-null handling, the locked Milestone 5 manual-code validation contract, and non-negative override amount validation.
- **TEST-002**: Unit-test generated-code creation for uppercase alphanumeric output, deterministic collision retry behavior, compliance with the source-doc length range `8..12`, and the implementation-chosen length `10` locked by the Milestone 5 spec.
- **TEST-003**: Unit-test package snapshot hydration so disabled packages are rejected before `createCdKeyRow` is called and active package snapshots return canonical access-key ordering and derived summary.
- **TEST-004**: Unit-test the issuance service so it persists `package_id`, `duration_days`, `is_extended`, `access_keys_json`, `amount_rp`, `created_by`, `used_by = null`, `used_at = null`, and `is_active = true` exactly once on success, and so any failure after validation leaves no partial `public.cd_keys` row behind.
- **TEST-005**: Unit-test the create action so actor identity is derived from the authenticated admin action context and is never accepted from browser payload.
- **TEST-006**: Unit-test `getCdKeyTablePage` for case-insensitive search, `used` or `unused` filter behavior, package filter behavior including disabled packages referenced by historical rows, package-summary derivation from snapshot `access_keys_json`, and stable ordering.
- **TEST-007**: Unit-test `getCdKeyDetailSnapshot` so defensive `packageName: null` handling stays correct for the Milestone 5 admin read model when relational join data is unexpectedly unavailable and does not fall back to CD-Key `code`.
- **TEST-008**: Unit-test the route-local query adapter so successful read payloads are unwrapped and validation or `{ ok: false, message }` outcomes throw `Error`.
- **TEST-009**: Integration-test create-only issuance semantics so duplicate codes fail instead of updating an existing row and so `public.seed_cd_key(...)` is not part of the live admin issuance path.
- **TEST-010**: Manual browser verification with `agent-browser` for open route, direct unauthenticated or non-admin access denial, issue with manual code, issue with generated code, amount override inspection, `used` or `unused` filter behavior, search by code or package or used-by username or used-by email, disabled-package rejection, detail dialog, code copy, desktop and mobile responsiveness, light and dark readability, keyboard focus behavior, accessible action labels, error state rendering, and column persistence.
- **TEST-011**: Read-only InsForge CLI verification with `npx @insforge/cli whoami`, `npx @insforge/cli current`, and row-specific `db query` checks for the exact created keys, stored snapshot fields, unused state, and absence of invalid rows from rejected disabled-package issuance.
- **TEST-012**: Project gates `pnpm test`, `pnpm lint`, `pnpm check`, and relevant Next.js runtime or compilation inspection through Next.js DevTools MCP.

## 7. Risks & Assumptions

- **RISK-001**: The current `/admin/cdkey` route is only a placeholder, so route replacement must preserve admin shell behavior and navigation expectations.
- **RISK-002**: If package snapshot hydration is implemented outside the canonical package domain, M5 can drift from the locked spec and violate the `modules/admin/*` boundary rules.
- **RISK-003**: If generated-code conflicts are not retried deterministically, the UI can fail intermittently under repeated issuance.
- **RISK-004**: If admin table status accidentally depends on `is_active`, the UI will conflict with the locked M5 rule that status is `used` or `unused` only.
- **RISK-005**: If the admin read model falls back to CD-Key `code` as `packageName`, detail and table behavior will conflict with the M5 spec.
- **RISK-006**: If the implementation reuses `public.seed_cd_key(...)`, duplicate-code issuance can silently mutate an existing row and corrupt history semantics.
- **ASSUMPTION-001**: The runtime database used for browser verification and InsForge CLI inspection is the same database referenced by `DATABASE_URL`.
- **ASSUMPTION-002**: The repo continues to use the existing `/admin/package` admin table stack, React Query provider, and safe-action setup without structural changes before M5 implementation starts.
- **ASSUMPTION-003**: The runtime seed dataset includes at least one disabled package and existing CD-Key fixtures equivalent to those defined in `migrations/040_dev_seed_full.sql`.
- **ASSUMPTION-004**: No new migration is required for Milestone 5 if the implementation reuses the current baseline tables, policies, and package-domain helpers as planned.

## 8. Related Specifications / Further Reading

- `docs/works/m5-admin-cdkey-spec.md`
- `docs/works/m4-admin-subscriptions-plan.md`
- `docs/works/m2-admin-package-plan.md`
- `docs/works/m2-admin-package-spec.md`
- `docs/PRD.md`
- `docs/DB.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`
- `migrations/012_subscription_tables.sql`
- `migrations/021_rls_policies.sql`
- `migrations/030_rpc.sql`
- `migrations/040_dev_seed_full.sql`
