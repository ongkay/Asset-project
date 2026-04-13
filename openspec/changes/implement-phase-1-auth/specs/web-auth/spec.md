## ADDED Requirements

### Requirement: Login flow SHALL branch by normalized email status on a single `/login` route
The system SHALL implement `/login` as a single email-first route that validates and normalizes the submitted email before checking whether the email is registered through a trusted server-side auth lookup. For a registered email, the route SHALL continue to a password step for that email. For an unregistered email, the route SHALL open a register confirmation dialog and SHALL NOT treat the email check as a failed login attempt.

#### Scenario: Registered email continues to password step
- **WHEN** a user submits a valid registered email from `/login`
- **THEN** the system shows the password step for the normalized email on the same route

#### Scenario: Unregistered email opens register confirmation
- **WHEN** a user submits a valid unregistered email from `/login`
- **THEN** the system shows a register confirmation dialog instead of redirecting to another register page

#### Scenario: Changing email clears stale branch state
- **WHEN** a user changes the selected email after reaching the password step or register step
- **THEN** the system clears stale password or register state and stale field errors before continuing

### Requirement: Registered user login SHALL create one active app session and redirect by role
The system SHALL authenticate registered users through InsForge Auth, reject banned users before creating a new app session, revoke all prior active app sessions for the same user, create one new `app_session` cookie backed by a hashed `app_sessions.token_hash`, write a success login log, and redirect the user by profile role.

#### Scenario: Member login succeeds
- **WHEN** a registered member submits the correct password
- **THEN** the system revokes old app sessions, creates a new active app session, writes a success login log, and redirects to `/console`

#### Scenario: Admin login succeeds
- **WHEN** a registered admin submits the correct password
- **THEN** the system revokes old app sessions, creates a new active app session, writes a success login log, and redirects to `/admin`

#### Scenario: Banned user is denied before session creation
- **WHEN** a banned user submits correct credentials
- **THEN** the system denies login, writes a failed login outcome, and does not leave a new active app session

#### Scenario: Missing profile fails closed
- **WHEN** InsForge Auth accepts an existing user but the required app profile cannot be resolved
- **THEN** the system stops the flow, records a stable failure outcome, and does not create a new active app session

### Requirement: Public self-register SHALL create a member profile and auto-login from `/login`
The system SHALL allow public self-registration only after the email-check branch returns unregistered and the user confirms registration. Successful self-register SHALL create the auth user through InsForge Auth, provision exactly one profile with normalized email and member defaults, generate unique server-side `username` and `public_id` values, revoke old app sessions for that user, create a new active app session, write a success login log, and redirect to `/console`.

#### Scenario: Confirmed register succeeds
- **WHEN** a user confirms registration for an unregistered email and submits a valid password plus matching confirmation
- **THEN** the system creates the auth user, provisions one member profile, creates a new app session, and redirects to `/console`

#### Scenario: Short password blocks register
- **WHEN** a user submits a register password shorter than 6 characters
- **THEN** the system rejects the submission with a clear validation error and does not create the user

#### Scenario: Confirm password mismatch blocks register
- **WHEN** a user submits a register password and confirm password that do not match
- **THEN** the system rejects the submission with a clear validation error and does not create the user

### Requirement: Failed password attempts SHALL drive the reset-password threshold server-side
The system SHALL track consecutive failed password submissions per normalized email on the server side. Only failures caused by wrong password for a registered email SHALL increment the reset-password threshold. The reset-password prompt or CTA SHALL remain hidden before the fifth consecutive failure, SHALL appear immediately after the fifth consecutive failure, SHALL reset after a successful login for the same email, and SHALL reset when the latest failure is older than 15 minutes.

#### Scenario: Four failures do not show reset prompt
- **WHEN** a registered email has four consecutive failed password submissions within the active window
- **THEN** the system shows the login error without showing the reset-password prompt or CTA

#### Scenario: Fifth failure shows reset prompt
- **WHEN** a registered email reaches the fifth consecutive failed password submission within the active window
- **THEN** the system shows the reset-password prompt or CTA immediately

#### Scenario: Successful login resets failure threshold
- **WHEN** a user successfully logs in after previously reaching the reset-password threshold for that email
- **THEN** the system resets the failed-login counter for that normalized email

#### Scenario: Expired failure window resets threshold
- **WHEN** the latest failed password submission for an email is older than 15 minutes
- **THEN** the next failed password submission is treated as the first recent failure

### Requirement: Reset password flow SHALL preserve privacy and support password replacement
The system SHALL provide `/reset-password` for both reset request and password replacement. Reset requests SHALL return the same generic success state for registered and unregistered emails. Reset completion SHALL validate the reset token payload, require password plus confirm password with a minimum length of 6 characters, update the actual auth credential through InsForge Auth, and resolve redirect authority from the provider-validated reset context plus the app profile. The flow SHALL redirect by role when a valid authenticated context is available or to `/login` with clear follow-up guidance when the provider cannot return that context.

#### Scenario: Registered and unregistered reset requests look identical
- **WHEN** a user submits a reset-password request for any valid email
- **THEN** the system responds with the same generic success state without revealing whether the email is registered

#### Scenario: Valid reset completes and redirects
- **WHEN** a user opens a valid reset link and submits matching valid new passwords
- **THEN** the system updates the auth password and redirects to the appropriate shell or to `/login` if no valid authenticated context is available

#### Scenario: Invalid reset token shows error state
- **WHEN** a user opens `/reset-password` with an invalid or expired reset token
- **THEN** the system shows a clear invalid-link state and offers a way to request a new reset link

### Requirement: Server-side auth invariants SHALL remain correct outside the browser checklist
The system SHALL preserve required server-side auth invariants even when they are not directly visible in the manual browser gate. These invariants include token-hash-only app-session persistence, trusted login-log writes, no side effects for the unregistered email-check branch, and `last_seen_at` updates during successful guarded-shell validation.

#### Scenario: Session persistence stores only token hash
- **WHEN** a new app session is created
- **THEN** the browser receives the raw opaque token while the database stores only `token_hash`

#### Scenario: Unregistered email check has no auth side effect
- **WHEN** the `/login` email step branches to register confirmation for an unregistered email
- **THEN** the system does not write a failed login event and does not increment the failed-login threshold

#### Scenario: Guard validation refreshes session activity
- **WHEN** a valid authenticated request reaches `/console` or `/admin`
- **THEN** the system updates `app_sessions.last_seen_at` through the server-side validation path

### Requirement: Logout and guarded shell access SHALL enforce app-session validity and role rules
The system SHALL revoke the active app session and clear the `app_session` cookie on logout. The system SHALL require a valid non-banned app session for `/console` and `/admin`, redirect guests to the auth flow, deny member access to `/admin`, redirect admins away from `/console` to `/admin`, and update `app_sessions.last_seen_at` during successful authenticated shell access.

#### Scenario: Logout revokes active session
- **WHEN** an authenticated user submits logout
- **THEN** the system revokes the active app session, clears the `app_session` cookie, and requires login again for guarded routes

#### Scenario: Guest cannot access guarded shell
- **WHEN** an unauthenticated visitor opens `/console` or `/admin`
- **THEN** the system redirects the visitor to the auth flow instead of rendering the guarded shell

#### Scenario: Admin is redirected from member shell
- **WHEN** an authenticated admin opens `/console`
- **THEN** the system redirects the admin to `/admin`

#### Scenario: Authenticated shell access refreshes last seen
- **WHEN** a valid authenticated request is accepted for `/console` or `/admin`
- **THEN** the system updates `app_sessions.last_seen_at` through the server-side session validation path
