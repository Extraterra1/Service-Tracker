# Future Flight Scheduled Arrival Ordering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make future flights display strictly from earliest to latest scheduled arrival.

**Architecture:** Add a scheduled-only immutable sorter beside the existing effective-time sorter. Use it only in `FlightsWorkspace`, preserving current/live-flight behavior.

**Tech Stack:** React, JavaScript, Vitest, Testing Library

---

### Task 1: Add the scheduled-arrival regression test

**Files:**
- Modify: `src/features/flights/__tests__/flightSorting.test.js`

**Step 1:** Add a test where estimated/actual arrival fields conflict with scheduled arrival order.

**Step 2:** Run `npm test -- src/features/flights/__tests__/flightSorting.test.js` and confirm it fails because the scheduled-only sorter is missing.

### Task 2: Implement and connect scheduled ordering

**Files:**
- Modify: `src/features/flights/flightSorting.js`
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`

**Step 1:** Export `sortFutureFlightsByScheduledArrival` using only `scheduledArrivalLocal`, invalid values last, and flight number for ties.

**Step 2:** Use that sorter in the future workspace and update the integration test wording/data to prove earliest scheduled arrival renders first.

**Step 3:** Run focused tests and confirm they pass.

### Task 3: Verify and release

**Files:**
- Verify all changed files

**Step 1:** Run ESLint on changed source/test files.

**Step 2:** Run the full test suite and production build.

**Step 3:** Check the staged diff, commit, and push `master`.
