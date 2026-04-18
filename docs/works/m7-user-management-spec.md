---
title: Milestone 7 User Management Implementation Specification
version: 1.0
date_created: 2026-04-17
last_updated: 2026-04-17
owner: AssetProject
tags: [process, admin, users, auth, nextjs, insforge, milestone-7]
---

# Introduction
This specification defines the implementation contract for Milestone 7 User Management. It is written for AI coding agents and maintainers that must deliver `/admin/users` without inventing behavior that conflicts with `docs/PRD.md`, `docs/DB.md`, `docs/IMPLEMENTATION_PLAN.md`, `migrations/*.sql`, `docs/agent-rules/folder-structure.md`, or `docs/agent-rules/ui-ux-rules.md`.

Milestone 7 is complete only when an admin can create loginable users, inspect user details, edit allowed profile fields, update avatar URL, ban or unban accounts, and reset passwords from the real `/admin/users` route while keeping `auth.users`, `public.profiles`, session-based admin access, and user history read models consistent.

## 1. Purpose & Scope

### 1.1 Purpose
The purpose of this specification is to provide a machine-readable contract for Milestone 7 User Management so implementation can be executed consistently across the admin table UI, create-user write path, profile editing rules, avatar editing, ban or unban behavior, password reset behavior, user detail reads, and backend verification.

### 1.2 In Scope
- Route `/admin/users`.
- Admin-only access control for user management.
- User table with search, filter, pagination, and persisted column visibility.
- Create-user flow from admin UI.
- Role selection during create-user flow.
- Automatic username generation from email local-part with unique suffix when needed.
- Automatic `public_id` generation.
- Edit basic profile fields that are safe for this milestone.
- Edit avatar URL from the detail dialog.
- Ban or unban action.
- Admin password reset action that changes the real auth credential.
- User detail dialog with active subscription, active asset access, transaction history, login history, and extension history.
- Browser verification on the live route.
- Read-only backend verification against the runtime database.

### 1.3 Out of Scope
- Self-service profile editing outside `/admin/users`.
- Email-change flow for existing users.
- Role-change flow for existing users.
- Delete-user flow.
- Bulk import, bulk edit, or bulk ban actions.
- Avatar upload or storage-bucket integration.
- Full observability screens under `/admin/userlogs` owned by Milestone 8.
- New public REST endpoints for internal admin UI.
- New baseline database schema unless implementation finds a concrete blocker that cannot be solved with the current tables, views, triggers, policies, and app-layer services.

### 1.4 Assumptions
- Milestones 0 through 4 are already available in the repo and runtime environment.
- Milestones 5 and 6 may still be in progress. Milestone 7 user-management flows must not depend on CD-Key redeem or payment-dummy implementation being merged, but must render those transaction sources correctly when such data already exists.
- Baseline migrations from `migrations/001_extensions.sql` through `migrations/030_rpc.sql` are applied to the runtime database, plus `migrations/045_auth_admin_helpers.sql` for the trusted auth-admin create, lookup, password-update, and compensation helpers used by Milestone 7.
- The runtime database contains at least one admin account that can access `/admin/*`.
- The implementation follows `docs/agent-rules/folder-structure.md`.
- The implementation should keep route-local admin UI composition aligned first with `src/app/(admin)/admin/assets/*` as the admin visual baseline, and use current subscriber patterns only as secondary evidence for table interaction behavior.
- The implementation should reuse the repo admin table stack, shared UI primitives, shared table helpers, and `next-safe-action` setup instead of introducing a new admin UI stack.

## 2. Definitions
| Term | Definition |
| --- | --- |
| User row | One table row representing one `public.profiles` row plus derived current-subscription fields. |
| Current subscription | The running subscription from `public.v_current_subscriptions` for one user if it exists. |
| Historical latest subscription | The latest historical `public.subscriptions` row selected by business timeline order `end_at desc`, then `start_at desc`, then `created_at desc`, then `id desc` when no running subscription exists. |
| Active package summary | Derived label `private`, `share`, `mixed`, or `none` based on the current running subscription access snapshot. |
| Safe profile edit | This milestone's allowed profile edits: `username` and `avatar_url`. Email, role, and `public_id` are read-only after creation. |
| Trusted auth admin path | Server-only InsForge auth-admin capability used to create auth users and update passwords. It must never execute in the browser. |
| Loginable user | A user that has both a valid `auth.users` record with credential data and a matching `public.profiles` row that the app can resolve during login. |
| Fallback avatar | A UI avatar rendered from username initials with a deterministic background style when `avatar_url` is null. |

