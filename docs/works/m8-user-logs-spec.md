---
title: Milestone 8 User Logs Implementation Specification
version: 1.0
date_created: 2026-04-19
last_updated: 2026-04-19
owner: AssetProject
tags: [process, admin, observability, logs, transactions, nextjs, insforge, milestone-8]
---

# Introduction
This specification defines the implementation contract for Milestone 8 User Logs. It is written for AI coding agents and maintainers that must deliver `/admin/userlogs` without inventing behavior that conflicts with `docs/PRD.md`, `docs/DB.md`, `docs/IMPLEMENTATION_PLAN.md`, `migrations/*.sql`, `docs/agent-rules/folder-structure.md`, or `docs/agent-rules/ui-ux-rules.md`.

Milestone 8 is complete only when an admin can open the real `/admin/userlogs` route and read login history, extension activity, and transaction history from browser-visible read models that remain consistent with the runtime database, previous milestones, and deleted-asset history rules.

The repo already contains:
- a placeholder route at `src/app/(admin)/admin/userlogs/page.tsx`
- an admin navigation link to `/admin/userlogs`
- recent login, extension, and transaction detail reads in `src/modules/admin/users/*`

Milestone 8 must expand that partial observability capability into a dedicated admin page without creating contradictory data contracts or duplicating business rules across modules.

The current `src/modules/admin/users/*` history reads are reference semantics only for row shape, recent ordering, and empty-state expectations inside the user-detail dialog. They are user-scoped, capped for detail usage, and are not the canonical paginated query source for `/admin/userlogs`.

## 1. Purpose & Scope

### 1.1 Purpose
The purpose of this specification is to provide a machine-readable contract for Milestone 8 User Logs so implementation can be executed consistently across route composition, tab state, server-side read models, filter parsing, client refetch behavior, transaction revenue summary, deleted-asset history display, and verification.

### 1.2 In Scope
- Route `/admin/userlogs`.
- Admin-only access control for the route and all browser-triggered read actions behind it.
- Replace the placeholder page with a real read-only admin page.
- Three tabs: `Login History`, `Extension Track`, and `Transactions`.
- Search, filter dropdown, pagination, and column-visibility persistence for each tab.
- Login history read model sourced from `public.login_logs`.
- Extension track read model sourced from `public.extension_tracks`.
- Transactions read model sourced from `public.transactions` and/or `public.v_transaction_list`.
- Revenue summary on the transactions tab.
- A required read-only admin-visible history surface on `/admin/userlogs` that can show assignment snapshots from `public.asset_assignments` for linked transaction history through `subscription_id`.
- Browser verification on the live route.
- Read-only backend verification against the runtime database.

### 1.3 Out of Scope
- Any write, edit, delete, or retry action for login logs, extension tracks, transactions, subscriptions, or assets.
- Admin audit log feature.
- Final `/admin` statistics dashboard owned by Milestone 9.
- Extension API write-path changes owned by Milestone 11.
- New public REST endpoints for internal admin UI.
- CSV export, reporting downloads, or scheduled reporting jobs.
- New database migration unless implementation discovers a concrete blocker that cannot be solved with the current tables, views, triggers, policies, and app-layer query composition.
- Display of raw `asset_json`, asset account credentials, session tokens, auth metadata, or other secrets.

### 1.4 Assumptions
- Milestones 1 through 7 are already implemented in the repo, consistent with the user's stated progress.
- Runtime migrations `001` through `030` are already applied to the same runtime database used by the app.
- Seed data from `040`, `041`, and `042` is available when milestone verification relies on seeded rows.
- `/admin/userlogs` is still a placeholder when this milestone starts.
- `src/modules/admin/users/queries.ts` and `src/modules/admin/users/repositories.ts` already provide recent login, extension, and transaction reads for the user-detail dialog, and Milestone 8 must not leave those existing contracts inconsistent with the new dedicated observability page.
- The implementation follows the existing admin-page pattern already used by `/admin/assets` and `/admin/users`: server-side initial load in `page.tsx`, route-local client composition under `_components`, and thin read actions for React Query refetch when needed.

## 2. Definitions
| Term | Definition |
| --- | --- |
| Login history row | One row derived from one `public.login_logs` record. |
| Resolved login identity | A login-history row whose `login_logs.user_id` still maps to a readable `public.profiles` row. |
| Unresolved login identity | A login-history row whose `login_logs.user_id` is `null` or no longer resolves to a readable `public.profiles` row. The row must still remain visible by raw email and timestamp. |
| Extension identity | The unique extension-track identity enforced by DB constraint: `user_id + device_id + ip_address + extension_id`. |
| Transaction list row | One row in the transactions tab representing one transaction event with user and package display data. |
| Revenue summary | Sum of `amount_rp` for transactions with `status = success` after applying the active non-pagination transaction filters. |
| Assignment snapshot | Historical data stored on `public.asset_assignments`, including `original_asset_id`, `access_key`, `asset_platform`, `asset_type`, `asset_note`, `asset_expires_at`, `asset_deleted_at`, `assigned_at`, `revoked_at`, and `revoke_reason`. |
| Transaction detail surface | A read-only dialog or equivalent detail surface on `/admin/userlogs` that shows one transaction and the assignment snapshot history linked through its `subscription_id`. |
| Tab state | The selected tab plus the filter, page, and page-size state associated with each tab. |
| Date range filter | A pair of optional date-only values in `yyyy-MM-dd` format used to constrain one tab's primary timestamp column. |

