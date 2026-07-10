# Flight Client Hierarchy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lower the visual priority of flight clients while making their relationship to each flight unmistakable.

**Architecture:** Preserve the existing JSX and data flow. Express hierarchy entirely through the flight client container and child styles so behavior and accessibility remain unchanged.

**Tech Stack:** CSS, Vitest, React Testing Library

---

### Task 1: Lock the hierarchy contract

**Files:**
- Create: `src/features/flights/__tests__/flightClientHierarchy.test.js`

**Step 1: Write the failing CSS regression test**

Read `src/App.css` and assert that the client container has an inset background and label styling, client typography is smaller, the phone inherits standard text color, and the WhatsApp SVG remains green.

**Step 2: Run the test**

Run: `npx vitest run src/features/flights/__tests__/flightClientHierarchy.test.js`

Expected: FAIL because the existing client section is flat and the whole phone link is green.

### Task 2: Implement the compact inset section

**Files:**
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/App.css`
- Modify: `src/features/flights/FlightsWorkspaceSkeleton.jsx`

**Step 1: Add the section label**

Render a quiet `Clients` heading inside the existing client container and mirror its inset footprint in the skeleton.

**Step 2: Adjust visual hierarchy**

Add a subtle tinted background, inset boundary, reduced font and control sizes, tighter spacing, and the standard-text/green-icon WhatsApp split.

**Step 3: Run focused tests**

Run the hierarchy test and existing flight workspace tests. Expected: PASS.

### Task 3: Verify and integrate locally

**Files:**
- Modify only if verification finds a scoped issue.

**Step 1: Run full verification**

Run `npm test`, changed-file ESLint, `git diff --check`, and `npm run build:perf`.

**Step 2: Commit and fast-forward merge**

Commit on `codex/flight-client-hierarchy`, fast-forward local `master`, and stop without pushing or deploying.