## 3. Requirements, Constraints & Guidelines

### 3.1 Source of Truth
- **REQ-001**: Business rules must follow `docs/PRD.md`.
- **REQ-002**: Database shape, constraints, views, and trigger behavior must follow `docs/DB.md` and `migrations/*.sql`.
- **REQ-003**: Milestone scope and definition of done must follow Milestone 7 in `docs/IMPLEMENTATION_PLAN.md`.
- **REQ-004**: File placement and import boundaries must follow `docs/agent-rules/folder-structure.md`.
- **REQ-005**: UI composition, table behavior, and dialog quality must follow `docs/agent-rules/ui-ux-rules.md`.

### 3.2 Route, Access, and Security Rules
- **REQ-010**: The user-management feature must live at `/admin/users`.
- **REQ-011**: The route must be accessible only to admin users.
- **REQ-012**: Guest and member users must be denied access to the route.
- **REQ-013**: Page-level access must be guarded by `requireAdminShellAccess()` or the canonical admin shell guard already used by the repo.
- **REQ-014**: The admin browser must never use database credentials, service credentials, or `project_admin` credentials directly on the client.
- **REQ-015**: All admin user-management mutations must execute on the server.
- **REQ-016**: The implementation must not add a new public REST endpoint for internal web UI user management.
- **REQ-017**: Browser-callable read and write actions must enforce admin access at the action boundary before reading or mutating user data.
- **SEC-001**: Any flow that creates auth users or changes auth passwords must use a trusted server-only auth-admin capability and must never run in a client component.
- **SEC-002**: The app must treat `public.profiles.is_banned` as the stored application-level banned flag for login and admin-management decisions. `public.is_app_admin()` is only an admin-privilege helper and must not be treated as the general banned-user check for member login or session flows.
- **SEC-003**: The `/admin/users` table and detail payload must not expose sensitive asset internals such as raw `asset_json`, full account credentials, or password hashes.

### 3.3 User Table and Read Model Rules
- Source docs define the table columns and high-level filters, but they do not define the exact row-shape, ordering contract, or how users without subscriptions appear. The following `DEC-*` items are local implementation decisions that close those gaps without contradicting source docs.

- **DEC-001**: The user table dataset returns exactly one row per `public.profiles` row.
- **DEC-002**: Each row includes derived subscription fields from the current running subscription if one exists; otherwise it includes the historical latest subscription by business timeline order `end_at desc`, then `start_at desc`, then `created_at desc`, then `id desc`; otherwise those derived fields are null.
- **REQ-020**: The minimum table columns are `ID`, `user`, `public ID`, `role`, `subscription status`, `expires at`, `created at`, `updated at`, and `actions`.
- **REQ-021**: If the table renders user identity, the UI must display `avatar + username + email` and follow the global admin user-display rule.
- **REQ-022**: Search must be case-insensitive and clearable.
- **REQ-023**: Search must match `user_id`, `email`, `username`, and `public_id`.
- **REQ-024**: The table must support filter by role with values `admin` and `member`.
- **REQ-025**: The table must support filter by subscription status.
- **DEC-003**: The subscription-status filter supports `active`, `processed`, `expired`, and `canceled`. Users without subscription history remain discoverable through the base table dataset and the `packageSummary = none` filter.
- **REQ-026**: The table must support filter by active package summary with values `private`, `share`, `mixed`, and `none`.
- **DEC-004**: Active package summary is derived from the current running subscription only. Users without a running subscription always map to `none`, even if they have historical subscriptions.
- **REQ-027**: The table must support persisted column visibility preferences.
- **REQ-027A**: Column visibility preferences for `/admin/users` must be persisted in browser `localStorage` using a stable page-specific storage key.
- **REQ-028**: The table must support server-side pagination.
- **DEC-005**: Stable server-side ordering is `updated_at desc`, then `created_at desc`, then `user_id desc`.
- **REQ-029**: The `expires at` column shows the current running subscription `end_at` when a running subscription exists, otherwise the selected historical latest subscription `end_at`, otherwise null.
- **REQ-030**: Table payloads must not include raw asset credentials, raw extension metadata payloads, or auth-provider secret fields.
- **REQ-031**: Row actions must include `Edit`, `Ban/Unban`, `Change Password`, and `View Details`.
- **DEC-014**: `Edit` and `View Details` may share one route-local detail surface as long as `Edit` opens the profile-editable state directly and `View Details` opens the read-oriented overview state directly.
- **GUD-001**: The `actions` column should remain visible and should not be hideable.