## 3. Requirements, Constraints & Guidelines

### 3.1 Source of Truth
- **REQ-001**: Business rules must follow `docs/PRD.md`.
- **REQ-002**: Database shape, constraints, views, and trigger behavior must follow `docs/DB.md` and `migrations/*.sql`.
- **REQ-003**: Milestone scope and definition of done must follow Milestone 8 in `docs/IMPLEMENTATION_PLAN.md`.
- **REQ-004**: File placement and import boundaries must follow `docs/agent-rules/folder-structure.md`.
- **REQ-005**: UI composition, responsive behavior, and admin visual language must follow `docs/agent-rules/ui-ux-rules.md`.

### 3.2 Route, Access, and Security Rules
- **REQ-010**: The feature must live at `/admin/userlogs`.
- **REQ-011**: The route must be accessible only to admin users.
- **REQ-012**: `src/app/(admin)/admin/userlogs/page.tsx` must guard access with `requireAdminShellAccess()` or the canonical equivalent already used by the repo.
- **REQ-013**: Guest and member users must be denied access to the route and its read actions.
- **REQ-014**: The page is strictly read-only. It must not create, update, revoke, cancel, or delete any row.
- **REQ-015**: The admin browser must never use database credentials, service credentials, or `project_admin` credentials directly on the client.
- **REQ-016**: The implementation must not add a new public REST endpoint for internal admin UI observability.
- **REQ-017**: Any browser-triggered refetch for this page must use the repo's existing server action pattern, gated by `adminActionClient` or the canonical admin action guard.
- **REQ-018**: The page must not expose raw `asset_json`, asset `account`, asset `proxy`, auth metadata, session token values, or other secret fields.
- **REQ-019**: All M8 reads must execute from an already authenticated admin app context on the server side, matching the existing admin-page pattern already used in the repo.
- **SEC-001**: Login-history rows must remain readable even when `login_logs.user_id` is null.
- **SEC-002**: Deleted-asset history must be read from `public.asset_assignments` snapshot columns and must not rely on the continued existence of a row in `public.assets`.
- **SEC-003**: If a transaction has no `subscription_id`, the M8 history detail surface must show an explicit empty assignment-history state instead of attempting fallback joins that could invent unrelated asset history.

### 3.3 Page Structure, Tab State, and UX Rules
- Source docs define the three tabs and minimum columns, but they do not define default tab, URL state behavior, per-tab persistence, or transaction detail interaction. The following `DEC-*` items close those gaps without contradicting source docs.

- **REQ-020**: `/admin/userlogs` must render a real admin page, not a placeholder card.
- **REQ-021**: The page must contain exactly three top-level tabs named `Login History`, `Extension Track`, and `Transactions`.
- **DEC-001**: The default selected tab on first load is `Login History`.
- **REQ-022**: Selected tab state must be URL-addressable through a `tab` search parameter.
- **DEC-002**: `tab` accepts only `login`, `extension`, or `transactions`. Invalid values fall back to `login`.
- **REQ-023**: Each tab must provide search, filter dropdowns, pagination, and persisted column visibility.
- **REQ-024**: All minimum columns defined by source docs must be visible by default on first load.
- **REQ-025**: All three tables must use sticky headers and follow the current admin-table baseline used by `src/app/(admin)/admin/assets/*`.
- **REQ-026**: Changing search, any filter, or page size must reset that tab's page to `1`.
- **REQ-027**: Empty-state copy must explain the condition and remain operationally clear.
- **REQ-028**: All user cells in this page must follow the global admin rule `avatar + username + email` when a profile is resolvable.
- **REQ-029**: If a user row has no avatar, the UI must use the same deterministic fallback-avatar behavior already required by Milestone 7.
- **DEC-003**: Tab state must preserve each tab's independent filter and pagination values when the user switches tabs.
- **DEC-004**: To preserve per-tab state cleanly, search params should be namespaced per tab as follows:
  - `loginSearch`, `loginOs`, `loginDateFrom`, `loginDateTo`, `loginPage`, `loginPageSize`
  - `extensionSearch`, `extensionBrowser`, `extensionOs`, `extensionDateFrom`, `extensionDateTo`, `extensionPage`, `extensionPageSize`
  - `transactionSearch`, `transactionSource`, `transactionStatus`, `transactionDateFrom`, `transactionDateTo`, `transactionPage`, `transactionPageSize`
- **DEC-005**: Column visibility for each tab must be persisted independently in browser `localStorage` using stable keys:
  - `admin.userlogs.login.columns.v1`
  - `admin.userlogs.extension.columns.v1`
  - `admin.userlogs.transactions.columns.v1`
