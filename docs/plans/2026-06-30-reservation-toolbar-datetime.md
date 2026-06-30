# Reservation Toolbar and Date-Time Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Put reservation filters and pagination on one responsive row and format booking date-times as `dd/mm/yyyy hh:mm`.

**Architecture:** Extend the reservation display helper with a deterministic date-time formatter and consume it in both row and popup rendering. Adjust the existing toolbar grid so filters and pager share the second row at desktop widths and wrap at the established mobile breakpoint.

**Tech Stack:** React 19, CSS, Vitest, Testing Library.

---

### Task 1: Specify date-time formatting

1. Update reservation tests to expect `01/07/2026 09:00` and `05/07/2026 10:00` in the row and popup.
2. Run the focused suite and verify RED.
3. Add a pure formatter and apply it to pickup/return fields.
4. Run the focused suite and verify GREEN.

### Task 2: Specify the shared toolbar row

1. Add CSS contract assertions for filter and pager grid placement plus mobile wrapping.
2. Run the focused suite and verify RED.
3. Update the toolbar layout without reducing tap targets.
4. Run the focused suite and verify GREEN.

### Task 3: Verify

Run the full test suite, changed-file lint, production build, and `git diff --check`, then commit the scoped implementation.
