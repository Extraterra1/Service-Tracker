# Mobile Flight Client Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recompose current-flight client details into a compact, readable mobile layout.

**Architecture:** Update the shared `FlightClient` markup with an identity group and a quieter reservation link, then redefine its desktop and mobile grid tracks. Keep data flow and destinations unchanged.

**Tech Stack:** React, CSS Grid, Vitest, Testing Library

---

### Task 1: Specify the mobile client hierarchy

**Files:**
- Modify: `src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/App.css`

**Step 1: Write failing assertions**

Render a client with phone, country, reservation ID, and URL. Assert the flag and name share an identity group, the full matrícula is present, and the reservation link shows `#<id>` with an eye icon.

**Step 2: Verify red**

Run: `npm test -- src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`

Expected: FAIL because the current markup has separate flag/name grid cells and a boxed `Reservations` link.

**Step 3: Implement the minimal layout**

Group flag and name, render the quiet reservation-ID link, and update desktop/mobile grid rules so matrícula uses content width and does not wrap.

**Step 4: Verify**

Run focused flight tests, the production build, and `git diff --check`. Report unrelated failures in the existing current-flights work separately.
