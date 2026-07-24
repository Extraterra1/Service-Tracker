# Future Flights for All Approved Users Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the separate `Voos futuros` workspace available to every approved signed-in user.

**Architecture:** Remove the admin-role predicate only at the two client-side entry points: hash resolution and header-menu rendering. Preserve the workspace identity, date boundary, flight data flow, and all unrelated administrator gates.

**Tech Stack:** React, JavaScript, Vitest, Testing Library, Vite

---

### Task 1: Make future-flight navigation universal

**Files:**
- Modify: `src/lib/__tests__/workspaceNavigation.test.js`
- Modify: `src/lib/workspaceNavigation.js`

**Step 1: Write the failing test**

Change the navigation expectation so both `resolveWorkspace('#voos-futuros', true)` and `resolveWorkspace('#voos-futuros', false)` return `futureFlights`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/workspaceNavigation.test.js`
Expected: FAIL because the non-admin case currently returns `services`.

**Step 3: Write minimal implementation**

Remove the `canManageAccess` condition from the `#voos-futuros` branch in `resolveWorkspace`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/workspaceNavigation.test.js`
Expected: PASS.

### Task 2: Show the menu destination to approved staff

**Files:**
- Modify: `src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`
- Modify: `src/components/AppHeaderMenu.jsx`
- Modify: `src/App.jsx`

**Step 1: Write the failing test**

Replace the non-admin hidden expectation with an expectation that `Voos futuros` is visible and opens `futureFlights`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`
Expected: FAIL because the menu action is currently rendered only when `canManageAccess` is true.

**Step 3: Write minimal implementation**

Render the future-flight menu action independently of `canManageAccess`. In `App`, stop redirecting approved staff away from `futureFlights` when handling or reconciling workspace state.

**Step 4: Run focused tests**

Run: `npm test -- src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx src/lib/__tests__/workspaceNavigation.test.js`
Expected: PASS.

### Task 3: Align documentation and verify

**Files:**
- Modify: `docs/agents/feature-map.md`
- Modify: `docs/agents/architecture-overview.md`

**Step 1: Update current behavior documentation**

Describe `#voos-futuros` as a separate destination available to every approved user and preserve the existing administrator-only access-management descriptions.

**Step 2: Run verification**

Run: `npx eslint src/App.jsx src/components/AppHeaderMenu.jsx src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx src/lib/workspaceNavigation.js src/lib/__tests__/workspaceNavigation.test.js`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands pass.
