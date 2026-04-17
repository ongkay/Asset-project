---
goal: Milestone 7 Admin Users Implementation Plan
version: 1.0
date_created: 2026-04-17
last_updated: 2026-04-17
owner: AssetProject
status: Planned
tags: [feature, admin, users, auth, nextjs, milestone-7]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the implementation sequence for Milestone 7 User Management at `/admin/users`. The plan is intentionally structured for `executing-plans`: phases are sequential, tasks are atomic, dependencies are explicit inside each task description, and every phase ends with concrete verification so execution can stop safely on the first blocker.

The implementation must remain consistent with `docs/works/m7-user-management-spec.md`, `docs/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DB.md`, `docs/agent-rules/folder-structure.md`, `docs/agent-rules/ui-ux-rules.md`, baseline SQL in `migrations/`, and the current admin UI baseline under `src/app/(admin)/admin/assets/**`.

## 1. Requirements & Constraints

- **REQ-001**: Implement the `/admin/users` milestone exactly as specified in `docs/works/m7-user-management-spec.md`.
- **REQ-002**: Preserve App Router boundaries: `src/app/**` stays thin; route-local UI lives under `src/app/(admin)/admin/users/_components/**`; business logic lives in `src/modules/**`.
- **REQ-003**: Use `src/modules/admin/users/**` for admin read models, filter parsing, and thin admin read/bootstrap actions only.
- **REQ-004**: Keep core user-management business rules in `src/modules/users/**` and trusted auth-admin orchestration in `src/modules/auth/**`.
- **REQ-005**: All browser-triggered mutations must use server actions with `next-safe-action`; do not add internal REST endpoints.
- **REQ-006**: The UI must follow the admin visual baseline in `src/app/(admin)/admin/assets/**`, especially page shell, toolbar density, table composition, sticky header, dialog style, and footer pagination treatment.
- **REQ-007**: Every password input in create-user and change-password flows must support show/hide.
- **REQ-008**: Column visibility for `/admin/users` must persist in browser `localStorage` using a stable page-specific key.
- **REQ-009**: User-facing admin table rows must render `avatar + username + email`.
- **REQ-010**: Fallback avatar styling must be deterministic per user and remain consistent after reload.
- **REQ-011**: The implementation must not expose sensitive asset fields such as `asset_json`, account credentials, or `proxy` in `/admin/users` payloads or UI.
- **REQ-012**: Do not add a migration unless implementation reaches a concrete blocker that cannot be solved with the current schema, policies, views, triggers, and app-layer services.
- **REQ-013**: Browser verification must run against the runtime database state expected by `docs/IMPLEMENTATION_PLAN.md`, including seeded browser/admin users when the checklist depends on them.
- **SEC-001**: The admin browser must never use `project_admin`, service credentials, or direct privileged auth/database credentials client-side.
- **SEC-002**: Any create-user or password-change flow must change the real auth identity in `auth.users` through a trusted server-only path.
- **SEC-003**: Self-ban must be prevented in the application/server-action layer and must not rely on current DB policies to fail automatically.
- **CON-001**: Use `pnpm` only.
- **CON-002**: Use repo-approved stack only: Next.js App Router, Tailwind, existing UI primitives, `react-hook-form`, `zod`, `@tanstack/react-query`, and `@tanstack/react-table`.
- **CON-003**: Keep existing repo patterns unless a concrete Milestone 7 requirement forces a divergence.
- **CON-004**: The plan must remain executable even if Milestones 5 and 6 are not fully merged; `/admin/users` may read `payment_dummy`, `cdkey`, and `admin_manual` transaction sources when present, but must not depend on incomplete feature code from those milestones.
- **GUD-001**: Prefer the smallest correct set of new files. Do not create abstractions, DTO layers, or helper folders unless the file size or concern split makes them necessary.
- **GUD-002**: Reuse assets-page and subscriber-page query/table/dialog patterns where they fit, but do not copy business logic into route-local code.
- **PAT-001**: Mirror the route-level structure used by `src/app/(admin)/admin/assets/page.tsx`: guard access, parse search params from module schema, load initial table page on the server, and render a client `users-page` component.
- **PAT-002**: Mirror the route-local query adapter pattern used by `src/app/(admin)/admin/assets/_components/assets-query.ts` and `src/app/(admin)/admin/subscriber/_components/subscriber-query.ts`.
- **PAT-003**: Mirror the admin detail dialog baseline from `src/app/(admin)/admin/assets/_components/asset-detail-dialog/asset-detail-dialog.tsx`; use dialog, not drawer.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Establish the domain and admin read-model contracts for `/admin/users` so later UI work can consume stable shapes without embedding business logic in route files.
- Entry Criteria: `docs/works/m7-user-management-spec.md` is accepted as the source of truth for Milestone 7.
- Completion Criteria: Admin-users schemas, types, and query boundaries exist; route-level parsing and initial table loading can be wired without placeholder types.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `src/modules/admin/users/types.ts` with stable read-model contracts from the spec: `AdminUsersTableFilters`, `AdminUserRow`, `AdminUsersTableResult`, `AdminUserDetailProfile`, `AdminUserDetailSubscription`, `AdminUserDetailActiveAsset`, `AdminUserDetailTransaction`, `AdminUserDetailLoginLog`, `AdminUserDetailExtensionTrack`, and `AdminUserDetailPayload`. Keep browser-visible asset fields limited to the allowed non-sensitive subset. | | |
| TASK-002 | Create `src/modules/admin/users/schemas.ts` with Zod schemas for route search params and browser-callable read inputs. Include exact enums for `role`, DB-backed `subscriptionStatus`, package summary, pagination defaults, and parser helpers such as `parseAdminUsersTableSearchParams`. Depend on TASK-001 contracts. | | |
| TASK-003 | Create `src/modules/admin/users/queries.ts` with server-only query entry points `getAdminUsersTablePage(filters)` and `getAdminUserDetail({ userId })`. The file may start with placeholder implementations that throw deterministic errors until repositories are wired, but function names, signatures, and return contracts must match TASK-001/TASK-002 exactly. Depend on TASK-001 and TASK-002. | | |
| TASK-004 | Extend `src/modules/users/types.ts` only if needed to support shared user-domain write contracts referenced later by create/edit/ban flows. Do not move admin read-model types into the domain layer. Depend on TASK-001. | | |
| TASK-005 | Verify Phase 1 contracts by running TypeScript-aware checks on the touched module files and ensuring no route-local code is required to parse filters or shape admin-user payloads yet. Stop here if contract names or field shapes remain uncertain. | | |

