---
title: Milestone 3 Admin Asset Implementation Specification
version: 1.0
date_created: 2026-04-15
last_updated: 2026-04-15
owner: AssetProject
tags: [process, admin, asset, nextjs, insforge, milestone-3]
---

# Introduction
This specification defines the implementation contract for Milestone 3 Admin Asset. It is written for AI coding agents and maintainers that must implement the asset-inventory milestone without inventing behavior that conflicts with `docs/PRD.md`, `docs/DB.md`, `docs/IMPLEMENTATION_PLAN.md`, and the baseline SQL migrations.

Milestone 3 is complete only when an admin can create, inspect, edit, search, filter, paginate, enable or disable, and safely delete asset inventory from a real browser route, with derived asset status and safe-delete behavior remaining consistent with the database-backed engine.

## 1. Purpose & Scope

### 1.1 Purpose
The purpose of this specification is to provide a machine-readable contract for the Milestone 3 Admin Asset feature so implementation can be executed consistently across UI, server actions, read models, sensitive detail handling, and database-backed recovery behavior.

### 1.2 In Scope
- Route `/admin/assets`.
- Admin-only access control for asset inventory management.
- Asset list table with search, filter, pagination, and persisted column visibility.
- Create asset flow.
- Detail popup or dialog that supports viewing and editing one asset.
- Display of current users that are actively using one asset.
- Enable and disable asset flow.
- Safe hard delete asset flow.
- Derived asset status `available`, `assigned`, `expired`, and `disabled`.
- Server-side read model for `total used` and status-backed list rendering.
- Browser verification on the live route.
- Read-only backend verification against the runtime database.

### 1.3 Out of Scope
- Manual subscription creation or override UI in Milestone 4.
- Quick Add Asset flow inside the subscriber dialog.
- Member console asset list and raw asset detail UI in Milestone 6.
- Extension API responses and nonce flow in Milestone 11.
- Admin dashboard home statistics.
- New public REST endpoints for internal web UI.
- New baseline database schema unless implementation discovers a concrete blocker that cannot be solved with the existing tables, views, and functions.

### 1.4 Assumptions
- Milestone 0 foundation is already available.
- The admin shell route exists and is guarded.
- Baseline migrations from `migrations/001_extensions.sql` through `migrations/030_rpc.sql` are applied to the runtime database.
- The runtime database contains the seed and admin fixtures required for browser verification.
- The implementation follows the folder rules in `docs/agent-rules/folder-structure.md`.
- The implementation should reuse the required admin-table stack for this milestone, including `@tanstack/react-query`, `@tanstack/react-table`, and shared UI or state primitives under `src/components/shared/**` and `src/lib/**` when they are already present; if a minimal helper is missing, it should be added in those allowed folders instead of introducing a new stack.

## 2. Definitions
| Term                          | Definition                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asset                         | Inventory row stored in `public.assets` that represents one provider account or credential set.                                                            |
| Asset status                  | Derived UI status, never manual input. Valid values are `available`, `assigned`, `expired`, and `disabled`.                                                |
| `total used`                  | Current number of active assignments for one asset.                                                                                                        |
| Active user list              | Current users that still actively use one asset, derived from non-revoked assignment rows and user profile data.                                           |
| Safe delete                   | Hard delete flow that revokes active assignments, attempts re-fulfillment, preserves assignment snapshots, and removes the row from `public.assets`.       |
| Asset detail                  | Sensitive admin-only view that may display `account`, `proxy`, and raw `asset_json`.                                                                       |
| Asset JSON text               | Raw JSON string entered in the admin form before schema parsing converts it into validated `assetJson`.                                                    |
| Inventory-active asset        | Asset row that still exists in `public.assets`, regardless of whether it is available, assigned, expired, or disabled.                                     |
| Column visibility persistence | Browser-side storage of table column show or hide preferences across reloads.                                                                              |
| Expiry date range filter      | Date-range filter on `expires_at`, serialized in search params as `yyyy-MM-dd` strings `expiresFrom` and `expiresTo`, interpreted with UTC day boundaries. |

## 3. Requirements, Constraints & Guidelines

