---
title: Milestone 4 Admin Subscriptions Implementation Specification
version: 1.0
date_created: 2026-04-16
last_updated: 2026-04-16
owner: AssetProject
tags: [process, admin, subscriptions, nextjs, insforge, milestone-4]
---

# Introduction
This specification defines the implementation contract for Milestone 4 Admin Subscriptions. It is written for AI coding agents and maintainers that must deliver the `/admin/subscriber` milestone without inventing behavior that conflicts with `docs/PRD.md`, `docs/DB.md`, `docs/IMPLEMENTATION_PLAN.md`, the baseline SQL migrations, or the implementation patterns already established by Milestone 3 Admin Asset.

Milestone 4 is complete only when an admin can create, edit, extend, replace, partially fulfill, quick-add private asset inventory, and cancel subscriptions from the real `/admin/subscriber` browser route while keeping `subscriptions`, `transactions`, and `asset_assignments` consistent with the exact-entitlement rules and one-running-subscription invariant.

## 1. Purpose & Scope

### 1.1 Purpose
The purpose of this specification is to provide a machine-readable contract for Milestone 4 Admin Subscriptions so implementation can be executed consistently across the admin table UI, add or edit dialog, candidate-asset resolution, quick-add asset flow, admin-manual activation write path, cancellation behavior, and backend verification.

### 1.2 In Scope
- Route `/admin/subscriber`.
- Admin-only access control for subscriber management.
- Subscriber table with search, filter, pagination, and persisted column visibility.
- One add or edit subscriber dialog opened from the route.
- Member user picker for manual activation.
- Active-package picker for manual activation.
- Positive integer duration override on top of package default duration.
- Candidate asset lookup grouped by exact `access_key` entitlement.
- Manual asset override for one or more entitlements.
- Automatic fallback fulfillment for entitlements that are not manually overridden.
- Quick Add Asset flow inside the subscriber dialog for creating a new `private` asset and immediately using it as an override candidate.
- Admin-manual activation that produces a consistent `transactions` row and `subscriptions` outcome.
- Cancellation of a running subscription from the admin route.
- Browser verification on the live route.
- Read-only backend verification against the runtime database.

### 1.3 Out of Scope
- CD-Key issuance UI and redeem flow.
- Member `/console` flow and `/paymentdummy` flow.
- User-management screens under `/admin/users`.
- User activity screens under `/admin/userlogs`.
- Admin dashboard home statistics.
- New public REST endpoints for internal admin UI.
- New baseline database schema unless implementation discovers a concrete blocker that cannot be solved with the existing tables, views, functions, and app-layer services.
- Final cron or recovery proof matrix owned by later milestones, except for the invariants this milestone must already preserve at mutation time.

### 1.4 Assumptions
- Milestones 0 through 3 are already available in the repo and runtime environment.
- Baseline migrations from `migrations/001_extensions.sql` through `migrations/030_rpc.sql` are applied to the runtime database.
- The runtime database contains member, admin, package, asset, subscription, and transaction seed data required for browser and CLI verification.
- The implementation follows `docs/agent-rules/folder-structure.md`.
- The implementation should keep code structure and route-local UI patterns consistent with the shipped Milestone 3 assets feature under `src/app/(admin)/admin/assets/**` unless there is a concrete Milestone 4-specific reason to diverge.
- The implementation should reuse the current repo admin-table stack, shared UI primitives, shared table helpers, shared filters, and `next-safe-action` setup instead of introducing a new admin UI stack.

## 2. Definitions
| Term                                 | Definition                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subscriber row                       | One admin-table row representing one member plus the subscription snapshot selected for display.                                                                                                                                                  |
| Selected subscription                | For one member row, the running subscription if one exists; otherwise the latest historical subscription by `created_at desc`.                                                                                                                    |
| Running subscription                 | A subscription row with `status in ('active', 'processed')` and `end_at > now()`.                                                                                                                                                                 |
| Manual activation                    | Admin-triggered subscription activation with `transactions.source = 'admin_manual'`.                                                                                                                                                              |
| Exact entitlement                    | One exact `access_key` string in `platform:asset_type` format, for example `tradingview:private`.                                                                                                                                                 |
| Candidate asset group                | A list of valid asset candidates for one exact `access_key` in the selected package.                                                                                                                                                              |
| Manual asset override                | A dialog selection that binds a specific asset ID to one exact entitlement before fallback fulfillment runs.                                                                                                                                      |
| Fallback fulfillment                 | Automatic best-asset assignment for any selected package entitlement that does not receive a manual override.                                                                                                                                     |
| Quick Add Asset                      | Dialog sub-flow that creates exactly one new `private` asset from minimal inputs, then immediately rehydrates candidate data so the new asset can be used as a manual override.                                                                   |
| `durationDays`                       | Positive integer entered in the subscriber dialog. For subscription activation it defines the number of days added to the activation window. For quick add asset it is a UI-only input that is transformed to `expiresAt = now() + durationDays`. |
| Total spent                          | Sum of all `transactions.amount_rp` where `transactions.status = 'success'` for the row user, across all sources.                                                                                                                                 |
| Historical subscription immutability | App-layer rule that past subscription rows are not rewritten for a new activation except for system-owned status updates on the row being intentionally extended or intentionally closed.                                                         |
| Local implementation decision        | A deterministic behavior added by this specification because the source docs do not define that detail. Such decisions must not contradict the source docs.                                                                                       |

## 3. Requirements, Constraints & Guidelines

### 3.1 Source of Truth
- **REQ-001**: Business rules must follow `docs/PRD.md`.
- **REQ-002**: Database shape, constraints, views, and function behavior must follow `docs/DB.md` and the baseline migrations.
- **REQ-003**: Milestone scope and definition of done must follow Milestone 4 in `docs/IMPLEMENTATION_PLAN.md`.
- **REQ-004**: File placement and import boundaries must follow `docs/agent-rules/folder-structure.md`.
- **REQ-005**: The Milestone 4 route and UI structure must stay visually and structurally aligned with the Milestone 3 assets implementation unless a Milestone 4 requirement explicitly needs a different composition.

