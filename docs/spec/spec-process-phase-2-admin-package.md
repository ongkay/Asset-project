---
title: Phase 2 Admin Package Implementation Specification
version: 1.0
date_created: 2026-04-14
last_updated: 2026-04-14
owner: AssetProject
tags: [process, admin, package, nextjs, insforge, phase-2]
---

# Introduction

This specification defines the implementation contract for Phase 2 Admin Package. It is written for AI coding agents and maintainers that must implement the package-management phase without inventing behavior that conflicts with `docs/PRD.md`, `docs/DB.md`, `docs/IMPLEMENTATION_PLAN.md`, and the baseline SQL migrations.

Phase 2 is complete only when an admin can create, edit, search, filter, paginate, and enable or disable packages from a real browser route, with entitlement validation based on exact `platform + asset_type` access keys and a server-side read model for `total used`.

## 1. Purpose & Scope

### 1.1 Purpose

The purpose of this specification is to provide a machine-readable contract for the Phase 2 Admin Package feature so implementation can be executed consistently across UI, server actions, read models, and database-backed validation.

### 1.2 In Scope

- Route `/admin/package`.
- Admin-only access control for package management.
- Package list table with search, filter, pagination, and persisted column visibility.
- Create package flow.
- Edit package flow.
- Enable and disable package flow.
- Entitlement editor for exact `platform + asset_type` access keys.
- Validation for duplicate entitlements within one package.
- Server-side read model for `total used`.
- Derived package summary `private`, `share`, or `mixed` for badge, filter, and reporting only.
- Browser verification on the live route.
- Read-only backend verification against the runtime database.

### 1.3 Out of Scope

- Subscription activation flows in Phase 4, Phase 5, and Phase 6.
- CD-Key issuance and redemption.
- Asset inventory management.
- Member console implementation.
- Admin dashboard home statistics.
- Hard delete package.
- Public REST endpoints for internal web UI.

### 1.4 Assumptions

- Phase 0 foundation is already available.
- The admin shell route exists and is guarded.
- Baseline migrations from `migrations/001_extensions.sql` through `migrations/030_rpc.sql` are applied to the runtime database.
- The runtime database contains the seed and admin fixtures required for browser verification.
- The implementation follows the folder rules in `docs/agent-rules/folder-structure.md`.

## 2. Definitions

| Term | Definition |
| --- | --- |
| Access key | Exact entitlement string in the form `platform:asset_type`, for example `tradingview:share`. |
| Entitlement | One exact access right represented by one access key. |
| `access_keys_json` | JSON array of access key strings stored in `public.packages.access_keys_json`. |
| Package summary | Derived label from `access_keys_json`: `private`, `share`, or `mixed`. |
| Total used | Number of running subscriptions for a package with status `active` or `processed` and `end_at > now()`. |
| Active package | Package with `is_active = true`. |
| Disabled package | Package with `is_active = false`. |
| Exact entitlement validation | Validation rule that accepts a non-empty unique subset of the six valid access keys from the baseline enum cross-product and rejects duplicates. |
| Column visibility persistence | Browser-side storage of table column show/hide preferences across reloads. |
| Package code | Server-generated immutable identifier stored in `public.packages.code`. |

## 3. Requirements, Constraints & Guidelines

### 3.1 Source of Truth

- **REQ-001**: Business rules must follow `docs/PRD.md`.
- **REQ-002**: Database shape, constraints, views, and RPC behavior must follow `docs/DB.md` and the baseline migrations.
- **REQ-003**: Phase scope and definition of done must follow Phase 2 in `docs/IMPLEMENTATION_PLAN.md`.
- **REQ-004**: File placement and import boundaries must follow `docs/agent-rules/folder-structure.md`.

### 3.2 Route and Access Rules

- **REQ-010**: The admin package feature must live at `/admin/package`.
- **REQ-011**: The route must be accessible only to admin users.
- **REQ-012**: Guest and member users must be denied access to the package admin route.
- **REQ-013**: Create and edit package actions must open as popup or modal flows on the `/admin/package` route, matching the PRD shape of `Add New / Edit`.
- **SEC-001**: The admin browser must not use database credentials, service credentials, or project-admin credentials directly on the client.
- **SEC-002**: All package mutations must execute on the server.
- **SEC-003**: The implementation must not add a new public REST endpoint for internal web UI package management.