- **DEC-006**: The active route should server-render only the selected tab's initial dataset. Other tabs may load lazily after tab activation through the existing read-action plus React Query pattern, but this remains an implementation guidance choice rather than a milestone acceptance gate.
- **DEC-006A**: Search-param normalization must follow the current admin-page parser baseline used elsewhere in the repo:
  - invalid enum filter values normalize to `null`
  - invalid `page` and `pageSize` values normalize to the documented defaults
  - invalid date strings normalize to `null`
  - reversed date ranges normalize to `null` on both ends rather than being silently swapped
  - the same normalization contract must be applied by the route search-param parser and any matching action input schema
- **GUD-001**: The page should reuse the current admin-table building blocks already present in the repo unless there is a documented blocker, especially `src/components/shared/data-table/**` and `src/components/shared/table-filters/**`, plus existing UI primitives from `src/components/ui/**`.
- **GUD-002**: The transactions tab should show revenue summary above the table in a restrained admin-card treatment, not a decorative marketing KPI block.

### 3.4 Login History Rules
- Source docs define minimum columns and filters, but they do not define unresolved-user handling, ordering, or search scope. The following `DEC-*` items close those gaps.

- **DEC-007**: The login-history dataset returns exactly one row per `public.login_logs` row.
- **REQ-030**: The canonical source for the login-history tab is `public.login_logs`.
- **REQ-031**: The login-history row set must not be derived from `app_sessions`, user detail cache, or any lossy aggregated projection.
- **REQ-032**: Minimum visible columns are `user`, `IP`, `browser`, `OS`, and `login time`.
- **REQ-033**: Login-history search must be case-insensitive and clearable.
- **DEC-008**: Login-history search must match raw `login_logs.email`, resolved profile `email`, resolved profile `username`, resolved profile `public_id`, and exact `user_id` UUID when the search string is UUID-shaped.
- **REQ-034**: Login-history narrowing must support user-oriented search plus filter dropdowns for `OS` and date range.
- **DEC-009**: Login-history date range filters apply to `login_logs.created_at` inclusively by calendar date.
- **DEC-010**: Login-history ordering is `created_at desc`, then `id desc`.
- **DEC-011**: Login-history page size default is `10`, with max page size `100`, matching existing admin table conventions.
- **REQ-035**: If a login-history row resolves to a profile, the `user` cell must render `avatar + username + email`.
- **REQ-036**: If a login-history row does not resolve to a profile, the `user` cell must still render a readable fallback identity using the raw login email and a neutral secondary label indicating that no linked profile is available.
- **REQ-037**: Null browser or OS values must be rendered as `Unknown browser` and `Unknown OS` or equivalent clear neutral copy.
- **REQ-038**: Browser and OS values shown in M8 must come from persisted `login_logs` values and must not be re-derived at read time from current user-agent parsing.
- **GUD-003**: Login-history UI may show success or failure state as a secondary badge or hidden optional column, but the milestone must not remove or replace any required minimum column to do so.

### 3.5 Extension Track Rules
- Source docs define minimum columns and the DB identity rule, but they do not define filter semantics, ordering, or search scope. The following `DEC-*` items close those gaps.

- **DEC-012**: The extension-track dataset returns exactly one row per `public.extension_tracks` row.
- **REQ-040**: The canonical source for the extension-track tab is `public.extension_tracks`.
- **REQ-041**: The page must preserve the DB identity semantics already enforced by the baseline schema: one row per unique `user_id + device_id + ip_address + extension_id` combination.
- **REQ-042**: Minimum visible columns are `user`, `IP`, `city`, `country`, `browser`, `OS`, `extension version`, `device ID`, `extension ID`, `first seen at`, and `last seen at`.
- **REQ-043**: Extension-track search must be case-insensitive and clearable.
- **DEC-013**: Extension-track search must match profile `email`, `username`, `public_id`, exact `user_id` UUID, `extension_id`, `device_id`, and `ip_address`.
- **REQ-044**: Extension-track narrowing must support user-oriented search. Date range filtering applies to `last_seen_at`.
- **DEC-014**: To satisfy the global admin-table dropdown-filter rule, the extension tab should expose dropdown filters for `browser` and `OS` because both fields already exist in the current data model and can be derived safely from distinct stored values.
- **DEC-015**: `browser` and `OS` filter option lists should be populated from distinct readable values in the dataset rather than a hardcoded enum, because extension clients may evolve these values over time.
- **DEC-016**: Extension-track ordering is `last_seen_at desc`, then `first_seen_at desc`, then `id desc`.
- **DEC-017**: Extension-track page size default is `10`, with max page size `100`.
- **REQ-045**: If a resolved user avatar is missing, the user cell must use the same deterministic fallback-avatar behavior used elsewhere in admin UI.
- **REQ-046**: Null `city`, `country`, `browser`, or `OS` values must remain readable as neutral placeholders rather than empty cells that look broken. The default placeholder copy should be `Unknown city`, `Unknown country`, `Unknown browser`, and `Unknown OS` unless the page adopts one consistent neutral symbol for all nullable cells.
- **REQ-047**: Browser and OS values shown in the extension tab must come from persisted `extension_tracks` values and must not be re-derived at read time.

