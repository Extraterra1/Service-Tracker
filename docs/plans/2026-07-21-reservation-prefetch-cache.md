# Reservation Prefetch Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prefetch reservation details from the service list, persist them for 24 hours, and show cached details while the selected reservation refreshes.

**Architecture:** Introduce a versioned localStorage cache with normalized keys, expiry, in-flight request deduplication, and bounded prefetch concurrency. Wire the service workspace to prefetch visible reservation references and make the popup use stale-while-revalidate state with a subtle refresh indicator.

**Tech Stack:** React 19, browser localStorage, Vitest, Testing Library

---

### Task 1: Reservation details cache

**Files:**
- Create: `src/lib/reservationDetailsCache.js`
- Create: `src/lib/__tests__/reservationDetailsCache.test.js`

**Step 1: Write failing cache tests**

Cover these public behaviors:

```js
expect(readCachedReservation('00123', now)).toEqual(reservation)
expect(readCachedReservation('123', now + 24 * 60 * 60 * 1000)).toBeNull()
expect(fetchAndCacheReservation('00123')).toBe(fetchAndCacheReservation('123'))
await prefetchReservationDetails(['1', '2', '3'])
```

Assert that successful values survive a module reload through localStorage, expired/malformed values are ignored, equivalent references share one request, and the prefetch worker never exceeds its concurrency limit.

**Step 2: Run tests to verify RED**

Run: `npm test -- src/lib/__tests__/reservationDetailsCache.test.js`

Expected: FAIL because `reservationDetailsCache.js` does not exist.

**Step 3: Implement the minimal cache module**

Export:

```js
export const RESERVATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000
export function normalizeReservationReference(reference) {}
export function readCachedReservation(reference, now = Date.now()) {}
export function fetchAndCacheReservation(reference) {}
export function prefetchReservationDetails(references, { concurrency = 3 } = {}) {}
```

Use a versioned localStorage record, guard all storage access, persist only successful responses, remove expired entries during reads, share promises through an in-flight map, and let prefetch settle failures without rejecting the whole batch.

**Step 4: Run tests to verify GREEN**

Run: `npm test -- src/lib/__tests__/reservationDetailsCache.test.js`

Expected: PASS.

### Task 2: Service-list background prefetch

**Files:**
- Modify: `src/features/service-workspace/ServiceWorkspace.jsx`
- Modify: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

**Step 1: Write the failing workspace test**

Mock `prefetchReservationDetails`, render pickups and returns with repeated and zero-padded references, and assert the workspace schedules one prefetch call with unique usable references after list data becomes available.

**Step 2: Run the focused test to verify RED**

Run: `npm test -- src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

Expected: FAIL because no prefetch is initiated.

**Step 3: Add the prefetch effect**

Derive unique reservation references with `useMemo`, call `prefetchReservationDetails` from `useEffect`, and ensure empty/loading lists do not perform work. Keep failures best-effort and out of visible workspace state.

**Step 4: Run the focused test to verify GREEN**

Run: `npm test -- src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

Expected: PASS.

### Task 3: Popup stale-while-revalidate behavior

**Files:**
- Modify: `src/features/service-workspace/ServiceReservationPopup.jsx`
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Modify: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

**Step 1: Write failing popup behavior tests**

Seed persisted cache data, open the reservation, and assert that:

```js
expect(screen.getByRole('dialog', { name: /Reserva/ })).toBeInTheDocument()
expect(screen.getByText('A atualizar…')).toBeInTheDocument()
```

Resolve the refresh and assert new content replaces old content. Add a failure case proving cached content remains and the indicator disappears. Preserve a no-cache failure test for the existing retry screen.

**Step 2: Run the focused tests to verify RED**

Run: `npm test -- src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

Expected: FAIL because cached popup content is not refreshed and no indicator exists.

**Step 3: Implement stale-while-revalidate state**

Replace the component-local map with the cache module. Initialize from persisted cache, always invoke `fetchAndCacheReservation` on open, retain cached content during refresh/failure, and use request IDs to ignore late results. Pass an `isRefreshing` prop into `ReservationDetailsPopup`.

**Step 4: Render subtle refresh feedback**

Add a compact `LoaderCircle` plus `A atualizar…` status near the showcase title. Use `role="status"`, polite announcements, and existing header visual language.

**Step 5: Run the focused tests to verify GREEN**

Run: `npm test -- src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

Expected: PASS.

### Task 4: Styling and full verification

**Files:**
- Modify: `src/App.css`

**Step 1: Add minimal indicator styling**

Style the refresh status as subdued inline metadata and animate only the icon rotation. Respect `prefers-reduced-motion` by disabling the rotation.

**Step 2: Run relevant tests**

Run: `npm test -- src/lib/__tests__/reservationDetailsCache.test.js src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

Expected: PASS.

**Step 3: Run repository verification**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Expected: all commands succeed without new warnings or errors.

**Step 4: Review the diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intended files changed.