### 3.3 Package Data Rules

- **REQ-020**: Package create and edit flows must accept `name`, `amountRp`, `durationDays`, `checkoutUrl`, `isExtended`, and a non-empty set of access keys.
- **REQ-021**: Package `code` must be generated server-side and must not be accepted from browser input.
- **REQ-022**: `amountRp` must be a non-negative safe integer in Rupiah and must be serialized as a JSON number in admin read/write contracts.
- **REQ-023**: `durationDays` must be a positive safe integer.
- **REQ-024**: `checkoutUrl` must be optional and must normalize trimmed blank input to `null`.
- **REQ-025**: If `checkoutUrl` is provided, it must be a valid absolute `http` or `https` URL.
- **REQ-026**: `access_keys_json` must contain only valid access keys from the baseline enum cross-product.
- **REQ-027**: `access_keys_json` must be a non-empty unique subset of the valid access-key universe.
- **REQ-028**: `access_keys_json` must not contain duplicate values.
- **REQ-029**: Duplicate entitlement selection in the UI or server payload must be rejected with a clear validation error.
- **REQ-030**: Access keys must be stored in canonical sorted order before persistence and before edit-prefill rendering.
- **REQ-031**: Package summary must be derived from `access_keys_json` using `public.get_package_summary(access_keys_json)` or equivalent server-side logic.
- **REQ-032**: Package summary must be used only for badge, filter, and reporting.
- **REQ-033**: Package summary must never be used for authorization or entitlement checks.
- **REQ-034**: `isExtended` must be persisted exactly as submitted and must be treated as package metadata, not as a derived value from the access keys.
- **REQ-035**: Newly created packages must default to `is_active = true` unless the server explicitly rejects activation for a concrete business reason.

### 3.4 Read Model and Table Rules

- **REQ-040**: The package list must support search by package name.
- **REQ-041**: The package list must support filter by package summary.
- **REQ-042**: The package list must support server-side pagination.
- **REQ-043**: The package list must support persisted column visibility preferences.
- **REQ-044**: The minimum table columns are `name`, `amount (Rp)`, `duration (days)`, `checkout URL`, `total used`, `created at`, `updated at`, and `action`.
- **REQ-045**: Active and disabled packages must be visually distinguishable.
- **REQ-046**: `total used` must be computed from running subscriptions, not from historical subscription rows.
- **REQ-047**: `total used` must count subscriptions with status `active` or `processed` only.
- **REQ-048**: `total used` must not be affected by `is_active` on the package row.
- **REQ-049**: The table must not load all package rows without pagination.

### 3.5 Mutation Behavior

- **REQ-060**: Create package must create exactly one `public.packages` row.
- **REQ-061**: Edit package must update the existing row and must not create a duplicate row.
- **REQ-062**: Enable and disable package must toggle `is_active` only.
- **REQ-063**: Hard delete package is out of scope and must not be implemented.
- **REQ-064**: Existing subscriptions and already issued CD-Keys must remain valid when a package is edited or disabled.
- **REQ-065**: Package history must remain queryable after disable and re-enable operations.
- **REQ-066**: The create and edit forms must use `react-hook-form` and `zod` validation.
- **REQ-067**: The create, edit, and toggle actions must use `next-safe-action` or the repo-standard server-action path.
- **REQ-068**: Server-side validation must reject payloads that bypass UI constraints.
- **REQ-069**: The edit popup must be prefilled from server data that includes the current `name`, `amountRp`, `durationDays`, `checkoutUrl`, `isExtended`, `isActive`, and access keys.
- **REQ-070**: `public.packages.id` and `public.packages.code` must remain separate identifiers; editing or displaying package data must not collapse them into a single field.

### 3.6 Technical Constraints

- **CON-001**: Use Next.js App Router conventions only.
- **CON-002**: Keep `src/app/**` thin; route files must only compose UI, session guards, redirects, and route-local components.
- **CON-003**: Put business logic in `src/modules/packages` and admin read-model logic in `src/modules/admin/packages` or the repo-equivalent package admin module.
- **CON-004**: Reuse existing UI primitives before adding new primitives.
- **CON-005**: Do not introduce HeroUI.
- **CON-006**: Do not put package mutation logic in route files or client components.
- **CON-007**: Do not add a separate browser test file only to satisfy the phase gate.

