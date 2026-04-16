---
title: Milestone 5 Admin CD-Key Implementation Specification
version: 1.0
date_created: 2026-04-16
last_updated: 2026-04-16
owner: AssetProject
tags: [process, admin, cdkey, nextjs, insforge, milestone-5]
---

# Introduction
This specification defines the implementation contract for Milestone 5 Admin CD-Key. It is written for AI coding agents and maintainers that must deliver the `/admin/cdkey` milestone without inventing behavior that conflicts with `docs/PRD.md`, `docs/DB.md`, `docs/IMPLEMENTATION_PLAN.md`, the baseline SQL migrations, or the admin UI patterns already established by `/admin/package`.

Milestone 5 is complete only when an admin can issue CD-Keys from the real `/admin/cdkey` browser route, search and filter the issued-key table, inspect package snapshot data, and prove that newly issued keys persist in `public.cd_keys` with the correct package snapshot while blocked issuance paths leave no invalid row behind.

## 1. Purpose & Scope

### 1.1 Purpose
The purpose of this specification is to provide a machine-readable contract for Milestone 5 Admin CD-Key so implementation can be executed consistently across the admin table UI, issue dialog, code normalization and generation rules, package snapshot persistence, read-model behavior, and backend verification.

### 1.2 In Scope
- Route `/admin/cdkey`.
- Admin-only access control for CD-Key issuance and inspection.
- CD-Key table with search, filter, pagination, and persisted column visibility.
- One issue dialog opened from the route.
- Manual code entry with canonical normalization.
- Automatic code generation when the code input is blank.
- Optional amount override at issuance time.
- Package snapshot persistence into `public.cd_keys`.
- Read-only detail view or equivalent route-local snapshot surface for issued key metadata.
- Browser verification on the live route.
- Read-only backend verification against the runtime database.

### 1.3 Out of Scope
- Member redeem flow in `/console`.
- Payment dummy flow.
- Admin subscriber manual activation flow.
- Editing an already issued CD-Key row.
- Toggling `cd_keys.is_active` from admin UI in this milestone.
- New public REST endpoints for internal admin UI.
- New baseline database schema unless implementation discovers a concrete blocker that cannot be solved with the existing tables, policies, and app-layer services.

### 1.4 Assumptions
- Milestones 0 through 4 are already available in the repo and runtime environment.
- Baseline migrations from `migrations/001_extensions.sql` through `migrations/030_rpc.sql` are applied to the runtime database.
- `migrations/040_dev_seed_full.sql` or an equivalent runtime seed dataset is available so browser and CLI verification can rely on active packages, a disabled package, and existing `used` or `unused` CD-Key fixtures.
- The implementation follows `docs/agent-rules/folder-structure.md`.
- The implementation should keep code structure and route-local UI patterns visually aligned with `src/app/(admin)/admin/package/**` unless there is a concrete Milestone 5-specific reason to diverge.
- The implementation should reuse the current repo admin-table stack, shared UI primitives, shared table helpers, shared filters, and `next-safe-action` setup instead of introducing a new admin UI stack.

## 2. Definitions
| Term                         | Definition                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CD-Key issuance              | Admin-triggered creation of one `public.cd_keys` row for later single-use redemption.                                                                                  |
| Usage status                 | UI-only derived state with value `unused` when `used_at is null` and `used` when `used_at is not null`.                                                               |
| Package snapshot             | The persisted CD-Key snapshot fields stored directly on `public.cd_keys`: `package_id`, `duration_days`, `is_extended`, `access_keys_json`, and `amount_rp`.         |
| Current package label        | The human-readable package name joined from `public.packages.name` at read time because `public.cd_keys` does not store `package_name`.                               |
| Amount override              | Optional admin-entered Rupiah amount that replaces the selected package `amount_rp` for the newly issued CD-Key snapshot only.                                        |
| Canonical manual code        | A create input code that has been trimmed and uppercased before server validation and persistence.                                                                     |
| Generated code               | A server-generated uppercase alphanumeric code created when the admin leaves the code field blank.                                                                     |
| Snapshot detail view         | A read-only dialog, sheet, or equivalent route-local surface that exposes the CD-Key snapshot and actor metadata not required in the minimum table columns.            |
| Legacy seed code             | Existing seed row code that may not match the stricter Milestone 5 issuance format. Legacy rows must remain readable even if new issuance uses a stricter write rule. |
| Local implementation decision | A deterministic behavior added by this specification because the source docs do not define that detail. Such decisions must not contradict the source docs.            |