### 3.4 Create User Rules
- **REQ-040**: Create-user UI must collect `email`, `password`, `confirmPassword`, and `role`.
- **REQ-040A**: Create-user schemas, server actions, and write contracts must validate `role` as exactly one of `admin` or `member`.
- **REQ-041**: Password validation must follow Milestone 1 auth rules with a minimum length of 6 characters.
- **REQ-042**: All password inputs in the create-user flow must support show or hide.
- **REQ-043**: The create-user flow must create a real auth account in `auth.users` through a trusted auth-admin path, then create the matching `public.profiles` row.
- **REQ-044**: The created user must be loginable immediately after successful admin creation.
- **DEC-006**: Because the PRD does not define an email-verification step for admin-created accounts, the trusted auth-admin path must provision the user in a state that allows immediate password login.
- **REQ-045**: The created `public.profiles.email` must match the auth user email used in `auth.users`.
- **REQ-046**: The app must generate `username` automatically from the email local-part.
- **DEC-007**: Username generation derives from the email local-part using this deterministic normalization contract: lowercase the local-part, replace each run of non-`[a-z0-9]` characters with `-`, collapse repeated separators, trim leading and trailing `-`, and fall back to `user` if the result is empty.
- **DEC-008**: If the derived username is already used, the app retries with a deterministic suffix until a unique username is found.
- **REQ-047**: The app must generate `public_id` automatically and store it in `public.profiles.public_id`.
- **DEC-009**: Generated `public_id` must be unique, stable after creation, and readable in admin workflows. The generator must retry on collision.
- **DEC-009A**: This specification does not impose a production `public_id` string format beyond uniqueness and readability. Seed-only formats in migration fixtures are non-normative examples for development data and must not be treated as the required runtime format for Milestone 7.
- **REQ-048**: The create-user flow must return a clear error when email is already used by an existing auth or profile record.
- **REQ-049**: The create-user flow must not silently create an auth user without the matching profile row, and must not silently create a profile row without the matching auth user.
- **REQ-050**: If auth-user creation succeeds but profile creation fails, the server flow must perform compensation so the system does not leave an orphan auth account.
- **REQ-051**: The create-user flow must not auto-login the newly created user in the admin browser session.

### 3.5 Profile Edit and Avatar Rules
- **REQ-060**: The route must support editing safe profile fields from the user detail dialog.
- **DEC-010**: Safe profile fields in this milestone are limited to `username` and `avatar_url`.
- **REQ-061**: Existing-user email is read-only in Milestone 7.
- **REQ-062**: Existing-user role is read-only in Milestone 7.
- **REQ-063**: Existing-user `public_id` is read-only in Milestone 7.
- **REQ-064**: Updated usernames must remain unique across `public.profiles.username`.
- **REQ-064A**: Updated usernames must be trimmed, non-empty, and validated with the same application-level validity rules used for generated usernames before persistence.
- **REQ-065**: Avatar editing in this milestone uses a direct URL string stored in `public.profiles.avatar_url`.
- **DEC-011**: File upload, image transformation, and storage-bucket workflows are out of scope for Milestone 7.
- **REQ-065A**: The read-only treatment of existing-user `email`, `role`, and `public_id` must be enforced in the server action or domain-layer update contract by an explicit allowlist. The implementation must not assume the current RLS or trigger set enforces these field restrictions for admin updates.
- **REQ-066**: If `avatar_url` is null or blank, user displays must render a fallback avatar using username initials.
- **REQ-066A**: Fallback avatar initials must derive from the normalized stored username.
- **REQ-067**: Fallback avatar background styling must be deterministic per user and remain visually consistent after reload.
- **GUD-002**: Deterministic fallback avatar styling should derive from `user_id` and map to an existing token-safe style palette already used by the repo rather than new hardcoded brand colors.

