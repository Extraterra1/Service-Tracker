# Future Flight Row Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show reservation times in future-flight client rows and present every future flight with only its scheduled time and `Programado` status.

**Architecture:** Add the reservation time to the existing `FlightClient` presentation and simplify the default future-flight branch of `FlightResult`. Preserve `singleTime` and `prominentStatus` behavior used by current-day flights, along with all API data and sorting.

**Tech Stack:** React, JavaScript, Vitest, Testing Library, CSS, Vite

---

### Task 1: Specify the simplified future-flight row

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/features/flights/FlightsWorkspace.jsx`

**Step 1: Write failing tests**

Update the future-flight field test to expect one `Programado` time using `scheduledArrivalLocal`, no `Estimado` or `Real` labels, and a `Programado` status even when the API result says `arrived`. Add a client-row assertion for `Hora` and an existing service item's `time` value.

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx`
Expected: FAIL because the row still renders three flight times, the API status, and no reservation time.

**Step 3: Write minimal implementation**

In the default future-flight branch, render one `<FlightTime label="Programado" value={result.scheduledArrivalLocal} />` and use `scheduled`/`Programado` for the displayed status. In `FlightClient`, render a `Hora` detail using the existing time formatter and `client.time`.

**Step 4: Run the focused test**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx`
Expected: PASS.

### Task 2: Match the loading skeleton

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx`
- Modify: `src/features/flights/FlightsWorkspaceSkeleton.jsx`

**Step 1: Write the failing test**

Expect one flight-time placeholder labelled `Programado` and three client-detail placeholders for Hora, Carro, and Matrícula.

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx`
Expected: FAIL because the skeleton has three flight times and two client details.

**Step 3: Write minimal implementation**

Reduce `TIME_LABELS` to `['Programado']` and add one client-detail skeleton span.

**Step 4: Run focused flight tests**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`
Expected: PASS, demonstrating current-day flight rendering remains intact.

### Task 3: Verify and release

**Files:**
- Modify: `docs/agents/feature-map.md`

**Step 1: Update documentation**

Document the single scheduled future-flight time, fixed future status, and client reservation time.

**Step 2: Run verification**

Run: `npx eslint src/features/flights/FlightsWorkspace.jsx src/features/flights/FlightsWorkspaceSkeleton.jsx src/features/flights/__tests__/FlightsWorkspace.test.jsx src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx`

Run: `npm test`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands pass.

**Step 3: Commit and push**

Commit the scoped implementation and documentation, then push `master` to `origin` after verifying the staged diff contains no secrets or unrelated changes.