### 3.2 Route, Access, and Security Rules
- **REQ-010**: The admin subscriptions feature must live at `/admin/subscriber`.
- **REQ-011**: The route must be accessible only to admin users.
- **REQ-012**: Guest and member users must be denied access to the subscriber admin route.
- **REQ-013**: Add New and Edit Subscriber must open from the `/admin/subscriber` route as modal or dialog flows.
- **REQ-014**: The admin browser must never use database credentials, service credentials, or `project_admin` credentials directly on the client.
- **DEC-011**: Browser-triggered admin subscription reads use `next-safe-action` through the admin action client. The initial Server Component page load may call server-only query functions directly after the admin page guard passes, matching the Milestone 3 assets pattern.
- **REQ-016**: All admin subscription mutations must execute on the server.
- **REQ-017**: The implementation must not add a new public REST endpoint for internal web UI subscription management.
- **REQ-018**: Page-level access must be guarded by `requireAdminShellAccess()` or the canonical admin shell guard already used by the repo.
- **REQ-019**: Browser-callable admin read and write actions must enforce admin access at the action boundary before reading or mutating subscription, transaction, assignment, package, or asset data.
- **SEC-001**: Repository code used by admin subscription flows must run only after the current app admin session guard passes and must use the repo-approved server-only InsForge database adapter.
- **SEC-002**: The user picker in the subscriber dialog must return only members, never admins.

### 3.3 Subscriber Table and Read Model Rules
- Source docs define the table columns and high-level filter categories for `/admin/subscriber`, but they do not define the exact row-shape, search-param serialization, or ordering contract. The following `DEC-*` items are local implementation decisions used to make this milestone deterministic without contradicting the source docs.

- **DEC-001**: The subscriber table dataset returns at most one row per member user.
- **DEC-002**: For one member user, the row shows the running subscription if one exists; otherwise it shows the latest historical subscription by `created_at desc`.
- **DEC-003**: Users with no subscription history are not required to appear in the table; they must remain reachable through the Add New subscriber dialog user picker.
- **REQ-020**: The table implementation must stay consistent with the chosen row-shape decision across search, filter, pagination, edit bootstrap, and reload behavior.
- **REQ-023**: The minimum table columns are `user`, `subscription status`, `start date`, `expires at`, `total spent (Rp)`, `package name`, and `actions`.
- **GUD-008**: The `actions` column should remain visible and should not be hideable when reusing the Milestone 3 column-visibility pattern.
- **REQ-024**: If the table renders user identity, the UI must display `avatar + username + email` and follow the global admin user-display rule.
- **REQ-025**: Search must be case-insensitive and clearable.
- **REQ-026**: Search must match member `user_id`, `username`, and `email`.
- **REQ-027**: The table must support filter by `assetType`.
- **DEC-004**: The `assetType` filter means: include rows whose selected subscription `access_keys_json` contains at least one exact entitlement ending with `:private` or `:share` for the chosen filter value.
- **REQ-029**: The `assetType` filter must not use package summary `private/share/mixed` as a proxy for entitlement authorization.
- **REQ-030**: The table must support filter by selected subscription status.
- **REQ-031**: The status filter must support `active`, `processed`, `expired`, and `canceled`.
- **REQ-032**: The table must support an expiry date-range filter.
- **DEC-005**: The date-range filter targets the selected subscription `end_at` value because the visible table column is `expires at`.
- **DEC-006**: The date-range filter serializes in search params as `expiresFrom` and `expiresTo` using `yyyy-MM-dd` values, consistent with the existing Milestone 3 admin-table pattern.
- **DEC-007**: `expiresFrom` is inclusive from `00:00:00.000Z` on that UTC day, `expiresTo` is inclusive through `23:59:59.999Z` on that UTC day, one-sided ranges are allowed, and reversed ranges return a clear validation error in the canonical query contract while route-level parsing recovers safely without crashing the page.
- **REQ-036**: The table must support persisted column visibility preferences.
- **REQ-037**: The table must support server-side pagination.
- **DEC-008**: The table uses stable server-side ordering with running subscriptions first, then selected subscription `updated_at desc`, then `user_id desc`.
- **REQ-039**: `total spent (Rp)` must be computed as the sum of all successful transactions for the row user across `payment_dummy`, `cdkey`, and `admin_manual` sources.
- **REQ-040**: The main table payload must not include raw `account`, `proxy`, or `asset_json` from asset rows.

### 3.4 Add or Edit Dialog and Candidate Asset Rules
- **REQ-050**: The subscriber dialog must support both `create` and `edit` modes.
- **REQ-051**: In create mode, the dialog must require selection of a member user.
- **REQ-052**: In edit mode, the dialog must load the selected row user and selected subscription context from the server, not from client-only table state.
- **REQ-053**: The package picker for admin-manual activation must show only active packages.
- **REQ-054**: The dialog must display the selected package name, price, default duration, `is_extended`, and exact entitlement list in a form that is readable before submit.
- **REQ-055**: `durationDays` must default to the selected package `duration_days` and may be overridden with a positive integer.
- **REQ-056**: The dialog must not expose a manual input for subscription status.
- **REQ-057**: Candidate assets must be grouped by exact entitlement `access_key` from the selected package, not by package summary and not by asset type alone.
- **REQ-058**: Candidate assets for one entitlement must match the exact tuple represented by that `access_key`.
- **REQ-059**: Candidate assets must only include inventory rows that are currently valid for assignment: `disabled_at is null` and `expires_at >= now()`.
- **REQ-060**: Candidate assets for a `private` entitlement must exclude any asset that currently has an active non-revoked assignment, except the current active assignment already attached to the same user and same running subscription context being edited.
- **REQ-061**: Candidate assets for a `share` entitlement must exclude assets that would violate the rule that one user may have at most one active `share` assignment per platform.
- **REQ-062**: If the selected running subscription already has a valid active assignment for a specific entitlement and the dialog still targets the same entitlement snapshot, that existing asset may appear as the current selection even though it is already in active use by the same user.
- **REQ-063**: A manual override may set zero or one asset per entitlement `access_key`.
- **REQ-064**: Entitlements without a manual override must remain eligible for fallback automatic fulfillment when the admin saves the dialog.
- **REQ-065**: Final validation of every manual override must still happen on the server; the browser must not be trusted to enforce exact tuple matching or share/private usage rules.
- **REQ-066**: The user picker search in the dialog must be case-insensitive and must support lookup by `user_id`, `username`, and `email`.
- **REQ-067**: Quick Add Asset must create only `private` assets.
- **REQ-068**: Quick Add Asset must collect exactly these minimum semantic inputs: `platform`, `account`, `durationDays`, `note`, `proxy`, and `assetJsonText`.
- **REQ-069**: Quick Add Asset must internally transform `durationDays` into `expiresAt = now() + durationDays` and then delegate to the canonical asset-domain create service instead of duplicating asset-write logic.
- **REQ-070**: Quick Add Asset must derive `access_key = platform:private` from its inputs and must reject the request when that access key is not part of the currently selected package entitlements.
- **REQ-071**: Quick Add Asset must be unavailable or must fail with a clear error when the currently selected package has no matching `private` entitlement for the chosen platform.
- **REQ-072**: After Quick Add Asset succeeds, the candidate-asset read model must refresh and the newly created asset must be auto-bound to the current dialog draft for its matching `access_key` so the admin does not need to select it again before saving the subscriber dialog. In this specification, that draft binding is the local implementation meaning of the source-doc phrase `langsung di-assign` inside an unsaved add or edit flow.