## 3. Requirements, Constraints & Guidelines

### 3.1 Source of Truth
- **REQ-001**: Business rules must follow `docs/PRD.md`.
- **REQ-002**: Database shape, constraints, views, and function behavior must follow `docs/DB.md` and the baseline migrations.
- **REQ-003**: Milestone scope and definition of done must follow Milestone 5 in `docs/IMPLEMENTATION_PLAN.md`.
- **REQ-004**: File placement and import boundaries must follow `docs/agent-rules/folder-structure.md`.
- **REQ-005**: The Milestone 5 route and UI composition must stay visually and structurally aligned with the shipped `/admin/package` pattern unless a Milestone 5 requirement explicitly needs a different composition.

### 3.2 Route, Access, and Security Rules
- **REQ-010**: The admin CD-Key feature must live at `/admin/cdkey`.
- **REQ-011**: The route must be accessible only to admin users.
- **REQ-012**: Guest and member users must be denied access to the CD-Key admin route.
- **REQ-013**: CD-Key issuance must open from the `/admin/cdkey` route as a modal or dialog flow.
- **REQ-014**: The admin browser must never use database credentials, service credentials, or `project_admin` credentials directly on the client.
- **DEC-001**: Browser-triggered admin CD-Key reads use `next-safe-action` through the admin action client. The initial Server Component page load may call server-only query functions directly after the admin page guard passes, matching the `/admin/package` pattern.
- **REQ-016**: All admin CD-Key mutations must execute on the server.
- **REQ-017**: The implementation must not add a new public REST endpoint for internal web UI CD-Key management.
- **REQ-018**: Page-level access must be guarded by `requireAdminShellAccess()` or the canonical admin shell guard already used by the repo.
- **REQ-019**: Browser-callable admin read and write actions must enforce admin access at the action boundary before reading or mutating CD-Key, package, or profile data.
- **SEC-001**: Repository code used by admin CD-Key flows must run only after the current app admin session guard passes and must use the repo-approved server-only InsForge database adapter.
- **SEC-002**: `created_by` must always be derived from the current authenticated admin session and must not be accepted from browser input.

### 3.3 CD-Key Data, Snapshot, and Code Rules
- **REQ-020**: Create CD-Key must accept `packageId`, optional manual `code`, and optional `amountRpOverride`.
- **REQ-021**: The server must load the selected package snapshot from canonical package-domain code before creating the CD-Key row. `src/modules/admin/cdkeys/**` is read-only for table, detail, and dialog bootstrap concerns and must not become a source of issuance business logic.
- **REQ-022**: A newly issued CD-Key row must persist `package_id`, `duration_days`, `is_extended`, `access_keys_json`, and `amount_rp` as a package snapshot for later redeem behavior.
- **REQ-023**: If `amountRpOverride` is blank, the issued row must snapshot the selected package `amount_rp`.
- **REQ-024**: If `amountRpOverride` is provided, it must be a non-negative safe integer in Rupiah and must replace the selected package amount only for the new CD-Key row.
- **REQ-025**: Newly issued rows from the admin UI must persist `is_active = true`.
- **REQ-026**: Newly issued rows must persist `used_by = null` and `used_at = null`.
- **REQ-027**: The admin UI must reject issuance from a package whose current `is_active = false`.
- **REQ-028**: Disabling a package after a CD-Key has already been issued must not mutate or invalidate the stored CD-Key snapshot row.
- **REQ-029**: The table status shown to admins must be derived from `used_at`, not from `is_active`.
- **DEC-002**: The Milestone 5 primary table exposes only `used` and `unused` usage states. Existing rows with `is_active = false` remain readable and inspectable, but do not create a third table status in this milestone.
- **REQ-030**: Milestone 5 must not redefine member redeem semantics. The current runtime CD-Key activation code does not itself reject `is_active = false`, so this milestone must not claim that inactive keys are non-redeemable unless a later implementation explicitly changes `src/modules/cdkeys/**`.
- **REQ-031**: If a manual code is provided, the server must trim leading or trailing whitespace and uppercase the final stored value before validation.
- **REQ-032**: Manual code input must contain only `A-Z` and `0-9` after normalization.
- **REQ-033**: Manual code input must be between 8 and 12 characters inclusive after normalization.
- **REQ-034**: Automatic code generation must produce uppercase alphanumeric output only.
- **DEC-003**: Automatically generated codes use exactly 10 characters chosen from `A-Z0-9`.
- **REQ-035**: The server must guarantee uniqueness of the final stored code value.
- **REQ-036**: If the admin leaves the code input blank, the server must generate the final code value server-side.
- **REQ-037**: Duplicate code attempts must fail with a clear validation or conflict error and must not overwrite an existing row.
- **REQ-038**: The package summary used for filter badges and reporting must be derived from the CD-Key snapshot `access_keys_json`, not from the current live package summary alone.
- **DEC-004**: Because `public.cd_keys` does not store `package_name`, the Milestone 5 admin read model may join `public.packages.name` as the current package label while treating the persisted snapshot fields on `public.cd_keys` as the authoritative issuance snapshot. This rule is specific to the Milestone 5 admin table and detail payloads and does not retroactively redefine older shared runtime helpers outside this milestone.
- **REQ-040**: The write path must not use `public.seed_cd_key(...)` for live admin issuance because that helper performs an upsert on code conflict and would violate create-only issuance semantics.
- **REQ-041**: Validation for the Milestone 5 issuance code format applies to new create inputs only. Existing legacy seed rows that do not match the new format must still load and display correctly in the admin table and detail view.

