# Future Flights Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the flight workspace future-only and open it on tomorrow by default.

**Architecture:** Extend `DateNavigator` with optional minimum-date and preset props, keeping its existing defaults unchanged. Centralize the tomorrow calculation in workspace navigation helpers and use it when opening or directly resolving the flights workspace.

**Tech Stack:** React, existing date helpers, Vitest, Testing Library

---

### Task 1: Specify future date navigation

**Files:**
- Modify: `src/components/__tests__/DateNavigator.test.jsx`
- Modify: `src/lib/__tests__/workspaceNavigation.test.js`

**Step 1: Write failing tests**

Assert that the future configuration displays `Próximos`, selects tomorrow, applies the input minimum, clamps invalid input, and disables the previous button at tomorrow. Assert the workspace helper returns tomorrow.

**Step 2: Run tests and confirm RED.**

### Task 2: Implement future-only navigation

**Files:**
- Modify: `src/components/DateNavigator.jsx`
- Modify: `src/lib/workspaceNavigation.js`
- Modify: `src/App.jsx`

**Step 1: Add optional navigator props with current behavior as defaults.**

**Step 2: Set tomorrow on flight entry and clamp direct access.**

**Step 3: Run focused tests and confirm GREEN.**

### Task 3: Rename the menu action

**Files:**
- Modify: `src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`
- Modify: `src/components/AppHeaderMenu.jsx`

**Step 1: Update the test first and verify it fails.**

**Step 2: Rename the action to `Voos futuros` and verify it passes.**

### Task 4: Verify and integrate locally

Run the full test suite, changed-file lint, `git diff --check`, and `npm run build:perf`. Commit on `codex/future-flights`, fast-forward local `master`, and do not push or deploy.