### 3.6 Ban, Unban, and Password Reset Rules
- **REQ-070**: Ban or unban actions must update `public.profiles.is_banned` and may update `ban_reason` only if the implementation includes an optional reason field.
- **DEC-012**: `ban_reason` input is optional and is not required for milestone acceptance. It may remain null.
- **REQ-071**: Banning a user must not delete history, delete subscriptions, or mutate unrelated transaction or assignment history.
- **REQ-072**: Unbanning a user must restore login eligibility through the existing auth flow without creating a new auth identity.
- **REQ-073**: The UI must block self-ban attempts with a clear error before submit reaches the database.
- **REQ-074**: Self-ban prevention is an application and server-action invariant for Milestone 7. The implementation must not rely on the current database policies or triggers to reject self-ban automatically.
- **REQ-075**: Ban and unban actions must preserve the same `auth.users.id` and `public.profiles.user_id` identity.
- **REQ-076**: Change Password must update the target user's real auth credential in the auth layer, not just application-local state.
- **REQ-077**: Change Password must target the existing auth user record for that profile and must not create a duplicate auth account.
- **REQ-078**: Change Password form must collect `newPassword` and `confirmPassword` and validate them server-side with the same minimum-length rule as login/register/reset flows.
- **REQ-079**: All password inputs in Change Password must support show or hide.
- **REQ-080**: Password reset by admin must not revoke or mutate history rows such as `transactions`, `subscriptions`, `login_logs`, or `extension_tracks`.
- **REQ-081**: The UI must show a clear success result after password reset so the admin can proceed to browser verification with the target user.

### 3.7 User Detail Read Model Rules
- **REQ-090**: `View Details` must open a dialog from `/admin/users`, matching the current admin detail-surface baseline used by the assets page.
- **REQ-091**: The detail view must display profile summary including `user_id`, `public_id`, `email`, `username`, `role`, `created_at`, `updated_at`, and banned state.
- **REQ-092**: The detail view must display the current running subscription if one exists.
- **REQ-093**: If no running subscription exists, the detail view must show an explicit empty state for active subscription.
- **REQ-094**: The detail view must display active asset access using only currently valid access rows.
- **REQ-095**: Active asset access in the detail view must be read from `public.v_current_asset_access` or an equivalent server query with the same validity rules.
- **REQ-095A**: Any table or detail field that shows active package summary must derive that summary from `public.subscriptions.access_keys_json` on the running subscription row, or an equivalent helper/query, because `public.v_current_subscriptions` does not expose enough data by itself.
- **REQ-095B**: Browser-visible user-management payloads must never expose `proxy`, even when sourcing data from `public.v_current_asset_access`. Queries that use that view must project only the allowed columns for this milestone.
- **REQ-096**: The detail view must display transaction history.
- **REQ-097**: Transaction history in the detail view must read from `public.v_transaction_list` or an equivalent server query with the same join semantics.
- **REQ-097A**: Transaction history in the detail view must be able to show `payment_dummy`, `cdkey`, and `admin_manual` sources when such rows exist for the user.
- **REQ-098**: The detail view must display login history from `public.login_logs`.
- **REQ-099**: The detail view must display extension history from `public.extension_tracks`.
- **DEC-013**: Because Milestone 8 owns the full observability screens, Milestone 7 detail history sections may show the latest 10 rows per dataset by default instead of full dashboard-level filters.
- **REQ-100**: History datasets in the detail view must be ordered descending by the most relevant timestamp: `transactions.created_at`, `login_logs.created_at`, and `extension_tracks.last_seen_at`.
- **REQ-101**: The detail view must not expose raw asset JSON, account credential values, password material, or internal auth metadata that is not needed for Milestone 7.
- **REQ-102**: The detail view must remain readable for users with no subscription, no asset access, or empty histories.