### 3.7 Guidelines

- **GUD-001**: Canonically sort access keys before storage so snapshots remain stable across edit cycles.
- **GUD-002**: Render `checkoutUrl = null` as a clear empty state such as `-` or `Not set`.
- **GUD-003**: Preserve the existing package `code` across edits.
- **GUD-004**: Use clear validation copy for invalid entitlements, invalid duration, negative amount, and invalid URL input.

### 3.8 File Placement Patterns

- **PAT-001**: `src/app/(admin)/admin/package/page.tsx` must remain route composition only.
- **PAT-002**: Route-local UI may live in `src/app/(admin)/admin/package/_components/**`.
- **PAT-003**: `src/modules/packages/actions.ts`, `services.ts`, `repositories.ts`, `schemas.ts`, and `types.ts` are the canonical domain files for package writes and shared business rules.
- **PAT-004**: `src/modules/admin/packages/queries.ts` is the canonical admin read-model boundary for the package table.
- **PAT-005**: Any table-specific UI state such as column visibility must stay in the route-local UI layer or client state, not in domain services.

## 4. Interfaces & Data Contracts

### 4.1 Route Contract

| Route | Type | Contract |
| --- | --- | --- |
| `/admin/package` | Admin page | Displays package table, create/edit controls, filter controls, and enable/disable actions. |

### 4.2 Read Model Contract

| Name | Fields | Notes |
| --- | --- | --- |
| `PackageAdminRow` | `id`, `code`, `name`, `amountRp`, `durationDays`, `checkoutUrl`, `summary`, `isExtended`, `isActive`, `totalUsed`, `createdAt`, `updatedAt` | `id` is the UUID primary key, `code` is the opaque text identifier, `summary` is derived, and `totalUsed` is server-computed. |
| `PackageTableFilters` | `search`, `summary`, `page`, `pageSize` | `search` is optional and clearable. `summary` must be one of `private`, `share`, `mixed`, or empty. |
| `PackageFormInput` | `name`, `amountRp`, `durationDays`, `checkoutUrl`, `isExtended`, `accessKeys` | `code`, `summary`, `totalUsed`, `createdAt`, and `updatedAt` are read-only. |
| `PackageEditorData` | `id`, `code`, `name`, `amountRp`, `durationDays`, `checkoutUrl`, `isExtended`, `isActive`, `accessKeys` | Used to prefill the edit popup; `id` and `code` must remain distinct. |
| `PackageTableResult` | `items`, `page`, `pageSize`, `totalCount` | Must be returned by the server-side list query. |
| `PackageToggleInput` | `id`, `isActive` | Used by enable and disable actions. |

### 4.3 Server Action Contracts

| Action | Input | Output | Notes |
| --- | --- | --- | --- |
| `createPackageAction` | `PackageFormInput` | Created `PackageAdminRow` or action error | Must generate `code` server-side. |
| `updatePackageAction` | `id` plus `PackageFormInput` | Updated `PackageAdminRow` or action error | Must update the existing row only. |
| `togglePackageActiveAction` | `PackageToggleInput` | Updated `PackageAdminRow` or action error | Must update `is_active` only. |

### 4.4 Validation Schema Contract

| Field | Rule |
| --- | --- |
| `name` | Required, non-empty after trim. |
| `amountRp` | Required safe integer, `>= 0`, serialized as a JSON number. |
| `durationDays` | Required safe integer, `> 0`. |
| `checkoutUrl` | Optional; trimmed blank becomes `null`; if present must be an absolute `http` or `https` URL. |
| `isExtended` | Required boolean. |
| `accessKeys` | Required non-empty array of unique valid access keys, already canonical-sorted before save. |

### 4.5 Computation Contract

| Computed value | Rule |
| --- | --- |
| Package summary | Use `public.get_package_summary(access_keys_json)` or equivalent server-side derivation. |
| `total used` | Count rows in `public.v_current_subscriptions` for the same `package_id`, or the exact equivalent predicate `status in ('active', 'processed') and end_at > now()` on `public.subscriptions`. |
| `isActive` | Directly mapped from `public.packages.is_active`. |

### 4.6 Example Payloads