### 3.4 Table, Search, Filter, and Detail Rules
- Source docs define the table columns and high-level filter categories for `/admin/cdkey`, but they do not define exact row shape, package-label snapshot strategy, or default ordering. The following `DEC-*` items are local implementation decisions used to make this milestone deterministic without contradicting the source docs.

- **REQ-050**: The minimum table columns are `code`, `package`, `status`, `used by`, `created by`, `created at`, and `updated at`.
- **REQ-051**: Search must be case-insensitive and clearable.
- **REQ-052**: Search must match code, current package label, used-by username, and used-by email.
- **REQ-053**: The table must support filter by usage status.
- **REQ-054**: The status filter must support `used` and `unused`.
- **REQ-055**: The table must support filter by package.
- **REQ-056**: The package filter for the table must include packages referenced by existing rows, including currently disabled packages, so historical rows remain inspectable.
- **REQ-057**: The table must support filter by derived package summary `private`, `share`, or `mixed`.
- **REQ-058**: The table must expose show or hide column controls and persist the selected column visibility in localStorage, consistent with the global admin table rule.
- **REQ-059**: The table must support server-side pagination.
- **DEC-005**: Stable default ordering is `created_at desc`, then `id desc`.
- **REQ-061**: If the table renders user identity for `used by` or `created by`, the UI must display `avatar + username + email`; when `avatarUrl` is null, the UI must render an initials-based fallback avatar with a consistent per-user background, following the global admin user-display rule.
- **REQ-062**: If `used_by is null`, the `used by` cell must render a clear empty state such as `Unused` or `-` without breaking table layout.
- **REQ-063**: Table rows must not include raw redeem-only data that is not needed for the list surface.
- **REQ-064**: The route must expose a read-only snapshot detail surface for at least `code`, `packageId`, current package label, derived package summary, `amountRp`, `durationDays`, `isExtended`, `accessKeys`, `createdBy`, `usedBy`, `usedAt`, `createdAt`, and `updatedAt`.
- **REQ-065**: The snapshot detail surface must make amount override outcomes inspectable so browser verification can prove whether the stored amount matches the selected package amount or the override.
- **REQ-066**: The initial server page load for `/admin/cdkey` should catch table-query failures, pass an empty paginated result plus a `tableError` message into the route-local page component, and keep the admin shell and card-wrapped table surface rendered, matching the `/admin/package` pattern.
- **GUD-001**: The detail surface should offer a copy affordance for the issued code.