### 3.8 Technical Constraints
- **CON-001**: Use Next.js App Router conventions only.
- **CON-002**: Keep `src/app/**` thin; route files must only compose UI, session guards, redirects, and route-local components.
- **CON-003**: Core auth-admin and profile write logic must live in domain modules, not in route files or client components.
- **CON-004**: Put admin read-model logic for `/admin/users` in `src/modules/admin/users/**`.
- **CON-005**: Put cross-route identity and access logic in canonical domain modules such as `src/modules/users/**`, `src/modules/auth/**`, or `src/modules/sessions/**` instead of duplicating it under `src/modules/admin/users/**`.
- **CON-006**: Forms in this milestone must use `react-hook-form` and `zod`.
- **CON-007**: Browser-side read state may use `@tanstack/react-query`; feature mutations must use server actions via `next-safe-action`.
- **CON-008**: Reuse existing UI primitives before adding new primitives.
- **CON-009**: Do not introduce HeroUI.
- **CON-010**: Prefer current baseline tables, views, and policies before introducing a new migration.
- **CON-011**: Do not add a dedicated browser test file only to satisfy the milestone gate.

### 3.9 UI and UX Guidelines
- **GUD-003**: `/admin/users` should visually align first with `src/app/(admin)/admin/assets/*` as the admin visual baseline: inset content area, compact toolbar, token-based cards, sticky table header, clean operational copy, and consistent footer pagination treatment.
- **GUD-004**: Search, filters, view-column control, pagination, and the primary create-user action should live in a compact toolbar above the table.
- **GUD-005**: The detail view should prioritize operational clarity over decoration and should separate profile summary, active access, and history sections clearly.
- **GUD-006**: Empty states must explain the condition and next logical action, for example no active subscription, no active assets, or no extension history.
- **GUD-007**: All UI styling must use semantic tokens from `src/app/globals.css` and must remain readable in light and dark modes.
- **GUD-008**: Use one consistent icon family already present in the repo, and do not use emoji as icons.

### 3.10 File Placement Patterns
- **PAT-001**: `src/app/(admin)/admin/users/page.tsx` must remain route composition only.
- **PAT-002**: Route-local UI may live in `src/app/(admin)/admin/users/_components/**`.
- **PAT-003**: `src/modules/admin/users/queries.ts`, `schemas.ts`, and `types.ts` are the canonical admin read-model boundary for the users table, filter parsing, and detail bootstrap.
- **PAT-004**: Browser-callable admin mutations for `/admin/users` may be exposed through `src/modules/admin/users/actions.ts` as thin dashboard-layer actions, or through shared domain action files when the same mutation must be reused outside the admin dashboard.
- **PAT-005**: Core business rules for create-user, safe profile edit, and ban/unban live in `src/modules/users/services.ts` and related repositories. Trusted auth-admin orchestration for auth-user creation and password change lives in `src/modules/auth/**` or a dedicated server-only auth domain module.
- **PAT-005A**: Any `src/modules/admin/users/actions.ts` file must stay thin and delegate to canonical domain services. It must not become the canonical home for core user-management business rules.
- **PAT-005B**: If `src/modules/users/actions.ts` is introduced for shared mutations, it must also remain thin and delegate to canonical domain services rather than duplicating business logic.
- **PAT-005C**: If client-side React Query wrappers are needed, they are optional route-local transport helpers and must not become the canonical query boundary.
- **PAT-006**: Shared UI primitives and presentational pieces reused across admin pages should stay under `src/components/**`; they must not import repositories or server-only code.

## 4. Interfaces & Data Contracts

### 4.1 Route Contract
| Route | Type | Contract |
| --- | --- | --- |
| `/admin/users` | Admin page | Displays the users table, create-user dialog, filters, column visibility controls, pagination, row actions, and user detail dialog. |

### 4.2 Table Filter and Row Contracts
| Name | Fields | Notes |
| --- | --- | --- |
| `AdminUsersTableFilters` | `search`, `role`, `subscriptionStatus`, `packageSummary`, `page`, `pageSize` | `role`, `subscriptionStatus`, and `packageSummary` may be null. `role` accepts only `admin` or `member`. `subscriptionStatus` accepts only DB status values. |
| `AdminUserRow` | `userId`, `email`, `username`, nullable `avatarUrl`, `publicId`, `role`, `isBanned`, nullable `subscriptionId`, nullable `subscriptionStatus`, nullable `subscriptionEndAt`, `activePackageSummary`, `createdAt`, `updatedAt` | One row per profile. `activePackageSummary` is `private`, `share`, `mixed`, or `none`. |
| `AdminUsersTableResult` | `items`, `page`, `pageSize`, `totalCount` | Main paginated table payload. |

