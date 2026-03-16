# Shared Plate Return Done Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a small completed indicator to entrega shared-plate icons when the paired recolha is marked done.

**Architecture:** Extend the shared-plate marker object in `ServiceWorkspace` with recolha completion state derived from `statusMap`. Render the badge in `ServiceItemCard` only for entrega items and update the memo comparator so status-driven marker changes re-render correctly.

**Tech Stack:** React, Vitest, Testing Library, CSS

---

### Task 1: Capture the regression in a workspace-level test

**Files:**
- Modify: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

**Step 1: Write the failing test**

Render one entrega and one recolha sharing a plate, set the recolha status to done, and expect only the entrega shared-plate button to expose a completed label.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`
Expected: FAIL because the shared-plate button has no completed state yet.

### Task 2: Add recolha completion to shared markers

**Files:**
- Modify: `src/features/service-workspace/ServiceWorkspace.jsx`

**Step 1: Write minimal implementation**

Track the return item id and its `done` state while building shared-plate markers, then include a boolean such as `returnDone` in each marker.

**Step 2: Keep dependencies correct**

Make sure the memoized marker computation depends on `statusMap`.

### Task 3: Render the badge on entrega cards

**Files:**
- Modify: `src/components/ServiceItemCard.jsx`
- Modify: `src/App.css`

**Step 1: Write minimal implementation**

Render a small check badge on the shared-plate button only when the current item is an entrega and the marker says the recolha is done. Update the button title/aria-label to reflect the completed state.

**Step 2: Update memoization**

Ensure the card comparator watches the marker completion flag as well as the marker color so the badge updates when status changes.

### Task 4: Verify the change

**Files:**
- Test: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

**Step 1: Run targeted tests**

Run: `npm test -- src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`
Expected: PASS

**Step 2: Run related card tests**

Run: `npm test -- src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
Expected: PASS