### 3.5 Issue Dialog and Mutation Behavior
- **REQ-070**: The issue dialog must show only active packages in its package picker.
- **REQ-071**: Before submit, the issue dialog must display the selected package name, price, duration, `isExtended`, exact `accessKeys`, and derived summary in a human-readable form.
- **REQ-072**: The issue dialog must make it explicit that leaving the code blank triggers server-side automatic generation.
- **REQ-073**: The issue dialog must use `react-hook-form` and `zod` validation.
- **REQ-074**: A successful submit must create exactly one new `public.cd_keys` row.
- **REQ-075**: The create path must be atomic. If creation fails after validation, the system must not leave a partially written CD-Key row.
- **REQ-076**: Create is the only write operation in this milestone; editing an existing CD-Key row is out of scope and must not be implemented as part of Milestone 5.
- **REQ-077**: The create path must normalize and validate the final code before the insert statement is executed.
- **REQ-078**: The create path must derive package summary or badge metadata for the read model from the persisted access-key snapshot, not from browser-submitted labels.
- **REQ-079**: The create path must revalidate package activity on the server at submit time so a package that became disabled after dialog open is still rejected safely.
- **REQ-080**: The create path must persist `created_by` from the current admin session user ID.
- **REQ-081**: The successful issue-dialog submit flow must invalidate the route-local React Query table cache using the `/admin/cdkey` query key so the new row appears immediately after a successful submit.
- **REQ-082**: If the final generated or normalized code conflicts with an existing row, the action must return a clear error and the admin must remain on the dialog with no row created.
- **REQ-083**: The create path must not call a seed helper or update-on-conflict helper that can silently mutate an existing key row.

### 3.6 Technical Constraints
- **CON-001**: Use Next.js App Router conventions only.
- **CON-002**: Keep `src/app/**` thin; route files must only compose UI, session guards, redirects, and route-local components.
- **CON-003**: Put core CD-Key issuance logic in `src/modules/cdkeys/**`.
- **CON-004**: Put admin CD-Key read-model logic in `src/modules/admin/cdkeys/**`.
- **CON-005**: Reuse the existing repo admin-table stack already used by `/admin/package`, including `@tanstack/react-query` for client read state and `@tanstack/react-table` for table rendering.
- **CON-006**: Reuse existing UI primitives before adding new primitives.
- **CON-007**: Do not introduce HeroUI.
- **CON-008**: Do not put CD-Key issuance business logic in route files or client components.
- **CON-009**: Do not add a separate browser test file only to satisfy the milestone gate.
- **CON-010**: Prefer the current baseline tables, triggers, policies, and package-domain data before introducing a new migration.

### 3.7 Guidelines
- **GUD-002**: Mirror the `/admin/package` page composition where practical: optional stat cards, one card-wrapped data table, a toolbar with search, filter, view options, and a primary action button.
- **GUD-003**: Reuse the shared admin toolbar, search input, filter select, table, pagination, and column-visibility helpers so `/admin/cdkey` behaves consistently with `/admin/package`.
- **GUD-004**: Present exact access keys in the issue dialog and detail surface as readable badges or grouped labels so admins can reason about the issued entitlement snapshot.
- **GUD-005**: Use clear validation copy for duplicate code, invalid code format, invalid amount override, and disabled package rejection.
- **GUD-006**: If summary cards are added to mirror `/admin/package`, keep their meaning explicit. Prefer current-filter or current-page counts unless a separate server aggregate is intentionally introduced.