### 3.5 Admin-Manual Activation Rules
- The baseline DB exposes assignment validation and status recalculation primitives, but it does not expose a dedicated cancel-or-replace subscription function and it does not enforce transaction-to-subscription consistency by itself. The shared app-layer activation service is therefore responsible for atomicity, snapshot protection, and cross-table consistency in this milestone.

- **REQ-080**: Every admin-manual save must use one shared activation service in `src/modules/subscriptions/services.ts` or an equivalent canonical subscriptions domain service that will also be reused by later payment-dummy and CD-Key milestones.
- **REQ-081**: `src/modules/admin/subscriptions/**` must never duplicate activation business logic; it may only validate admin read inputs, build read models, and delegate writes to the domain layer.
- **REQ-082**: A successful admin-manual activation must create exactly one `transactions` row with `source = 'admin_manual'`.
- **REQ-083**: The successful `admin_manual` transaction row must have `status = 'success'` and a non-null `paid_at`, consistent with the baseline DB constraint for successful transactions.
- **REQ-084**: The successful `admin_manual` transaction amount must snapshot the selected package `amount_rp`; duration override must not change transaction amount in this milestone.
- **REQ-085**: The app-layer activation service must keep `transactions.user_id`, `transactions.subscription_id`, `transactions.package_id`, `transactions.package_name`, and the affected subscription snapshot mutually consistent, because the baseline DB does not enforce that cross-table consistency on its own.
- **REQ-086**: If no running subscription exists for the user, the activation service must create a new subscription row with `source = 'admin_manual'`, `start_at = now()`, and `end_at = now() + durationDays`.
- **REQ-087**: If a running subscription exists and the selected package is the same package ID and `is_extended = true`, the activation service must extend the same subscription row instead of creating a second running row.
- **DEC-012**: Source docs require same-row extension for the same package, but they do not define whether subscription snapshot fields should refresh from the current package master. This specification chooses snapshot immutability for the reused subscription row.
- **REQ-088**: For the same-row extension case, the app-layer activation service must keep the existing subscription `start_at`, `package_id`, `package_name`, `access_keys_json`, and `source` unchanged; only `end_at`, derived status, and system-owned timestamps may change on that existing row.
- **DEC-013**: For the same-row extension case, the linked admin-manual transaction should remain consistent with the affected subscription snapshot for `package_id` and `package_name` so the reused subscription row and its extension event do not diverge semantically.
- **REQ-089**: For the same-row extension case, the new admin-manual transaction must still persist the successful extension event and its amount snapshot while remaining consistent with the affected subscription row.
- **REQ-090**: For the same-row extension case, still-valid active assignments for the same entitlement snapshot must not be revoked solely because the admin extended the period.
- **REQ-091**: If a running subscription exists, the selected package is different, and the selected package `is_extended = true`, the activation service must close the current running subscription so it is no longer running, revoke its active assignments, then create a new subscription row with `source = 'admin_manual'`, `start_at = now()`, and `end_at = max(old.end_at, now()) + durationDays`.
- **REQ-092**: If a running subscription exists and the selected package `is_extended = false`, the activation service must close the current running subscription so it is no longer running, revoke its active assignments, then create a new subscription row with `source = 'admin_manual'`, `start_at = now()`, and `end_at = now() + durationDays`.
- **DEC-009**: Source docs define that replacement must `tutup subscription lama` but do not define the exact persisted terminal status of the replaced row. This specification chooses `canceled` as the replacement-closure state so the row becomes non-running immediately without pretending it naturally expired.
- **GUD-006**: If the implementation writes `cancel_reason` for explicit admin cancellation or replacement closure, use stable app-defined values, but do not rely on a DB-level non-empty or enum constraint because the baseline schema treats `cancel_reason` as plain text.
- **REQ-094**: Historical subscription rows must not be mutated into a different package snapshot; replacement must create a new row instead, and app-layer services must enforce this because the baseline DB does not freeze those snapshot fields.
- **REQ-095**: The subscription row `access_keys_json` must always be a snapshot of the entitlements actually granted by the affected subscription contract.
- **REQ-096**: `subscriptions.access_keys_json` and `asset_assignments.access_key` must only contain exact access keys allowed by the selected subscription snapshot.
- **REQ-097**: Manual overrides must be inserted only for exact access keys that belong to the final subscription snapshot.
- **REQ-098**: After manual overrides are applied, fallback automatic fulfillment must attempt to satisfy all remaining entitlements using exact tuple matching.
- **REQ-099**: The final subscription status must be derived by the system as `active` when all entitlements are satisfied and `processed` when one or more entitlements remain unfulfilled.
- **REQ-100**: The admin must never input `active`, `processed`, `expired`, or `canceled` manually.
- **REQ-101**: The one-running-subscription invariant must hold after every activation attempt.
- **REQ-102**: The one-active-share-per-platform-per-user invariant must hold after every activation attempt.
- **REQ-103**: Package summary `private/share/mixed` must never be used as the authorization key for assignment; exact `access_key` matching is mandatory.
- **REQ-104**: Disabled packages must remain visible in historical table rows but must be rejected for new admin-manual activation attempts.
- **DEC-010**: Source docs do not define Edit Subscriber behavior for a row whose selected subscription is not running. This specification chooses the following local implementation decision: opening Edit from such a row starts a new activation flow prefilled with the selected user while leaving historical rows unchanged.
- **REQ-106**: The activation write path must be atomic. If one step fails, the system must not leave a partially persisted success transaction, a second running subscription row, or partially written manual override state.