### 3.1 Source of Truth
- **REQ-001**: Business rules must follow `docs/PRD.md`.
- **REQ-002**: Database shape, constraints, views, and function behavior must follow `docs/DB.md` and the baseline migrations.
- **REQ-003**: Milestone scope and definition of done must follow Milestone 3 in `docs/IMPLEMENTATION_PLAN.md`.
- **REQ-004**: File placement and import boundaries must follow `docs/agent-rules/folder-structure.md`.

### 3.2 Route and Access Rules
- **REQ-010**: The admin asset feature must live at `/admin/assets`.
- **REQ-011**: The route must be accessible only to admin users.
- **REQ-012**: Guest and member users must be denied access to the asset admin route.
- **REQ-013**: Create asset must open from the `/admin/assets` route as a modal or dialog flow.
- **REQ-014**: Asset detail must open from the `/admin/assets` route as a modal or dialog flow and must support edit operations in the same context.
- **SEC-001**: The admin browser must not use database credentials, service credentials, or project-admin credentials directly on the client.
- **SEC-002**: All asset mutations must execute on the server.
- **SEC-003**: The implementation must not add a new public REST endpoint for internal web UI asset management.
- **SEC-004**: Raw `account`, `proxy`, and `asset_json` data must never be exposed in the asset-list read model, asset-list response payload, asset-list column options, or asset-list URL state.

### 3.3 Asset Data Rules
- **REQ-020**: Asset create and edit UI flows must accept `platform`, `assetType`, `account`, `note`, `proxy`, `assetJsonText`, and `expiresAt`.
- **REQ-021**: `platform` must be one of `tradingview`, `fxreplay`, or `fxtester`.
- **REQ-022**: `assetType` must be one of `private` or `share`.
- **REQ-023**: `account` must be required and non-empty after trim.
- **REQ-024**: `note` must be optional and must normalize trimmed blank input to `null`.
- **REQ-025**: `proxy` must be optional and must normalize trimmed blank input to `null`.
- **REQ-026**: `assetJsonText` must be required in the form, must parse successfully to JSON on the server boundary, and the parsed `assetJson` value must have top-level type `array` or `object`.
- **REQ-027**: `expiresAt` must be required and must persist to `public.assets.expires_at` as a timestamp.
- **REQ-028**: Create asset must default `expiresAt` to `now + 30 days` before the admin submits the form.
- **REQ-029**: The server must not accept manual input for derived status.
- **REQ-030**: The server must not accept manual input for `disabledAt`; enable and disable actions own that field.
- **REQ-031**: Asset status must be derived from `expires_at`, `disabled_at`, and active usage; it must never be stored as a permanent mutable app-layer field.
- **REQ-032**: Asset create and edit forms must use `react-hook-form` and `zod` validation.
- **REQ-033**: The create asset form must support both `private` and `share` asset types.
- **REQ-034**: The server must accept an already expired `expiresAt` value, and the resulting asset status must derive immediately as `expired`.
- **REQ-035**: Editing `platform` or `assetType` must be rejected whenever the asset still has one or more active non-revoked assignments; tuple changes are allowed only when `totalUsed = 0`.

### 3.4 Read Model and Table Rules
- The PRD only requires a date-range filter for `/admin/assets`; the concrete parameter names and serialization below are local implementation choices made by this specification so the milestone can be implemented deterministically.