### Implementation Phase 2

- GOAL-002: Implement trusted domain write paths for create user, safe profile edit, ban/unban, and password change without coupling them to route-local UI.
- Entry Criteria: Phase 1 contracts are present and stable.
- Completion Criteria: Canonical domain actions and services exist for all Milestone 7 writes, with server-side validation and trusted auth-admin orchestration in place.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `src/modules/users/schemas.ts` with Zod schemas for `AdminCreateUserValues`, `AdminEditUserProfileValues`, `AdminToggleUserBanInput`, and any normalized server-side inputs needed by `src/modules/users/actions.ts`. `AdminCreateUserValues` must explicitly include `password` + `confirmPassword` with matching validation. Enforce `role` as `admin | member`, duplicate-email-safe normalized email handling, and username validation rules that match the generated-username contract rather than only trimming/non-empty checks. Keep editable profile fields behind an explicit allowlist contract. | | |
| TASK-007 | Create `src/modules/users/actions.ts` with browser-callable server actions for create-user, safe-profile-edit, and ban/unban. Use the repo action client pattern, enforce admin authorization at the action boundary for every write, validate input with TASK-006 schemas, and delegate all business rules into `src/modules/users/services.ts`. | | |
| TASK-008 | Expand `src/modules/users/services.ts` to add domain functions for username generation, username collision resolution, `public_id` generation and collision retries, fallback-avatar seed support if needed, safe profile update allowlist enforcement, self-ban prevention, duplicate-email rejection before profile insert, and profile banned-state mutation. Fallback avatar logic must derive initials from the normalized stored username and derive deterministic styling from `user_id` using an existing token-safe palette. Keep all auth-provider writes delegated to `src/modules/auth/**`. | | |
| TASK-009 | Expand `src/modules/users/repositories.ts` with the profile-level read and write access needed by TASK-008: unique username checks, unique `public_id` checks, existing profile email checks, profile lookup by filters, profile insert, safe profile update, and banned-state update. Keep admin-dashboard-specific detail/history composition out of the core users repository. Use existing InsForge adapters only. | | |
| TASK-010 | Expand `src/modules/auth/services.ts` and `src/modules/auth/repositories.ts` with trusted server-only auth-admin helpers for auth-user creation and password mutation. Expand `src/modules/auth/schemas.ts` and `src/modules/auth/actions.ts` for the browser-callable admin password-change action contract. The password-change contract must explicitly include `newPassword` + `confirmPassword` with matching validation, and the auth action must enforce admin authorization at the write boundary. Harden the shared admin action middleware or equivalent admin action boundary so all admin read/write actions used by `/admin/users` reject `is_banned = true`, matching `requireAdminShellAccess()`. Ensure the auth login/session path still rejects banned users before app-session creation; patch that guard here if Milestone 1 code does not already cover it. Keep all non-action orchestration in `services.ts`/`repositories.ts`. If `src/modules/auth/types.ts` needs new result contracts, update it in the same step. | | |
| TASK-011 | Wire TASK-007 and TASK-010 actions to the Phase 2 user/auth domain services so the full create-user flow requires generated username, generated unique `public_id`, duplicate-email rejection across auth and profiles, compensation for the orphan-auth-user failure path, and preservation of the acting admin session without auto-logging the new user into the admin browser. | | |
| TASK-012 | Verify Phase 2 by running targeted checks/tests for create-user input validation, duplicate-email rejection, username normalization/collision logic, `public_id` uniqueness, self-ban prevention, old-password failure vs new-password success, and trusted auth-admin orchestration. Stop if create-user cannot guarantee a real loginable auth identity. | | |