### 3.6 Cancellation and History Rules
- **REQ-110**: Cancel subscription must be available only for a currently running subscription.
- **REQ-111**: Cancel subscription must set `subscriptions.status = 'canceled'`.
- **REQ-112**: Cancel subscription must revoke all active assignments for that subscription immediately.
- **REQ-113**: Cancel subscription must not create a new transaction row in this milestone.
- **REQ-114**: Canceling a subscription must not delete subscription history, transaction history, or assignment snapshots.
- **REQ-115**: Total spent must remain the lifetime successful-transaction sum after cancellation.

### 3.7 Technical Constraints
- **CON-001**: Use Next.js App Router conventions only.
- **CON-002**: Keep `src/app/**` thin; route files must only compose UI, session guards, redirects, and route-local components.
- **CON-003**: Put core subscription write logic in `src/modules/subscriptions/**`.
- **CON-004**: Put admin subscriber read-model logic in `src/modules/admin/subscriptions/**`.
- **CON-005**: Reuse the existing repo admin-table stack already used by Milestone 3 assets, including `@tanstack/react-query` for client read state and `@tanstack/react-table` for table rendering.
- **CON-006**: Reuse existing UI primitives before adding new primitives.
- **CON-007**: Do not introduce HeroUI.
- **CON-008**: Forms in this milestone must use `react-hook-form` and `zod`.
- **CON-009**: Do not put subscription activation business logic in route files or client components.
- **CON-010**: Do not add a separate browser test file only to satisfy the milestone gate.
- **CON-011**: Prefer the current baseline tables, views, triggers, and SQL functions before introducing a new migration.

### 3.8 Guidelines
- **GUD-001**: Mirror the Milestone 3 assets page composition where practical: one card-wrapped data table, a toolbar with search, filter, view options, and a primary action button.
- **GUD-002**: Reuse the existing shared admin toolbar, search input, date-range filter, filter popover, table, pagination, and column-visibility helpers so `/admin/subscriber` behaves consistently with `/admin/assets`.
- **GUD-003**: Present package entitlements in a human-readable form such as grouped access-key badges so the admin can reason about exact tuple coverage before submit.
- **GUD-004**: Keep candidate asset data concise in the dialog. Candidate rows should favor `id`, `platform`, `assetType`, `note`, `expiresAt`, and usage hints rather than raw sensitive credentials.
- **GUD-005**: Use clear validation copy for invalid duration, disabled package, invalid override asset, share-rule collisions, and quick-add platform mismatch.
- **GUD-007**: Summary cards are optional for Milestone 4. If they are added to mirror M3 page composition, keep their semantics explicit. Prefer current-filter or current-page counts unless a separate server aggregate is intentionally introduced.

### 3.9 File Placement Patterns
- **PAT-001**: `src/app/(admin)/admin/subscriber/page.tsx` must remain route composition only.
- **PAT-002**: Route-local UI may live in `src/app/(admin)/admin/subscriber/_components/**`.
- **PAT-003**: `src/modules/subscriptions/actions.ts`, `services.ts`, `repositories.ts`, `schemas.ts`, and `types.ts` are the canonical domain files for manual activation, cancellation, and write contracts.
- **PAT-004**: `src/modules/admin/subscriptions/actions.ts`, `queries.ts`, `schemas.ts`, and `types.ts` are the canonical admin read-model boundary for the subscriber table, editor bootstrap, user search, and candidate-asset reads.
- **PAT-005**: Quick Add Asset must delegate to canonical asset-domain services under `src/modules/assets/**`; it must not create a parallel asset-write stack under the subscriptions module.
- **PAT-006**: Route-local table state, dialog state, URL search-param state, and React Query transport state must remain in the route-local UI layer, matching the Milestone 3 assets pattern.
- **PAT-007**: The route-local query adapter should live in `src/app/(admin)/admin/subscriber/_components/subscriber-query.ts` and should be transport-only, analogous to Milestone 3 `assets-query.ts`.
- **PAT-008**: The initial `/admin/subscriber` page load may call `src/modules/admin/subscriptions/queries.ts` directly from the Server Component page after `requireAdminShellAccess()` passes, matching Milestone 3.
- **PAT-009**: `subscriber-query.ts` must import browser-callable admin read actions, unwrap successful payloads, and convert validation errors or `{ ok: false, message }` results into thrown `Error` objects for React Query, matching the Milestone 3 `assets-query.ts` transport contract.

## 4. Interfaces & Data Contracts

