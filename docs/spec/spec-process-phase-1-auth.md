---
title: Phase 1 Auth Implementation Specification
version: 1.0
date_created: 2026-04-13
last_updated: 2026-04-13
owner: AssetProject
tags: [process, auth, nextjs, insforge, phase-1]
---

# Introduction
This specification defines the complete Phase 1 Auth implementation contract for AssetProject. It is written for AI coding agents that will implement the phase later. It consolidates requirements from `docs/PRD.md`, `docs/user-flow/auth-flow.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DB.md`, `docs/agent-rules/folder-structure.md`, and `migrations/*.sql`.

Phase 1 is complete only when authentication can be executed end-to-end from a real browser route: login, register, reset password, logout, role redirect, session creation, session revocation, failed-login counter, login logging, and guarded shell access.

## 1. Purpose & Scope

### 1.1 Purpose
The purpose of this specification is to provide an implementation-ready contract for Phase 1 Auth so an AI agent can implement the feature without inventing new behavior or conflicting with the project source of truth.

### 1.2 In Scope
- `/login` email-first flow.
- Login for registered email.
- Register for unregistered email in the same `/login` flow.
- Auto login after successful register.
- `/reset-password` request reset flow.
- `/reset-password` set new password flow after a valid reset-link token.
- Password and confirm password validation.
- Show/hide control for every password input.
- Failed-login counter per email.
- Reset password CTA or dialog after 5 failed login attempts for the same email.
- Counter reset after successful login or after 15 minutes since the last failure.
- `app_session` cookie creation, validation, and clearing.
- Opaque raw session token in cookie and `token_hash` only in database.
- Revoke all old sessions on login or register success.
- Logout that revokes the active session and clears the cookie.
- Login log writes for success and failure.
- Role-based redirect after successful auth:
  - `member` to `/console`
  - `admin` to `/admin`
- Banned user rejection before a new `app_session` is created.
- Guarded shell behavior for `/console` and `/admin`.
- Manual browser verification using `agent-browser` CLI via skill `agent-browser`.

### 1.3 Out of Scope
- Final member console UI. It is Phase 6.
- Final admin dashboard UI. It is Phase 9.
- Payment dummy, CD-Key, package, asset, subscription, and extension API features.
- OAuth, OTP, magic link, phone auth, Google login, and multi-provider auth.
- Multi-device active session support.
- Creating browser test files only to satisfy Phase 1 verification.
- Public REST endpoints for web UI auth. Web UI mutations must use Server Actions.

### 1.4 Preconditions
- Phase 0 foundation is available, including final route groups `(public)`, `(member)`, `(admin)`, shared InsForge adapters, session helpers, guarded shell routes, and `next-safe-action` setup.
- Runtime database has schema `auth.users`.
- Migrations are applied in the order defined by `migrations/README.md`.
- For manual browser verification, `040_dev_seed_full.sql` and `041_dev_seed_loginable_users.sql` are applied to the same database used by runtime `DATABASE_URL`.

## 2. Definitions
| Term                      | Definition                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `app_session`             | Required web and extension session cookie name.                                                         |
| Active session            | Row in `app_sessions` where `revoked_at is null`.                                                       |
| Opaque token              | Random token stored only in the browser cookie. It must not be stored as raw text in the database.      |
| `token_hash`              | Hash of the opaque session token stored in `app_sessions.token_hash`.                                   |
| Profile                   | App user profile row in `profiles`, including `role` and `is_banned`.                                   |
| Member                    | User with `profiles.role = 'member'`.                                                                   |
| Admin                     | User with `profiles.role = 'admin'`.                                                                    |
| Banned user               | User with `profiles.is_banned = true`.                                                                  |
| Login log                 | Append-only auth event row in `login_logs`.                                                             |
| Failed-login counter      | App-layer count of recent failed login attempts per email.                                              |
| Normalized email          | Email after trimming leading and trailing whitespace and converting the whole address to lowercase.     |
| Reset password request    | Flow that sends reset instructions without disclosing whether the email exists.                         |
| Reset password completion | Flow that validates reset-link token payload and updates the password.                                  |
| Guarded shell             | Minimal protected route shell for `/console` or `/admin`.                                               |
| Server Action             | Next.js App Router mutation mechanism for internal web UI actions.                                      |
| Trusted server-side path  | Server-only path that may use privileged adapters or RPCs safely; never exposed to browser credentials. |

## 3. Requirements, Constraints & Guidelines

