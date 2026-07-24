# Future Client Identity Spacing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add left breathing room to the future client identity without changing reservation-time alignment.

**Architecture:** Scope one padding rule to the future aligned identity cell and reset it at the existing mobile breakpoint. Preserve the surrounding subgrid tracks and all markup.

**Tech Stack:** CSS, Vitest, Vite

---

### Task 1: Add a spacing regression test

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`

**Step 1:** Add CSS assertions for scoped desktop `padding-left: 0.55rem` and a max-width 700px reset to `padding-left: 0`.

**Step 2:** Run `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx` and confirm it fails because the rules are absent.

### Task 2: Apply the targeted spacing

**Files:**
- Modify: `src/App.css`

**Step 1:** Add left padding to `.flight-client--time-aligned .flight-client-identity`.

**Step 2:** Reset that padding inside the existing max-width 700px block.

**Step 3:** Run the focused flight tests and confirm they pass.

### Task 3: Verify and release

Run focused lint, the full test suite, production build, and `git diff --check`. Review the staged scope for secrets and unrelated edits, commit, and push `master`.
