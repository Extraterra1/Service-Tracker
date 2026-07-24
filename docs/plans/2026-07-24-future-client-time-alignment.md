# Future Client Time Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align each future reservation time horizontally with the scheduled flight time above while retaining it inside the client box.

**Architecture:** Add future-only alignment hooks to `FlightsWorkspace` and use CSS subgrid to inherit the parent flight columns. Group the remaining client details separately and restore the existing compact client grid below 700px.

**Tech Stack:** React, CSS Grid/Subgrid, JavaScript, Vitest, Testing Library, Vite

---

### Task 1: Specify future-only alignment hooks

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/features/flights/FlightsWorkspace.jsx`

**Step 1: Write the failing test**

Assert that future flight clients have `flight-client--time-aligned`, their `Hora` detail has `flight-client-time`, and the surrounding box has `flight-clients--time-aligned`. Assert current-day clients lack those hooks.

**Step 2: Run tests to verify failure**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`
Expected: FAIL because the alignment hooks and grouped detail structure do not exist.

**Step 3: Write minimal markup**

Apply the alignment classes only when `singleTime` is false. Wrap car, matrícula, and actions in a `flight-client-rest` element so the first two inherited columns remain dedicated to identity and `Hora`.

**Step 4: Run focused component tests**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`
Expected: PASS.

### Task 2: Implement responsive grid alignment

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/App.css`

**Step 1: Write the failing CSS regression assertions**

Assert the aligned client container and row use `grid-template-columns: subgrid`, `flight-client-time` uses inherited column 2, `flight-client-rest` occupies columns 3 through 4, and the max-width 700px rule replaces subgrid with the compact two-column layout.

**Step 2: Run test to verify failure**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx`
Expected: FAIL because the alignment CSS is absent.

**Step 3: Write minimal CSS**

Remove the earlier approximate five-column future rule. Add future-only subgrid rules with no horizontal offset, and add mobile overrides restoring two columns and stacking `Hora` with the other client details.

**Step 4: Run focused flight tests**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx`
Expected: PASS.

### Task 3: Verify and release

**Files:**
- Modify: `docs/agents/feature-map.md`

**Step 1: Update documentation**

Record that future reservation time remains in the client box and aligns to the scheduled flight-time column on wide layouts.

**Step 2: Run release verification**

Run focused ESLint, `npm test`, `npm run build`, and `git diff --check`.

**Step 3: Commit and push**

Review the staged scope for unrelated changes and credential patterns, commit the implementation, and push `master` to `origin`.