### 3.1 Source of Truth
- **REQ-001**: Business rules must follow `docs/PRD.md`.
- **REQ-002**: UI flow must follow `docs/user-flow/auth-flow.md`.
- **REQ-003**: Phase scope and gate must follow Phase 1 in `docs/IMPLEMENTATION_PLAN.md`.
- **REQ-004**: Schema, RLS, triggers, RPC, and seed behavior must follow `docs/DB.md` and `migrations/*.sql`.
- **REQ-005**: File placement and import boundaries must follow `docs/agent-rules/folder-structure.md`.
- **REQ-006**: If `docs/user-flow/auth-flow.md` uses `/console` as a simplified member success target but `docs/PRD.md` and `docs/IMPLEMENTATION_PLAN.md` require role redirect, public self-register must go to `/console`, while existing-user login and reset completion must use role redirect.

### 3.2 Route and UI Requirements
- **REQ-010**: `/login` must contain email step, password step, register confirmation dialog, and register step in one route.
- **REQ-011**: `/login` must not split register into a separate route.
- **REQ-012**: `/reset-password` must support request reset and set new password states.
- **REQ-013**: Email input must be validated before server request.
- **REQ-014**: Password fields must validate minimum 6 characters where a new password is created or submitted.
- **REQ-015**: Register must include `password` and `confirmPassword`.
- **REQ-016**: Set new password must include `password` and `confirmPassword`.
- **REQ-017**: `confirmPassword` must match `password`.
- **REQ-018**: Every password input must include show/hide behavior with an eye icon or equivalent accessible control.
- **REQ-019**: Submit controls must expose loading and disabled states during requests.
- **REQ-020**: Error messages must be clear and placed near the affected field when the error is field-specific.
- **REQ-021**: Successful login, register, and reset completion must redirect directly to the correct shell, without a long success screen.
- **REQ-022**: When the password step is shown, the selected email must remain visible and the user must have a clear way to go back or change email.

### 3.3 Login Requirements
- **REQ-030**: `/login` must start with email input and a `Next` action.
- **REQ-031**: The server must check whether the email exists.
- **REQ-032**: If the email exists, the UI must show password step for the selected email.
- **REQ-033**: If the email does not exist, the UI must show a register confirmation dialog.
- **REQ-034**: If the user cancels register confirmation, the UI must return to email step.
- **REQ-035**: If the user changes email after a branch was selected, stale password/register state and stale errors must be cleared.
- **REQ-036**: Login success must revoke old sessions, create a new `app_session`, write a success login log, and redirect by role.
- **REQ-037**: Login failure must write a failed login log and update failed-login counter for the email.
- **REQ-038**: Login must reject banned users before creating a new app session.
- **REQ-039**: A failed login for a non-existing email must not create a session.
- **REQ-040**: If the email-check step returns `unregistered`, do not write a failed login log and do not increment the failed-login counter. Show only the register confirmation dialog.

### 3.4 Register Requirements
- **REQ-050**: Register must begin only after the email check returns unregistered and the user confirms registration.
- **REQ-051**: Register must create the actual auth user through InsForge Auth.
- **REQ-052**: After InsForge Auth creates the user, trusted server-side code must upsert exactly one `profiles` row keyed by `auth.users.id` because baseline migrations do not auto-create profiles.
- **REQ-053**: Register success must auto login the user.
- **REQ-054**: Register success must revoke any old sessions for that user before creating a new session.
- **REQ-055**: Register success must write a success login log.
- **REQ-056**: Register must not create a duplicate `profiles.email`, `profiles.username`, or `profiles.public_id`.
- **REQ-057**: Public self-register must create profile defaults with normalized `email`, `role = 'member'`, `is_banned = false`, `ban_reason = null`, and `avatar_url = null`.
- **REQ-058**: Public self-register must derive `username` from the email local part and append a unique suffix on collision, matching the PRD user creation rule.
- **REQ-059**: Public self-register must generate `public_id` server-side, never from user input, and must retry on unique constraint conflict.
- **REQ-060**: Public self-register success must redirect to `/console`. It must not create an admin user and must not redirect to `/admin`.

### 3.5 Reset Password Requirements
- **REQ-070**: `/reset-password` must accept an email for reset request.
- **REQ-071**: Reset request response must be generic for registered and unregistered emails.
- **REQ-072**: Reset request must not reveal whether an email exists.
- **REQ-073**: Reset request must call InsForge Auth reset email capability through a trusted server-side path.
- **REQ-074**: Reset completion must validate the reset token payload received from the reset link.
- **REQ-075**: Invalid or expired reset token must show a clear error state and offer a way to request a new link.
- **REQ-076**: Reset completion must update the actual auth credential in InsForge Auth.
- **REQ-077**: The UI must treat reset completion as a single reset-link-token flow. Implementation may internally exchange a provider `code` for an `otp` or equivalent token only if the InsForge Auth adapter requires it.
- **REQ-078**: Reset completion success must redirect by role.
- **REQ-079**: After password reset success, reuse or create a new `app_session` only if InsForge Auth returns or permits a valid authenticated user context as part of reset completion.
- **REQ-080**: If InsForge Auth cannot provide a valid authenticated context after reset completion, redirect to `/login` with a clear instruction to login using the new password. This fallback is allowed only for that provider limitation.

