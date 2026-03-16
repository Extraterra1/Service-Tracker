# Manual Time Override Audit Footer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show the correct `updatedBy` and `updatedAt` footer on service cards after a manual time override.

**Architecture:** Preserve time override audit metadata when overrides are merged into service items, then have the card footer choose the newest audit source across status, ready state, and manual override. Cover the regression with a component test.

**Tech Stack:** React, Vitest, Testing Library

---

### Task 1: Reproduce the missing footer update

**Files:**
- Modify: `src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
- Test: `src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`

**Step 1: Write the failing test**

Add a card test that renders an item with manual override audit metadata and expects the footer to show `Atualizado por ...`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
Expected: FAIL because the footer still shows `Sem atualização de equipa`.

### Task 2: Preserve and consume override audit metadata

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/ServiceItemCard.jsx`

**Step 1: Write minimal implementation**

Pass `updatedAt`, `updatedByName`, and `updatedByEmail` from the override map onto merged service items, then update the card to select the newest audit source among status, ready, and override metadata.

**Step 2: Run targeted tests**

Run: `npm test -- src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
Expected: PASS

### Task 3: Verify related behavior

**Files:**
- Test: `src/lib/__tests__/timeOverrideChanges.test.js`

**Step 1: Run related tests**

Run: `npm test -- src/lib/__tests__/timeOverrideChanges.test.js src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
Expected: PASS