### 3.6 Transactions Tab Rules
- Source docs define minimum columns and a revenue summary, but they do not define search scope, ordering, pagination behavior for the summary, or how deleted-asset history becomes visible. The following `DEC-*` items close those gaps.

- **REQ-050**: The transactions tab must read transaction history from `public.transactions` and/or `public.v_transaction_list` in a way that preserves the same visible row semantics as `public.v_transaction_list`.
- **REQ-051**: The tab must remain consistent with `public.v_transaction_list` for user, package, source, amount, status, and timestamps.
- **REQ-051A**: `public.v_transaction_list` is sufficient only for the visible transaction row semantics it already exposes. Any M8 query that also needs `subscription_id`, `public_id`, or `avatar_url` must additionally read from `public.transactions` plus `public.profiles`, or an equivalent extended server-side projection.
- **REQ-052**: Minimum visible columns are `user`, `package`, `source`, `amount (Rp)`, `status`, `created at`, and `updated at`.
- **REQ-053**: Transactions search must be case-insensitive and clearable.
- **DEC-018**: Transactions search must match profile `email`, `username`, `public_id`, exact `user_id` UUID, and `package_name`.
- **REQ-054**: Transactions filters must include date range.
- **DEC-019**: To satisfy the global admin-table dropdown-filter rule, the transactions tab should expose dropdown filters for `source` and `status` because both are first-class stored fields and safe to query server-side.
- **DEC-020**: Transactions date range filters apply to `created_at` inclusively by calendar date.
- **DEC-021**: Transactions ordering is `created_at desc`, then `updated_at desc`, then transaction primary key desc (`transactions.id`, aliased as `transaction_id` when a view is used).
- **DEC-022**: Transactions page size default is `10`, with max page size `100`.
- **REQ-055**: Revenue summary must be rendered on the transactions tab.
- **DEC-023**: Revenue summary is the sum of `amount_rp` for rows with `status = 'success'` after applying the active transaction search and non-pagination filters.
- **DEC-024**: Revenue summary must ignore the current page slice. It must summarize the full filtered dataset, not only the current page.
- **DEC-025**: If transaction filters produce no successful rows, revenue summary is `0`.
- **REQ-056**: `/admin/userlogs` must provide at least one read-only admin-visible history surface for linked assignment snapshots when a transaction row has a related `subscription_id`.
- **REQ-057**: This history surface must not require navigating away from `/admin/userlogs`.
- **DEC-026**: The default M8 history surface should use `Dialog` so it stays aligned with existing admin detail surfaces and preserves current table context, but an equivalent inline or sheet-based detail surface is acceptable if it remains read-only and context-preserving.

### 3.7 Deleted-Asset History Rules
- This milestone has one non-obvious but mandatory rule from source docs: `/admin/userlogs` must provide an admin-visible read path for linked historical assignment data, and historical assets that have already been hard-deleted must still remain readable from assignment snapshots. The following requirements make that rule implementable without ambiguity while staying inside current milestone scope.

- **REQ-060**: The M8 linked-history read path on `/admin/userlogs` must use `public.asset_assignments` as its source of truth for historical linked asset data, not `public.assets`.
- **REQ-061**: Historical assignment snapshots must remain readable even when `asset_assignments.asset_id` is null. `asset_deleted_at` is optional metadata and must not be treated as the only validity signal for historical snapshot readability.
- **REQ-062**: The historical display must use snapshot columns from `asset_assignments`, including at least `original_asset_id`, `access_key`, `asset_platform`, `asset_type`, `asset_note`, `asset_expires_at`, `assigned_at`, `revoked_at`, `revoke_reason`, and nullable `asset_deleted_at` when available.
- **REQ-063**: The historical display must not require a join to `public.assets` for snapshot fields that already exist on `public.asset_assignments`.
- **REQ-064**: If multiple replacement assignments existed for the same subscription over time, the historical read path must be able to show all relevant assignment rows for that subscription rather than only the latest row.
- **DEC-027**: Assignment-history ordering, when shown, is `assigned_at desc`, then `id desc`.
- **SEC-004**: Historical assignment display must not expose raw `account`, `proxy`, or `asset_json`, even if current asset rows still exist.
- **DEC-028**: If a transaction is linked to a subscription but no assignment rows exist, the M8 history surface must show an explicit empty state instead of implying data loss.

