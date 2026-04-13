## Why

Phase 1 auth is the first end-to-end product slice that turns the current shell routes into a usable application entry point. The project already has a detailed implementation contract, but it still needs an OpenSpec change that turns the auth, session, reset-password, and role-guard requirements into an implementation-ready proposal with matching specs, design, and tasks.

## What Changes

- Add the Phase 1 web auth flow for `/login` with email check, password step, inline register branch, and register confirmation dialog.
- Add the Phase 1 reset-password flow for requesting reset instructions and completing password reset from a valid reset link.
- Add trusted server-side auth orchestration for login, register, logout, reset password, failed-login tracking, login logging, banned-user rejection, and fail-closed handling when required app profile state is missing.
- Add app-session lifecycle handling with `app_session` cookie creation, hashed session persistence in `app_sessions`, old-session revocation, and logout revocation.
- Add role-based redirect and guarded shell behavior for `/console` and `/admin`, including single-device enforcement and `last_seen_at` touch on authenticated shell access.
- Add explicit separation between browser acceptance flow and required server-side auth invariants so Phase 1 gate evidence is not ambiguous.
- Add OpenSpec capability specs that define the auth behavior contract needed before implementation.

## Capabilities

### New Capabilities
- `web-auth`: Email/password authentication for the web app, including login, register, reset password, logout, session management, failed-login UX, and role-based guarded shell access.

### Modified Capabilities
- None.

## Impact

- Affected routes: `src/app/(public)/login`, `src/app/(public)/reset-password`, `src/app/(member)/console`, `src/app/(admin)/admin`, and related layouts/guards.
- Affected modules: `src/modules/auth`, `src/modules/sessions`, `src/modules/users`, and shared server infrastructure under `src/lib/insforge/**` and `src/lib/safe-action/**`.
- Affected data/runtime systems: InsForge Auth, `profiles`, `app_sessions`, `login_logs`, request metadata parsing, trusted server-only DB access paths, and cookie handling for `app_session`.
- Verification impact: Phase 1 browser checklist from `docs/IMPLEMENTATION_PLAN.md`, server-side invariant verification outside the manual browser gate, project quality gates, and runtime verification against the seeded InsForge-backed database.