- **REQ-040**: The asset list must support search by platform, note, username, and email of the current active user of that asset.
- **REQ-041**: Search must be case-insensitive and clearable.
- **REQ-042**: The asset list must support filter by asset type.
- **REQ-043**: The asset list must support filter by derived status.
- **REQ-044**: The asset list must support an expiry date range filter.
- **REQ-045**: The date range filter must target `expires_at` and must use `yyyy-MM-dd` values in search params because the shared date-range component already serializes that format.
- **REQ-046**: The asset list must support server-side pagination.
- **REQ-047**: The asset list must support persisted column visibility preferences.
- **REQ-048**: The minimum table columns are `platform`, `expires at`, `note`, `asset type`, `status`, `total used`, `created at`, `updated at`, and `actions`.
- **REQ-049**: `status` in the table must be computed from the server-side read model, not guessed in the client.
- **REQ-050**: `total used` in the table must be computed from active assignment data, not from historical lifetime assignment counts.
- **REQ-051**: `total used` for `share` assets may be greater than `1`.
- **REQ-052**: `status = assigned` applies only to `private` assets that currently have active usage.
- **REQ-053**: `share` assets that are active and not expired remain `available` even when `total used > 0`.
- **REQ-054**: The table must not load all asset rows without pagination.
- **REQ-055**: The main table payload must exclude raw `account`, `proxy`, and `assetJson` values.
- **REQ-056**: The asset list must return at most one table row per asset, even when a matching `share` asset has multiple active users.
- **REQ-057**: Username or email search must match an asset when the term matches any current active user identity for that asset.
- **REQ-058**: User-identity joins used for search must not duplicate rows or distort `totalCount`; the result set must still paginate distinct assets.
- **REQ-059**: `expiresFrom` is inclusive from `00:00:00.000Z` on that UTC day, `expiresTo` is inclusive through `23:59:59.999Z` on that UTC day, one-sided ranges are allowed, and reversed ranges must be rejected by the canonical query contract with a clear validation error while route-level search-param parsing must recover safely without crashing the page.

### 3.5 Detail and Current-User Rules
- **REQ-060**: Asset detail must display the current persisted fields needed for inspection and edit: `id`, `platform`, `assetType`, `account`, `note`, `proxy`, `assetJson`, `expiresAt`, `disabledAt`, `createdAt`, `updatedAt`, derived `status`, and `totalUsed`.
- **REQ-061**: Asset detail must display the list of users who are currently using the asset when such users exist.
- **REQ-062**: If the current-user list is rendered as rows or cards that show user identity, the UI must display `avatar + username + email` and follow the global admin-table user rendering rule.
- **REQ-063**: The current-user list may additionally include `accessKey`, `subscriptionStatus`, and `assignedAt` if those fields help admin diagnostics.
- **REQ-064**: For `private` assets, the current-user list must not display more than one actively using user.
- **REQ-065**: For `share` assets, the current-user list may display multiple actively using users.
- **REQ-066**: The current-user list must read only currently active usage and must not render purely historical revoked assignment rows in the default detail view.
- **REQ-067**: The current-user list, active-user search predicate, and `totalUsed` computation must all use the same active-assignment predicate; optional subscription fields are enrichment only and must not add a different activity filter.

### 3.6 Mutation Behavior
- **REQ-070**: Create asset must create exactly one `public.assets` row.
- **REQ-071**: Edit asset must update the existing row and must not create a duplicate row.
- **REQ-072**: Disable asset must set `disabled_at` to the current server time.
- **REQ-073**: Enable asset must clear `disabled_at` back to `null`.
- **REQ-074**: Enable asset must not force status to `available`; the resulting status must still derive from the remaining state, including expiration and active assignments.
- **REQ-075**: Delete asset must call `public.delete_asset_safely(asset_id)` or an equivalent server-side wrapper over the same baseline function.
- **REQ-076**: Delete asset must remove the row from `public.assets` and must preserve assignment snapshots in `public.asset_assignments`.
- **REQ-077**: Delete asset must not leave orphan data that violates the baseline constraints.
- **REQ-078**: Admin create, edit, toggle, and delete entrypoints must use `next-safe-action`.
- **REQ-079**: Server-side validation must reject payloads that bypass UI constraints.
- **REQ-080**: Asset detail edit must prefill from server data and must not rely on stale client-only row data for sensitive fields.
- **REQ-081**: Disable asset must, in the same trusted server-side flow, call `public.recheck_subscription_after_asset_change(asset_id)` or an equivalent wrapper after setting `disabled_at` so impacted assignments are revoked and affected subscriptions are re-evaluated immediately.
- **REQ-082**: If an edit changes `expiresAt` so the persisted asset becomes immediately invalid for current active assignments, the same trusted server-side update flow must call `public.recheck_subscription_after_asset_change(asset_id)` or an equivalent wrapper after saving the new expiry.