### 3.8 File Placement Patterns
- **PAT-001**: `src/app/(admin)/admin/cdkey/page.tsx` must remain route composition only.
- **PAT-002**: Route-local UI may live in `src/app/(admin)/admin/cdkey/_components/**`.
- **PAT-003**: If the concern is needed, `src/modules/cdkeys/actions.ts`, `services.ts`, `repositories.ts`, `schemas.ts`, and `types.ts` are the canonical domain homes for issuance write contracts and shared CD-Key rules. Not every file is mandatory if the implementation remains simpler while preserving repo boundaries.
- **PAT-004**: If the concern is needed, `src/modules/admin/cdkeys/actions.ts`, `queries.ts`, `schemas.ts`, and `types.ts` are the canonical admin read-model homes for the CD-Key table, issue-dialog bootstrap, and detail reads. Not every file is mandatory if the implementation remains simpler while preserving repo boundaries.
- **PAT-005**: Route-local table state, dialog state, URL search-param state, and React Query transport state must remain in the route-local UI layer, matching the `/admin/package` pattern.
- **PAT-006**: The route-local query adapter should live in `src/app/(admin)/admin/cdkey/_components/cdkey-query.ts` and should be transport-only, analogous to the existing admin pages.
- **PAT-007**: The initial `/admin/cdkey` page load may call `src/modules/admin/cdkeys/queries.ts` directly from the Server Component page after `requireAdminShellAccess()` passes, matching `/admin/package`.
- **PAT-008**: `src/app/(admin)/admin/cdkey/page.tsx` should pass a stable `key` derived from the parsed table filters or search params into the route-local page component so client-side table state remounts predictably on URL-driven filter changes, mirroring `/admin/package`.
- **PAT-009**: When the corresponding concerns exist, the preferred route-local decomposition mirrors `/admin/package`: `cdkey-page.tsx`, `cdkey-table/cdkey-table.tsx`, `cdkey-table/cdkey-table-toolbar.tsx`, `cdkey-table/cdkey-table-filter-bar.tsx`, and `cdkey-form-dialog/cdkey-form-dialog.tsx`.

## 4. Interfaces & Data Contracts

### 4.1 Route Contract
| Route           | Type       | Contract                                                                                                  |
| --------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `/admin/cdkey`  | Admin page | Displays the CD-Key table, issue action, filters, column-visibility options, and read-only snapshot view. |