### 4.3 Create, Edit, Ban, and Password Contracts
| Name | Fields | Notes |
| --- | --- | --- |
| `AdminCreateUserValues` | `email`, `password`, `confirmPassword`, `role: 'admin' | 'member'` | Browser-facing create-user form values. |
| `AdminCreateUserInput` | `email`, `password`, `role: 'admin' | 'member'`, `generatedUsername`, `generatedPublicId` | Server-normalized create contract after validation and collision resolution. `generatedUsername` follows the normalization contract in `DEC-007`. |
| `AdminEditUserProfileValues` | `userId`, `username`, nullable `avatarUrl` | Safe profile edit only. |
| `AdminToggleUserBanInput` | `userId`, `nextIsBanned`, nullable `banReason` | `nextIsBanned = true` means ban; `false` means unban. |
| `AdminChangeUserPasswordValues` | `userId`, `newPassword`, `confirmPassword` | Browser-facing password form values. |
| `AdminChangeUserPasswordInput` | `userId`, `newPassword` | Server-normalized password reset contract. |

### 4.4 Detail View Contracts
| Name | Fields | Notes |
| --- | --- | --- |
| `AdminUserDetailProfile` | `userId`, `email`, `username`, nullable `avatarUrl`, `publicId`, `role`, `isBanned`, nullable `banReason`, `createdAt`, `updatedAt` | Profile summary payload. |
| `AdminUserDetailSubscription` | nullable `subscriptionId`, nullable `packageId`, nullable `packageName`, nullable `status`, nullable `startAt`, nullable `endAt`, `packageSummary` | Running subscription only. `packageSummary` becomes `none` when no running subscription exists. |
| `AdminUserDetailActiveAsset` | `assetId`, `subscriptionId`, `accessKey`, `platform`, `assetType`, nullable `note`, `expiresAt`, `subscriptionStatus`, `subscriptionEndAt` | Derived from valid active asset access only. |
| `AdminUserDetailTransaction` | `transactionId`, `packageId`, `packageName`, `source`, `status`, `amountRp`, `createdAt`, `updatedAt`, nullable `paidAt` | Sanitized transaction history row. |
| `AdminUserDetailLoginLog` | `loginLogId`, nullable `userId`, `email`, `isSuccess`, nullable `failureReason`, `ipAddress`, nullable `browser`, nullable `os`, `createdAt` | Recent login history row. |
| `AdminUserDetailExtensionTrack` | `extensionTrackId`, `extensionId`, `deviceId`, `extensionVersion`, `ipAddress`, nullable `city`, nullable `country`, nullable `browser`, nullable `os`, `firstSeenAt`, `lastSeenAt` | Recent extension history row. |
| `AdminUserDetailPayload` | `profile`, `currentSubscription`, `activeAssets`, `transactions`, `loginLogs`, `extensionTracks` | Canonical detail bootstrap payload. |

### 4.5 Query and Parser Contracts
| Query or parser | Input | Output | Notes |
| --- | --- | --- | --- |
| `parseAdminUsersTableSearchParams` | `searchParams` from the route | `AdminUsersTableFilters` | Parser lives in `src/modules/admin/users/schemas.ts` and is imported by the route so `page.tsx` stays composition-only. |
| `getAdminUsersTablePage` | `AdminUsersTableFilters` | `AdminUsersTableResult` | Canonical server-side table query for initial page load and admin read actions. |
| `getAdminUserDetail` | `{ userId: string }` | `AdminUserDetailPayload` | Canonical server-side detail bootstrap query. |
| `resolveGeneratedUsername` | `{ email: string }` | `string` | Canonical collision-safe username generator using the normalization contract in `DEC-007`. |
| `resolveGeneratedPublicId` | `{ role: 'admin' \| 'member' }` | `string` | Canonical collision-safe public ID generator. Role input may influence the generated value, but no fixed string format is required by this specification. |

