# Flight Time Ordering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Order current, previous, and future flight lists by effective arrival time, earliest first.

**Architecture:** Add a pure shared sorting utility that mirrors the displayed-time fallback chain and never mutates its input. Apply it at the presentation boundary in both flight workspaces, after current/previous grouping where applicable.

**Tech Stack:** JavaScript, React, Vitest, Testing Library

---

### Task 1: Specify the shared ordering utility

**Files:**
- Create: `src/features/flights/__tests__/flightSorting.test.js`
- Create: `src/features/flights/flightSorting.js`

**Step 1:** Write failing unit tests for ascending effective time, fallback priority, missing times last, flight-number tie-breaking, and input immutability.

**Step 2:** Run `npm test -- src/features/flights/__tests__/flightSorting.test.js --run` and confirm failure because the module does not exist.

**Step 3:** Implement `getEffectiveArrivalTime` and `sortFlightsByArrivalTime` minimally.

**Step 4:** Rerun the focused unit test and confirm it passes.

### Task 2: Apply ordering to current and previous flights

**Files:**
- Modify: `src/features/flights/CurrentFlightsWorkspace.jsx`
- Modify: `src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`

**Step 1:** Add a rendering test with deliberately reversed current and previous results.

**Step 2:** Run the focused workspace test and confirm chronological-order assertions fail.

**Step 3:** Sort each group independently using the shared utility.

**Step 4:** Rerun the focused test and confirm it passes.

### Task 3: Apply ordering to future flights

**Files:**
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`

**Step 1:** Add a rendering test with future results returned in reverse chronological order.

**Step 2:** Run the focused workspace test and confirm it fails.

**Step 3:** Sort a copied result array before rendering.

**Step 4:** Rerun the focused test and confirm it passes.

### Task 4: Verify

**Step 1:** Run `npm test -- src/features/flights --run`.

**Step 2:** Run scoped ESLint on touched flight files.

**Step 3:** Run `npm run build` and `git diff --check`.

Expected: all commands succeed.
