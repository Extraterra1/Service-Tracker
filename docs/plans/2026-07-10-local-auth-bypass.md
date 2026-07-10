# Local Authentication Bypass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically authenticate a dedicated Firebase debug account during explicitly opted-in local Vite development while preserving Google sign-in and all live Firestore authorization.

**Architecture:** Add a pure configuration gate and a small Email/Password sign-in helper to the existing auth library. Call the helper after Firebase restores its persisted auth state, allowing the normal auth subscription and allowlist flow to remain authoritative. Guard the behavior with both Vite development mode and an explicit environment flag so production builds always fail closed.

**Tech Stack:** React 19, Vite, Firebase Auth, Vitest

---

### Task 1: Define and test the local bypass guard

**Files:**
- Modify: `src/lib/auth.js`
- Create: `src/lib/__tests__/auth.test.js`

**Step 1: Write the failing configuration tests**

Create tests for an exported `getLocalAuthBypassCredentials({ isDev, env })` function. Assert that it returns trimmed credentials only when `isDev` is true, `VITE_LOCAL_AUTH_BYPASS` is exactly `true`, and both credential values are non-empty. Assert that production mode, a missing flag, and incomplete credentials each return `null`.

**Step 2: Run the focused tests and verify RED**

Run: `npm test -- src/lib/__tests__/auth.test.js`

Expected: FAIL because `getLocalAuthBypassCredentials` is not exported.

**Step 3: Implement the minimal pure guard**

Add `getLocalAuthBypassCredentials` to `src/lib/auth.js`. Check `isDev` first, then the exact opt-in flag, then trim and validate both strings. Return `{ email, password }` or `null`. Never log either value.

**Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- src/lib/__tests__/auth.test.js`

Expected: all configuration tests PASS.

**Step 5: Commit**

```bash
git add src/lib/auth.js src/lib/__tests__/auth.test.js
git commit -m "test: define local auth bypass guard"
```

### Task 2: Add automatic debug-account authentication

**Files:**
- Modify: `src/lib/auth.js`
- Modify: `src/lib/__tests__/auth.test.js`

**Step 1: Write failing authentication behavior tests**

Mock Firebase Auth's `signInWithEmailAndPassword`. Test an exported `signInWithLocalDebugAccount()` helper with injectable options so that:

- enabled local configuration and no `auth.currentUser` calls `signInWithEmailAndPassword(auth, email, password)`;
- an existing `auth.currentUser` does not call it;
- disabled configuration does not call it;
- absent Firebase Auth does not call it.

**Step 2: Run the focused tests and verify RED**

Run: `npm test -- src/lib/__tests__/auth.test.js`

Expected: FAIL because the automatic sign-in helper does not exist.

**Step 3: Implement minimal automatic sign-in**

Import `signInWithEmailAndPassword` from `firebase/auth`. Implement the helper with defaults from `import.meta.env.DEV` and `import.meta.env`, reusing the pure guard. Return `null` when disabled, already authenticated, or Firebase is unavailable; otherwise return the Firebase sign-in promise.

**Step 4: Run focused and existing Firebase Auth tests**

Run: `npm test -- src/lib/__tests__/auth.test.js src/lib/__tests__/firebaseAuth.test.js`

Expected: both test files PASS.

**Step 5: Commit**

```bash
git add src/lib/auth.js src/lib/__tests__/auth.test.js
git commit -m "feat: add local debug account sign-in"
```

### Task 3: Integrate the bypass into access-gate startup

**Files:**
- Modify: `src/hooks/useAccessGate.js`
- Create: `src/hooks/__tests__/useAccessGate.test.jsx`

**Step 1: Write the failing hook integration test**

Mock the auth library and Firebase configuration. Render `useAccessGate` through a minimal test harness, capture the auth callback, and verify startup waits for `waitForAuthStateReady()` and then calls `signInWithLocalDebugAccount()`. Add a rejection case proving a failed debug sign-in leaves the auth subscription active and records a non-sensitive diagnostic error.

**Step 2: Run the hook test and verify RED**

Run: `npm test -- src/hooks/__tests__/useAccessGate.test.jsx`

Expected: FAIL because startup never invokes the local debug sign-in helper.

**Step 3: Add the startup call**

Import `signInWithLocalDebugAccount` into `useAccessGate.js`. After `waitForAuthStateReady()` resolves, call the helper. Catch only this local sign-in error, record it through `sessionDiagnostics.recordError('local_auth_bypass_error', error)`, and let the normal auth callback continue controlling UI state.

**Step 4: Run the hook and auth tests**

Run: `npm test -- src/hooks/__tests__/useAccessGate.test.jsx src/lib/__tests__/auth.test.js`

Expected: all tests PASS with no credential values in assertions or diagnostics.

**Step 5: Commit**

```bash
git add src/hooks/useAccessGate.js src/hooks/__tests__/useAccessGate.test.jsx
git commit -m "feat: start local debug authentication"
```

### Task 4: Document local setup

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Step 1: Add safe placeholder variables**

Append disabled placeholders to `.env.example`:

```dotenv
VITE_LOCAL_AUTH_BYPASS=false
VITE_LOCAL_AUTH_EMAIL=
VITE_LOCAL_AUTH_PASSWORD=
```

**Step 2: Document Firebase and allowlist setup**

Add a README section explaining how to enable Email/Password authentication, create a dedicated debug user, add its UID to `staff_allowlist`, and place credentials in ignored `.env.local`. State explicitly that the bypass only runs under Vite development mode and that Firestore rules remain enforced.

**Step 3: Verify secret-file handling**

Run: `git check-ignore .env.local`

Expected: `.env.local` is reported as ignored by the `*.local` rule.

**Step 4: Commit**

```bash
git add .env.example README.md
git commit -m "docs: explain local auth bypass setup"
```

### Task 5: Full verification

**Files:**
- Verify only

**Step 1: Run the full unit suite**

Run: `npm test`

Expected: all unit tests PASS. Firestore emulator tests may remain under the separate `npm run test:rules` command.

**Step 2: Run lint**

Run: `npm run lint`

Expected: PASS with no warnings introduced by the bypass.

**Step 3: Build the production bundle**

Run: `npm run build`

Expected: PASS. The pure guard ensures `import.meta.env.DEV === false` disables automatic debug sign-in in the production bundle.

**Step 4: Review the final diff for secrets and scope**

Run: `git diff HEAD~3 --check && git status --short`

Expected: no whitespace errors, no credential-bearing local environment file, and only the planned auth, test, and documentation changes.