### 4.1 Route Contract
| Route               | Type       | Contract                                                                                                                                             |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/subscriber` | Admin page | Displays the subscriber table, Add New action, filters, column-visibility options, add or edit dialog, and cancel action for a running subscription. |

### 4.2 Subscriber Table Contracts
| Name                     | Fields                                                                                                                                                                                                         | Notes                                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SubscriberTableFilters` | `search`, `assetType`, `status`, `expiresFrom`, `expiresTo`, `page`, `pageSize`                                                                                                                                | `assetType`, `status`, `expiresFrom`, and `expiresTo` may be `null`. Date values use `yyyy-MM-dd`.                                                                                     |
| `SubscriberAdminRow`     | `userId`, `username`, `email`, nullable `avatarUrl`, `subscriptionId`, `subscriptionStatus`, `startAt`, `expiresAt`, `packageId`, `packageName`, `accessKeys`, `totalSpentRp`, `selectedSubscriptionUpdatedAt` | `subscriptionId` is the selected subscription row for this user under `DEC-001` and `DEC-002`. `accessKeys` is the selected subscription snapshot used for filters and edit bootstrap. |
| `SubscriberTableResult`  | `items`, `page`, `pageSize`, `totalCount`                                                                                                                                                                      | Main paginated table payload.                                                                                                                                                          |

### 4.3 Editor, Picker, and Candidate Contracts
| Name                          | Fields                                                                                                                                                        | Notes                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `SubscriberUserOption`        | `userId`, `username`, `email`, nullable `avatarUrl`, nullable `currentSubscriptionId`, nullable `currentSubscriptionStatus`                                   | Returned by the dialog user picker search. Must contain member users only.                           |
| `SubscriberPackageOption`     | `packageId`, `name`, `amountRp`, `durationDays`, `isExtended`, `accessKeys`, `packageSummary`                                                                 | Returned by the package picker. Must contain active packages only. `packageSummary` is display-only. |
| `SubscriberCurrentAssignment` | `accessKey`, `assetId`, `platform`, `assetType`, nullable `note`, `expiresAt`, `assignmentId`                                                                 | Existing active assignment for the selected subscription context.                                    |
| `SubscriberCandidateAsset`    | `assetId`, `platform`, `assetType`, nullable `note`, `expiresAt`, `status`, `totalUsed`, `isCurrentSelection`                                                 | Concise candidate data for one manual override option.                                               |
| `SubscriberCandidateGroup`    | `accessKey`, `assetType`, `platform`, `currentSelection`, `candidates`, `isFulfilled`, `canQuickAddPrivateAsset`                                              | One group per exact entitlement in the selected package snapshot.                                    |
| `SubscriberEditorData`        | nullable `selectedUser`, nullable `selectedSubscription`, `packageOptions`, nullable `defaultPackageId`, nullable `defaultDurationDays`, `currentAssignments` | Initial dialog bootstrap returned from the server.                                                   |
| `SubscriberActivationDraft`   | `userId`, `packageId`, nullable `subscriptionId`, `packageSnapshot`, `defaultDurationDays`, `candidateGroups`                                                 | Returned whenever the dialog needs current candidate-asset data for the selected user and package.   |

### 4.4 Mutation Input Contracts
| Name                              | Fields                                                                                                                                    | Notes                                                                                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminManualActivationFormValues` | `userId`, `packageId`, `durationDays`, `manualAssignmentsByAccessKey`                                                                     | Browser-facing save payload. `manualAssignmentsByAccessKey` maps one access key to one selected `assetId` or `null`.                                                            |
| `AdminManualActivationInput`      | `userId`, `packageSnapshot`, `durationDays`, `manualAssignmentsByAccessKey`, nullable `existingRunningSubscriptionId`                     | Domain write contract after validation and package lookup.                                                                                                                      |
| `SubscriberQuickAddAssetValues`   | `userId`, `packageId`, nullable `subscriptionId`, `platform`, `account`, `durationDays`, `note`, `proxy`, `assetJsonText`                 | Browser-facing quick-add payload. `assetType` is implicit and fixed to `private`. `durationDays` is converted to `expiresAt` server-side before delegating to the asset domain. |
| `SubscriberQuickAddAssetInput`    | `userId`, `packageId`, nullable `subscriptionId`, `platform`, `assetType = private`, `account`, `note`, `proxy`, `assetJson`, `expiresAt` | Server-normalized quick-add payload delegated to the asset domain layer.                                                                                                        |
| `SubscriberCancelInput`           | `subscriptionId`                                                                                                                          | Cancel action input.                                                                                                                                                            |

### 4.5 Admin Query and Parser Contracts
| Query or parser                    | Input                                                            | Output                                                  | Notes                                                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseSubscriberTableSearchParams` | `searchParams` from the route                                    | `SubscriberTableFilters`                                | Route-level parser in `src/modules/admin/subscriptions/schemas.ts` that normalizes malformed params safely, matching the Milestone 3 pattern. |
| `getSubscriberTablePage`           | `SubscriberTableFilters`                                         | `SubscriberTableResult`                                 | Canonical server-side table query for initial page load and admin read actions.                                                               |
| `getSubscriberEditorData`          | `{ userId?: string, subscriptionId?: string }`                   | `SubscriberEditorData`                                  | Canonical server-side dialog bootstrap query.                                                                                                 |
| `searchSubscriberUsers`            | `{ query: string, page: number, pageSize: number }`              | `{ users: SubscriberUserOption[], totalCount: number }` | Canonical server-side member user-picker query.                                                                                               |
| `getSubscriberActivationDraft`     | `{ userId: string, packageId: string, subscriptionId?: string }` | `SubscriberActivationDraft`                             | Canonical server-side package snapshot and candidate-asset query.                                                                             |

### 4.6 Admin Read Action Contracts
| Action                               | Input                                                            | Output                                                                                                | Notes                                                                           |
| ------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `getSubscriberTablePageAction`       | `SubscriberTableFilters`                                         | `{ ok: true, tablePage: SubscriberTableResult }` or `{ ok: false, message: string }`                  | Canonical browser-callable table read.                                          |
| `getSubscriberEditorDataAction`      | `{ userId?: string, subscriptionId?: string }`                   | `{ ok: true, editorData: SubscriberEditorData }` or `{ ok: false, message: string }`                  | Bootstraps dialog state from the server.                                        |
| `searchSubscriberUsersAction`        | `{ query: string, page: number, pageSize: number }`              | `{ ok: true, users: SubscriberUserOption[], totalCount: number }` or `{ ok: false, message: string }` | Canonical member user picker search.                                            |
| `getSubscriberActivationDraftAction` | `{ userId: string, packageId: string, subscriptionId?: string }` | `{ ok: true, draft: SubscriberActivationDraft }` or `{ ok: false, message: string }`                  | Returns package snapshot and candidate asset groups for the current selections. |