## 5. Acceptance Criteria
- **AC-001**: Given an authenticated admin user, when `/admin/users` is opened, then the route renders without runtime error and denies non-admin access.
- **AC-002**: Given the users table is visible, when the admin searches by `user_id`, `email`, `username`, or `public_id`, then matching rows are returned case-insensitively.
- **AC-003**: Given the users table is visible, when the admin filters by role, subscription status, or active package summary, then the row set changes consistently with the selected filters.
- **AC-004**: Given the admin creates a new member user with valid inputs, when the form succeeds, then a new loginable auth account and matching profile row exist and the row appears in `/admin/users` after reload.
- **AC-005**: Given the admin creates a user whose email local-part collides with an existing username, when the form succeeds, then the stored username is unique and derived from the email with a deterministic suffix.
- **AC-006**: Given the admin creates a new user, when the row is opened in detail, then `public_id`, role, and profile summary are readable and consistent with stored data.
- **AC-007**: Given a user without `avatar_url`, when the table and detail render, then a fallback avatar with deterministic initials and consistent background styling is shown after reload.
- **AC-008**: Given the admin edits `username` or `avatar_url`, when the save succeeds, then the updated values appear in table or detail views after reload.
- **AC-009**: Given the admin bans a non-self user, when the user logs out and tries to log in again, then login is denied by the existing auth flow without creating a new app session.
- **AC-010**: Given the admin unbans that user, when the user logs in again with a valid password, then login succeeds and the same user identity is preserved.
- **AC-011**: Given the admin changes a user's password, when the target user attempts the old password, then login fails, and when the target user attempts the new password, then login succeeds.
- **AC-012**: Given a user with active subscription or history data, when the admin opens `View Details`, then active subscription, active asset access, transactions, login history, and extension history are readable from the detail UI.
- **AC-013**: Given a user with no current subscription and empty histories, when the admin opens `View Details`, then the UI shows explicit empty states without runtime error.
- **AC-014**: Given the admin toggles visible columns, when the page reloads in the same browser, then the column visibility preference persists from `localStorage`.
- **AC-015**: Given the admin attempts to ban themselves, when the action is submitted, then the UI rejects the action with a clear error and no user state changes.

## 6. Test Automation Strategy
- **Test Levels**: Unit, integration, and browser-verification-assisted end-to-end.
- **Frameworks**: Use the repo test stack already wired by the project. Do not invent a separate browser test harness just to satisfy this milestone.
- **Unit Focus**: Username normalization, username collision resolution, `public_id` generation, filter parsing, fallback avatar seed mapping, and safe profile schema validation.
- **Integration Focus**: Admin create-user mutation orchestration, compensation on partial failure, ban or unban persistence, password-reset server path, and detail read-model composition.
- **Browser Verification**: Use `agent-browser` on the real `/admin/users` route to verify create user, loginability, fallback avatar behavior, detail rendering, ban or unban effect, and password change effect.
- **Repo Quality Gates**: `pnpm lint`, `pnpm check`, `pnpm test`, browser verification for impacted flows, and no relevant Next.js runtime or compilation errors.
- **Backend Verification**: Use read-only `npx @insforge/cli` commands against the runtime database to verify `auth.users`, `public.profiles`, banned state, and identity consistency. Do not use insert or update helpers as verification shortcuts.

## 7. Rationale & Context
- Milestone 7 sits after core auth, admin assets, subscriptions, CD-Key issuance, and member console. The user-management milestone must therefore integrate with a live auth system rather than invent a local-only account table.
- The baseline SQL already supports profile storage, banned state, current-subscription view, transaction view, login logs, and extension tracking. It does not provide a baseline SQL helper for creating auth users or updating auth passwords. The app layer must therefore own trusted auth-admin orchestration.
- `edit profil dasar` is ambiguous in the source docs. This specification interprets it as `username` plus `avatar_url` for Milestone 7 and keeps `email`, `role`, and `public_id` read-only to avoid auth/profile divergence and role-management scope expansion.
- Avatar editing is specified as URL-only because the milestone does not require storage integration, upload UX, or media processing.
- The `none` filter value is a UI-level decision required to keep users with no running subscription visible and manageable without violating the DB enum contract.
- Recent history previews in the detail dialog are sufficient for Milestone 7 because full observability filtering belongs to Milestone 8.

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: InsForge Auth - create auth users and update passwords through a trusted server-only admin capability.
- **EXT-002**: Runtime Postgres schema defined by `migrations/*.sql` - stores `public.profiles`, `public.subscriptions`, `public.transactions`, `public.login_logs`, and `public.extension_tracks`.