### 3.6 Session Requirements
- **SEC-001**: The cookie name must be exactly `app_session`.
- **SEC-002**: The browser cookie must store only the opaque raw token.
- **SEC-003**: `app_sessions` must store only `token_hash`, never the raw token.
- **SEC-004**: Session validation must hash the cookie token and find `app_sessions.token_hash` where `revoked_at is null`.
- **SEC-005**: Login and register success must revoke all old active sessions for the same user before inserting the new session.
- **SEC-006**: Logout must set `revoked_at` on the active session and clear the cookie.
- **SEC-007**: Single active session per user must remain enforced by the partial unique index `app_sessions_one_active_per_user_idx`.
- **SEC-008**: Metadata such as IP, browser, and OS must be written to `login_logs`, not `app_sessions`.
- **SEC-009**: All `app_sessions` and `login_logs` writes must happen only in server-side code that bypasses RLS via a privileged adapter or a `SECURITY DEFINER` function; no browser-authenticated DML is allowed.
- **SEC-010**: Session lookup and mutation code must stay server-only.
- **SEC-011**: The `revoke_app_sessions(user_id)` DB helper may be used only through a trusted server-side path; do not expose it to browser code.
- **SEC-012**: Authenticated server-side shell access must touch `app_sessions.last_seen_at` when validating the active `app_session`, so Live User and session freshness have accurate data.

### 3.7 Failed-Login Counter Requirements
- **REQ-090**: Failed-login counter is counted per normalized email.
- **REQ-091**: The reset password CTA or dialog must not appear before 5 consecutive failures for the same email.
- **REQ-092**: The reset password CTA or dialog must appear immediately after the 5th consecutive failure.
- **REQ-093**: The counter must reset on successful login for the same email.
- **REQ-094**: The counter must reset when the last failure is older than 15 minutes.
- **REQ-095**: Counter logic must be server-side.
- **REQ-096**: The implementation may derive the counter from `login_logs` or use a dedicated app-layer state if it remains consistent with the DB and does not require a new baseline migration without approval.
- **REQ-097**: If a dev helper is needed to verify the 15-minute rule without waiting manually, it must be development-only, server-side, and not available in production.
- **REQ-098**: The 15-minute counter check may use a dev-only app helper or mocked clock; no database migration support is assumed.

### 3.8 Login Log Requirements
- **DAT-001**: On login success, insert `login_logs` with `is_success = true`, `user_id`, normalized `email`, `ip_address`, `browser`, `os`, and `created_at`.
- **DAT-002**: On login failure, insert `login_logs` with `is_success = false`, normalized `email`, `failure_reason`, `ip_address`, `browser`, `os`, and nullable `user_id`.
- **DAT-003**: `ip_address` is required by schema and must be derived from a trusted request metadata source.
- **DAT-004**: `browser` and `os` may be null if parsing is unavailable, but the schema contract must be explicit.
- **DAT-005**: Failure reasons should use stable internal strings such as `wrong_password`, `user_banned`, `sign_in_failed`, or `auth_provider_error`.

### 3.9 Role Guard and Redirect Requirements
- **REQ-110**: Successful member auth redirects to `/console`.
- **REQ-111**: Successful admin auth redirects to `/admin`.
- **REQ-112**: Guest access to `/console` redirects to auth flow.
- **REQ-113**: Guest access to `/admin` redirects to auth flow.
- **REQ-114**: Banned users must not access `/console` or `/admin`.
- **REQ-115**: Member users must not access `/admin`.
- **REQ-116**: Admin users opening `/console` must be redirected to `/admin`, consistent with the current shell guard.
- **REQ-117**: Reload after login must preserve session and role guard behavior.

### 3.10 Technical Constraints
- **CON-001**: Use Next.js App Router route groups `(public)`, `(member)`, and `(admin)`.
- **CON-002**: Use `pnpm` only.
- **CON-003**: Use TypeScript strict style and avoid `any`.
- **CON-004**: Use `react-hook-form` and `zod` for auth forms.
- **CON-005**: Use `next-safe-action` for web UI mutations.
- **CON-006**: Use existing UI primitives in `src/components/ui/**` before adding new primitives.
- **CON-007**: Do not introduce HeroUI.
- **CON-008**: Do not add REST endpoints for internal web UI auth.
- **CON-009**: Do not put business logic in `page.tsx`, `layout.tsx`, route-local client components, or UI primitives.
- **CON-010**: Do not import from `src/app/**` into `src/modules/**`.
- **CON-011**: Do not import server-only code into client components.
- **CON-012**: Do not write `app_sessions` or `login_logs` directly from browser code.
- **CON-013**: Do not store raw passwords or reset tokens in app database.
- **CON-014**: Do not create browser test files just to satisfy Phase 1 verification.