```json
{
  "name": "Starter TradingView Share",
  "amountRp": 100000,
  "durationDays": 30,
  "checkoutUrl": "https://example.com/checkout",
  "isExtended": false,
  "accessKeys": ["tradingview:share"]
}
```

```json
{
  "id": "5eb5d3f4-6f2d-4f1b-9c0c-d4c5f2f5fb41",
  "code": "pkg_20260414_001",
  "name": "Combo Pro",
  "amountRp": 250000,
  "durationDays": 30,
  "checkoutUrl": null,
  "summary": "mixed",
  "isExtended": true,
  "isActive": true,
  "totalUsed": 12,
  "createdAt": "2026-04-14T00:00:00Z",
  "updatedAt": "2026-04-14T00:00:00Z"
}
```

## 5. Acceptance Criteria

- **AC-001**: Given a guest or member user opens `/admin/package`, when the page loads, then access is denied and package data is not shown.
- **AC-002**: Given an admin user opens `/admin/package`, when the page loads, then the package table renders without runtime error.
- **AC-003**: Given valid package input with unique entitlements, when the admin submits create, then exactly one new row appears and the row persists after reload.
- **AC-004**: Given duplicate entitlements or invalid access keys, when the admin submits create or edit, then the server rejects the request with a clear validation error and no row changes are persisted.
- **AC-005**: Given negative amount, zero or negative duration, or invalid checkout URL, when the admin submits create or edit, then the server rejects the request and the database remains unchanged.
- **AC-006**: Given an existing package, when the admin edits it, then the same package row remains the same `id` and `code`, and the updated values persist after reload.
- **AC-007**: Given an existing package, when the admin disables it, then `is_active` becomes false, the row remains visible, and the UI clearly marks it as disabled.
- **AC-008**: Given a disabled package, when the admin re-enables it, then `is_active` becomes true again without losing row history.
- **AC-009**: Given the package table, when search, filter, page change, or column visibility changes occur, then the result set and column preferences behave deterministically across reloads.
- **AC-010**: Given a package has running subscriptions, when the table loads, then `total used` equals the current count of active or processed subscriptions for that package.
- **AC-011**: Given a package summary badge or filter is shown, when the UI renders, then the summary is derived from `access_keys_json` and not entered manually.
- **AC-012**: Given a package is edited or disabled, when later phases inspect historical subscriptions or issued CD-Keys, then existing history remains valid and unchanged.
- **AC-013**: Given the runtime database is inspected with read-only InsForge CLI, when package data is queried, then the stored row, `access_keys_json`, and `is_active` state match the UI outcome.
- **AC-014**: Given the admin submits a blank or whitespace-only `checkoutUrl`, when the form is saved, then the stored value becomes `null`.
- **AC-015**: Given the package list is paginated, when the admin moves between pages or changes page size, then the server returns only the requested page and a correct `totalCount`.
- **AC-016**: Given an existing package is opened in edit mode, when the popup renders, then it is prefilled from server data including the current access keys and immutable identifiers are displayed separately.

## 6. Test Automation Strategy

- **Test Levels**: unit, integration, and browser verification.
- **Unit Focus**: Zod validation for package forms, duplicate entitlement detection, access-key normalization, and summary derivation.
- **Integration Focus**: package repository queries, server actions, `total used` computation, and `is_active` toggle behavior against the runtime database.
- **Browser Verification**: manual browser flow on `/admin/package` using `agent-browser` CLI through the `agent-browser` skill.
- **Test Data Management**: use the runtime seed admin account and create temporary package rows with unique names or codes; do not rely on manual database edits during the flow under test.
- **CI/CD Integration**: at minimum run `pnpm lint`, `pnpm build`, and `pnpm check`; run `pnpm markdown:check` if this spec or related Markdown changes.
- **Coverage Requirements**: all create/edit/toggle validation paths and `total used` read model logic should have automated coverage where the repository already supports it.
- **Performance Testing**: the package table must remain paginated server-side and must not fetch the full package catalog in one request.

## 7. Rationale & Context

The package entity is an upstream contract for later phases. Subscription activation, CD-Key issuance, and payment-dummy activation all depend on package snapshots, so package data must be stable, validated, and reusable without introducing hidden behavior.

`access_keys_json` is the authoritative entitlement source because the database schema validates it directly and later phases snapshot the same entitlement list into subscriptions and CD-Keys. The package summary is intentionally derived only for UI and reporting so it cannot drift into being an authorization source.

