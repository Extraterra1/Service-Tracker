# Firestore Access Requests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an in-app menu section where active staff can approve or deny pending access requests using Firestore only.

**Architecture:** Move access request creation and decisions into client-side Firestore helpers guarded by security rules. App state subscribes to pending requests only after `accessState === 'allowed'`, then passes request data and decision handlers into the existing header menu accordion.

**Tech Stack:** React, Vite, Firebase Auth, Firestore, Firestore security rules, Vitest, Testing Library.

---

### Task 1: Access Request Store

**Files:**
- Create: `src/lib/accessRequestStore.js`
- Test: `src/lib/__tests__/accessRequestStore.test.js`

**Steps:**

1. Write failing tests for `createOwnAccessRequest`, `subscribeToPendingAccessRequests`, `approveAccessRequest`, and `denyAccessRequest`.
2. Run `npm test -- src/lib/__tests__/accessRequestStore.test.js` and verify failures.
3. Implement Firestore helpers with `serverTimestamp`, `query`, `where`, `orderBy`, `onSnapshot`, `writeBatch`, `setDoc`, and `updateDoc`.
4. Run the focused test and verify it passes.

### Task 2: Firestore Rules

**Files:**
- Modify: `firestore.rules`
- Test: `src/lib/__tests__/firestore.rules.test.js`

**Steps:**

1. Add failing emulator tests for non-staff self request creation, active staff request listing, staff approval, staff denial, and blocked non-staff writes.
2. Run `npm run test:rules` with the Firestore emulator available and verify failures.
3. Add constrained access request and allowlist write helpers in rules.
4. Run `npm run test:rules` and verify passes.

### Task 3: Access Gate Firestore Fallback

**Files:**
- Modify: `src/lib/access.js`
- Test: `src/lib/__tests__/access.test.js`

**Steps:**

1. Add failing tests showing missing request creation uses `createOwnAccessRequest` instead of the callable function.
2. Run `npm test -- src/lib/__tests__/access.test.js` and verify failures.
3. Update access resolution to use Firestore request creation for non-allowlisted users.
4. Run the focused test and verify it passes.

### Task 4: Pending Request Hook

**Files:**
- Create: `src/hooks/useAccessRequests.js`
- Test: `src/hooks/__tests__/useAccessRequests.test.jsx`

**Steps:**

1. Add failing hook tests for subscribing only when allowed and exposing approve/deny busy state.
2. Run `npm test -- src/hooks/__tests__/useAccessRequests.test.jsx` and verify failures.
3. Implement hook around `accessRequestStore`.
4. Run the focused test and verify it passes.

### Task 5: Menu UI

**Files:**
- Modify: `src/components/AppHeaderMenu.jsx`
- Modify: `src/App.css`
- Test: `src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`

**Steps:**

1. Add failing UI tests for the Access Requests section, empty state, and approve/deny buttons.
2. Run the focused menu test and verify failures.
3. Add accordion section and compact request rows.
4. Run the focused menu test and verify it passes.

### Task 6: App Wiring

**Files:**
- Modify: `src/App.jsx`
- Test: relevant focused tests

**Steps:**

1. Wire `useAccessRequests` into `App` after access is allowed.
2. Pass request props and handlers into `AppHeaderMenu`.
3. Run focused tests.

### Task 7: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/agents/architecture-overview.md`
- Modify: `docs/agents/data-model-and-rules.md`

**Steps:**

1. Update docs to describe Firestore-only approval and mark Telegram as removed/legacy.
2. Run `npm test`.
3. Run lint on touched files.
4. Run `npm run build`.