### 4.2 Table and Filter Contracts
| Name                 | Fields                                                                                                                                                                              | Notes                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CdKeyUsageStatus`   | `used`, `unused`                                                                                                                                                                    | Derived from `used_at`.                                                                                                                                                  |
| `CdKeyTableFilters`  | `search`, `status`, `packageId`, `packageSummary`, `page`, `pageSize`                                                                                                               | `status`, `packageId`, and `packageSummary` may be `null`.                                                                                                               |
| `CdKeyAdminRow`      | `id`, `code`, `packageId`, nullable `packageName`, `packageSummary`, `status`, `isActive`, nullable `usedBy`, `createdBy`, nullable `usedAt`, `createdAt`, `updatedAt`            | `packageName` is the current package label if available. `packageSummary` is derived from the CD-Key snapshot. `usedBy` and `createdBy` are user-display objects.      |
| `CdKeyUserIdentity`  | `userId`, `username`, `email`, nullable `avatarUrl`                                                                                                                                 | Shared actor display shape for `usedBy` and `createdBy`.                                                                                                                 |
| `CdKeyTableResult`   | `items`, `page`, `pageSize`, `totalCount`                                                                                                                                            | Main paginated table payload.                                                                                                                                            |

### 4.3 Issue Dialog and Detail Contracts
| Name                    | Fields                                                                                                                                                           | Notes                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `CdKeyPackageOption`    | `packageId`, `name`, `amountRp`, `durationDays`, `isExtended`, `accessKeys`, `packageSummary`                                                                   | Returned by the issue-dialog package picker. Must contain active packages only.                                                            |
| `CdKeyIssueFormValues`  | `packageId`, nullable `code`, nullable `amountRpOverride`                                                                                                        | Browser-facing dialog payload. Blank `code` means auto-generate. Blank `amountRpOverride` means use package amount.                       |
| `CdKeyIssueInput`       | `packageId`, nullable `manualCode`, nullable `amountRpOverride`                                                                                                  | Server-normalized write contract before package snapshot hydration. The actor identity is derived server-side from the authenticated admin session and is never accepted from browser input. |
| `CdKeyIssueResult`      | `id`, `code`, `packageId`, nullable `packageName`, `packageSummary`, `status`, `amountRp`, `durationDays`, `isExtended`, `accessKeys`, `createdBy`, `createdAt` | Successful create response shape returned to the UI or used for cache refresh.                                                             |
| `CdKeyDetailSnapshot`   | `id`, `code`, `packageId`, nullable `packageName`, `packageSummary`, `amountRp`, `durationDays`, `isExtended`, `accessKeys`, `isActive`, `createdBy`, nullable `usedBy`, nullable `usedAt`, `createdAt`, `updatedAt` | Read-only detail payload required for verification and inspection. For the Milestone 5 admin read model only, if the current package label is unavailable, `packageName` must be `null` and must not fall back to CD-Key `code` or other non-label values. |

### 4.4 Query and Parser Contracts
| Query or parser              | Input                         | Output               | Notes                                                                                                                                      |
| ---------------------------- | ----------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `parseCdKeyTableSearchParams` | `searchParams` from the route | `CdKeyTableFilters`  | Route-level parser in `src/modules/admin/cdkeys/schemas.ts` that normalizes malformed params safely.                                      |
| `getCdKeyTablePage`          | `CdKeyTableFilters`           | `CdKeyTableResult`   | Canonical server-side table query for initial page load and admin read actions.                                                            |
| `listIssuablePackages`       | none                          | `CdKeyPackageOption[]` | Canonical server-side package list for the issue dialog. Must include active packages only.                                               |
| `getCdKeyDetailSnapshot`     | `{ id: string }`              | `CdKeyDetailSnapshot` | Canonical server-side read for row detail.                                                                                                  |

### 4.5 Code Normalization and Computation Contract
| Computed or normalized value | Rule                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `manualCode`                 | Trim whitespace and uppercase before validation.                                                                                         |
| Generated code               | Produce one 10-character uppercase alphanumeric string and retry on collision before final failure.                                     |
| `status`                     | `used` when `usedAt != null`; otherwise `unused`.                                                                                       |
| Package summary              | Derive from the persisted CD-Key `access_keys_json` snapshot using `public.get_package_summary(access_keys_json)` or equivalent logic. |
| `amountRp`                   | `amountRpOverride` when provided; otherwise current selected package `amount_rp` at issuance time.                                      |

### 4.6 Example Payloads
```json
{
  "packageId": "9b8ac60d-7a0d-4db7-b6bf-daa287aa2d3f",
  "code": null,
  "amountRpOverride": 125000
}
```

```json
{
  "id": "1e3df7f3-0718-4cf4-9d80-cba75b7c2114",
  "code": "7A9X2P1Q4Z",
  "packageId": "9b8ac60d-7a0d-4db7-b6bf-daa287aa2d3f",
  "packageName": "Starter TradingView Share",
  "packageSummary": "share",
  "status": "unused",
  "amountRp": 125000,
  "durationDays": 30,
  "isExtended": true,
  "accessKeys": ["tradingview:share"],
  "createdBy": {
    "userId": "0f9a7c18-72f8-44d7-8bb7-c5e2b8f6af31",
    "username": "seed.admin.browser",
    "email": "seed.admin.browser@assetnext.dev",
    "avatarUrl": null
  },
  "usedBy": null,
  "usedAt": null,
  "createdAt": "2026-04-16T08:30:00.000Z",
  "updatedAt": "2026-04-16T08:30:00.000Z"
}
```

## 5. Acceptance Criteria
- **AC-001**: Given a guest or member user opens `/admin/cdkey`, when the page loads, then access is denied and CD-Key data is not shown.
- **AC-002**: Given an admin user opens `/admin/cdkey`, when the page loads, then the CD-Key table renders without runtime error.
- **AC-003**: Given valid package selection and a valid manual code, when the admin submits create, then exactly one new `public.cd_keys` row is created and persists after reload.
- **AC-004**: Given valid package selection and a blank code input, when the admin submits create, then the server generates one unique uppercase alphanumeric code and the row persists after reload.
- **AC-005**: Given a generated code is created by the UI, when the row is inspected, then the final code length is between 8 and 12 characters and matches the canonical generation contract in this specification.
- **AC-006**: Given an amount override is entered, when the admin submits create, then the stored `amount_rp` on the new row matches the override and can be inspected from the detail surface or equivalent UI.
- **AC-007**: Given the admin leaves amount override blank, when the row is created, then the stored `amount_rp` matches the selected package amount at issuance time.
- **AC-008**: Given the selected package is disabled before submit, when the admin submits create, then the server rejects the request with a clear error and no new row is created.
- **AC-009**: Given a duplicate manual code or an invalid manual code format, when the admin submits create, then the server rejects the request with a clear validation or conflict error and no existing row is overwritten.
- **AC-010**: Given a newly issued key, when the table or detail surface is inspected, then `used_by` and `used_at` remain empty and the UI shows the row as `unused`.
- **AC-011**: Given the table is filtered by `used`, `unused`, package, or package summary, when the filter changes, then the result set changes deterministically without full-page failure.
- **AC-012**: Given the table search input changes, when the admin searches by code, package, or used-by identity, then matching rows appear case-insensitively.
- **AC-013**: Given the admin changes column visibility or pagination state, when the page reloads, then the preferences and server-side pagination behavior remain deterministic.
- **AC-014**: Given a newly issued row is inspected through the detail surface, when the detail payload loads, then the package snapshot fields `packageId`, `durationDays`, `isExtended`, `accessKeys`, and `amountRp` are visible and consistent with the stored row.
- **AC-015**: Given a legacy seed CD-Key such as `DEV-P1-UNUSED` exists, when `/admin/cdkey` loads, then the page renders and the row remains readable even though new create validation is stricter.
- **AC-016**: Given the runtime database is inspected with read-only InsForge CLI, when `public.cd_keys` is queried, then the stored row, package snapshot fields, and unused state match the UI outcome.
- **AC-017**: Given a package becomes disabled after earlier keys were issued, when the admin views existing CD-Key rows, then those rows remain visible and their stored snapshot data remains unchanged.
- **AC-018**: Given a malformed create payload bypasses the UI, when the server action runs, then it rejects the payload with a clear validation error and persists no invalid row.
- **AC-019**: Given `used by` or `created by` displays a user with `avatarUrl = null`, when the table or detail surface renders, then the UI shows an initials-based fallback avatar with a consistent per-user background.
- **AC-020**: Given the initial server-side table query fails, when `/admin/cdkey` loads, then the admin shell and table card still render with an empty paginated result and a visible table error state instead of crashing the route.

## 6. Test Automation Strategy
- **Test Levels**: unit, integration, and browser verification.
- **Unit Focus**: Zod validation for create inputs, manual code normalization, generated-code formatting, optional amount override normalization, and package-summary derivation from CD-Key snapshots.
- **Integration Focus**: admin read-model filters, issuance repository behavior, conflict handling, package snapshot persistence, and detail-query correctness.
- **Browser Verification**: manual browser flow on `/admin/cdkey` using `agent-browser` CLI through the `agent-browser` skill, including desktop and mobile viewport checks, light and dark readability, keyboard access and focus states in dialogs and table controls, first-error focus after failed submit, and accessible labels for icon-only actions.
- **Test Data Management**: use the runtime seed admin account, active package fixtures, and disabled package fixtures already present in the runtime database; create temporary CD-Key rows with distinctive package and amount combinations; do not rely on manual database edits during the flow under test.
- **CI/CD Integration**: at minimum run `pnpm lint`, `pnpm check`, and `pnpm test`; run Markdown lint or format checks only if the repo already provides them.
- **Coverage Requirements**: all create validation paths, duplicate-code rejection, package-disabled rejection, generated-code normalization, and admin read-model filter paths should have automated coverage where the repository already supports it.
- **Performance Testing**: the CD-Key table must remain paginated server-side and must not fetch the full CD-Key catalog in one request.
- **Negative Path Coverage**: include invalid code format, duplicate manual code, disabled package issuance, malformed amount override, guest or member direct access to `/admin/cdkey`, and malformed mutation payloads that bypass the UI.
- **Runtime Health Verification**: relevant Next.js runtime and compilation diagnostics for `/admin/cdkey` should be checked through Next.js DevTools MCP after `next-devtools_init` and must show no Milestone 5-related runtime or compilation error.

## 7. Rationale & Context
Milestone 5 is the admin-side bridge between stable package definitions and later member-side redeem flow. The issuance surface must therefore persist a deterministic snapshot of package entitlement and amount data at the time the key is created.

The baseline SQL schema already stores the right snapshot fields on `public.cd_keys`, but it does not store `package_name`. This is why the specification distinguishes between the authoritative snapshot fields on the CD-Key row and the current package label joined at read time.

The baseline RPC helper `public.seed_cd_key(...)` is intentionally excluded from the live admin create path because its `on conflict do update` behavior would silently mutate an existing key row. That is acceptable for seed maintenance and unacceptable for user-facing issuance.

The stricter create-time code format is intentionally separated from read behavior because the repo already contains development seed keys with legacy formats such as `DEV-P1-UNUSED`. Admin pages must tolerate those rows while still enforcing a clearer contract for new issuance.

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: InsForge Auth - required for admin session identity and role-based access control.
- **EXT-002**: InsForge Database - required for CD-Key storage, package lookup, and actor joins.

### Infrastructure Dependencies
- **INF-001**: Runtime database with `auth.users` and applied baseline migrations `001_extensions.sql` through `030_rpc.sql`.
- **INF-002**: Browser-verifiable runtime seed data from `migrations/040_dev_seed_full.sql` or an equivalent dataset that includes an admin login fixture, active packages, at least one disabled package, and existing CD-Key rows for `used` and `unused` states.
- **INF-003**: Next.js App Router runtime with the `(admin)` route group already available.

### Data Dependencies
- **DAT-001**: `public.cd_keys` for issuance storage and readback.
- **DAT-002**: `public.packages` for package label lookup and active-package issuance checks.
- **DAT-003**: `public.profiles` for `created_by` and `used_by` identity display.
- **DAT-004**: `public.get_package_summary(jsonb)` or an equivalent server-side derivation for package summary badges and filters.
- **DAT-005**: `public.is_valid_access_keys_json(jsonb)` as the baseline invariant validator for stored access-key snapshots.
- **DAT-006**: Existing RLS policies on `public.cd_keys` that allow admin `select`, `insert`, and `update` through authenticated admin sessions.
- **DAT-007**: `public.seed_cd_key(...)` exists only as a seed helper reference and must not be used for live admin issuance.

### Technology Platform Dependencies
- **PLT-001**: Next.js App Router.
- **PLT-002**: `next-safe-action` and `adminActionClient` for admin browser-callable reads and mutations.
- **PLT-003**: `react-hook-form` for the issue dialog.
- **PLT-004**: `zod` for input validation.
- **PLT-005**: Existing Tailwind and UI primitives from `src/components/ui/**`.
- **PLT-006**: Shared table, filter, state, query-provider, and local-storage helpers already used by `/admin/package`.
- **PLT-007**: `TanStack React Query` for client read state and `TanStack React Table` for table rendering, consistent with the existing shared admin-table stack present in the repo.

### Compliance Dependencies
- **COM-001**: Admin-only access to `/admin/*`.
- **COM-002**: Server-side mutation enforcement for internal web UI CD-Key issuance.
- **COM-003**: Package disable must block new issuance without corrupting already issued snapshots.

## 9. Examples & Edge Cases
```json
{
  "packageId": "paket-3-uuid",
  "code": "TVSHARE01",
  "amountRpOverride": null
}
```

```text
Edge case: existing seed row code "DEV-P1-UNUSED"
- Must remain readable in the table.
- Must remain searchable by code.
- Must not be rejected by read-model parsing.
- Does not relax validation for new create inputs.
```

```text
Edge case: disabled package selected in dialog
- Dialog may have loaded while package was active.
- Server must re-check package activity on submit.
- Submit must fail with a clear error.
- No new CD-Key row may be created.
```

## 10. Validation Criteria
- The document contains no placeholder sections, `TODO`, or contradictory guidance.
- The document remains aligned with Milestone 5 scope in `docs/IMPLEMENTATION_PLAN.md` and the PRD rules for `/admin/cdkey`.
- The route, file-placement, and import-boundary guidance match `docs/agent-rules/folder-structure.md`.
- The specification explicitly defines create-only issuance semantics and explicitly rejects use of the upserting `seed_cd_key(...)` helper for live UI issuance.
- The specification explicitly distinguishes new-write validation from legacy read compatibility for existing seed codes.
- The specification explicitly defines how package snapshot fields and the current package label coexist.
- The specification provides testable acceptance criteria for manual code, generated code, amount override, disabled package rejection, search and filter behavior, and backend verification.

## 11. Related Specifications / Further Reading
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PRD.md`
- `docs/DB.md`
- `docs/agent-rules/folder-structure.md`
- `docs/works/m2-admin-package-spec.md`
- `docs/works/m4-admin-subscriptions-spec.md`
- `migrations/012_subscription_tables.sql`
- `migrations/021_rls_policies.sql`
- `migrations/030_rpc.sql`