Disable and enable are preferred over hard delete because package history must remain intact for subscriptions and CD-Keys that were created earlier. This preserves future phase compatibility and avoids historical data loss.

`total used` must be computed from running subscriptions instead of historical counts because the table is intended to show current utilization, not lifetime package sales.

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**: InsForge Auth - required for admin session identity and role-based access control.
- **EXT-002**: InsForge Database - required for package storage, subscription lookup, and derived reporting.

### Infrastructure Dependencies

- **INF-001**: Runtime database with `auth.users` and applied baseline migrations `001_extensions.sql` through `030_rpc.sql`.
- **INF-002**: Browser-verifiable seed data that includes an admin login fixture.
- **INF-003**: Next.js App Router runtime with the `(admin)` route group already available.

### Data Dependencies

- **DAT-001**: `public.packages` for package storage.
- **DAT-002**: `public.subscriptions` for `total used` calculation.
- **DAT-003**: `public.get_package_summary(access_keys_json)` for summary derivation.
- **DAT-004**: `public.is_valid_access_key` and `public.is_valid_access_keys_json` for entitlement validation.
- **DAT-005**: `public.v_current_subscriptions` as a preferred read model for running subscription counts when it fits the query shape.

### Technology Platform Dependencies

- **PLT-001**: Next.js App Router.
- **PLT-002**: `next-safe-action` for server mutations.
- **PLT-003**: `react-hook-form` for package forms.
- **PLT-004**: `zod` for input validation.
- **PLT-005**: Existing Tailwind and UI primitives from `src/components/ui/**`.
- **PLT-006**: `TanStack React Query` only for client-side read state if the admin table implementation uses it in the existing repo pattern.

### Compliance Dependencies

- **COM-001**: Admin-only access to `/admin/*`.
- **COM-002**: Server-side mutation enforcement for internal web UI package management.
- **COM-003**: No hard delete package in v1.

## 9. Examples & Edge Cases

```json
{
  "name": "Mixed Pro",
  "amountRp": 250000,
  "durationDays": 30,
  "checkoutUrl": null,
  "isExtended": true,
  "accessKeys": ["tradingview:private", "fxreplay:share"]
}
```

| Scenario | Expected Result |
| --- | --- |
| Blank `checkoutUrl` | Normalize to `null` before save. |
| Duplicate `tradingview:share` selected twice | Reject with validation error. |
| Package disabled while running subscriptions still exist | Row remains visible; `total used` may still be greater than zero. |
| Package name edited | Future package reads show the new name; historical subscriptions and CD-Keys keep their stored snapshots. |
| Access keys edited on an existing package | Future activations use the new entitlement list; existing snapshots remain unchanged. |
| Summary filter set to `mixed` | Only packages derived as `mixed` are shown; the filter does not affect authorization. |

## 10. Validation Criteria

- **VAL-001**: `/admin/package` is admin-only and denies guest/member access.
- **VAL-002**: Create and edit inputs pass Zod validation before any database write.
- **VAL-003**: `public.packages.access_keys_json` always satisfies `public.is_valid_access_keys_json` after create or edit.
- **VAL-004**: Duplicate entitlements are rejected both in the UI and on the server.
- **VAL-005**: Package summary is derived, not user-entered.
- **VAL-006**: `total used` equals the current count of running subscriptions for that package.
- **VAL-007**: Disable and enable toggle `is_active` without deleting the package row.
- **VAL-008**: Column visibility persists after a page reload.
- **VAL-009**: Read-only InsForge CLI verification against the runtime database matches the UI state.
- **VAL-010**: `pnpm lint`, `pnpm build`, and `pnpm check` complete successfully after implementation.

## 11. Related Specifications / Further Reading

- `docs/PRD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DB.md`
- `docs/agent-rules/folder-structure.md`
- `docs/spec/spec-process-phase-1-auth.md`
- `migrations/README.md`
- `migrations/003_core_helpers.sql`
- `migrations/011_catalog_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/020_admin_access_helpers.sql`
- `migrations/021_rls_policies.sql`
- `migrations/023_triggers.sql`
- `migrations/024_views.sql`
- `migrations/025_table_grants.sql`
- `migrations/030_rpc.sql`
