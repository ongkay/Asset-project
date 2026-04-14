## 1. Auth domain foundations

- [x] 1.1 Audit the existing Phase 0 auth, session, safe-action, and guard baseline to confirm the reusable pieces already present for Phase 1.
- [x] 1.2 Add or complete `src/modules/auth/schemas.ts` with normalized email, login, register, reset request, reset completion, and request metadata schemas.
- [x] 1.3 Add or complete `src/modules/auth/types.ts` with the auth result, redirect, failure-reason, and reset-flow types needed by the feature.
- [x] 1.4 Add or complete `src/modules/auth/repositories.ts` with trusted InsForge Auth calls for email check, login, register, reset request, reset completion, and profile lookup or upsert helpers.
- [x] 1.5 Add or complete `src/modules/auth/services.ts` with the Phase 1 orchestration for email branching, login, register, failed-login counter evaluation, reset request, reset completion, banned-user rejection, and fail-closed handling when an existing-user profile is missing.

## 2. App-session and auth event lifecycle

- [x] 2.1 Add or complete `src/modules/sessions/repositories.ts` for hashed app-session lookup, create, revoke, active-session validation, and `last_seen_at` touch operations.
- [x] 2.2 Add or complete `src/modules/sessions/services.ts` so login, register, logout, and guarded shell access reuse one canonical app-session lifecycle.
- [x] 2.3 Implement trusted success and failure login-log writes with required request metadata and stable failure reasons.
- [x] 2.4 Implement the server-side failed-login threshold query from `login_logs` so only `wrong_password` failures count toward the reset CTA, which appears after five recent consecutive failures and resets on success or after 15 minutes.
- [x] 2.5 Add or complete generic request metadata parsing in `src/lib/**` for trusted IP extraction plus nullable browser and OS values.

## 3. Server Actions and route wiring

- [x] 3.1 Implement `src/modules/auth/actions.ts` with `next-safe-action` mutations for email check, login, register, reset request, reset completion, and logout.
- [x] 3.2 Build the `/login` route-local UI under `src/app/(public)/login/_components/**` for email step, password step, register confirmation dialog, register step, inline validation, loading states, and conditional reset CTA.
- [x] 3.3 Keep `src/app/(public)/login/page.tsx` as route composition only and wire it to the auth components and actions.
- [x] 3.4 Build the `/reset-password` route-local UI under `src/app/(public)/reset-password/_components/**` for request state, generic success state, valid reset state, invalid-link state, password plus confirm-password inputs, and password show or hide controls.
- [x] 3.5 Keep `src/app/(public)/reset-password/page.tsx` as route composition only and wire it to the reset actions and token-state handling.

## 4. Guarded shell behavior

- [x] 4.1 Complete the shared authenticated guard path in `src/modules/users/services.ts` or the existing guard boundary so it validates `app_session`, rejects banned users, applies role redirects, and touches `last_seen_at`.
- [x] 4.2 Wire `(member)` shell access so guests are redirected to auth flow and admins opening `/console` are redirected to `/admin`.
- [x] 4.3 Wire `(admin)` shell access so guests are redirected to auth flow and members are denied access.
- [x] 4.4 Implement logout UI integration so submitting logout revokes the active app session and clears the cookie before redirecting to `/login`.

## 5. Verification and quality gates

- [ ] 5.1 Manually verify the Phase 1 browser checklist with `agent-browser`, including member login, admin login, inline register, reset request, reset completion, logout, single-device invalidation, and guarded route behavior.
- [x] 5.2 Verify the failed-login threshold behavior, including hidden CTA before five failures, visible CTA on the fifth failure, reset after successful login, and reset after the 15-minute window using a development-safe verification strategy.
- [ ] 5.3 Verify required server-side auth invariants through automated tests, trusted diagnostics, or controlled development verification: `app_sessions` stores only `token_hash`, unregistered email check has no auth side effect, success and failure `login_logs` are written, `last_seen_at` is touched, and banned or profile-missing login does not leave an active session.
- [x] 5.4 Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm check`, then record any unrelated failures instead of claiming a green gate that was not achieved.