### Implementation Phase 3

- GOAL-003: Implement admin read models and thin admin transport actions for table data and detail bootstrap.
- Entry Criteria: Phase 2 canonical write paths exist, even if UI is not yet wired.
- Completion Criteria: `/admin/users` can load table data and detail bootstrap data from server-side queries, with all required filter and history shapes available.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Implement `src/modules/admin/users/queries.ts` for the real table and detail queries. Prefer a baseline safe RPC when one exists for the required sensitive read path; otherwise use `public.profiles`, raw `public.subscriptions` for historical status/timestamp access, `public.v_current_subscriptions` for current-subscription joins, `public.subscriptions.access_keys_json`, `public.v_current_asset_access`, `public.v_transaction_list`, `public.login_logs`, and `public.extension_tracks` as required by the spec. Enforce the business-time fallback order for historical subscriptions and the stable table ordering contract `updated_at desc`, then `created_at desc`, then `user_id desc`. When reading from `public.v_current_asset_access`, explicitly allowlist the returned columns and never return `proxy`, credential values, or raw `asset_json`. Depend on TASK-001 through TASK-010. | | |
| TASK-014 | Create `src/modules/admin/users/actions.ts` as thin admin read/bootstrap actions for browser-triggered table and detail reads only. Keep admin access enforcement at the read boundary, validate browser payloads with the appropriate schemas, and delegate all business logic into `src/modules/admin/users/queries.ts`. Align the result envelope with `src/modules/admin/assets/actions.ts`. Depend on TASK-013. | | |
| TASK-015 | Keep `src/modules/admin/users/schemas.ts` limited to Zod schemas and route search-param parsing only. If any query serialization helpers are still missing for the client layer, add only the canonical filter parsing helpers needed by the route and admin read actions. Do not place browser-only `localStorage` constants in the module layer. Depend on TASK-013. | | |
| TASK-016 | Verify Phase 3 by exercising table/detail reads through `src/modules/admin/users/actions.ts` and browser-callable write actions through `src/modules/users/actions.ts` and `src/modules/auth/actions.ts`. Confirm search is case-insensitive across `user_id/email/username/public_id`, role filter, DB-status subscription filter, `packageSummary = none`, stable table ordering, detail history ordering, and the action envelopes expected by the React Query client adapter. Stop if any required read/write path still depends on route-local business logic. | | |

### Implementation Phase 4

