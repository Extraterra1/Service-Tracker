# Reservations Tab State Retention Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve the Reservations tab's search, pagination, results, and scroll state when navigating to another tab and back, without refetching.

**Architecture:** Add a small keep-alive wrapper that mounts its children on first activation and subsequently toggles a native `hidden` container. Use it around `ReservationsWorkspace` in `App`, while excluding Reservations from the existing mutually exclusive workspace render chain.

**Tech Stack:** React 19, Vitest, Testing Library, Vite

---

### Task 1: Keep-alive lifecycle

**Files:**
- Create: `src/components/KeepAliveWorkspace.jsx`
- Create: `src/components/__tests__/KeepAliveWorkspace.test.jsx`

**Step 1: Write the failing test**

Test that a child mounts on first activation, retains typed state while inactive, is hidden while inactive, and does not rerun its mount-side request when reactivated.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/KeepAliveWorkspace.test.jsx`
Expected: FAIL because `KeepAliveWorkspace` does not exist.

**Step 3: Write minimal implementation**

Implement a wrapper with a `hasBeenActive` state. Set it after activation, render nothing before first activation, and render a `hidden={!active}` container thereafter.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/KeepAliveWorkspace.test.jsx`
Expected: PASS.

### Task 2: Preserve Reservations in App

**Files:**
- Modify: `src/App.jsx`

**Step 1: Integrate the wrapper**

Render the lazy Reservations workspace inside `KeepAliveWorkspace`, and remove Reservations from the mutually exclusive conditional chain used by other workspaces.

**Step 2: Run focused regression tests**

Run: `npm test -- src/components/__tests__/KeepAliveWorkspace.test.jsx src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`
Expected: PASS.

**Step 3: Verify the project**

Run: `npm run lint && npm run build`
Expected: both commands exit successfully.
