# TV Operations Board Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a hidden `#tv` workspace that continuously displays the next unfinished delivery and recolha with TV-scale hierarchy.

**Architecture:** Extend hash workspace resolution with a non-menu `tv` workspace. Add pure selectors for unfinished services and effective flight time, then render a dedicated read-only component fed by the existing service state and shared flight-status cache. Keep normal authentication and realtime subscriptions intact while suppressing standard app chrome in TV mode.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, CSS, existing Firebase realtime stores and flight-status cache.

---

### Task 1: Route the hidden TV workspace

**Files:**
- Modify: `src/lib/workspaceNavigation.js`
- Modify: `src/lib/__tests__/workspaceNavigation.test.js`

1. Add a failing test that `resolveWorkspace('#tv')` returns `tv` and that `getPrimaryTabId('tv')` returns an empty string.
2. Run `npm test -- src/lib/__tests__/workspaceNavigation.test.js` and confirm failure.
3. Add the `#tv` resolution without adding a primary-tab mapping.
4. Re-run the focused test and confirm it passes.

### Task 2: Select the next unfinished services and effective time

**Files:**
- Create: `src/features/tv/tvBoard.js`
- Create: `src/features/tv/__tests__/tvBoard.test.js`

1. Write failing tests showing that completed services are excluded, overdue unfinished services remain eligible, reservation overrides control ordering, untimed items sort last, delivery and recolha are selected independently, and matching flight arrival time takes display precedence only for delivery.
2. Run `npm test -- src/features/tv/__tests__/tvBoard.test.js` and confirm failure.
3. Implement small pure helpers for time parsing, unfinished selection, flight-result matching, and `HH:mm` extraction from the live flight result with reservation-time fallback.
4. Re-run the focused test and confirm it passes.

### Task 3: Build the read-only TV board

**Files:**
- Create: `src/features/tv/TvOperationsBoard.jsx`
- Create: `src/features/tv/__tests__/TvOperationsBoard.test.jsx`
- Modify: `src/App.css`

1. Write failing component tests for the dominant delivery section, secondary recolha section, flight-time priority, reservation fallback, operational details, and section-specific empty/loading states.
2. Run `npm test -- src/features/tv/__tests__/TvOperationsBoard.test.jsx` and confirm failure.
3. Implement the component as semantic read-only sections with a roughly 70/30 visual split and no interaction controls.
4. Add scoped `tv-` CSS with fluid `clamp()` typography, high contrast, 16:9-friendly spacing, overflow protection, and reduced-motion handling.
5. Re-run the component test and confirm it passes.

### Task 4: Connect shared live flight data

**Files:**
- Create: `src/features/tv/useTvFlightData.js`
- Create: `src/features/tv/__tests__/useTvFlightData.test.jsx`

1. Write failing hook tests for subscribing to today's shared flight cache, refreshing stale/missing data using the existing lease and API helpers, and cleaning up timers/subscriptions.
2. Run `npm test -- src/features/tv/__tests__/useTvFlightData.test.jsx` and confirm failure.
3. Implement a focused read-only hook reusing `flightStatusStore`, `fetchCurrentFlights`, and normalized pickup flight numbers.
4. Re-run the hook test and confirm it passes.

### Task 5: Integrate `#tv` and remove standard app chrome

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.css`
- Modify: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx` or add an app-level TV test in the nearest existing app test location.

1. Write a failing integration test that loads `#tv`, renders the TV board, and does not render the app header or bottom navigation.
2. Run the focused integration test and confirm failure.
3. Lazy-load the TV board, pass today's service data/status/loading state/user ID, suppress header/banners/popups/tab bar in TV mode, and preserve access-gate behavior.
4. Re-run the integration test and confirm it passes.

### Task 6: Verify the complete change

**Files:**
- Review all modified files.

1. Run all focused TV and routing tests.
2. Run `npm test`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Inspect the TV workspace at a 1920×1080 viewport and correct any clipping or weak-distance legibility.