- GOAL-004: Replace the `/admin/users` placeholder route with the real page shell, table state, query adapter, and toolbar/table baseline aligned with `/admin/assets`.
- Entry Criteria: Phase 3 queries can provide real table and detail data.
- Completion Criteria: The route renders the real user-management page shell, with assets-style toolbar, table, pagination, and persisted column visibility.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Replace the placeholder in `src/app/(admin)/admin/users/page.tsx` with the same route-level composition pattern as `src/app/(admin)/admin/assets/page.tsx`: `requireAdminShellAccess()`, await `searchParams`, call `parseAdminUsersTableSearchParams`, call `getAdminUsersTablePage`, and render a client `AdminUsersPage` component with initial data/error props. | | |
| TASK-018 | Create `src/app/(admin)/admin/users/_components/users-page-types.ts`, `users-query.ts`, and `use-users-table-state.ts`. Mirror assets/subscriber query-key and state patterns, including a stable localStorage key for visible columns and URL-synced filters inside `use-users-table-state.ts`, plus React Query fetch helpers in `users-query.ts` that call the required admin read transport actions from TASK-014. The search interaction must be auto-search, using debounced URL/query updates without a separate submit step. Depend on TASK-014 and TASK-015. | | |
| TASK-019 | Create `src/app/(admin)/admin/users/_components/users-page.tsx` that mirrors the required `AdminAssetsPage` composition for this milestone: one card-wrapped toolbar + table shell, dialog state, detail state, and query invalidation after mutations. Do not add optional KPI/stats cards that are not part of the Milestone 7 scope. Keep the visual language aligned with `src/app/(admin)/admin/assets/_components/assets-page.tsx`. | | |
| TASK-020 | Create `src/app/(admin)/admin/users/_components/users-table/users-table.tsx`, `users-columns.tsx`, `users-toolbar.tsx`, `users-filter-popover.tsx`, `users-row-actions.tsx`, and `users-types.ts`. Follow naming and structural rules from `folder-structure.md`; include sticky header, pagination footer, a case-insensitive clearable search field, filter dropdowns, column visibility, and `avatar + username + email` user cells. Keep the `actions` column always visible and exclude it from hide/show toggles. Depend on TASK-018/TASK-019. | | |
| TASK-021 | Verify Phase 4 in the browser and at the component level: `/admin/users` should render with the same visual density and shell language as `/admin/assets`, filters must update URL state, the search field must be clearable, the `actions` column must remain non-hideable, and other column visibility must persist via `localStorage`. Stop if the page drifts visually from the assets baseline or if route files accumulate business logic. | | |

### Implementation Phase 5

- GOAL-005: Implement create-user, detail, edit, ban/unban, and change-password dialogs with assets-style interaction quality and full milestone data coverage.
- Entry Criteria: Phase 4 table and route shell are stable.
- Completion Criteria: All row actions are wired, dialogs match current repo dialog style, and detail view shows all required sections without leaking sensitive data.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-022 | Create `src/app/(admin)/admin/users/_components/user-form-dialog/user-form-dialog.tsx` for create-user only. Use `react-hook-form` + `zod`, show/hide password for create-user fields, and align dialog header/footer spacing with `asset-detail-dialog.tsx` and other admin dialogs. Depend on TASK-007 and TASK-019. | | |
| TASK-023 | Create `src/app/(admin)/admin/users/_components/user-detail-dialog/user-detail-dialog.tsx` and any supporting subcomponents such as `user-detail-subscription.tsx`, `user-detail-assets.tsx`, and `user-detail-history.tsx` only if the dialog grows beyond a readable single file. `View Details` and `Edit` must share this same detail surface, with `Edit` opening the detail dialog directly in editable state for safe profile fields. Populate profile summary, editable avatar URL, editable username, active subscription summary, active access cards/table, transaction history, login history, and extension history. Never render `proxy`, account credentials, or raw asset JSON. Include server-side duplicate-username rejection and allow clearing `avatar_url` back to `null`. Depend on TASK-013 and TASK-019. | | |
| TASK-024 | Create `src/app/(admin)/admin/users/_components/user-change-password-dialog/user-change-password-dialog.tsx` and `user-ban-dialog/user-ban-dialog.tsx` if separate confirmation surfaces improve clarity. Keep both thin and mutation-driven; use explicit confirmation language for destructive ban actions and clear success/error feedback for password changes. The password dialog must collect `newPassword` + `confirmPassword`, provide show/hide controls for both password inputs, wire to the auth-domain password-change action from TASK-010, and surface matching-validation errors near the fields. The ban dialog must wire to the user-domain ban action from TASK-007. | | |
| TASK-025 | Wire `users-row-actions.tsx` and `users-page.tsx` to open the correct dialog states for `Edit`, `Ban/Unban`, `Change Password`, and `View Details`. `Edit` must open the shared detail dialog in editable state rather than a separate profile-edit modal. Reuse cached detail/query data where possible, invalidate table/detail queries after successful mutations, and keep all client code transport-only. Depend on TASK-022 through TASK-024. | | |
| TASK-026 | Verify Phase 5 in the browser with seeded and newly created users: create member user, inspect detail, edit avatar/username from the detail dialog, clear `avatar_url` back to null, attempt duplicate-username edit and confirm server-side rejection, ban/unban a non-self user, change password, and confirm dialog behavior, keyboard focus, and empty states. Stop if any mutation bypasses server-side validation or if the detail dialog leaks sensitive fields. | | |