### 3.11 File Placement Requirements
- **PAT-001**: `src/app/(public)/login/page.tsx` must remain route composition only.
- **PAT-002**: `src/app/(public)/login/_components/**` may contain route-local UI components.
- **PAT-003**: `src/app/(public)/reset-password/page.tsx` must remain route composition only.
- **PAT-004**: `src/app/(public)/reset-password/_components/**` may contain route-local UI components.
- **PAT-005**: `src/modules/auth/actions.ts` must contain auth Server Actions.
- **PAT-006**: `src/modules/auth/services.ts` must contain auth orchestration.
- **PAT-007**: `src/modules/auth/repositories.ts` must contain InsForge Auth and auth-adjacent data access.
- **PAT-008**: `src/modules/auth/schemas.ts` must contain Zod schemas for auth forms and actions.
- **PAT-009**: `src/modules/auth/types.ts` must contain auth domain types.
- **PAT-010**: `src/modules/sessions/services.ts` and `src/modules/sessions/repositories.ts` remain the canonical app-session lifecycle boundary.
- **PAT-011**: `src/modules/users/services.ts` remains the canonical shell guard boundary unless a more specific user-domain service is required.
- **PAT-012**: Shared request metadata parsing may live in `src/lib/**` only if it is generic infrastructure and not business logic.

## 4. Interfaces & Data Contracts

### 4.1 Routes
| Route             | Type                   | Contract                                                              |
| ----------------- | ---------------------- | --------------------------------------------------------------------- |
| `/login`          | Public App Router page | Email-first login/register flow. Redirect away after successful auth. |
| `/reset-password` | Public App Router page | Request reset and complete reset flow.                                |
| `/console`        | Guarded member shell   | Requires valid `app_session`, non-banned member profile.              |
| `/admin`          | Guarded admin shell    | Requires valid `app_session`, non-banned admin profile.               |
| `/unauthorized`   | Error page             | Used for forbidden or banned shell access.                            |

### 4.2 Recommended Server Actions
The exact exported names may follow existing project naming, but the contracts below must exist.

| Action                        | Input                                                                                | Output                                                   | Notes                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------- |
| `checkAuthEmailAction`        | `{ email: string }`                                                                  | `{ status: "registered" \| "unregistered" }`             | Must validate and normalize email.                      |
| `loginAction`                 | `{ email: string; password: string }` plus request metadata                          | `{ redirectTo: "/console" \| "/admin" }` or action error | Must create `app_session` on success.                   |
| `registerAction`              | `{ email: string; password: string; confirmPassword: string }` plus request metadata | `{ redirectTo: "/console" }` or action error             | Must auto login public members only.                    |
| `requestPasswordResetAction`  | `{ email: string }`                                                                  | `{ success: true }`                                      | Must be generic for registered and unregistered emails. |
| `completePasswordResetAction` | `{ email: string; resetToken: string; password: string; confirmPassword: string }`   | `{ redirectTo: "/console" \| "/admin" \| "/login" }`     | Use `/login` only when provider session is unavailable. |
| `logoutAction`                | No body or `{}`                                                                      | `{ redirectTo: "/login" }`                               | Must revoke active session and clear cookie.            |

### 4.3 Input Schemas
Schemas must be Zod schemas. The messages may be localized, but the validation semantics must match this table.

| Schema           | Fields                                               | Rules                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email check      | `email`                                              | Required, valid email, normalized.                                                                                                                                                      |
| Login            | `email`, `password`                                  | Email valid. Password required. Do not enforce 6-character minimum for existing login if that would block legacy users; if all users are guaranteed to have min 6, min 6 is acceptable. |
| Register         | `email`, `password`, `confirmPassword`               | Email valid, password min 6, confirm required and equal.                                                                                                                                |
| Reset request    | `email`                                              | Email valid. Response must remain generic.                                                                                                                                              |
| Reset completion | `email`, `resetToken`, `password`, `confirmPassword` | Reset token required, password min 6, confirm required and equal. Provider-specific `code` or `otp` handling is internal.                                                               |
| Request metadata | `ipAddress`, `browser`, `os`                         | `ipAddress` required. `browser` and `os` nullable.                                                                                                                                      |

Email normalization must be identical for email check, login, register, reset request, login log writes, and failed-login counter: trim leading and trailing whitespace, convert the whole email address to lowercase, and reject empty or syntactically invalid results.

### 4.4 Session Data Contract
`app_sessions` table contract from `migrations/010_profiles_and_auth_tables.sql`:

| Column         | Required | Phase 1 Use                                |
| -------------- | -------- | ------------------------------------------ |
| `id`           | yes      | Session identifier used server-side only.  |
| `user_id`      | yes      | Owner profile.                             |
| `token_hash`   | yes      | Hash of cookie token.                      |
| `last_seen_at` | yes      | Touched by authenticated server-side flow. |
| `revoked_at`   | no       | Null means active. Non-null means invalid. |
| `created_at`   | yes      | Creation timestamp.                        |

Required indexes and constraints:
- `app_sessions_token_hash_unique`
- `app_sessions_one_active_per_user_idx` unique partial on `(user_id)` where `revoked_at is null`
- `app_sessions_user_last_seen_idx`

### 4.5 Login Log Data Contract
`login_logs` table contract from `migrations/010_profiles_and_auth_tables.sql`:

| Column           | Required | Phase 1 Use                          |
| ---------------- | -------- | ------------------------------------ |
| `id`             | yes      | Generated by DB.                     |
| `user_id`        | no       | Null if user was not resolved.       |
| `email`          | yes      | Normalized input email.              |
| `is_success`     | yes      | Success or failure.                  |
| `failure_reason` | no       | Stable reason for failure.           |
| `ip_address`     | yes      | Trusted request IP metadata.         |
| `browser`        | no       | Parsed user-agent metadata.          |
| `os`             | no       | Parsed user-agent metadata.          |
| `created_at`     | yes      | Used for failed counter and history. |

Required indexes:
- `login_logs_email_created_at_idx`
- `login_logs_user_created_at_idx`
- `login_logs_success_created_at_idx`

### 4.6 Profile Contract
`profiles` fields required for Phase 1:

| Field        | Register default / rule                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `user_id`    | Auth user ID from `auth.users.id`.                                      |
| `email`      | Normalized auth email cached in app profile.                            |
| `username`   | Email local part, with deterministic unique suffix on collision.        |
| `public_id`  | Server-generated unique public ID. Never accept it from register input. |
| `role`       | `member` for public self-register.                                      |
| `is_banned`  | `false` for public self-register.                                       |
| `ban_reason` | `null` for public self-register.                                        |
| `avatar_url` | Nullable. Use `null` for public self-register.                          |

Phase 1 must treat `profiles.role` as the app role source of truth and `profiles.is_banned` as the app ban source of truth. `avatar_url` is nullable at DB level; UI that displays a user identity must render a fallback avatar when it is null.

The baseline migrations do not include a trigger that creates `profiles` automatically after `auth.users` insert. Public self-register therefore must upsert the profile from trusted server-side code after InsForge Auth creates the user. The browser must never insert or update `profiles.email`, `profiles.role`, `profiles.is_banned`, `profiles.ban_reason`, or `profiles.public_id` directly.

### 4.7 Session Lifecycle Sequence
Login and register success must use this sequence:
1. Validate input with Zod.
2. Authenticate or create user with InsForge Auth.
3. For register only, upsert the public member profile through a trusted server-side path.
4. Read profile.
5. Reject if profile is banned.
6. Revoke all active app sessions for user.
7. Create a new opaque raw session token.
8. Hash the token.
9. Insert `app_sessions` row with `token_hash`.
10. Write cookie `app_session` with raw token.
11. Write success `login_logs` row.
12. Redirect existing-user login by role and public self-register to `/console`.

Create the session and write the success log inside one trusted server-side unit of work. If any failure happens after session insert, the implementation must revoke the newly created session and clear the cookie before returning or otherwise leave no active session from the failed transaction.

### 4.8 Failure Counter Semantics
The counter for an email is computed from consecutive failed password submissions for the normalized email. Reset boundaries:
- a successful login for the same normalized email, or
- the latest failed password submission being older than 15 minutes.

When deriving the counter from `login_logs`, count only failed password submission rows newer than the latest success row for the same normalized email and newer than `now() - 15 minutes`.

The reset prompt is shown when the current consecutive failure count is at least 5.

The email-check step for an unregistered email is not a login failure. It must not write `login_logs` and must not affect the failed-login counter.

### 4.9 Minimum User-Facing Copy
The exact language may be adjusted for the product tone, but the UI must convey these states.

| Context                  | Message Intent                                                            |
| ------------------------ | ------------------------------------------------------------------------- |
| Missing email            | Email is required.                                                        |
| Invalid email            | Email must be valid.                                                      |
| Missing password         | Password is required.                                                     |
| Wrong password           | Password is incorrect. Try again.                                         |
| Reset prompt             | Reset password to continue.                                               |
| Short password           | Password must be at least 6 characters.                                   |
| Missing confirm password | Confirm password is required.                                             |
| Confirm mismatch         | Confirm password must match password.                                     |
| Reset request success    | If the email can receive reset instructions, instructions have been sent. |
| Invalid reset token      | Reset link is invalid or expired. Request a new link.                     |
| Generic system error     | The action failed. Try again later.                                       |

