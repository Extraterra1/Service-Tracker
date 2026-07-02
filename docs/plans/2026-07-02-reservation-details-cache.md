# Reservation Details Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reuse fetched reservation details until the browser page is refreshed.

**Architecture:** Add a module-level `Map` beside the service reservation popup and key it by normalized reservation reference. Initialize popup state from the cache, populate it only after successful API responses, and preserve the current loading, error, and retry behavior for cache misses.

**Tech Stack:** React 19, Vitest, Testing Library

---

### Task 1: Cache successful reservation details

**Files:**
- Modify: `src/features/service-workspace/ServiceReservationPopup.jsx`
- Test: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

**Step 1: Write the failing test**

Add a test that opens reservation `10787`, resolves the lookup, closes and reopens the popup, and expects `fetchReservationDetails` to have been called once.

**Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

Expected: FAIL because reopening currently triggers a second lookup.

**Step 3: Write the minimal implementation**

Add a module-level `Map`, normalize references before using them as keys, initialize state from the cached response, skip fetching on a cache hit, and cache only successful responses.

**Step 4: Run the focused tests**

Run: `npm test -- --run src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

Expected: PASS.

**Step 5: Run regression checks**

Run: `npm test -- --run src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx src/components/__tests__/ServiceItemCard.locationLink.test.jsx`

Run: `npm run build`

Expected: PASS.
