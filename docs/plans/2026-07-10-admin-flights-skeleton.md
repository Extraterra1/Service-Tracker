# Admin Flights and Loading Skeleton Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restrict Flights to admins, add logo home navigation, and render a native arrivals-board skeleton during all flight loading states.

**Architecture:** Centralize access in `resolveWorkspace` and `App.jsx`, keeping UI visibility and direct-hash behavior consistent. Reuse one skeleton component in the lazy boundary and loaded workspace so both loading phases share the same accessible visual structure.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, CSS.

---

### Task 1: Make Flights admin-only

**Files:** `src/lib/workspaceNavigation.js`, `src/lib/__tests__/workspaceNavigation.test.js`, `src/App.jsx`, `src/components/AppHeaderMenu.jsx`, and relevant component tests.

1. Write failing tests for non-admin `#voos` resolution/redirect and hidden menu action.
2. Run focused tests and confirm RED.
3. Gate Flights with `canManageAccess`, while preserving admin navigation.
4. Run focused tests and commit `feat: restrict flights workspace to admins`.

### Task 2: Make the logo return to services

**Files:** `src/components/AppHeaderMenu.jsx`, its tests, and `src/App.css` if focus/reset styling is needed.

1. Write a failing test that clicks the logo and expects `onWorkspaceChange('services')`.
2. Run RED, implement the semantic button, then run GREEN.
3. Commit `feat: make app logo return to services`.

### Task 3: Add the Flights skeleton

**Files:** create `src/features/flights/FlightsWorkspaceSkeleton.jsx`; modify `FlightsWorkspace.jsx`, `App.jsx`, `App.css`, and flight tests.

1. Write failing tests for the lazy fallback and both loaded-workspace loading states.
2. Implement a shared board-shaped skeleton with responsive and reduced-motion CSS.
3. Run focused/full tests and build.
4. Commit `feat: add flights loading skeleton`.

### Task 4: Resolve lockfile and verify

1. Restore the root `package-lock.json` metadata-only rewrite to the committed version.
2. Run full tests, changed-file lint, build/performance checks, and diff integrity.
3. Update agent docs if admin-only Flights behavior needs recording.
4. Merge to `master`, rerun tests, and deploy Service Tracker.