### 3.8 Technical and Module Placement Constraints
- **CON-001**: Use Next.js App Router conventions only.
- **CON-002**: Keep `src/app/**` thin. `page.tsx` must only resolve search params, call the canonical query layer, and render route-local UI.
- **CON-003**: The canonical admin read-model boundary for this feature must live under `src/modules/admin/userlogs/**`.
- **CON-004**: Read-only filter parsing belongs in `src/modules/admin/userlogs/schemas.ts`.
- **CON-005**: Read-model types belong in `src/modules/admin/userlogs/types.ts`.
- **CON-006**: `src/modules/admin/userlogs/queries.ts` is the required admin read-model boundary. A dedicated `src/modules/admin/userlogs/repositories.ts` file is optional and should exist only when these reads are truly admin-specific and cannot be cleanly composed from existing domain repositories.
- **CON-007**: If client refetch is needed, thin admin read actions belong in `src/modules/admin/userlogs/actions.ts` and must delegate to `queries.ts`.
- **CON-008**: Core data rules already expressed in existing domain modules and migrations must not be reimplemented differently under `src/modules/admin/userlogs/**`.
- **CON-009**: This milestone is read-only. Table-toolbar filters should follow the repo's current route-local state-hook plus URL-sync plus Zod parser pattern. `react-hook-form` is only required if M8 introduces a true submitted form beyond the toolbar filter controls.
- **CON-010**: React Query may be used for client read state, following the same pattern already used in admin pages such as `/admin/assets` and `/admin/users`.
- **CON-011**: Do not introduce HeroUI.
- **CON-012**: Do not create a new internal `/api/*` endpoint for this page.
- **CON-013**: Prefer current baseline tables and views before introducing new database objects.
- **CON-014**: Do not leave duplicate row-shape logic for login logs, extension tracks, or transaction history in both `src/modules/admin/users/*` and `src/modules/admin/userlogs/*` if the shapes become the same feature concern. Shared parsing or repository helpers should be extracted to one canonical server-only location.

### 3.9 UI and Interaction Guidelines
- **GUD-004**: Visual language should follow the existing `/admin/assets` page first: compact toolbar, understated metric cards, bordered card container, sticky table header, and concise operational copy.
- **GUD-005**: The three tabs should live inside one primary content card or equivalent cohesive admin layout, not three disconnected pages.
- **GUD-006**: Each tab toolbar should prioritize clear filtering over decoration.
- **GUD-007**: Transactions tab summary must use token-safe colors and existing card primitives, not custom marketing gradients or raw color values.
- **GUD-008**: Any optional dialog or sheet used by M8 must include an accessible title, even if the visual heading is hidden.
- **GUD-009**: Tables and detail views must remain usable on mobile and desktop without horizontal-scroll-only workflows becoming the primary interaction path.
- **GUD-010**: Timestamp-heavy cells should use the same `id-ID` date-time presentation pattern already used by current admin detail surfaces so M8 does not visually diverge from existing admin history sections.
- **GUD-011**: Avatar fallback tone should reuse `getAvatarToneClass()` from `src/lib/avatar.ts` plus stored username initials, consistent with the current admin baseline.

### 3.10 File Placement Patterns
- **PAT-001**: `src/app/(admin)/admin/userlogs/page.tsx` must remain route composition only.
- **PAT-002**: Route-local UI may live in `src/app/(admin)/admin/userlogs/_components/**`.
- **PAT-003**: The route-local component tree should follow the existing admin-page pattern with explicit naming, for example:
  - `userlogs-page.tsx`
  - `userlogs-page-types.ts`
  - `userlogs-query.ts`
  - `use-userlogs-state.ts`
  - `login-history-table/*`
  - `extension-track-table/*`
  - `transactions-table/*`
  - `transaction-detail-dialog/*`
- **PAT-004**: `src/modules/admin/userlogs/queries.ts` is the canonical server-side read orchestration boundary for this feature.
- **PAT-004A**: If `src/app/(admin)/admin/userlogs/_components/userlogs-query.ts` exists, it is only a route-local client fetch and query-key wrapper around server actions. It must not become the server-side source of truth.
- **PAT-005**: `src/modules/admin/userlogs/actions.ts` may expose only thin read wrappers for client refetch and detail loading. It must not become a business-logic layer.
- **PAT-006**: If code from `src/modules/admin/users/repositories.ts` is reused, reuse must happen through extraction of canonical shared helpers, not by coupling route-local UI directly to another page's query module.
- **PAT-007**: Shared presentational UI reused across admin pages stays under `src/components/**` and must not import server-only repositories.

## 4. Interfaces & Data Contracts

### 4.1 Route Contract
| Route | Type | Contract |
| --- | --- | --- |
| `/admin/userlogs` | Admin page | Displays the tabbed read-only observability page for login history, extension activity, and transaction history. |

### 4.2 Route State and Filter Contracts
| Name | Fields | Notes |
| --- | --- | --- |
| `AdminUserLogsActiveTab` | `'login' | 'extension' | 'transactions'` | URL-selected top-level tab. Invalid values normalize to `login`. |
| `AdminLoginHistoryFilters` | `search`, `os`, `dateFrom`, `dateTo`, `page`, `pageSize` | `dateFrom` and `dateTo` use `yyyy-MM-dd`. |
| `AdminExtensionTrackFilters` | `search`, `browser`, `os`, `dateFrom`, `dateTo`, `page`, `pageSize` | `dateFrom` and `dateTo` apply to `lastSeenAt`. |
| `AdminTransactionsFilters` | `search`, `source`, `status`, `dateFrom`, `dateTo`, `page`, `pageSize` | `source` accepts `payment_dummy`, `cdkey`, `admin_manual`. `status` accepts `pending`, `success`, `failed`, `canceled`. |
| `AdminUserLogsRouteState` | `tab`, `login`, `extension`, `transactions` | Parsed nested route-state object derived from namespaced search params. User-oriented narrowing for login and extension is handled through `search`, not a separate user-id filter param. |