### Implementation Phase 6

- GOAL-006: Finish milestone verification, regression checks, and documentation-level alignment for a clean execution handoff.
- Entry Criteria: Phases 1 through 5 are complete and all feature paths are implemented.
- Completion Criteria: Repo quality gates, browser verification, and backend invariant checks pass; the final implementation remains consistent with current repo structure and visual baseline.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Run `pnpm lint`, `pnpm check`, and `pnpm test`. Fix any failures caused by the Milestone 7 implementation without broad unrelated refactors. | | |
| TASK-028 | Run browser verification for the Milestone 7 checklist from `docs/IMPLEMENTATION_PLAN.md` on the real `/admin/users` route via the mandated `agent-browser` skill/CLI, without creating a dedicated browser test file just to satisfy the gate. Use one admin account from `042_dev_seed_admin_users.sql` where `profiles.role = 'admin'` and `auth.users.is_project_admin = false`, so admin access is proven against the app-admin contract rather than the wrong auth flag. Include guest denial for direct `/admin/users` access, member denial for direct `/admin/users` access, create-user loginability, duplicate-email rejection, username collision behavior, fallback avatar consistency, detail rendering, avatar edit persistence, self-ban rejection, role filter behavior, subscription-status filter behavior, active package summary filter behavior including `none`, ban/unban effect on fresh login, password change effect on old/new password login attempts, and confirmation that the acting admin session is preserved after create-user. | | |
| TASK-029 | Run backend invariant verification against the runtime database using the runtime-linked verification path mandated by `docs/IMPLEMENTATION_PLAN.md`. Start with `npx @insforge/cli whoami` and `npx @insforge/cli current`, confirm the CLI target matches the app runtime database, then run read-only checks for auth/profile row consistency, username/public_id uniqueness, banned-state persistence without history damage, and password change without duplicate auth identities. | | |
| TASK-030 | Perform a final consistency pass against `docs/works/m7-user-management-spec.md`, `docs/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/agent-rules/folder-structure.md`, `docs/agent-rules/ui-ux-rules.md`, and the assets-page visual baseline. Only after all evidence is green should the implementation be considered ready for `finishing-a-development-branch`. | | |

## 3. Alternatives

- **ALT-001**: Keep `/admin/users/page.tsx` as a placeholder and defer the route until Milestone 8. Rejected because Milestone 7 explicitly owns `/admin/users` and its browser flows.
- **ALT-002**: Put all user-management mutations in `src/modules/admin/users/actions.ts`. Rejected because folder rules require admin modules to stay thin and delegate business logic to core domain services.
- **ALT-003**: Use a drawer for `View Details`. Rejected because the current admin detail-surface baseline is a dialog under `/admin/assets`.
- **ALT-004**: Expose profile and history data through a new `/api/admin/users/*` route. Rejected because internal UI mutations and reads must use server components, queries, or server actions instead of new public REST endpoints.
- **ALT-005**: Introduce avatar upload/storage in Milestone 7. Rejected because the accepted spec constrains avatar editing to URL-based updates only.
- **ALT-006**: Add a new migration for user-management helper SQL immediately. Rejected because the spec and migrations allow implementation via current app-layer services and trusted auth-admin paths unless a concrete blocker is discovered.

## 4. Dependencies