## 5. Acceptance Criteria
- **AC-001**: Given the user opens `/login`, When the page loads, Then the email step renders without runtime error.
- **AC-002**: Given `seed.active.browser@assetnext.dev` and password `Devpass123`, When login succeeds, Then the browser has `app_session` and redirects to `/console`.
- **AC-003**: Given `seed.admin.browser@assetnext.dev` and password `Devpass123`, When login succeeds, Then the browser has `app_session` and redirects to `/admin`.
- **AC-004**: Given a new valid email, When the user clicks `Next`, Then a register confirmation dialog appears instead of a separate register page.
- **AC-005**: Given the user confirms public register, When password and confirm password are valid, Then the system creates the auth user, upserts exactly one public member profile, creates `app_session`, writes a success login log, and redirects to `/console`.
- **AC-006**: Given register password is shorter than 6 characters, When the form is submitted, Then the form is rejected with a clear error and no user is created.
- **AC-007**: Given register confirm password differs from password, When the form is submitted, Then the form is rejected with a clear error and no user is created.
- **AC-008**: Given any password field in login, register, or reset flow, When the user activates show/hide, Then the input visibility toggles without losing the input value.
- **AC-009**: Given a registered email, When the user submits wrong password 4 times, Then reset CTA/dialog is not visible.
- **AC-010**: Given a registered email, When the user submits wrong password the 5th time, Then reset CTA/dialog becomes visible.
- **AC-011**: Given reset CTA/dialog is visible, When the user logs in successfully for the same email, Then the counter resets and reset CTA/dialog is no longer visible.
- **AC-012**: Given the last failed login for an email is older than 15 minutes, When the user returns to login, Then the failed counter is treated as reset.
- **AC-013**: Given the user requests password reset for a registered email, When the request succeeds, Then the UI shows the generic success message.
- **AC-014**: Given the user requests password reset for an unregistered email, When the request completes, Then the UI shows the same generic success message as for a registered email.
- **AC-015**: Given a valid reset-link token, When the user submits matching valid new passwords, Then the actual InsForge Auth password changes and the user is redirected according to role if a valid authenticated context is available, or sent to `/login` with clear instruction if provider session is unavailable.
- **AC-016**: Given an invalid or expired reset token, When the reset route is opened, Then the UI shows an invalid or expired link state.
- **AC-017**: Given the user is logged in, When logout is submitted, Then the active `app_sessions` row has `revoked_at` set, cookie `app_session` is cleared, and guarded routes require login again.
- **AC-018**: Given the same user logs in from browser A and then browser B, When browser A reloads `/console`, Then browser A session is invalid and cannot access the guarded shell.
- **AC-019**: Given a banned user, When login is attempted, Then no new `app_session` is created and the user is denied with a clear error.
- **AC-020**: Given a logged-in member, When `/admin` is opened, Then access is denied.
- **AC-021**: Given a logged-in admin, When `/admin` is opened, Then access is allowed.
- **AC-022**: Given a logged-in user reloads the target shell, When the page reloads, Then the `app_session` is read successfully and the shell remains accessible.
- **AC-023**: Given login succeeds or fails, When inspecting `login_logs`, Then the corresponding success or failure row is written with email, IP, browser, OS, and failure reason as applicable.
- **AC-024**: Given a session is created, When inspecting `app_sessions`, Then only `token_hash` is stored and the raw token is not present in the database.
- **AC-025**: Given an unregistered email is checked from `/login`, When the UI branches to register confirmation, Then no failed login log is written and the failed-login counter does not change.
- **AC-026**: Given a logged-in admin opens `/console`, When the member shell guard runs, Then the user is redirected to `/admin`.
- **AC-027**: Given an authenticated shell is loaded, When session validation succeeds, Then `app_sessions.last_seen_at` is touched through server-side session code.

## 6. Test Automation Strategy

### 6.1 Browser Verification
- **VER-001**: Use manual browser verification with `agent-browser` CLI through skill `agent-browser`.
- **VER-002**: Use the Phase 1 checklist in `docs/IMPLEMENTATION_PLAN.md` as the browser verification checklist.
- **VER-003**: Do not create browser test files just to satisfy the Phase 1 gate.
- **VER-004**: Do not switch to another browser tool by default. If a concrete `agent-browser` CLI limitation blocks a required step, document that limitation and use another browser tool only for that blocked step.
- **VER-005**: Verification must run against the app runtime database referenced by `DATABASE_URL`, not an unrelated admin or MCP database.

