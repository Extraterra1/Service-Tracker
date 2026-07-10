# Local Authentication Bypass Design

## Goal

Allow local development to use live Firebase data without requiring an interactive Google sign-in on every debug session.

## Approach

Use a dedicated Firebase Email/Password debug account with a fixed UID. Local Vite development may automatically authenticate that account when an explicit opt-in environment flag is enabled. The existing Google authentication flow remains the default in every other environment.

The debug account credentials live only in `.env.local`, which must remain uncommitted. Its UID must have an active `staff_allowlist` document because live Firestore security rules remain unchanged and continue to enforce normal authorization.

## Activation Guardrails

The bypass activates only when all of these conditions are true:

- Vite reports development mode through `import.meta.env.DEV`.
- `VITE_LOCAL_AUTH_BYPASS` equals `true`.
- `VITE_LOCAL_AUTH_EMAIL` and `VITE_LOCAL_AUTH_PASSWORD` are both present.

Production builds must never attempt Email/Password debug authentication, even if similarly named environment variables are supplied. Missing or invalid local credentials fail closed and leave the normal signed-out experience available.

## Authentication Flow

The access gate continues subscribing to Firebase Auth as its authoritative session source. During local initialization, a small authentication helper checks whether the bypass is enabled. If so, and Firebase has not restored an existing user, it signs in with the configured Email/Password credentials. The resulting real Firebase user then follows the existing allowlist resolution path without any changes to Firestore rules or downstream data access.

An already restored Firebase session is retained rather than replaced. This avoids signing out a developer who intentionally selected another account.

## Error Handling

Automatic sign-in failures are handled as local startup failures without weakening authorization. The app remains signed out and exposes the existing Google sign-in action. Diagnostics may record a non-sensitive error, but credentials must never be included in logs, UI copy, or persisted diagnostics.

## Testing

Automated tests will prove that:

- the bypass configuration is enabled only in Vite development mode with the explicit flag and both credentials;
- production mode always disables the bypass;
- automatic local sign-in uses Email/Password credentials when no session exists;
- an existing authenticated user is not replaced;
- disabled or incomplete configuration does not attempt debug sign-in;
- the existing Google sign-in behavior remains intact.

## Firebase Setup

Enable the Email/Password provider, create one dedicated debug user, and add that user's UID to `staff_allowlist` with `active: true` and the least-privileged appropriate role. Put the account credentials and opt-in flag in `.env.local`. Do not commit that file or relax Firestore rules.

Enabling Email/Password authentication can expose Firebase's public account-registration endpoint. The allowlist still prevents unauthorized accounts from accessing application data. Where Firebase Identity Platform blocking functions are available, reject account creation except for explicitly approved debug accounts.