### 4.3 Login History Contracts
| Name | Fields | Notes |
| --- | --- | --- |
| `AdminLoginHistoryRowUser` | nullable `userId`, nullable `username`, `email`, nullable `avatarUrl`, nullable `publicId`, `isResolved` | `isResolved = false` when the row cannot resolve to a profile. |
| `AdminLoginHistoryRow` | `loginLogId`, `user`, `ipAddress`, nullable `browser`, nullable `os`, `loginTime`, `isSuccess`, nullable `failureReason` | `isSuccess` and `failureReason` are available to the UI even if not shown as default visible columns. |
| `AdminLoginHistoryPage` | `items`, `page`, `pageSize`, `totalCount` | Canonical paginated result. |

### 4.4 Extension Track Contracts
| Name | Fields | Notes |
| --- | --- | --- |
| `AdminExtensionTrackRowUser` | `userId`, `username`, `email`, nullable `avatarUrl`, `publicId` | Extension rows are expected to resolve to a real user. |
| `AdminExtensionTrackRow` | `extensionTrackId`, `user`, `ipAddress`, nullable `city`, nullable `country`, nullable `browser`, nullable `os`, `extensionVersion`, `deviceId`, `extensionId`, `firstSeenAt`, `lastSeenAt` | One row per `extension_tracks` row. |
| `AdminExtensionTrackPage` | `items`, `page`, `pageSize`, `totalCount`, `availableBrowsers`, `availableOsValues` | Distinct filter-option lists may be returned with the page payload. |

### 4.5 Transactions Contracts
| Name | Fields | Notes |
| --- | --- | --- |
| `AdminTransactionRowUser` | `userId`, `username`, `email`, nullable `avatarUrl`, `publicId` | Resolved from profile join. |
| `AdminTransactionRow` | `transactionId`, nullable `subscriptionId`, `user`, `packageId`, `packageName`, `source`, `status`, `amountRp`, `createdAt`, `updatedAt`, nullable `paidAt` | `subscriptionId` may be present for detail resolution even if not shown in the table. |
| `AdminTransactionRevenueSummary` | `successCount`, `successAmountRp` | Summary over filtered non-pagination dataset. |
| `AdminTransactionsPage` | `items`, `page`, `pageSize`, `totalCount`, `revenueSummary` | Canonical transactions-tab payload. |

### 4.6 Transaction Detail and Assignment Snapshot Contracts
| Name | Fields | Notes |
| --- | --- | --- |
| `AdminAssignmentSnapshotRow` | `assignmentId`, `subscriptionId`, nullable `assetId`, `originalAssetId`, `accessKey`, `platform`, `assetType`, nullable `assetNote`, `assetExpiresAt`, `assignedAt`, nullable `revokedAt`, nullable `revokeReason`, nullable `assetDeletedAt` | Must come from `public.asset_assignments` snapshot fields. |
| `AdminTransactionDetail` | `transactionId`, nullable `subscriptionId`, `user`, `packageName`, `source`, `status`, `amountRp`, `createdAt`, `updatedAt`, nullable `paidAt`, `assignmentHistory` | Read-only detail payload for the required M8 linked-history surface. |

### 4.7 Query and Parser Contracts
| Query or parser | Input | Output | Notes |
| --- | --- | --- | --- |
| `parseAdminUserLogsSearchParams` | route `searchParams` | `AdminUserLogsRouteState` | Canonical nested parser for selected tab and namespaced filters. |
| `getAdminLoginHistoryPage` | `AdminLoginHistoryFilters` | `AdminLoginHistoryPage` | Canonical login-history query. |
| `getAdminExtensionTrackPage` | `AdminExtensionTrackFilters` | `AdminExtensionTrackPage` | Canonical extension-track query. |
| `getAdminTransactionsPage` | `AdminTransactionsFilters` | `AdminTransactionsPage` | Canonical transactions query including revenue summary. |
| `getAdminTransactionDetail` | `{ transactionId: string }` | `AdminTransactionDetail` | Canonical detail query for the required M8 linked-history surface on `/admin/userlogs`. |

