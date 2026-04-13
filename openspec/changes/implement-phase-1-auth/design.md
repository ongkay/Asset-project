## Context

Phase 1 auth is the first vertical slice that must make the public auth routes, member shell, and admin shell usable end-to-end from a real browser. The source documents already define the product rules in detail: `/login` is a single email-first route that branches into login or register, `/reset-password` must hide account existence, successful auth must create an app-owned `app_session`, and `/console` plus `/admin` must enforce role-aware access.

This change crosses multiple modules and security boundaries. It touches App Router route composition, `next-safe-action` server mutations, InsForge Auth, trusted server-side writes to `profiles`, `app_sessions`, and `login_logs`, and server-side session validation that also updates `app_sessions.last_seen_at`. The implementation must keep `src/app/**` thin, place business rules in `src/modules/**`, avoid new public REST endpoints for web auth, and preserve the database invariants already defined by the baseline SQL.

## Goals / Non-Goals

**Goals:**
- Deliver a complete browser-usable Phase 1 auth flow for login, register, reset password, logout, role redirect, and guarded shell access.
- Keep the web auth surface aligned with the existing architecture: App Router pages for composition, `src/modules/auth/**` for auth logic, `src/modules/sessions/**` for app-session lifecycle, and `src/modules/users/**` for shell guard decisions.
- Enforce single-device login through the app-owned `app_session` contract instead of relying only on the auth provider browser session.
- Reuse the existing database baseline and derive failed-login behavior from server-side state without introducing a new baseline migration.
- Make the implementation verifiable through the Phase 1 browser checklist and existing quality gates.

**Non-Goals:**
- Adding OAuth, magic link, OTP, phone auth, or any non-email/password auth method.
- Building the final member console UI or final admin dashboard UI beyond the guarded shell needed in Phase 1.
- Adding public REST endpoints for internal web auth flows.
- Changing core schema design for sessions, login logs, or profiles beyond what the current migrations and trusted server-side helpers already support.

## Decisions

### 1. Keep route files thin and place auth orchestration in domain modules
The `/login` and `/reset-password` pages will stay route-composition only, with route-local UI under `_components` and all mutation entry points in `src/modules/auth/actions.ts`. Business rules will live in `src/modules/auth/services.ts`, while session creation, revocation, validation, and last-seen updates remain in `src/modules/sessions/**`.

Rationale:
- This matches the required folder structure and keeps App Router files focused on UI composition and redirects.
- It makes Phase 1 reusable by later phases that need login state, logout, and shell guards.

Alternatives considered:
- Putting auth logic directly in `page.tsx` or route-local client components was rejected because it breaks the architecture rules and makes future reuse harder.
- Creating internal `/api/*` endpoints for web auth was rejected because the project explicitly requires Server Actions for internal web mutations.

### 2. Treat `app_session` as an app-owned session layer above InsForge Auth
Successful login and register will authenticate or create the user through InsForge Auth, then create a separate opaque app session token for the `app_session` cookie. Only the token hash will be stored in `app_sessions`, and all old active sessions for the user will be revoked before the new row is inserted.

Rationale:
- The PRD requires one shared cookie contract for web and extension access, plus single-device enforcement controlled by the app.
- The database baseline already provides the partial unique index and helper contract needed for one active app session per user.

Alternatives considered:
- Relying only on the provider session was rejected because it would not satisfy the `app_session` cookie contract or the extension API requirements.
- Storing the raw token in the database was rejected because it violates the documented security requirements.

### 3. Keep session creation and login-log writes in one trusted server-side flow with compensation on failure
The login and register success path will follow a single trusted server-side sequence: validate input, authenticate/create user, ensure profile exists, reject banned users, revoke old app sessions, create the new app session, set the cookie, and write the success login log. If a failure happens after the new session is inserted, the flow will revoke that new session and clear the cookie before returning an error.

Rationale:
- `app_sessions` and `login_logs` are server-only write paths under the current RLS baseline.
- The source specification requires that a partial failure does not leave a live session behind.

Alternatives considered:
- Splitting session creation and login logging into unrelated calls was rejected because it increases the chance of inconsistent auth state.

### 3a. Fail closed when auth succeeds but the required app profile is missing
Existing-user login and reset completion will treat `profiles` as required app state after provider authentication succeeds. If the auth provider returns a valid user but the matching `profiles` row cannot be resolved, the flow will stop, write a stable failure reason such as `profile_missing`, and avoid creating a new app session.

Rationale:
- The baseline schema makes `profiles` the source of truth for role and banned state, and `app_sessions.user_id` references `profiles(user_id)`.
- Proceeding without a profile would make role redirect, ban checks, and session insert behavior inconsistent.

Alternatives considered:
- Auto-creating a profile on every existing-user login was rejected because only public self-register is allowed to provision a default member profile in this phase.

### 4. Derive the failed-login counter from `login_logs` instead of adding a new table
The failed-login threshold will be computed server-side from indexed `login_logs` data for the normalized email, using only recent failed password submissions with `failure_reason = 'wrong_password'` that are newer than the latest success and newer than the 15-minute cutoff.

Rationale:
- The database already has the required indexes, and the source documents explicitly allow deriving the counter from `login_logs`.
- This avoids a new baseline migration in Phase 1.