### 3.7 Forward-Compatibility Expectations
- The PRD and baseline database define stronger recovery behavior for invalid in-use assets. Milestone 3 must already wire disable and delete through `public.recheck_subscription_after_asset_change(asset_id)` and `public.delete_asset_safely()` semantics, while Milestone 10 and Milestone 11 own the broader browser and CLI proof matrix for cron reconciliation, multiple recovery permutations, and active-read-path enforcement.

### 3.8 Technical Constraints
- **CON-001**: Use Next.js App Router conventions only.
- **CON-002**: Keep `src/app/**` thin; route files must only compose UI, session guards, redirects, and route-local components.
- **CON-003**: Put core asset business logic in `src/modules/assets`.
- **CON-004**: Put admin asset read-model logic in `src/modules/admin/assets`.
- **CON-005**: Reuse the existing repo admin-table stack with `@tanstack/react-query`, `@tanstack/react-table`, and shared primitives under `src/components/shared/**` and `src/lib/**` when those pieces fit the milestone requirements.
- **CON-006**: Reuse existing UI primitives before adding new primitives.
- **CON-007**: Do not introduce HeroUI.
- **CON-008**: Do not put asset mutation logic in route files or client components.
- **CON-009**: Do not add a separate browser test file only to satisfy the milestone gate.
- **CON-010**: Prefer the current baseline tables, views, triggers, and SQL functions before introducing a new migration.

### 3.9 Guidelines
- **GUD-001**: Reuse existing shared search, filter, pagination, table, and column-visibility helpers from `src/components/shared/**` and `src/lib/**` where available so `/admin/assets` stays aligned with the existing admin-table UI in this repo.
- **GUD-002**: Default the create form expiry to 30 days ahead in the user interface, not by mutating the server schema.
- **GUD-003**: Render `note = null` and `proxy = null` as a clear empty state such as `-` or `Not set` in read-only contexts.
- **GUD-004**: Keep raw `asset_json` only in the detail form or detail panel, not in the list table.
- **GUD-005**: Use clear validation copy for invalid JSON, invalid expiry, and invalid enum selections.

### 3.10 File Placement Patterns
- **PAT-001**: `src/app/(admin)/admin/assets/page.tsx` must remain route composition only.
- **PAT-002**: Route-local UI may live in `src/app/(admin)/admin/assets/_components/**`.
- **PAT-003**: `src/modules/assets/services.ts`, `repositories.ts`, `schemas.ts`, and `types.ts` are the canonical domain files for asset rules, persistence, and data contracts.
- **PAT-004**: `src/modules/admin/assets/actions.ts` is the canonical admin mutation entrypoint for the `/admin/assets` route and must delegate to `src/modules/assets/services.ts`.
- **PAT-005**: `src/modules/admin/assets/queries.ts`, `schemas.ts`, and `types.ts` are the canonical admin read-model boundary for the asset table and detail-prefill flows.
- **PAT-006**: Table-specific UI state such as column visibility, search input debounce, date-range filter state, and dialog state must stay in the route-local UI layer or client state, not in domain services.
- **PAT-007**: If client-side React Query needs a browser-callable fetcher, a route-local query adapter may delegate to `src/modules/admin/assets/queries.ts`, but that adapter is transport-only, must not become the canonical read-model home, and must not introduce a new `/api/*` endpoint.

## 4. Interfaces & Data Contracts

