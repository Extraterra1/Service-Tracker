# Current Flights Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a current-day real-time Voos board using Flight Checker API data, automatic/manual refresh, client grouping, and an Anteriores archive.

**Architecture:** Add a dedicated adapter for FR24-Scraper's batch endpoint and a shared Firestore cache/refresh lease while reusing the existing flight board presentation. Keep current and future workspace fetching separate, reset current Voos to today's service data, and derive archived flights from UTC arrival timestamps plus a lightweight clock tick.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, CSS, Flight Checker Express API

---

### Task 1: Current-flight API adapter

**Files:**
- Create: `src/features/flights/currentFlightsApi.js`
- Create: `src/features/flights/__tests__/currentFlightsApi.test.js`

**Steps:**
1. Write failing tests for FR24 batch payloads, API-key headers, 25-flight chunking, partial errors, and UTC-to-Madeira mapping.
2. Run the adapter tests and confirm the expected failures.
3. Implement the minimal adapter using parallel fetches and normalized display results.
4. Run the adapter tests to green.

### Task 2: Shared Firestore flight cache

**Files:**
- Create: `src/lib/flightStatusStore.js`
- Create: `src/lib/__tests__/flightStatusStore.test.js`
- Modify: `firestore.rules`
- Modify: `src/lib/__tests__/firestore.rules.test.js`

**Steps:**
1. Write failing tests for freshness, flight-set matching, subscriptions, persistence, and refresh lease behavior.
2. Implement the current-day cache document and refresh lease using existing Firestore conventions.
3. Add rules that allow active staff to read/write structurally validated current-day documents only.
4. Run store and rule tests to green.

### Task 3: Current-day workspace behavior

**Files:**
- Create: `src/features/flights/CurrentFlightsWorkspace.jsx`
- Create: `src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`
- Modify: `src/features/flights/FlightsWorkspace.jsx`

**Steps:**
1. Write failing UI tests for initial load, client grouping, manual refresh, two-minute polling, retained results during refresh, and partial failure.
2. Run the focused tests and confirm they fail.
3. Extract/reuse the established flight row and client presentation where useful, then implement current-flight state and refresh behavior.
4. Run focused tests to green.

### Task 4: Anteriores classification

**Files:**
- Modify: `src/features/flights/CurrentFlightsWorkspace.jsx`
- Modify: `src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`
- Modify: `src/App.css`

**Steps:**
1. Add failing clock-controlled tests for arrived flights before and after the one-hour threshold.
2. Implement Madeira-local arrival parsing, clock ticking, main-list partitioning, and a collapsed native disclosure.
3. Add compact styles consistent with the existing board and reduced-motion behavior.
4. Run focused tests to green.

### Task 5: App integration and today-only navigation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/__tests__/AppTabBar.test.jsx` or an appropriate app navigation test
- Delete: `src/features/flights/FlightsComingSoonWorkspace.jsx`
- Delete: `src/features/flights/__tests__/FlightsComingSoonWorkspace.test.jsx`

**Steps:**
1. Add a failing integration test proving Voos renders the live workspace and resets the shared date to today.
2. Replace the construction-screen lazy import with CurrentFlightsWorkspace and pass current service-day state.
3. Ensure Voos never renders DateNavigator while Voos Futuros remains unchanged.
4. Run integration tests to green.

### Task 6: Verification

**Files:**
- Review all modified files.

**Steps:**
1. Run focused flight tests.
2. Run ESLint on changed JavaScript files and `git diff --check`.
3. Run the full test suite and production build.
4. Review the final diff and leave all work local without pushing.
