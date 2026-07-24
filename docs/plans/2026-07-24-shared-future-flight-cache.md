# Shared Future Flight Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cache future-flight results in Firestore for 24 hours across approved users, with exact flight-set invalidation and manual refresh.

**Architecture:** Add an isolated future-flight cache/lease store modeled on the current-day shared cache, then integrate it into `FlightsWorkspace` with stale-while-revalidate behavior. Add narrowly validated Firestore rules for future dates and deploy them before pushing the frontend.

**Tech Stack:** React, Firebase Firestore, Firestore Security Rules, Vitest, Testing Library, Vite

---

### Task 1: Build the future-flight cache store

**Files:**
- Create: `src/lib/futureFlightCacheStore.js`
- Create: `src/lib/__tests__/futureFlightCacheStore.test.js`

**Steps:**

1. Write failing tests for a 24-hour TTL, normalized exact-set matching, per-date memory cache, Firestore subscription, normalized persistence metadata, and the 45-second transaction lease.
2. Run `npm test -- src/lib/__tests__/futureFlightCacheStore.test.js` and verify the missing module/exports fail.
3. Implement normalization, memory cache, `isFutureFlightCacheFresh`, `subscribeToFutureFlightDay`, `saveFutureFlightCache`, and `tryAcquireFutureFlightRefreshLease`.
4. Rerun the store tests and confirm they pass.

### Task 2: Integrate cached future flights

**Files:**
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/App.jsx`

**Steps:**

1. Add failing tests proving matching fresh shared cache renders without an external request, stale/missing/changed-set caches refresh, cached results survive refresh/save failures, and manual refresh bypasses freshness.
2. Run `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx` and verify the new expectations fail.
3. Pass `userUid` from `App` into future flights. Subscribe by selected date, use matching cache immediately, coordinate automatic refresh with the lease, save successful results best-effort, and add a compact manual refresh control with `A atualizar…` feedback.
4. Preserve request invalidation on date/flight-set changes and the existing retry behavior when no usable results exist.
5. Run future and current flight component tests and confirm they pass.

### Task 3: Secure and document the shared cache

**Files:**
- Modify: `firestore.rules`
- Modify: `src/lib/__tests__/firestore.rules.test.js`
- Modify: `docs/agents/data-model-and-rules.md`
- Modify: `docs/agents/feature-map.md`

**Steps:**

1. Add failing emulator tests for approved reads/writes, rejected malformed payloads, rejected spoofed updater UID, and denied deletes for `future_flight_cache` and `future_flight_refresh_locks`.
2. Add exact validators and collection rules without the current-date restriction.
3. Update data-model and feature documentation.
4. Run the rules tests when emulator credentials are available; otherwise run rules compilation during deployment and report the skipped emulator state explicitly.

### Task 4: Verify, deploy, and release

1. Run focused ESLint on changed JavaScript/JSX files.
2. Run `npm test`.
3. Run `npm run build` and `git diff --check`.
4. Review the staged diff for unrelated changes and credential patterns.
5. Deploy with `firebase deploy --only firestore:rules` and verify success for `sheet-generator-69633`.
6. Commit the scoped implementation and push `master` to `origin`.