### 6.2 Required Manual Browser Checklist
- Login as `seed.active.browser@assetnext.dev` with `Devpass123` and verify redirect to `/console`.
- Login as `seed.admin.browser@assetnext.dev` with `Devpass123` and verify redirect to `/admin`.
- Register a new email from `/login` and verify auto login plus `app_session`.
- Submit register with password shorter than 6 characters and verify clear rejection.
- Verify show/hide works for all password inputs.
- Submit 5 failed logins for the same email and verify reset prompt appears only after the 5th failure.
- Verify successful login resets failed counter.
- Verify 15-minute reset counter behavior using dev clock, seeded state, or development-only app helper. Do not assume database migration support for this helper.
- Complete `/reset-password` with a valid reset link from the development inbox.
- Submit reset completion with password shorter than 6 characters and verify clear rejection.
- Request reset for an unregistered email and verify generic success.
- Open invalid or expired reset token and verify error state.
- Logout and verify guarded routes require login again.
- Login from another browser context and verify old session is invalid.
- Reload after login and verify the session remains valid.

### 6.3 Code Quality Gates
Run available project gates relevant to the implementation:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm check`
- `pnpm markdown:check` only if Markdown files are changed

Do not claim a gate passed unless it was actually run and completed successfully.

## 7. Rationale & Context
The PRD requires single-device login and extension compatibility through one shared cookie: `app_session`. This means the app cannot delegate all session behavior to a generic browser auth session alone. The Next.js server layer must own the app session lifecycle: revoke old app sessions, create an opaque session token, store only a hash, and validate through `app_sessions`.

The failed-login counter is explicitly app-layer behavior. The database provides `login_logs` with indexes that support per-email counting, but the UX rule and 15-minute reset boundary belong in server-side auth services.

Reset password must not disclose account existence. This is why reset request output must be generic even when the server can determine whether an email exists.

Baseline migrations do not auto-create `profiles` from `auth.users`, and RLS does not provide a normal member insert path for a profile that does not exist yet. Public register therefore needs a trusted server-side profile upsert immediately after auth user creation.

Baseline RLS also does not make `app_sessions` and `login_logs` normal browser-writable tables. Phase 1 must use trusted server-side writes for auth session lifecycle and login logging.

Where the UI flow document describes register redirecting to `/console`, that remains the rule for public self-register. Existing-user login and reset completion use PRD role redirect because existing users may be admins.

The folder structure rules require `src/app/**` to remain thin and domain logic to live in `src/modules/**`. Phase 1 must follow that boundary so later phases can reuse auth, session, and guard behavior without copying logic into UI components.

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: InsForge Auth. Required for email/password sign in, sign up, reset email, reset token exchange, current user lookup, and password update.
- **EXT-002**: InsForge Database. Required for `profiles`, `app_sessions`, and `login_logs`.

### Infrastructure Dependencies
- **INF-001**: Database with `auth.users` schema. Plain local Postgres without `auth.users` is not sufficient.
- **INF-002**: Applied migrations `001_extensions.sql` through `031_activation_rpc.sql`.
- **INF-003**: Development seed `040_dev_seed_full.sql` and browser-loginable seed `041_dev_seed_loginable_users.sql` for manual browser verification.
- **INF-004**: Development inbox for reset password email verification.
- **INF-005**: Runtime `DATABASE_URL` must point to the same database used for seed verification.

### Technology Platform Dependencies
- **PLT-001**: Next.js App Router.
- **PLT-002**: Server Actions through `next-safe-action`.
- **PLT-003**: Forms through `react-hook-form`.
- **PLT-004**: Validation through `zod`.
- **PLT-005**: UI through Tailwind CSS and existing primitives in `src/components/ui/**`.
- **PLT-006**: Package manager `pnpm`.

### Dependency Addition Policy
- **DEP-001**: Phase 1 Auth does not require new npm dependencies by default.
- **DEP-002**: Use existing dependencies for the auth implementation:
  - `@insforge/sdk` for InsForge Auth and Database integration through `src/lib/insforge/**`.
  - `next-safe-action` for web UI mutations.
  - `react-hook-form`, `@hookform/resolvers`, and `zod` for auth forms and validation.
  - `lucide-react` for password show/hide icons when an icon is needed.
  - `sonner` only if the existing UI pattern needs toast feedback.
  - built-in Next.js request/cookie APIs and existing `src/lib/cookies.ts` for cookie handling.
  - Node `crypto` APIs for opaque token generation and token hashing.
- **DEP-003**: Do not add `uuid`; use `crypto.randomUUID()` or database-generated UUIDs where appropriate.
- **DEP-004**: Do not add password hashing libraries for Phase 1; raw password lifecycle is handled by InsForge Auth and must not be stored in app DB.
- **DEP-005**: Do not add a user-agent parsing dependency by default. If browser/OS metadata quality becomes a real blocker, propose a small dependency such as `ua-parser-js` separately, verify its current documentation before use, and document why a local parser is insufficient.

### Data Dependencies
- **DAT-010**: `profiles` table with role and banned status.
- **DAT-011**: `app_sessions` table with one active session per user invariant.
- **DAT-012**: `login_logs` table with indexes for per-email failed login counter.
- **DAT-013**: `profiles` must be provisioned by trusted server-side code during public self-register because baseline migrations do not auto-create it from `auth.users`.
- **DAT-014**: Seed accounts from `041_dev_seed_loginable_users.sql`:
  - `seed.admin.browser@assetnext.dev`
  - `seed.active.browser@assetnext.dev`
  - `seed.processed.browser@assetnext.dev`
  - `seed.expired.browser@assetnext.dev`
  - `seed.canceled.browser@assetnext.dev`
  - `seed.none.browser@assetnext.dev`
  - shared password `Devpass123`

## 9. Examples & Edge Cases

### 9.1 Login Flow State Machine
```txt
/login email step
  -> email registered
    -> password step
      -> password valid
        -> revoke old sessions
        -> create app_session
        -> write success login log
        -> redirect by role
      -> password invalid
        -> write failed login log
        -> update failed counter
        -> show reset prompt only when count >= 5
  -> email unregistered
    -> register confirmation dialog
      -> cancel
        -> return to email step
      -> confirm
        -> register step
          -> create user
          -> upsert public member profile
          -> create app_session
          -> write success login log
          -> redirect /console
```

### 9.2 Reset Request Privacy
```txt
Input: registered.user@example.com
Output shown to user: If this email can receive reset instructions, we sent them.

Input: not-registered@example.com
Output shown to user: If this email can receive reset instructions, we sent them.
```

### 9.3 Single-Device Edge Case
```txt
Browser A logs in as seed.active.browser@assetnext.dev.
Browser B logs in as seed.active.browser@assetnext.dev.
Browser A reloads /console.
Expected result: Browser A no longer has a valid active session and is redirected to auth flow.
```

### 9.4 Failure Counter Edge Case
```txt
Email has 4 recent failures inside the last 15 minutes.
Next wrong password creates the 5th failure.
Expected result: reset prompt appears.

Email has 4 failures, but the last failure is older than 15 minutes.
Next wrong password is treated as the first recent failure.
Expected result: reset prompt remains hidden.
```

### 9.5 Banned User Edge Case
```txt
User has profiles.is_banned = true.
User submits correct password.
Expected result: login is rejected, no new app_sessions row remains active, and the user does not reach /console or /admin.
```

## 10. Validation Criteria
- **VAL-001**: No raw session token is stored in `app_sessions`.
- **VAL-002**: At most one `app_sessions` row per user has `revoked_at is null`.
- **VAL-003**: Login success writes exactly one success login event for the request.
- **VAL-004**: Login failure writes a failure login event with a stable `failure_reason`.
- **VAL-005**: Reset request output is indistinguishable for registered and unregistered emails.
- **VAL-006**: `/login` contains login and register in one route.
- **VAL-007**: `/reset-password` supports request, valid token, and invalid token states.
- **VAL-008**: No internal web UI auth REST endpoint is added.
- **VAL-009**: No browser test file is added solely for Phase 1 verification.
- **VAL-010**: Browser verification is performed manually with `agent-browser` CLI; any fallback tool use is limited to a documented concrete `agent-browser` limitation.
- **VAL-011**: Implementation respects import boundaries from `docs/agent-rules/folder-structure.md`.
- **VAL-012**: Public self-register provisions exactly one `profiles` row with `role = 'member'`, `is_banned = false`, and nullable `avatar_url`.
- **VAL-013**: Email normalization is identical for lookup, login logs, reset request, and failed-login counter.
- **VAL-014**: Authenticated shell access touches `app_sessions.last_seen_at` through server-side session code.
- **VAL-015**: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm check` pass after implementation, unless an existing unrelated failure is documented.

## 11. Related Specifications / Further Reading
- `docs/PRD.md`
- `docs/user-flow/auth-flow.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DB.md`
- `docs/PHASE_0_FOUNDATION_BACKLOG.md`
- `docs/agent-rules/folder-structure.md`
- `migrations/README.md`
- `migrations/003_core_helpers.sql`
- `migrations/010_profiles_and_auth_tables.sql`
- `migrations/020_admin_access_helpers.sql`
- `migrations/021_rls_policies.sql`
- `migrations/022_subscription_engine.sql`
- `migrations/025_table_grants.sql`
- `migrations/041_dev_seed_loginable_users.sql`