## 5. Acceptance Criteria
- **AC-001**: Given an authenticated admin user, when `/admin/userlogs` is opened, then the route renders without runtime error and denies non-admin access.
- **AC-002**: Given `/admin/userlogs` is opened without a `tab` query parameter, when the page loads, then `Login History` is the default tab.
- **AC-003**: Given the login-history tab is active, when the admin narrows rows through user-oriented search plus OS or date-range filters, then the dataset changes consistently and remains ordered by newest login first.
- **AC-004**: Given a new login event occurs after Milestone 1 is implemented, when the admin refreshes the login-history tab, then the new event appears from `login_logs`.
- **AC-005**: Given a login-history row has no resolvable profile, when the row is rendered, then the row still shows a readable fallback identity using raw email instead of disappearing.
- **AC-006**: Given the extension-track tab is active, when the admin narrows rows through user-oriented search plus browser, OS, or date-range filters, then the dataset changes consistently and remains ordered by newest `lastSeenAt` first.
- **AC-007**: Given seed extension-track data exists, when the admin opens `Extension Track`, then rows display all required minimum columns including city, country, device ID, and extension ID.
- **AC-008**: Given the transactions tab is active, when the admin filters by date range, source, status, or search, then both the row set and revenue summary update consistently.
- **AC-009**: Given filtered transactions contain no successful rows, when the transactions tab renders, then revenue summary is `0` and no stale value from previous filters remains.
- **AC-010**: Given a transaction row is opened in the M8 history surface with a linked subscription, when historical assignment rows exist, then the detail surface shows assignment snapshots sourced from `asset_assignments`.
- **AC-011**: Given an asset used by a historical assignment has already been hard-deleted, when the related history is opened from `/admin/userlogs`, then the historical assignment remains readable from snapshot fields without requiring a live `assets` row.
- **AC-012**: Given a transaction has no linked subscription or no assignment history, when its M8 history surface is opened, then the UI shows an explicit empty state without error.
- **AC-013**: Given the admin switches between tabs, when they return to a previous tab, then that tab's search, filters, page, and page size remain preserved by URL state.
- **AC-014**: Given the admin changes visible columns for one tab, when the page reloads in the same browser, then the column visibility for that tab persists without affecting other tabs.
- **AC-015**: Given the route is used on mobile and desktop, when tables and detail surfaces are opened, then the page remains readable and operable without broken layout or inaccessible controls.

## 6. Test Automation Strategy
- **Test Levels**: Unit, integration, and browser-verification-assisted end-to-end.
- **Frameworks**: Use the repo test stack already configured by the project. Do not introduce a separate browser test file only to satisfy this milestone gate.
- **Unit Focus**: Search-param parsing, namespaced tab-state normalization, reversed-date handling, unresolved login-row mapping, revenue-summary calculation, and transaction-detail snapshot mapping.
- **Integration Focus**: Admin read actions, per-tab query composition, login-log joins, extension-track distinct filter values, transaction summary aggregation, and linked-history snapshot retrieval for the required M8 history surface.
- **Browser Verification**: Use `agent-browser` on the real `/admin/userlogs` route to verify tabs, filters, pagination, column persistence, revenue summary, and the required linked-history behavior that M8 ships on this route.
- **Repo Quality Gates**: `pnpm lint`, `pnpm check`, `pnpm test`, browser verification for impacted flows, and no relevant Next.js runtime or compilation errors.
- **Backend Verification**: Use read-only `npx @insforge/cli` commands against the runtime database to verify `login_logs`, `extension_tracks`, `transactions`, `v_transaction_list`, and `asset_assignments` snapshot behavior. Do not use insert or update helpers as verification shortcuts.

## 7. Rationale & Context
- The route already exists as a placeholder, and the admin shell already links to it. Milestone 8 must convert that placeholder into a real page instead of inventing a new observability route.
- Milestone 7 already introduced recent login, extension, and transaction histories inside the user-detail dialog. Milestone 8 therefore must expand those capabilities into full-table admin observability without leaving duplicate or contradictory row contracts.
- `public.login_logs`, `public.extension_tracks`, `public.transactions`, `public.v_transaction_list`, and `public.asset_assignments` already provide the data needed for this milestone. No new schema is required by default.
- The deleted-asset-history rule is easy to miss because the main tables for Milestone 8 do not include asset columns. This specification closes that gap by making the M8 linked-asset history read path explicit and tying it to `asset_assignments` snapshot columns.
- Namespaced search params are required because three independent tables share one route. Without namespacing, switching tabs would clobber unrelated state or create ambiguous URLs.
- Revenue summary is defined over the filtered non-pagination dataset because page-local revenue would be operationally misleading and would not satisfy the intended admin read model.

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: InsForge runtime database - stores `login_logs`, `extension_tracks`, `transactions`, `subscriptions`, and `asset_assignments`.
- **EXT-002**: Existing admin auth/session system - provides the admin identity required to access `/admin/*`.

### Third-Party Services
- **SVC-001**: No additional third-party service is required for Milestone 8.

### Infrastructure Dependencies
- **INF-001**: Next.js App Router runtime with server components and server actions.
- **INF-002**: Shared admin `next-safe-action` setup through the repo's existing `adminActionClient` pattern.

### Data Dependencies
- **DAT-001**: `public.login_logs` for login history.
- **DAT-002**: `public.extension_tracks` for extension activity.
- **DAT-003**: `public.transactions` and `public.v_transaction_list` for transactions tab data and summary consistency.
- **DAT-004**: `public.asset_assignments` for historical assignment snapshots linked through `subscription_id`.
- **DAT-005**: `public.profiles` for user display metadata and fallback-avatar inputs.