### 4.1 Route Contract
| Route           | Type       | Contract                                                                                                                       |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/admin/assets` | Admin page | Displays asset inventory table, create control, filter controls, detail control, enable or disable actions, and delete action. |

### 4.2 Read Model Contract
| Name                 | Fields                                                                                                                                                            | Notes                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `AssetAdminRow`      | `id`, `platform`, `assetType`, `note`, `expiresAt`, `disabledAt`, `status`, `totalUsed`, `createdAt`, `updatedAt`                                                 | Main table row. Sensitive fields are intentionally excluded.      |
| `AssetTableFilters`  | `search`, `assetType`, `status`, `expiresFrom`, `expiresTo`, `page`, `pageSize`                                                                                   | `expiresFrom` and `expiresTo` are `yyyy-MM-dd` strings or `null`. |
| `AssetFormValues`    | `platform`, `assetType`, `account`, `note`, `proxy`, `assetJsonText`, `expiresAt`                                                                                 | UI form contract before parsing and normalization.                |
| `AssetFormInput`     | `platform`, `assetType`, `account`, `note`, `proxy`, `assetJson`, `expiresAt`                                                                                     | Domain write contract after parsing and normalization.            |
| `AssetEditorData`    | `id`, `platform`, `assetType`, `account`, `note`, `proxy`, `assetJson`, `expiresAt`, `disabledAt`, `status`, `totalUsed`, `createdAt`, `updatedAt`, `activeUsers` | Used to prefill the detail dialog.                                |
| `AssetActiveUserRow` | `userId`, `username`, `email`, `avatarUrl`, `accessKey`, `subscriptionId`, `subscriptionStatus`, `assignedAt`                                                     | Admin-visible current-user data.                                  |
| `AssetTableResult`   | `items`, `page`, `pageSize`, `totalCount`                                                                                                                         | Returned by the server-side list query.                           |
| `AssetToggleInput`   | `id`, `disabled`                                                                                                                                                  | `disabled = true` means disable, `false` means enable.            |
| `AssetDeleteInput`   | `id`                                                                                                                                                              | Used by the safe delete action.                                   |

### 4.3 Mutation Server Action Contracts
| Action                      | Input                      | Output                               | Notes                                                 |
| --------------------------- | -------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `createAssetAction`         | `AssetFormInput`           | Created asset row or action error    | Must create one `public.assets` row.                  |
| `updateAssetAction`         | `id` plus `AssetFormInput` | Updated asset detail or action error | Must update the existing row only.                    |
| `toggleAssetDisabledAction` | `AssetToggleInput`         | Updated asset row or action error    | Disable must set `disabled_at`, enable must clear it. |
| `deleteAssetAction`         | `AssetDeleteInput`         | Success flag or action error         | Must call the safe delete path.                       |

These mutation actions are admin-dashboard entrypoints and belong in `src/modules/admin/assets/actions.ts`. They must use `next-safe-action` and delegate business logic to `src/modules/assets/services.ts`.

### 4.4 Admin Query Contracts
| Query                | Input               | Output                    | Notes                                                                 |
| -------------------- | ------------------- | ------------------------- | --------------------------------------------------------------------- |
| `getAssetTablePage`  | `AssetTableFilters` | `AssetTableResult`        | Canonical admin read-model query for search, filters, and pagination. |
| `getAssetEditorData` | `id`                | `AssetEditorData \| null` | Canonical admin read-model query for sensitive detail prefill.        |

### 4.5 Validation Schema Contract
| Field                   | Rule                                                     |
| ----------------------- | -------------------------------------------------------- |
| `platform`              | Required enum: `tradingview`, `fxreplay`, `fxtester`.    |
| `assetType`             | Required enum: `private`, `share`.                       |
| `account`               | Required non-empty trimmed string.                       |
| `note`                  | Optional; trimmed blank becomes `null`.                  |
| `proxy`                 | Optional; trimmed blank becomes `null`.                  |
| `assetJsonText`         | Required form string that must parse to JSON.            |
| `assetJson`             | Required parsed JSON with top-level `array` or `object`. |
| `expiresAt`             | Required timestamp value.                                |
| `id` for edit or delete | Required valid UUID.                                     |
| `disabled`              | Required boolean for enable or disable toggle.           |

### 4.6 Computation Contract
| Computed value   | Rule                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Asset status     | Use `public.v_asset_status.status` or an equivalent server-side derivation that exactly matches the baseline view logic.                   |
| `total used`     | Use the active-use count from `public.v_asset_status.active_use` or an equivalent count of current non-revoked assignments for that asset. |
| Active user list | Join the same current non-revoked assignment predicate used for `total used` with `profiles` and optional subscription enrichment fields.  |
| `disabledAt`     | Directly mapped from `public.assets.disabled_at`; `null` means not disabled.                                                               |

### 4.7 Example Payloads
```json
{
  "platform": "tradingview",
  "assetType": "private",
  "account": "tv-admin-private-001@assetnext.dev",
  "note": "milestone-3-admin-asset-private-001",
  "proxy": "http://proxy.assetnext.dev/private-001",
  "assetJsonText": "[{\"name\":\"session\",\"value\":\"cookie-private-001\"}]",
  "expiresAt": "2026-05-15T00:00:00.000Z"
}
```

```json
{
  "id": "8f47232b-0f53-4d75-b86c-5e7876bde901",
  "platform": "fxreplay",
  "assetType": "share",
  "note": "seed share asset",
  "expiresAt": "2026-07-01T00:00:00.000Z",
  "disabledAt": null,
  "status": "available",
  "totalUsed": 3,
  "createdAt": "2026-04-01T12:00:00.000Z",
  "updatedAt": "2026-04-14T10:15:00.000Z"
}
```

## 5. Acceptance Criteria
- **AC-001**: Given a guest or member user opens `/admin/assets`, when the page loads, then access is denied and asset data is not shown.
- **AC-002**: Given an admin user opens `/admin/assets`, when the page loads, then the asset table renders without runtime error.
- **AC-003**: Given valid private-asset input, when the admin submits create, then exactly one new asset row appears and persists after reload.
- **AC-004**: Given valid share-asset input, when the admin submits create, then exactly one new asset row appears and persists after reload.
- **AC-005**: Given the create dialog opens, when the form first renders, then `expiresAt` is prefilled to approximately `now + 30 days`.
- **AC-006**: Given invalid enum values, blank account, or invalid JSON, when the admin submits create or edit, then the server rejects the request with a clear validation error and no row changes are persisted.
- **AC-007**: Given an existing asset, when the admin opens detail, then the persisted fields and current derived status are displayed from server data.
- **AC-008**: Given an existing asset, when the admin edits `note`, `proxy`, `account`, `assetJson`, or `expiresAt`, then the same asset row is updated and the changes persist after reload.
- **AC-009**: Given an unexpired enabled asset, when the admin disables it, then `disabled_at` becomes non-null and the status becomes `disabled`.
- **AC-010**: Given a disabled but otherwise valid asset, when the admin enables it, then `disabled_at` becomes `null` and the resulting status derives correctly from the remaining state.
- **AC-011**: Given an asset that is not currently in use, when the admin deletes it, then the row is removed from `public.assets` and no invalid orphan state remains.
- **AC-012**: Given the asset table, when search, filter, page change, date-range change, or column visibility changes occur, then the result set and column preferences behave deterministically across reloads.
- **AC-013**: Given a `share` asset with active use, when the table loads, then its status remains `available` unless it is expired or disabled.
- **AC-014**: Given a `private` asset with active use, when the table loads, then its status becomes `assigned` unless it is expired or disabled.
- **AC-015**: Given an asset has active users, when the detail dialog loads, then the current-user list displays those users using the admin identity presentation rules.
- **AC-016**: Given the runtime database is inspected with read-only InsForge CLI, when asset rows and status rows are queried, then `public.assets`, `public.v_asset_status`, and safe-delete row removal match the UI outcome.
- **AC-017**: Given an asset still has active assignments, when the admin edits `platform` or `assetType`, then the server rejects the request with a clear validation error and preserves the stored tuple.
- **AC-018**: Given an assigned asset is edited so `expiresAt` becomes earlier than `now()`, when the mutation completes, then the update persists, the asset becomes `expired`, and the same server-side flow triggers immediate re-evaluation for impacted assignments.

Non-blocking forward-compatibility note:
- Representative browser or CLI proof for the disable-time replacement-versus-`processed` recovery outcomes is intentionally deferred to later milestones even though the Milestone 3 mutation boundary must stay compatible with that behavior.
- **AC-019**: Given a search term matches multiple current users of the same `share` asset, when the table loads, then the asset appears only once and `totalCount` still counts distinct assets.
- **AC-020**: Given only `expiresFrom` or only `expiresTo` is present, when the table query runs, then the date filter behaves as a one-sided inclusive range using UTC day boundaries.
- **AC-021**: Given `expiresFrom` is later than `expiresTo`, when the canonical query contract is called directly, then it returns a clear validation error; when the route is opened through malformed search params, the page recovers safely without crashing.
- **AC-022**: Given a malformed mutation payload bypasses the UI, when the server action runs, then it rejects the payload with a clear validation error and persists no invalid row.

## 6. Test Automation Strategy
- **Test Levels**: unit, integration, and browser verification.
- **Unit Focus**: Zod validation for asset forms, JSON parsing, blank-to-null normalization, and date-range normalization.
- **Integration Focus**: asset repository queries, admin read-model filters, server actions, `v_asset_status` alignment, and safe delete wiring.
- **Browser Verification**: manual browser flow on `/admin/assets` using `agent-browser` CLI through the `agent-browser` skill.
- **Test Data Management**: use the runtime seed admin account and create temporary asset rows with deterministic notes or account values; do not rely on manual database edits during the flow under test.
- **CI/CD Integration**: at minimum run `pnpm lint`, `pnpm build`, and `pnpm check` after the feature implementation; run `pnpm markdown:check` when the Markdown docs for this milestone change.
- **Coverage Requirements**: all create, edit, toggle, delete, JSON-validation, and admin read-model filter paths should have automated coverage where the repository already supports it.
- **Performance Testing**: the asset table must remain paginated server-side and must not fetch the full asset inventory in one request.
- **Negative Path Coverage**: include malformed `assetJsonText`, reversed date range, guest or member direct access to `/admin/assets`, and malformed mutation payloads that bypass the UI.
- **Deferred Integration Proof**: standalone browser and CLI proof for full in-use recovery after disable or delete belongs to later milestones even though the Milestone 3 mutation boundary must remain compatible with that recovery path.
- **Runtime Health Verification**: relevant Next.js runtime and compilation diagnostics for `/admin/assets` should be checked through Next.js DevTools MCP and must show no Milestone 3-related runtime or compilation error.

## 7. Rationale & Context
The asset entity is the operational inventory source for fulfillment, subscriber assignment, member console access, and extension access. Milestone 3 must therefore finish the inventory-admin surface before subscription milestones rely on it.

Asset status is derived instead of stored because the baseline design intentionally keeps truth in `expires_at`, `disabled_at`, and active assignment state. This avoids app-layer drift where the UI could disagree with the database engine.

Safe delete is implemented through the baseline SQL engine because simple row deletion would break assignment history and could violate fulfillment invariants. The baseline functions already encode the correct revoke, re-fulfill, and snapshot-preservation behavior, so the application layer should wrap them rather than re-invent them.

Sensitive fields such as `account`, `proxy`, and `asset_json` are limited to asset detail because they are operational secrets and do not belong in the general inventory list payload.

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: InsForge Auth - required for admin session identity and role-based access control.
- **EXT-002**: InsForge Database - required for asset storage, assignment lookup, views, and safe-delete or recheck functions.

### Infrastructure Dependencies
- **INF-001**: Runtime database with `auth.users` and applied baseline migrations `001_extensions.sql` through `030_rpc.sql`.
- **INF-002**: Browser-verifiable seed data that includes an admin login fixture and assigned-asset fixture for detail inspection.
- **INF-003**: Next.js App Router runtime with the `(admin)` route group already available.

### Data Dependencies
- **DAT-001**: `public.assets` for asset storage.
- **DAT-002**: `public.asset_assignments` for `total used`, current users, and history preservation.
- **DAT-003**: `public.v_asset_status` for derived status and active-use counts.
- **DAT-004**: `public.subscriptions` and `public.profiles` for current-user detail context.
- **DAT-005**: `public.delete_asset_safely(uuid)` for safe hard delete.
- **DAT-006**: `public.validate_asset_assignment()` as the invariant guard that later subscriber flows must continue to satisfy.
- **DAT-007**: `public.recheck_subscription_after_asset_change(uuid)` as a later-milestone integration dependency for immediate invalid-asset recovery.

### Technology Platform Dependencies
- **PLT-001**: Next.js App Router.
- **PLT-002**: `next-safe-action` for admin mutations.
- **PLT-003**: `react-hook-form` for asset forms.
- **PLT-004**: `zod` for input validation.
- **PLT-005**: Existing Tailwind and UI primitives from `src/components/ui/**`.
- **PLT-006**: Shared table, filter, state, query-provider, and local-storage helpers under `src/components/shared/**` and `src/lib/**` when available, plus the ability to add minimal missing shared pieces there if the exact helper set is not already present.
- **PLT-007**: `TanStack React Query` and `TanStack React Table` consistent with the existing shared admin-table stack already present in the repo.

Admin table reads may come from Server Components or from a route-local transport adapter that delegates to the canonical server-side read model. Such read transports must stay server-side, must avoid new public `/api/*` endpoints, and must not replace `src/modules/admin/assets/queries.ts` as the canonical read-model home.

### Compliance Dependencies
- **COM-001**: Admin-only access to `/admin/*`.
- **COM-002**: Server-side mutation enforcement for internal web UI asset management.
- **COM-003**: Asset delete must preserve history snapshots.
- **COM-004**: Disabled or expired assets must remain excluded from active-access read paths even if reconciliation has not yet run.

## 9. Examples & Edge Cases
```json
{
  "platform": "fxtester",
  "assetType": "share",
  "account": "share-user@assetnext.dev",
  "note": null,
  "proxy": null,
  "assetJson": {
    "token": "share-cookie"
  },
  "expiresAt": "2026-05-20T00:00:00.000Z"
}
```

| Scenario                                                       | Expected Result                                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Blank `note` or `proxy`                                        | Normalize to `null` before save.                                                               |
| Invalid JSON text in the form                                  | Reject with validation error before persistence.                                               |
| Top-level JSON scalar such as string or number                 | Reject because `asset_json` must be `array` or `object`.                                       |
| Share asset has `totalUsed > 0` and is not expired or disabled | Status remains `available`, not `assigned`.                                                    |
| Private asset has one active assignment                        | Status becomes `assigned`.                                                                     |
| Asset is enabled again after expiry has already passed         | `disabled_at` clears, but status remains `expired`.                                            |
| Admin searches by current user email                           | Matching asset rows appear even though user identity is not a mandatory table column.          |
| Asset is safely deleted                                        | Row disappears from `public.assets`; assignment history remains in `public.asset_assignments`. |

## 10. Validation Criteria
- **VAL-001**: `/admin/assets` is admin-only and denies guest or member access.
- **VAL-002**: Create and edit inputs pass Zod validation before any database write.
- **VAL-003**: `public.assets.asset_json` always satisfies the baseline `jsonb_typeof(asset_json) in ('array', 'object')` contract after create or edit.
- **VAL-004**: `status` shown in the admin table matches `public.v_asset_status` or an equivalent derivation.
- **VAL-005**: `total used` matches the active assignment count used by the server read model.
- **VAL-006**: Disable and enable mutate `disabled_at` only and preserve the asset row.
- **VAL-007**: Delete executes the safe-delete path and removes the asset row without breaking history snapshots.
- **VAL-008**: Column visibility persists after a page reload.
- **VAL-009**: Read-only InsForge CLI verification against the runtime database matches the UI state.
- **VAL-010**: `pnpm lint`, `pnpm build`, and `pnpm check` complete successfully after implementation.
- **VAL-011**: Asset-list search over username or email returns distinct asset rows without duplicate pagination artifacts.
- **VAL-012**: Current-user rows, `total used`, and derived status all reflect the same active-assignment predicate.
- **VAL-013**: The asset-list contracts never expose raw `account`, `proxy`, or `assetJson` values.
- **VAL-014**: Editing `platform` or `assetType` on an in-use asset is rejected unless the asset has no active assignments.
- **VAL-015**: Editing `expiresAt` into the past on an in-use asset triggers immediate server-side re-evaluation of impacted assignments.
- **VAL-016**: Next.js DevTools MCP shows no relevant runtime or compilation errors for the `/admin/assets` implementation.

## 11. Related Specifications / Further Reading
- `docs/PRD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DB.md`
- `docs/agent-rules/folder-structure.md`
- `migrations/011_catalog_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/021_rls_policies.sql`
- `migrations/022_subscription_engine.sql`
- `migrations/024_views.sql`