- **DEP-001**: `docs/works/m7-user-management-spec.md` for all milestone contracts.
- **DEP-002**: `docs/PRD.md` section `7.4. Users Management (/admin/users)` for product behavior.
- **DEP-003**: `docs/IMPLEMENTATION_PLAN.md` Milestone 7 for browser and backend verification criteria.
- **DEP-003A**: `docs/DB.md` for schema, view, and constraint semantics used by admin-user queries and verification.
- **DEP-004**: `docs/agent-rules/folder-structure.md` for module and route boundaries.
- **DEP-005**: `docs/agent-rules/ui-ux-rules.md` for admin visual baseline and table/dialog quality expectations.
- **DEP-006**: Baseline migrations `010_profiles_and_auth_tables.sql`, `011_catalog_tables.sql`, `012_subscription_tables.sql`, `020_admin_access_helpers.sql`, `021_rls_policies.sql`, `022_subscription_engine.sql`, `023_triggers.sql`, `024_views.sql`, `025_table_grants.sql`, and `030_rpc.sql`.
- **DEP-006A**: Verification seed files `040_dev_seed_full.sql`, `041_dev_seed_loginable_users.sql`, and `042_dev_seed_admin_users.sql` when browser verification depends on seeded accounts and history data.
- **DEP-007**: Existing admin visual and interaction patterns in `src/app/(admin)/admin/assets/**`.
- **DEP-008**: Existing admin read-transport patterns in `src/modules/admin/assets/actions.ts`, `src/app/(admin)/admin/assets/_components/assets-query.ts`, and `src/app/(admin)/admin/subscriber/_components/subscriber-query.ts`, plus mutation action patterns in `src/modules/assets/actions.ts`.
- **DEP-009**: Existing session guard in `src/modules/users/services.ts`.

## 5. Files

- **FILE-001**: Modify `src/app/(admin)/admin/users/page.tsx`.
- **FILE-002**: Create `src/app/(admin)/admin/users/_components/users-page.tsx`.
- **FILE-003**: Create `src/app/(admin)/admin/users/_components/users-page-types.ts`.
- **FILE-004**: Create `src/app/(admin)/admin/users/_components/users-query.ts`.
- **FILE-005**: Create `src/app/(admin)/admin/users/_components/use-users-table-state.ts`.
- **FILE-006**: Create `src/app/(admin)/admin/users/_components/users-table/users-table.tsx`.
- **FILE-007**: Create `src/app/(admin)/admin/users/_components/users-table/users-columns.tsx`.
- **FILE-008**: Create `src/app/(admin)/admin/users/_components/users-table/users-toolbar.tsx`.
- **FILE-009**: Create `src/app/(admin)/admin/users/_components/users-table/users-filter-popover.tsx`.
- **FILE-010**: Create `src/app/(admin)/admin/users/_components/users-table/users-row-actions.tsx`.
- **FILE-011**: Create `src/app/(admin)/admin/users/_components/users-table/users-types.ts`.
- **FILE-012**: Create `src/app/(admin)/admin/users/_components/user-form-dialog/user-form-dialog.tsx`.
- **FILE-013**: Create `src/app/(admin)/admin/users/_components/user-detail-dialog/user-detail-dialog.tsx`.
- **FILE-014**: Optionally create detail subcomponents under `src/app/(admin)/admin/users/_components/user-detail-dialog/` only if the dialog becomes too large.
- **FILE-015**: Create `src/app/(admin)/admin/users/_components/user-change-password-dialog/user-change-password-dialog.tsx`.
- **FILE-016**: Create `src/app/(admin)/admin/users/_components/user-ban-dialog/user-ban-dialog.tsx` if a separate confirmation dialog is warranted.
- **FILE-017**: Create `src/modules/admin/users/types.ts`.
- **FILE-018**: Create `src/modules/admin/users/schemas.ts`.
- **FILE-019**: Create `src/modules/admin/users/queries.ts`.
- **FILE-020**: Create `src/modules/admin/users/actions.ts` for thin admin read/bootstrap actions only.
- **FILE-021**: Create `src/modules/users/actions.ts` for browser-callable create/edit/ban mutations used by the admin route.
- **FILE-022**: Create `src/modules/users/schemas.ts`.
- **FILE-023**: Modify `src/modules/users/services.ts`.
- **FILE-024**: Modify `src/modules/users/repositories.ts`.
- **FILE-025**: Modify `src/modules/users/types.ts` only if shared domain contracts need expansion.
- **FILE-026**: Modify `src/modules/auth/services.ts`.
- **FILE-027**: Modify `src/modules/auth/repositories.ts`.
- **FILE-027A**: Modify `src/modules/auth/action-client.ts` or the equivalent shared admin action middleware to reject banned admins at the action boundary.
- **FILE-028**: Modify `src/modules/auth/actions.ts`.
- **FILE-029**: Modify `src/modules/auth/schemas.ts` only if shared service-level payload validation is needed.
- **FILE-030**: Modify `src/modules/auth/types.ts` only if auth-admin result contracts are needed.

