# Recolha Transfer Status Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persisted, audited red/green transfer toggle to completed recolha license plates and reset it when a recolha is undone.

**Architecture:** Introduce a `service_transfer` Firestore overlay parallel to `service_ready`, subscribe to it through the existing date-collections hook, and pass it into service cards. Transfer taps use their own batched store write and activity action; recolha undo resets transfer state in the status batch.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, Firebase Firestore, Firestore Emulator rules tests, CSS.

---

### Task 1: Transfer realtime map

**Files:**
- Modify: `src/lib/dateCollectionsMaps.js`
- Create: `src/lib/__tests__/transferChanges.test.js`

**Steps:**
1. Write failing tests showing `applyTransferChanges` normalizes `transferred`, plate, timestamp, and updater fields; preserves unchanged references; toggles entries; and removes deleted entries.
2. Run `npm test -- src/lib/__tests__/transferChanges.test.js` and confirm the missing export fails.
3. Implement `normalizeTransferEntry`, equality comparison, and `applyTransferChanges` following the ready-map pattern.
4. Re-run the focused test and confirm it passes.

### Task 2: Transfer persistence and activity payload

**Files:**
- Create: `src/lib/transferStore.js`
- Create: `src/lib/__tests__/transferStore.test.js`

**Steps:**
1. Write failing tests for missing/current-day validation, rejection of non-return items and missing plates, and the expected batched writes.
2. Assert the source write targets `service_transfer/{date}_{itemId}` with `serviceType: "return"` and `transferred`; assert the activity write uses `actionType: "transfer_toggle"`, the plate, transfer value, and updater/item metadata.
3. Run `npm test -- src/lib/__tests__/transferStore.test.js` and confirm failure because the module is absent.
4. Implement `subscribeToDateTransfers` and `setItemTransferredState` by adapting the ready-store structure to return items.
5. Re-run the focused tests and confirm they pass.

### Task 3: Realtime subscription wiring

**Files:**
- Modify: `src/hooks/useDateCollections.js`
- Modify: `src/hooks/__tests__/useServiceDayData.test.jsx` only if shared mocks require it
- Create or modify: `src/hooks/__tests__/useDateCollections.test.jsx`

**Steps:**
1. Write a failing hook test proving transfer changes populate `transferMap`, selected-date changes resubscribe, access loss clears it, and transfer subscription errors surface.
2. Run the focused hook test and confirm the missing map/subscription fails.
3. Add lazy loading, state, errors, and an effect for `subscribeToDateTransfers`; return `transferMap` and include transfer errors.
4. Re-run the focused test and confirm it passes.

### Task 4: Card interaction and visual states

**Files:**
- Modify: `src/components/ServiceItemCard.jsx`
- Modify: `src/App.css`
- Create: `src/components/__tests__/ServiceItemCard.transferStatus.test.jsx`

**Steps:**
1. Write failing component tests that an undone recolha renders a non-button plate with no highlight, a done/untransferred recolha renders a red pressed-state control, a transferred recolha renders green, and clicking calls `onToggleTransferred` only when done.
2. Include accessible labels/titles describing “aguarda transferência” and “transferida”.
3. Run the focused test and confirm the new control is absent.
4. Add `transferState` and `onToggleTransferred` props, derive eligibility from `serviceType === "return"`, `status.done`, and plate presence, and render the plate control with `is-awaiting-transfer` or `is-transferred` classes.
5. Extend memo comparison to include transfer state and callback identity.
6. Add red/green CSS states with matching hover and focus styles.
7. Re-run the focused test and existing card tests.

### Task 5: Workspace and application mutation flow

**Files:**
- Modify: `src/components/ServicePane.jsx`
- Modify: `src/features/service-workspace/ServiceWorkspace.jsx`
- Modify: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`
- Modify: `src/App.jsx`

**Steps:**
1. Add failing workspace tests proving the correct transfer entry/callback reaches recolha cards without changing entrega ready behavior.
2. Run the focused workspace test and confirm failure.
3. Thread `transferMap` and `onToggleTransferred` through workspace and pane components.
4. In `App`, consume `transferMap`, lazy-load the transfer store, and add a guarded handler that ignores non-return, undone, plate-less, unauthorized, past-date, or already-updating items, then toggles persisted state.
5. Pass the new props into `ServiceWorkspace` and re-run workspace tests.

### Task 6: Atomic undo reset

**Files:**
- Modify: `src/lib/statusStore.js`
- Modify: `src/lib/__tests__/statusStore.test.js`

**Steps:**
1. Write a failing store test proving `setItemDoneState({ done: false })` for a return with a plate adds a `service_transfer` merge write with `transferred: false` to the same batch, while other status changes do not.
2. Run the focused status-store test and confirm the reset write is missing.
3. Add the conditional transfer reset write using the same updater metadata and status update timestamp semantics.
4. Re-run status-store tests and confirm they pass.

### Task 7: Firestore validation

**Files:**
- Modify: `firestore.rules`
- Modify: `src/lib/__tests__/firestore.rules.test.js`

**Steps:**
1. Write failing emulator tests for valid current-day return transfer writes and invalid pickup, empty-plate, wrong-ID, wrong-UID, and non-current-day writes.
2. Add failing activity-rule tests for valid `transfer_toggle` entries and invalid service type or missing transfer fields.
3. Run `npm test -- src/lib/__tests__/firestore.rules.test.js` and confirm rule denials.
4. Add `isValidTransferPayload`, `hasValidOptionalTransferFields`, `transfer_toggle` activity validation, and the `service_transfer` match block.
5. Re-run the emulator tests and confirm they pass.

### Task 8: Activity, leaderboard, and audit attribution

**Files:**
- Modify: `src/lib/activityStore.js`
- Modify: `src/components/ActivityPopup.jsx`
- Modify: `src/components/__tests__/ActivityPopup.test.jsx`
- Modify: `src/lib/leaderboardStore.js`
- Modify: `src/lib/__tests__/leaderboardStore.test.js`
- Modify: `src/lib/leaderboardWinnerBadges.js`
- Modify relevant winner-badge and card tests

**Steps:**
1. Write failing tests that activity normalization/display distinguishes transferred on/off entries, each `transfer_toggle` scores one point, and the latest transfer timestamp controls audit/winner attribution.
2. Run the focused tests and confirm the new action is ignored.
3. Normalize transfer fields, add Portuguese activity labels, score transfer toggles like ready/time changes, and include transfer state in latest-update identity selection.
4. Pass transfer state into audit calculations on the card/pane path.
5. Re-run all focused tests and confirm they pass.

### Task 9: Documentation and full verification

**Files:**
- Modify: `docs/agents/data-model-and-rules.md`
- Modify: `docs/agents/change-guide.md`
- Modify: `docs/agents/testing-and-invariants.md`
- Modify: `docs/agents/feature-map.md` if its ready-state map enumerates overlays

**Steps:**
1. Document `service_transfer`, `transfer_toggle`, current-day/return-only rules, reset semantics, and leaderboard scoring.
2. Run focused transfer, status, card, workspace, activity, leaderboard, and Firestore tests.
3. Run `npm test` and `npm run build`.
4. Inspect `git diff --check` and `git status --short`.
5. Commit the completed implementation with a concise feature message.

