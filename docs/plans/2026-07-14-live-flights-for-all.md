# Live Flights for All Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show the current-day live flights workspace to every authenticated application user.

**Architecture:** Remove the role/email permission decision from `App` and make `FlightsAccessWorkspace` always render `CurrentFlightsWorkspace`. Delete the now-unused access helper and replace its authorization tests with a regression test for universal workspace access.

**Tech Stack:** React, JavaScript, Vitest, Testing Library, Vite

---

### Task 1: Lock in universal live-flight access

**Files:**
- Modify: `src/features/flights/__tests__/FlightsAccessWorkspace.test.jsx`
- Delete: `src/features/flights/__tests__/flightAccess.test.js`

**Step 1: Write the failing test**

Change the default `FlightsAccessWorkspace` test to render without an access prop and expect the live workspace rather than the coming-soon view.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/features/flights/__tests__/FlightsAccessWorkspace.test.jsx`

Expected: FAIL because the current default permission is false and the coming-soon view renders.

### Task 2: Remove the obsolete access branch

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/features/flights/FlightsAccessWorkspace.jsx`
- Delete: `src/features/flights/flightAccess.js`

**Step 1: Write minimal implementation**

Remove the access-helper import and `canViewCurrentFlights` calculation from `App`. Stop passing `canViewLiveFlights` to `FlightsAccessWorkspace`. Make `FlightsAccessWorkspace` pass its props directly to `CurrentFlightsWorkspace`, and remove its coming-soon import.

**Step 2: Run focused tests**

Run: `npm test -- src/features/flights/__tests__/FlightsAccessWorkspace.test.jsx src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx src/lib/__tests__/workspaceNavigation.test.js`

Expected: all tests pass.

**Step 3: Verify production output**

Run: `npx eslint src/App.jsx src/features/flights/FlightsAccessWorkspace.jsx src/features/flights/__tests__/FlightsAccessWorkspace.test.jsx && npm run build && git diff --check`

Expected: scoped lint has no errors, build succeeds, and diff check is clean.