### Third-Party Services
- **SVC-001**: No additional third-party service is required for Milestone 7 if avatar editing remains URL-based.

### Infrastructure Dependencies
- **INF-001**: Next.js App Router runtime with server actions and server-only modules.
- **INF-002**: `next-safe-action` shared action client for browser-triggered mutations.

### Data Dependencies
- **DAT-001**: `public.v_current_subscriptions` for current subscription read models.
- **DAT-002**: `public.v_current_asset_access` for active asset access in user detail.
- **DAT-003**: `public.v_transaction_list` for transaction history composition.
- **DAT-004**: `public.login_logs` and `public.extension_tracks` for user detail history sections.

### Technology Platform Dependencies
- **PLT-001**: Next.js App Router and Server Actions.
- **PLT-002**: `react-hook-form` plus `zod` for form validation.
- **PLT-003**: `@tanstack/react-query` and `@tanstack/react-table` for admin table behavior.
- **PLT-004**: TailwindCSS and repo-approved UI primitives under `src/components/ui/**`.

### Compliance Dependencies
- **COM-001**: Password mutations must affect the real auth identity rather than local app-only state.
- **COM-002**: Admin browser flows must use session-based app access and must not expose privileged credentials client-side.

## 9. Examples & Edge Cases
```json
{
  "createUserExample": {
    "input": {
      "email": "new.member+trial@assetnext.dev",
      "password": "Devpass123",
      "confirmPassword": "Devpass123",
      "role": "member"
    },
    "generated": {
      "username": "new-member-trial",
      "publicId": "generated-public-id"
    }
  },
  "collisionExample": {
    "existingUsername": "seed-active-browser",
    "newEmail": "seed.active.browser@different.dev",
    "resolvedUsername": "seed-active-browser-2"
  },
  "tableRowWithoutSubscription": {
    "userId": "91000000-0000-4000-8000-000000000006",
    "email": "seed.none.browser@assetnext.dev",
    "publicId": "MEM-BRW-05",
    "subscriptionStatus": null,
    "activePackageSummary": "none",
    "subscriptionEndAt": null
  },
  "detailEmptyState": {
    "currentSubscription": null,
    "activeAssets": [],
    "transactions": [],
    "loginLogs": [],
    "extensionTracks": []
  }
}
```

Edge cases that implementation must handle:
- Create user with email that already exists in auth or profiles.
- Create user with normalized username collision.
- Create user where auth account is created but profile insert fails.
- Edit username to an existing username.
- Avatar URL cleared back to null.
- Self-ban attempt by the acting admin.
- Password reset for a banned user.
- Detail view for user with no current subscription.
- Detail view for user with active subscription but zero current asset access because status is `processed`.
- Filters using `packageSummary = none` for users without running subscriptions.

## 10. Validation Criteria
- The implementation must satisfy all Milestone 7 browser checklist items from `docs/IMPLEMENTATION_PLAN.md`.
- Browser verification for Milestone 7 must use the runtime database setup required by the implementation plan, including baseline migrations, `045_auth_admin_helpers.sql`, and the seeded browser-loginable accounts from `040_dev_seed_full.sql`, `041_dev_seed_loginable_users.sql`, and `042_dev_seed_admin_users.sql` when those checklist steps rely on seeded login and admin users.
- The implementation must not require manual DB edits during browser verification.
- Admin create-user verification must prove both `auth.users` and `public.profiles` consistency for the created identity.
- Ban or unban verification must prove only `public.profiles.is_banned` changed and history stayed intact.
- Password-reset verification must prove the auth identity remains the same and the credential changes take effect.
- Route structure, module placement, and imports must follow `docs/agent-rules/folder-structure.md`.
- UI structure and visual language must follow `docs/agent-rules/ui-ux-rules.md`.
- The spec is invalid if it requires browser-side privileged credentials, a new internal REST endpoint, or direct client-side access to server-only repositories.

## 11. Related Specifications / Further Reading
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PRD.md`
- `docs/DB.md`
- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`
- `migrations/010_profiles_and_auth_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/020_admin_access_helpers.sql`
- `migrations/021_rls_policies.sql`
- `migrations/022_subscription_engine.sql`
- `migrations/024_views.sql`
- `migrations/030_rpc.sql`