### 4.7 Mutation Server Action Contracts
| Action                               | Input                             | Output                                                                                            | Notes                                                                                          |
| ------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `activateSubscriptionManuallyAction` | `AdminManualActivationFormValues` | `{ ok: true, subscriptionId: string, transactionId: string }` or `{ ok: false, message: string }` | Canonical admin-manual activation action.                                                      |
| `quickAddSubscriberAssetAction`      | `SubscriberQuickAddAssetValues`   | `{ ok: true, assetId: string, accessKey: string }` or `{ ok: false, message: string }`            | Creates one `private` asset through the asset domain and returns the matching entitlement key. |
| `cancelSubscriptionAction`           | `SubscriberCancelInput`           | `{ ok: true, subscriptionId: string }` or `{ ok: false, message: string }`                        | Cancels a running subscription and revokes its assignments.                                    |

These mutation actions are admin-dashboard entrypoints and belong in `src/modules/subscriptions/actions.ts`. They must use the admin action client, validate raw form action input with Zod, delegate business logic to `src/modules/subscriptions/services.ts`, and return only stable identifiers plus a boolean success contract. Route-local UI must refetch admin read models after mutation success.

The initial `/admin/subscriber` page load may call `src/modules/admin/subscriptions/queries.ts` directly from the Server Component page after the admin page guard passes. Browser refreshes, user-picker search, draft refresh, and dialog bootstrap reads should use the admin read actions above via the route-local query adapter.

Client components must not import `src/modules/admin/subscriptions/queries.ts` directly. They must read through the admin read actions and the route-local query adapter.

### 4.8 Derived Semantics Contract
| Computed value            | Rule                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selected subscription row | Under `DEC-001` and `DEC-002`, running subscription if present, else latest historical subscription by `created_at desc`.                                |
| Asset-type filter         | Under `DEC-004`, `selectedSubscription.access_keys_json` contains at least one exact entitlement ending with `:${assetType}`.                            |
| Total spent               | `sum(transactions.amount_rp)` where `transactions.user_id = row.userId` and `transactions.status = 'success'`.                                           |
| Candidate asset validity  | Exact tuple match, valid inventory, and no violation of private/share assignment rules.                                                                  |
| Final subscription status | `active` if every exact entitlement has an active assignment; otherwise `processed`, unless separately moved to `expired` or `canceled` by system rules. |

### 4.9 Example Payloads
```json
{
  "userId": "91000000-0000-4000-8000-000000000008",
  "packageId": "a6f2f5a3-1131-41ef-8d5a-3bfa45c1e321",
  "durationDays": 45,
  "manualAssignmentsByAccessKey": {
    "tradingview:private": "be3c9b61-f6a7-4333-a8f7-f74f85d602fb",
    "fxreplay:share": null
  }
}
```

```json
{
  "userId": "91000000-0000-4000-8000-000000000008",
  "packageId": "a6f2f5a3-1131-41ef-8d5a-3bfa45c1e321",
  "subscriptionId": "92000000-0000-4000-8000-000000000002",
  "platform": "tradingview",
  "account": "tv-admin-manual-quick-001@assetnext.dev",
  "durationDays": 30,
  "note": "m4 quick add private tradingview",
  "proxy": "http://proxy.assetnext.dev/tv-quick-001",
  "assetJsonText": "[{\"name\":\"session\",\"value\":\"cookie-quick-001\"}]"
}
```

```json
{
  "userId": "91000000-0000-4000-8000-000000000008",
  "packageId": "a6f2f5a3-1131-41ef-8d5a-3bfa45c1e321",
  "defaultDurationDays": 30,
  "candidateGroups": [
    {
      "accessKey": "tradingview:private",
      "platform": "tradingview",
      "assetType": "private",
      "isFulfilled": true,
      "canQuickAddPrivateAsset": true,
      "currentSelection": {
        "accessKey": "tradingview:private",
        "assetId": "be3c9b61-f6a7-4333-a8f7-f74f85d602fb",
        "platform": "tradingview",
        "assetType": "private",
        "note": "existing manual asset",
        "expiresAt": "2026-05-16T00:00:00.000Z",
        "assignmentId": "d1fd65cb-fc6a-4c6b-95d5-2f2d4b696842"
      },
      "candidates": [
        {
          "assetId": "be3c9b61-f6a7-4333-a8f7-f74f85d602fb",
          "platform": "tradingview",
          "assetType": "private",
          "note": "existing manual asset",
          "expiresAt": "2026-05-16T00:00:00.000Z",
          "status": "assigned",
          "totalUsed": 1,
          "isCurrentSelection": true
        }
      ]
    }
  ]
}
```

