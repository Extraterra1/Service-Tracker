# Prominent Flight Status Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the current-day flight status more prominent and visually distinguishable without changing future-flight rows.

**Architecture:** Extend the shared `FlightResult` with an opt-in prominent-status mode. The current-day workspace enables it; semantic icons and CSS variants render the badge while the default shared behavior remains unchanged.

**Tech Stack:** React, Lucide React, CSS, Vitest, Testing Library

---

### Task 1: Add the prominent status contract

**Files:**
- Modify: `src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`
- Modify: `src/features/flights/CurrentFlightsWorkspace.jsx`

1. Add a failing test that expects current-day scheduled and airborne rows to expose semantic status badges.
2. Run the focused test and confirm the badge expectation fails.
3. Pass an opt-in prop from `CurrentFlightsWorkspace` to `FlightResult`.

### Task 2: Render and style semantic badges

**Files:**
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/App.css`

1. Map normalized states to accessible icons.
2. Render the icon and opt-in modifier class without affecting default future-flight rows.
3. Add distinct blue, amber, green, red, and neutral badge treatments.
4. Run the focused flight tests and confirm they pass.
5. Run lint and the production build.

No commit or push is included, per user instruction.