## 6. Testing

- **TEST-001**: Unit test username normalization and collision logic in the user domain.
- **TEST-002**: Unit test safe profile-edit schema rules, including trimmed non-empty username, generated-rule-compatible username validation, duplicate-username rejection, `avatar_url` nullable clearing, and disallowed field edits.
- **TEST-003**: Integration test create-user orchestration, including duplicate-email rejection, auth/profile consistency, `public_id` generation, and compensation on profile-insert failure.
- **TEST-004**: Integration test self-ban rejection and non-self ban/unban persistence.
- **TEST-005**: Integration test password change against the trusted auth-admin path, including old-password failure, new-password success, and no duplicate auth identity creation.
- **TEST-006**: Integration test admin-users table filters and detail payload composition from canonical queries, including stable table ordering and asset-field allowlisting from `v_current_asset_access`.
- **TEST-007**: Regression test or targeted verification that banned users are rejected before a new app session is created if the current auth/session path required a Milestone 7 patch.
- **TEST-008**: Browser verification for `/admin/users` matching the Milestone 7 checklist in `docs/IMPLEMENTATION_PLAN.md`, including guest/member denial, self-ban rejection, edit-from-detail behavior, duplicate-username rejection on edit, and clearing `avatar_url` back to null.
- **TEST-009**: Run `pnpm lint`.
- **TEST-010**: Run `pnpm check`.
- **TEST-011**: Run `pnpm test`.
- **TEST-012**: Read-only `npx @insforge/cli` verification starting with `whoami` and `current` for auth/profile consistency, uniqueness, banned state, and password-change identity stability.

## 7. Risks & Assumptions

- **RISK-001**: Trusted auth-admin capabilities may not be fully wrapped yet in the current auth module, increasing the chance of implementation drift if orchestration is scattered.
- **RISK-002**: The current users domain is still minimal; adding too much into a single file could make `services.ts` or `repositories.ts` unwieldy unless concern split is introduced carefully.
- **RISK-003**: User detail queries can accidentally leak `proxy` or other sensitive asset fields if `v_current_asset_access` is projected too broadly.
- **RISK-004**: Visual drift from the assets baseline is likely if the route-local UI is designed from scratch instead of cloned structurally from existing admin pages.
- **RISK-005**: Seed-dependent browser verification will give false negatives if the runtime database does not match the seed prerequisites in `docs/IMPLEMENTATION_PLAN.md`.
- **RISK-006**: Existing Milestone 1 login/session code may already enforce banned-user login denial. If so, Milestone 7 must add regression coverage without duplicating or destabilizing that path.
- **ASSUMPTION-001**: No migration is required for Milestone 7 if trusted auth-admin access is available through current InsForge integration.
- **ASSUMPTION-002**: The final implementation may expose thin admin read transport actions under `src/modules/admin/users/actions.ts`, but domain business logic remains in `src/modules/users/services.ts` and `src/modules/auth/services.ts`.
- **ASSUMPTION-003**: The detail dialog may show the latest 10 rows per history section by default, consistent with the accepted spec.
- **ASSUMPTION-004**: `public_id` format remains implementation-defined as long as it is unique, stable, and readable.

## 8. Related Specifications / Further Reading

- `docs/works/m7-user-management-spec.md`
- `docs/PRD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`
- `migrations/README.md`
- `migrations/010_profiles_and_auth_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/020_admin_access_helpers.sql`
- `migrations/021_rls_policies.sql`
- `migrations/022_subscription_engine.sql`
- `migrations/023_triggers.sql`
- `migrations/024_views.sql`
- `migrations/030_rpc.sql`
- `src/app/(admin)/admin/assets/page.tsx`
- `src/app/(admin)/admin/assets/_components/assets-page.tsx`
- `src/app/(admin)/admin/assets/_components/asset-detail-dialog/asset-detail-dialog.tsx`
- `src/modules/admin/assets/actions.ts`
- `src/modules/assets/actions.ts`