## 5. Acceptance Criteria
- **AC-001**: Given a guest or member opens `/admin/subscriber`, when the page loads, then access is denied and subscriber data is not shown.
- **AC-002**: Given an admin opens `/admin/subscriber`, when the page loads, then the page renders without runtime error and the table is visible.
- **AC-003**: Given an admin searches by username, email, or user ID, when the search is applied, then the result set updates deterministically and remains one row per user.
- **AC-004**: Given an admin filters by asset type, subscription status, or expiry date range, when the filters are applied, then the result set updates according to the selected subscription snapshot shown in the row.
- **AC-005**: Given reversed `expiresFrom` and `expiresTo` values, when the canonical table contract is called directly, then it returns a clear validation error; when malformed search params reach the route, the page recovers safely without crashing.
- **AC-006**: Given an admin opens Add New, when the dialog renders, then it allows member selection, active-package selection, and positive duration override.
- **AC-007**: Given a member with no running subscription and a package whose entitlements can all be fulfilled, when the admin saves the dialog, then exactly one `admin_manual` transaction is created, exactly one running subscription exists for that user, and the resulting status is `active`.
- **AC-008**: Given a member with no running subscription and a package whose entitlements cannot all be fulfilled, when the admin saves the dialog, then exactly one `admin_manual` transaction is created, exactly one running subscription exists for that user, and the resulting status is `processed`.
- **AC-009**: Given the admin selects a manual override asset whose exact tuple matches the target access key, when the dialog is saved, then the request succeeds and the resulting assignment uses that exact access key.
- **AC-010**: Given the admin selects a manual override asset whose exact tuple does not match the target access key, when the dialog is saved, then the server rejects the request and no invalid assignment is persisted.
- **AC-011**: Given the selected package is disabled, when the admin attempts manual activation through a forged or stale payload, then the server rejects the request and no new transaction or running subscription is created.
- **AC-012**: Given Quick Add Asset is used for a package that contains a matching private entitlement, when the quick-add form is submitted, then exactly one new `private` asset row is created, the candidate draft refreshes, and the new asset becomes the draft-bound override for its matching access key without requiring manual reselection.
- **AC-013**: Given Quick Add Asset is used for a platform whose computed `platform:private` access key is not part of the selected package, when the form is submitted, then the server rejects the request and persists no new asset row.
- **AC-014**: Given the selected package is the same package and `is_extended = true`, when the admin saves the dialog, then the same subscription row is extended, no second running subscription is created, and the original subscription snapshot fields remain unchanged.
- **AC-015**: Given the selected package differs and `is_extended = true`, when the admin saves the dialog, then the current running subscription is closed as `canceled`, a new running subscription begins at `now()`, and its `end_at` includes the carry-over base of `max(old.end_at, now()) + durationDays`.
- **AC-016**: Given a running subscription exists and the selected package `is_extended = false`, when the admin saves the dialog, then the old running subscription is closed as `canceled`, a new running subscription begins at `now()`, and no remaining period from the old subscription is carried forward.
- **AC-017**: Given the same user receives multiple successful admin-manual activations over time, when the table reloads, then `total spent (Rp)` equals the lifetime sum of successful transactions for that user.
- **AC-018**: Given a running subscription is canceled from the admin route, when the action completes, then the row status becomes `canceled`, active assignments for that subscription are revoked, and no new transaction row is created.
- **AC-019**: Given a share entitlement is already satisfied by an active share assignment on the same platform for the same user, when the admin tries to add another active share assignment for that platform, then the server rejects the request or the candidate list prevents the choice and no duplicate active share assignment is persisted.
- **AC-020**: Given runtime data is inspected with read-only InsForge CLI, when `subscriptions`, `transactions`, and `asset_assignments` are queried for the affected user, then the UI outcome and database invariants match.
- **AC-021**: Given a save request fails validation or persistence, when the action returns an error, then the system leaves no partial success transaction, no second running subscription, and no partially written invalid assignments.
- **AC-022**: Given the page is reloaded after any successful activation or cancellation, when the route loads again, then the shown `start date`, `expires at`, `package name`, `status`, and `total spent (Rp)` remain consistent.

## 6. Test Automation Strategy
- **Test Levels**: unit, integration, and browser verification.
- **Unit Focus**: filter validation, row-selection rules, exact-entitlement override validation, quick-add normalization from `durationDays` to `expiresAt`, and activation-rule branching for same-package extension versus replacement.
- **Integration Focus**: admin read-model queries, user picker search, candidate-asset grouping, quick-add asset delegation to the asset domain, activation service atomicity, and cancellation side effects.
- **Browser Verification**: manual browser flow on `/admin/subscriber` using `agent-browser` CLI through the `agent-browser` skill, including desktop and mobile viewport checks, light and dark readability, keyboard access and focus states in dialogs and table controls, first-error focus after failed submit, accessible labels for icon-only actions, and meaningful empty states.
- **Test Data Management**: use the runtime seed admin account, seed packages, seed assets, and deterministic test notes or account values. Do not rely on manual database edits during the flow under test.
- **CI/CD Integration**: at minimum run `pnpm lint`, `pnpm build`, and `pnpm check` after implementation; run `pnpm markdown:check` when Markdown docs under `docs/*` change.
- **Coverage Requirements**: automated coverage should exist where the repo supports it for table-filter validation, user-search contract, candidate-asset grouping, quick-add asset normalization, same-row extension immutability, replacement-path cancellation, no-double-running-subscription enforcement, share-rule enforcement, and cancellation side effects.
- **Performance Testing**: the subscriber table and dialog candidate lookups must stay paginated or scoped; they must not load the full users, subscriptions, packages, or assets dataset into the browser.
- **Negative Path Coverage**: include guest access, member access, reversed date range, disabled package selection, invalid override asset ID, quick-add access-key mismatch, and atomic rollback on failed activation.
- **Runtime Health Verification**: relevant Next.js runtime and compilation diagnostics for `/admin/subscriber` should be checked through Next.js DevTools MCP after `next-devtools_init` and must show no Milestone 4-related runtime or compilation error.

## 7. Rationale & Context
Milestone 4 is the first feature that must orchestrate package snapshots, subscription lifecycle rules, exact-entitlement fulfillment, and admin-driven overrides in one browser flow. The spec therefore makes the write path explicit instead of leaving it implied across PRD fragments.

This specification adopts one row per member with a selected subscription snapshot as a local implementation decision because the source docs do not define the exact row-shape for `/admin/subscriber`. The chosen projection keeps the admin surface operational, avoids duplicate rows from history, and still allows canceled or expired users to stay visible. Users with no history remain reachable through the add dialog, so the table does not need to become a full user-management screen.

Quick Add Asset is defined as a `private`-only helper because the milestone backlog explicitly fixes the resulting asset type to `private` while the database schema stores `expires_at`, not `duration_days`. This specification closes that gap by defining `durationDays` as a UI-only value that must be converted to `expiresAt` before delegating to the existing asset domain. It also clarifies that `langsung di-assign` inside an unsaved dialog means the new asset is immediately bound to the active draft and does not require reselection before the final subscriber save.