Alternatives considered:
- A dedicated failed-attempt table was rejected because it adds new persistence and migration scope without a documented need.
- A client-managed counter was rejected because the requirements demand server-side consistency.

### 5. Make reset password provider-aware but keep the route contract provider-agnostic
`/reset-password` will expose one request flow and one completion flow at the app level. Internally, the auth module may exchange provider-specific reset parameters such as `code` or `otp` if required by the InsForge adapter, but the UI and Server Action contract will treat reset completion as one token-based flow. The submitted email may be kept for UX continuity, but actor resolution and redirect authority must come from the provider-validated reset context plus `profiles`. If the provider cannot return a valid authenticated context after password reset, the flow will redirect to `/login` with a clear instruction to sign in using the new password.

Rationale:
- The product requirement is a single reset-link-token experience, while the provider integration detail may vary.
- The fallback preserves usability without inventing unsupported provider behavior.

Alternatives considered:
- Exposing provider-specific reset mechanics directly in the page contract was rejected because it leaks adapter details into product behavior.

### 6. Centralize role guard and `last_seen_at` updates in server-side session validation
The canonical shell guard path will validate the `app_session`, load the related profile, reject banned users, apply role redirects, and update `app_sessions.last_seen_at` during successful authenticated shell access.

Rationale:
- This keeps `/console` and `/admin` behavior consistent across direct URL access, reloads, and post-login redirects.
- It matches the project rule that `last_seen_at` must be touched from authenticated server-side flows.

Alternatives considered:
- Updating `last_seen_at` from client-side effects was rejected because it is less trustworthy and conflicts with the server-side session contract.
- Duplicating guard logic separately in member and admin routes was rejected because it risks drift.

### 7. Keep request metadata parsing as generic infrastructure
IP extraction is required for `login_logs`, while browser and OS parsing is optional. The parsing and normalization of request metadata should live in `src/lib/**` as generic infrastructure and feed validated metadata into auth actions.

Rationale:
- The folder rules allow shared request metadata parsing in `src/lib/**` when it is generic infrastructure.
- This avoids mixing HTTP parsing concerns into auth business rules.

Alternatives considered:
- Adding a new user-agent dependency immediately was rejected because the spec allows nullable `browser` and `os` when parsing is unavailable.

### 8. Separate browser gate evidence from server-side invariants
The Phase 1 browser checklist remains the primary E2E gate for user-visible behavior. Server-side auth invariants such as `token_hash`-only persistence, login-log side effects, no mutation for unregistered email checks, and `last_seen_at` touch remain mandatory, but they must be verified through automated tests, trusted server-side diagnostics, or another controlled verification path instead of being treated as browser-only checklist items.

Rationale:
- The implementation plan requires Phase gates to be provable from browser behavior without depending on ad-hoc SQL inspection.
- Some auth correctness rules are real but not directly browser-visible, so they need a different verification channel.

Alternatives considered:
- Treating raw SQL inspection as the primary Phase 1 proof was rejected because it conflicts with the delivery-mode rules.

## Risks / Trade-offs

- [InsForge reset completion may not return an authenticated user context] -> Wrap the provider-specific behavior behind the auth repository and support the documented `/login` fallback after successful password update.
- [Session row and success log can become inconsistent if a late step fails] -> Keep the success path in one trusted server-side unit and revoke the newly created session plus clear the cookie on post-insert failure.
- [Failed-login queries can become noisy or expensive] -> Limit the query to one normalized email, reuse the existing `(email, created_at desc)` index, and only evaluate password-submission failures inside the recent window.
- [Profile creation can hit unique collisions for `username` or `public_id`] -> Generate both server-side, retry on conflict, and keep the collision strategy inside the trusted auth service.
- [Role guard behavior can drift between `/console` and `/admin`] -> Keep the final decision in a shared server-side guard/service layer instead of duplicating it in page-level UI logic.
- [Browser verification can produce misleading results if runtime points to the wrong database] -> Use the seeded runtime database referenced by `DATABASE_URL` and follow the Phase 1 browser checklist from the implementation plan.

## Migration Plan

1. Confirm Phase 0 prerequisites are present: route groups, shared InsForge adapters, `next-safe-action` setup, and shell guard foundations.
2. Implement auth schemas, actions, repositories, and services in `src/modules/auth/**`, reusing `src/modules/sessions/**` and `src/modules/users/**` where required.
3. Wire `/login` and `/reset-password` route-local UI to the new Server Actions without creating internal REST endpoints.
4. Wire guarded shell access so direct visits, reloads, and redirects all use the same validated app-session path.
5. Verify database-facing behavior against the runtime InsForge database with the seed accounts required by Phase 1.
6. Run relevant quality gates and browser verification.

Rollback strategy:
- This change is application-layer only and should be rolled back by reverting the code change if needed.
- No new baseline migration is assumed for this Phase 1 auth change.

## Open Questions

- Does the current Phase 0 baseline already include the exact `next-safe-action` factory and guard helpers required for auth, or must those pieces be completed as part of this change before feature code lands?
- Which InsForge reset-password callback parameters are exposed in the current runtime integration, and does the provider return a valid authenticated context after password update in all supported environments?
- Is there already a shared request metadata parser in `src/lib/**`, or should Phase 1 introduce the minimal generic parser needed for IP, browser, and OS extraction?
