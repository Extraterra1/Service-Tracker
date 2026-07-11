# Porta-chaves Selection Pill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix real-browser plate selection and display a removable selected-plate pill.

**Architecture:** Preserve input focus on result pointer-down so selection remains click-driven and keyboard-compatible. Render the selected value from existing state in a pill with an explicit clear action.

**Tech Stack:** React 19, Testing Library, Vitest, existing CSS.

---

### Task 1: Reproduce and fix the pointer selection race

**Files:**
- Modify: `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`
- Modify: `src/features/keyrings/KeyringsWorkspace.jsx`

1. Add a failing test that fires pointer-down on a result, blurs the input with a null related target, then clicks the result and expects selection.
2. Run the focused test and confirm failure.
3. Prevent default on result pointer-down to retain input focus.
4. Run the focused test and confirm it passes.

### Task 2: Add and verify the selected-plate pill

**Files:**
- Modify: `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`
- Modify: `src/features/keyrings/KeyringsWorkspace.jsx`
- Modify: `src/App.css`

1. Add failing assertions for a selected pill, accessible clear button, cleared preview, and disabled generation after clearing.
2. Implement the pill and clear action.
3. Style the pill beneath the combobox.
4. Run focused tests, changed-file lint, the full suite, and production build.
5. Commit the fix.