Same-package extension is the most ambiguity-prone case because PRD requires reusing the same subscription row while the database also stores immutable package and entitlement snapshots. This specification resolves that by treating snapshot immutability as an app-layer responsibility, keeping the existing subscription snapshot immutable, and recording the new admin-manual event in a fresh transaction row. For replacement paths, this specification chooses `canceled` as the closure state because the row is intentionally terminated early and should stop being running immediately.

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: InsForge Auth - required for admin session identity and role-based access control.
- **EXT-002**: InsForge Database - required for package, asset, subscription, transaction, assignment, and profile storage.

### Infrastructure Dependencies
- **INF-001**: Runtime database with `auth.users` and applied baseline migrations `001_extensions.sql` through `030_rpc.sql`.
- **INF-002**: Browser-verifiable seed data that includes admin login fixtures, member fixtures, active packages, and assignable assets.
- **INF-003**: Next.js App Router runtime with the `(admin)` route group already available.

### Data Dependencies
- **DAT-001**: `public.packages` for package selection, price, duration, `is_extended`, and exact entitlement snapshots.
- **DAT-002**: `public.subscriptions` for current and historical subscription lifecycle rows.
- **DAT-003**: `public.transactions` for admin-manual activation audit and `total spent` aggregation.
- **DAT-004**: `public.asset_assignments` for current assignments, entitlement satisfaction, and history snapshots.
- **DAT-005**: `public.assets` for manual override candidates and quick-add asset creation.
- **DAT-006**: `public.profiles` for member user identity, role filtering, and admin-table user rendering.
- **DAT-007**: `public.v_current_subscriptions` where useful for running-subscription lookup.
- **DAT-008**: `public.v_current_asset_access` where useful for active-access projections.
- **DAT-009**: `public.validate_asset_assignment()` and `public.apply_subscription_status(...)` as the baseline DB enforcement points for assignment validity and derived subscription status.
- **DAT-010**: `public.recheck_subscription_after_asset_change(...)` and `public.delete_asset_safely(...)` remain important downstream dependencies even though Milestone 4 does not own the full recovery proof matrix.

### Technology Platform Dependencies
- **PLT-001**: Next.js App Router.
- **PLT-002**: `next-safe-action` and the repo admin action client.
- **PLT-003**: `react-hook-form` for dialog forms.
- **PLT-004**: `zod` for input validation.
- **PLT-005**: Existing Tailwind and UI primitives from `src/components/ui/**`.
- **PLT-006**: Existing shared table, toolbar, filter, local-storage, and query-provider helpers already used by Milestone 3 assets.
- **PLT-007**: `TanStack React Query` for client read state and `TanStack React Table` for table rendering.

### Compliance Dependencies
- **COM-001**: `/admin/*` routes must remain admin-only.
- **COM-002**: Internal web UI must not open new public REST endpoints outside the allowed extension and trusted-cron scope.

## 9. Examples & Edge Cases
```json
{
  "edgeCases": [
    {
      "name": "same-package-extension-keeps-snapshot",
      "given": {
        "runningSubscription": {
          "packageId": "pkg-starter",
          "source": "payment_dummy",
          "accessKeys": ["tradingview:private"],
          "startAt": "2026-04-01T00:00:00.000Z",
          "endAt": "2026-04-30T00:00:00.000Z"
        },
        "selectedPackage": {
          "packageId": "pkg-starter",
          "amountRp": 150000,
          "durationDays": 30,
          "isExtended": true,
          "accessKeys": ["tradingview:private"]
        }
      },
      "then": {
        "sameSubscriptionRow": true,
        "subscriptionSnapshotChanges": false,
        "newTransactionCreated": true,
        "transactionSource": "admin_manual"
      }
    },
    {
      "name": "replacement-different-package-with-carry-over",
      "given": {
        "runningSubscription": {
          "packageId": "pkg-starter",
          "endAt": "2026-05-10T00:00:00.000Z"
        },
        "selectedPackage": {
          "packageId": "pkg-pro",
          "durationDays": 30,
          "isExtended": true
        }
      },
      "then": {
        "oldSubscriptionStatus": "canceled",
        "newSubscriptionStartAt": "now()",
        "newSubscriptionEndAt": "max(old.endAt, now()) + 30 days"
      }
    },
    {
      "name": "quick-add-private-mismatch",
      "given": {
        "selectedPackageAccessKeys": ["fxreplay:share"],
        "quickAddPlatform": "tradingview"
      },
      "then": {
        "computedAccessKey": "tradingview:private",
        "requestRejected": true,
        "assetPersisted": false
      }
    }
  ]
}
```

## 10. Validation Criteria
- The `/admin/subscriber` route exists, is guarded, and renders without runtime error.
- The table returns one row per member and never allows two running subscriptions for the same user.
- Search, filters, pagination, and column persistence behave deterministically and survive reloads.
- Candidate assets and manual overrides are validated against exact `access_key` tuples.
- Quick Add Asset always creates `private` assets and always normalizes `durationDays` into `expiresAt` before asset creation.
- Every successful admin-manual activation produces one success transaction linked to the final subscription row.
- Same-package `is_extended = true` extensions reuse the same subscription row without rewriting immutable subscription snapshot fields.
- Replacement paths close the old running subscription as `canceled`, revoke old assignments, and create a new running subscription row with the correct `end_at` formula.
- Canceling a running subscription revokes assignments immediately and preserves history.
- App-layer services, not baseline DB constraints alone, enforce snapshot immutability, transaction-to-subscription consistency, and activation atomicity for this milestone.
- Read-only InsForge CLI verification shows the UI state and database state are consistent for the affected user.

## 11. Related Specifications / Further Reading
- `docs/works/m3-admin-asset-spec.md`
- `docs/PRD.md`
- `docs/DB.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`
- `migrations/010_profiles_and_auth_tables.sql`
- `migrations/011_catalog_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/020_admin_access_helpers.sql`
- `migrations/021_rls_policies.sql`
- `migrations/022_subscription_engine.sql`
- `migrations/023_triggers.sql`
- `migrations/024_views.sql`
- `migrations/030_rpc.sql`
