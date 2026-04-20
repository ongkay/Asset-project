---
title: Milestone 9 Admin Home Design
version: 1.0
date_created: 2026-04-20
last_updated: 2026-04-20
owner: AssetProject
tags: [design, admin, dashboard, analytics, recent-users, react-query, milestone-9]
---

# Introduction
This document defines the approved design direction for Milestone 9 Admin Home at `/admin`. It translates the current milestone scope, the existing repo structure, and the approved UI direction into a concrete design contract before implementation planning begins.

The goal is to replace the current placeholder admin overview with a real operational dashboard that reads runtime data from the existing admin read-model boundary, remains visually consistent with the authenticated admin UI already in the repo, and stays small enough to implement without dragging unrelated reporting features into Milestone 9.

This design intentionally keeps the page focused on the required milestone scope only:
- summary statistics
- chart-driven operational visibility
- date range controls
- recent user activity surface

It does not include optional extras from the ASCII mockup such as revenue-by-source, asset-health, or manual operational notes.

## 1. Source Of Truth And Explicit Overrides

### 1.1 Source Documents
This design must remain consistent with:
- `docs/PRD.md`
- `docs/DB.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`

It must also stay aligned with the current admin-route implementation pattern already used in:
- `src/app/(admin)/admin/assets/*`
- `src/app/(admin)/admin/users/*`
- `src/app/(admin)/admin/userlogs/*`

### 1.2 Visual Reference Rules
Visual language must follow the existing internal dashboard/admin baseline already present in the repo.

Reference inputs:
- `src/app/(main)/dashboard/default/*` as the primary reference for overall dashboard composition, hero-chart treatment, card rhythm, and KPI hierarchy
- `src/app/(main)/dashboard/crm/*` as the primary reference for overview-card composition, mixed chart density, and multi-row dashboard balance
- `src/app/(admin)/admin/assets/*` as a secondary reference only for admin-shell alignment, table/detail restraint, and admin-route interaction tone where relevant
- `docs/works/m9-admin-home-ascii.md` as layout inspiration only

The design must not copy demo copy, fake metrics, or template semantics from legacy dashboard pages, but it must intentionally stay recognizably in the same dashboard family as `default` and `crm`.

### 1.3 Approved Override To Current PRD/Plan Wording
The source docs currently frame the activity widget as `Live User` with an online window of the last 10 minutes.

The user explicitly approved a different behavior for this milestone design:
- the widget is renamed to `Recent Users`
- it shows the latest 50 member rows by `lastSeenAt`
- it does not apply the `10 minutes` online cutoff

This override is intentional and must be treated as user-approved design direction for the implementation plan that follows this document.

## 2. Design Goals

### 2.1 Primary Goals
- Make `/admin` feel like the real admin landing page, not a navigation placeholder.
- Keep the page scannable in one pass for operational admin usage.
- Keep data reads server-safe while matching the React Query pattern already used by other admin routes.
- Show enough chart context to make the dashboard useful without turning it into a broad BI/reporting feature.

### 2.2 Non-Goals
- No new admin write path.
- No public internal REST endpoint.
- No export/report builder.
- No extra KPI blocks outside the milestone's required scope.
- No visual system rewrite or new design-system foundation.

## 3. Route And Architecture

### 3.1 Route Ownership
- Final route remains `src/app/(admin)/admin/page.tsx`.
- `page.tsx` stays thin and route-oriented.
- Business and read-model logic remain in `src/modules/admin/dashboard/*`.
- Route-local UI composition remains in `src/app/(admin)/admin/_components/*`.

### 3.2 Access Model
- The page is admin-only.
- All reads execute on the server with the active admin app session.
- The browser must not use privileged database credentials.

### 3.3 Read Pattern
The dashboard must follow the same broad consistency pattern as other admin routes in the repo:
- initial page composition comes from the App Router route
- page state and refetch behavior are handled in route-local client components
- React Query is used for client read-state consistency
- server-side query functions remain the canonical data boundary

This keeps the dashboard consistent with the rest of `/admin/*` while preserving the existing folder boundaries.

### 3.4 Proposed File Shape
The implementation plan must target this structure unless a smaller equivalent route-local split is proven clearer during planning:

```txt
src/app/(admin)/admin/
|- page.tsx
`- _components/
   |- admin-dashboard-page.tsx
   |- admin-dashboard-query.ts
   |- use-admin-dashboard-state.ts
   |- admin-dashboard-summary-cards.tsx
   |- admin-dashboard-sales-chart.tsx
   |- admin-dashboard-member-growth-chart.tsx
   |- admin-dashboard-transactions-chart.tsx
   |- admin-dashboard-subscription-composition-card.tsx
   `- admin-dashboard-recent-users-table.tsx

src/modules/admin/dashboard/
|- queries.ts
`- types.ts
```

## 4. Page Composition

### 4.1 Layout Order
The final dashboard layout is a single page with four content rows:

1. summary cards row
2. sales trend hero chart row
3. member growth chart + recent users table row
4. transactions chart + subscription composition row

### 4.2 Summary Cards
The first row contains exactly four cards:
- `Total Member`
- `Member Berlangganan`
- `Total Asset`
- `Total Transaksi Sukses`

These are the headline metrics and should remain the fastest-scanning section on the page.

### 4.3 Sales Trend
The second row contains the dominant full-width chart card.

Purpose:
- show total successful transaction value in Rupiah across the active range
- host the shared range controls in the most visible location

This card is the main visual anchor of the page.

### 4.4 Member Growth
This chart shows member movement over time using two series in one chart:
- new members
- subscribed members

This keeps the page within milestone scope without needing an extra chart slot.

### 4.5 Transactions Chart
This chart shows successful transaction count over time.

It intentionally complements the sales trend card:
- sales trend answers value in Rupiah
- transactions chart answers event count

### 4.6 Subscription Composition
The subscription-type metrics required by the milestone are represented in one composition card rather than three separate KPI cards.

The card must visibly show:
- `private`
- `share`
- `mixed`

The visual uses a donut-style composition chart paired with explicit numeric labels for `private`, `share`, and `mixed`.

### 4.7 Recent Users
The activity widget is a mini table, not a card list.

Each row must display:
- user cell as `avatar + username + email ringkas`
- role
- active package name
- last seen absolute timestamp in `dd/mm/yy HH:mm`
- last seen relative text such as `5 menit lalu` or `2 jam lalu`

The table shows up to 50 member rows sorted by the most recent `lastSeenAt`.

## 5. Responsive Behavior

### 5.1 Mobile
- summary cards stack to one column
- charts and activity panels become a single vertical flow
- recent users remains readable without relying on desktop-only density

### 5.2 Tablet
- summary cards move to two columns
- lower dashboard rows can render as two-column sections if space allows

### 5.3 Desktop
- summary cards render as four columns
- sales trend remains full width
- rows three and four use stable two-column grids

The layout should follow the repo's container-query and admin-card rhythm rather than fixed-width marketing-style blocks.

## 6. Range Control Design

### 6.1 Required Controls
The dashboard supports three range modes:
- `30 hari`
- `90 hari`
- custom date range picker

### 6.2 Default State
- page default is `30 hari`

### 6.3 Behavior Rules
- changing any range control updates the full dashboard, not just one card
- custom mode only triggers a read when both dates are valid
- invalid custom range (`from > to`) is blocked client-side
- invalid custom range shows inline validation near the control, not a global toast

### 6.4 Placement
The shared range controls live in the `Sales Trend` card header because that card is the page's visual anchor and already owns the transaction-value context.

## 7. Data Contract

### 7.1 Query Strategy
The page uses one dashboard query contract rather than one fetch per widget.

Reasoning:
- all widgets stay in sync when the range changes
- loading and error states stay unified
- React Query usage remains consistent but not fragmented
- the page feels cohesive rather than assembled from unrelated widget fetches

### 7.2 Query Input
The dashboard read contract accepts:
- `preset`: `30d | 90d | custom`
- `from`: ISO datetime
- `to`: ISO datetime

### 7.3 Query Output
The dashboard read contract returns:

```ts
type AdminDashboardReadModel = {
  summary: {
    totalMembers: number;
    totalSubscribedMembers: number;
    totalAssets: number;
    totalSuccessAmountRp: number;
  };
  salesSeries: Array<{
    bucketLabel: string;
    amountRp: number;
  }>;
  memberGrowthSeries: Array<{
    bucketLabel: string;
    newMembers: number;
    subscribedMembers: number;
  }>;
  transactionSeries: Array<{
    bucketLabel: string;
    successCount: number;
  }>;
  subscriptionComposition: {
    private: number;
    share: number;
    mixed: number;
  };
  recentUsers: Array<{
    userId: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    role: "member";
    activePackageName: string | null;
    lastSeenAt: string;
  }>;
  range: {
    preset: "30d" | "90d" | "custom";
    from: string;
    to: string;
    label: string;
  };
};
```

Exact property names may change during implementation planning, but the contract shape and meaning must remain equivalent.

### 7.4 Data Sources
- Aggregate summary must reuse `get_admin_dashboard_stats(from, to)` for the metrics it already exposes.
- Additional chart series and recent-user reads must be composed in `src/modules/admin/dashboard/queries.ts` using stable server-side query composition.
- `Recent Users.lastSeenAt` must use the latest available timestamp between `app_sessions.last_seen_at` and `extension_tracks.last_seen_at` for each member when both sources exist.
- `Recent Users.activePackageName` must come from the member's currently running subscription with status `active` or `processed`, and must be `null` when no running subscription exists.

## 8. React Query And State Rules

### 8.1 Query Key
The route uses one stable query key shaped around the selected range values, for example:

```ts
["admin-dashboard", { preset, from, to }]
```

### 8.2 Route State
Route-local state should own:
- selected preset
- custom date picker values
- normalized effective range sent to the query

### 8.3 Refetch UX
- use keep-previous-data or equivalent behavior so the page does not flicker hard during range changes
- show a lightweight updating indicator near the range controls while refetch is running

## 9. UI Rules

### 9.1 Visual Language
The page must feel like a production admin dashboard, not a generic landing page.

Approved direction:
- dashboard composition first follows `src/app/(main)/dashboard/default/*` and `src/app/(main)/dashboard/crm/*`
- bordered cards
- light shadows only
- compact operational copy
- data-dense but readable composition
- charts that prioritize scanning over decoration

The `assets` admin page is not the visual source of truth for the `/admin` home layout. It remains useful only as a secondary reference for admin-shell continuity and restrained operational tone.

### 9.2 Token Discipline
Implementation must use the repo's existing semantic tokens and primitives.

The UI/UX skill's design-system guidance supports a neutral, operational, data-dense dashboard style, but its raw font and hex recommendations are advisory only. Repo tokens, `globals.css`, and existing admin primitives remain authoritative.

### 9.3 Component Expectations
The design assumes reuse of existing primitives such as:
- `Card`
- `Badge`
- `Avatar`
- `Table`
- `Chart`
- `Skeleton`
- `Alert`
- date/select/toggle primitives already present in `src/components/ui/*`

## 10. Loading, Empty, And Error States

### 10.1 Initial Load
- show dashboard-shaped skeletons per block
- avoid layout jump between loading and resolved content

### 10.2 Range Refetch
- preserve previous resolved data while the next range is loading
- show a local updating signal in the dashboard header area

### 10.3 Query Error
- render a restrained alert card inside the page body
- include retry
- keep the admin shell intact

### 10.4 Empty States
- if a chart range has no data, show a clear no-data card state instead of a broken empty chart frame
- if `Recent Users` has no readable rows, show a neutral empty state instead of treating it as a load failure

## 11. Verification Intent

The implementation plan must preserve these proof points:
- admin login lands on `/admin`
- dashboard renders without runtime error
- default range is `30 hari`
- switching to `90 hari` changes data
- valid custom range changes data
- invalid custom range is blocked locally
- non-admin access is denied
- `Recent Users` shows the latest 50 member rows by `lastSeenAt`
- dashboard data remains consistent with the server-side read model used by the page

## 12. Risks And Guardrails

### 12.1 Main Risks
- drifting away from the admin-route React Query pattern used elsewhere in the repo
- over-expanding scope into general reporting widgets not required by milestone 9
- mixing placeholder legacy dashboard semantics back into the final `/admin`
- leaving the activity widget ambiguously named relative to its real behavior

### 12.2 Guardrails
- keep one canonical admin dashboard read model
- keep route files thin
- do not add internal REST endpoints for this page
- do not introduce HeroUI or a new design foundation
- keep the `Recent Users` label honest to its non-live behavior

## 13. Approved Outcome
Milestone 9 Admin Home is considered correctly designed when `/admin` is no longer a placeholder hub and instead becomes a real, data-backed, admin-only dashboard that:
- uses the repo's existing dashboard visual language with `default` and `crm` as the primary composition references
- follows the repo's current React Query-based admin read pattern
- keeps the milestone scope tight
- exposes a truthful `Recent Users` activity surface
- is ready to be translated into an implementation plan without reopening the page architecture or layout decisions