### Technology Platform Dependencies
- **PLT-001**: Next.js App Router and Server Actions.
- **PLT-002**: `zod` for canonical search-param parsing and any validated form contract. `react-hook-form` remains available if M8 introduces a true submitted form beyond the toolbar filter controls.
- **PLT-003**: `@tanstack/react-query` and `@tanstack/react-table` for admin read-state and table behavior, consistent with existing admin pages.
- **PLT-004**: TailwindCSS and repo-approved UI primitives under `src/components/ui/**`.

### Compliance Dependencies
- **COM-001**: Admin browser flows must not expose privileged credentials client-side.
- **COM-002**: Historical deleted-asset display must not leak sensitive asset internals while remaining readable from snapshots.

## 9. Examples & Edge Cases
```json
{
  "loginHistoryUnresolvedRow": {
    "loginLogId": "0f9b2a24-1b6a-41cb-9856-f6b6359c0b84",
    "user": {
      "userId": null,
      "username": null,
      "email": "unknown@example.com",
      "avatarUrl": null,
      "publicId": null,
      "isResolved": false
    },
    "ipAddress": "203.0.113.10",
    "browser": null,
    "os": null,
    "loginTime": "2026-04-19T08:00:00Z",
    "isSuccess": false,
    "failureReason": "email_not_found"
  },
  "extensionTrackRow": {
    "extensionTrackId": "7eecdd5f-cd30-4eb3-95b0-7ef66f6e5f6b",
    "user": {
      "userId": "91000000-0000-4000-8000-000000000001",
      "username": "seed-admin-browser",
      "email": "seed.admin.browser@assetnext.dev",
      "avatarUrl": null,
      "publicId": "ADM-BRW-01"
    },
    "ipAddress": "198.51.100.20",
    "city": "Bandung",
    "country": "ID",
    "browser": "Chrome",
    "os": "Windows",
    "extensionVersion": "1.0.0",
    "deviceId": "device-a",
    "extensionId": "chrome-extension-example",
    "firstSeenAt": "2026-04-18T10:00:00Z",
    "lastSeenAt": "2026-04-19T10:00:00Z"
  },
  "transactionSummaryExample": {
    "filters": {
      "source": "payment_dummy",
      "status": null,
      "dateFrom": "2026-04-01",
      "dateTo": "2026-04-30"
    },
    "revenueSummary": {
      "successCount": 3,
      "successAmountRp": 450000
    }
  },
  "deletedAssetAssignmentSnapshot": {
    "assignmentId": "5ff2af69-7517-49f8-bd5e-64693f7757fd",
    "subscriptionId": "8f842d07-80b2-4227-a8fe-2c85d4654f2a",
    "assetId": null,
    "originalAssetId": "23694952-9861-4aac-8078-5b85472b2c81",
    "accessKey": "tradingview:private",
    "platform": "tradingview",
    "assetType": "private",
    "assetNote": "legacy deleted asset",
    "assetExpiresAt": "2026-05-01T00:00:00Z",
    "assignedAt": "2026-04-01T00:00:00Z",
    "revokedAt": "2026-04-10T00:00:00Z",
    "revokeReason": "asset_deleted",
    "assetDeletedAt": null
  }
}
```

Edge cases that implementation must handle:
- Login-history rows with `user_id = null`.
- Login-history rows whose profile was removed from the accessible join path.
- Extension-track rows with null city, country, browser, or OS.
- Extension-track filter options that differ from hardcoded browser names.
- Transactions with `subscription_id = null`.
- Transactions filtered to zero successful rows while still having non-success rows on the page.
- Transactions whose linked historical assets were hard-deleted and now have `asset_id = null` on assignment history rows.
- Repeated replacement assignments for the same subscription over time.
- Reversed date ranges in search params.
- Tab switching while preserving each tab's independent state.

## 10. Validation Criteria
- The implementation must satisfy all Milestone 8 browser checklist items from `docs/IMPLEMENTATION_PLAN.md`.
- Browser verification must prove the real `/admin/userlogs` route works, not a mock page or dev-only shortcut.
- Browser verification must prove the selected tab, filters, pagination, and column visibility persist correctly.
- Backend verification for login history must prove reads come from `public.login_logs`.
- Backend verification for extension activity must prove reads come from `public.extension_tracks` and preserve the uniqueness rule `user_id + device_id + ip_address + extension_id`.
- Backend verification for transactions must prove list rows remain consistent with `public.transactions` and `public.v_transaction_list` for the same filter window.
- Backend verification for deleted-asset history must prove a transaction-linked subscription can still surface assignment snapshot data from `public.asset_assignments` when the related `public.assets` row is gone.
- Route structure, module placement, and imports must follow `docs/agent-rules/folder-structure.md`.
- UI structure and visual language must follow `docs/agent-rules/ui-ux-rules.md`.
- The spec is invalid if implementation requires a new internal public REST endpoint, browser-side privileged credentials, or live-asset joins as the sole source of historical deleted-asset data.

## 11. Related Specifications / Further Reading
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PRD.md`
- `docs/DB.md`
- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`
- `docs/works/m7-user-management-spec.md`
- `migrations/010_profiles_and_auth_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/021_rls_policies.sql`
- `migrations/024_views.sql`
- `migrations/030_rpc.sql`
