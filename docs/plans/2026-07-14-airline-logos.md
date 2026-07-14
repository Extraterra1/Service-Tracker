# Airline Logos in Live Flights Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bundle and display airline SVG logos for every carrier represented in the ICAO-to-IATA conversion JSON.

**Architecture:** Add a local SVG asset set plus a small airline-brand resolver keyed by normalized IATA prefix. `FlightResult` uses the resolver to render an accessible fixed-size logo before the existing FlightRadar24 flight-number link, with no runtime logo requests and no placeholder for unknown airlines.

**Tech Stack:** React, JavaScript, JSON, SVG, CSS, Vitest, Testing Library, Vite

---

### Task 1: Source and audit the logo asset set

**Files:**
- Create: `src/assets/airlines/*.svg`
- Create: `src/assets/airlines/sources.json`

**Step 1:** Research SVG coverage from Wikimedia Commons, official airline media resources, and established open SVG collections.

**Step 2:** Save one optimized local SVG for each of the 34 distinct IATA identities, reusing shared brand assets where appropriate.

**Step 3:** Record each asset's IATA code, airline name, source URL, and provenance/license note.

**Step 4:** Audit that every distinct IATA code in `airlineCodes.json` has a local file and source entry.

### Task 2: Build the airline-brand resolver test-first

**Files:**
- Create: `src/features/flights/airlineBrands.js`
- Create: `src/features/flights/__tests__/airlineBrands.test.js`

**Step 1:** Write failing tests asserting all conversion rows resolve and unknown prefixes return null.

**Step 2:** Run the test and confirm failure because the resolver does not exist.

**Step 3:** Implement IATA-prefix extraction and the local asset/name map.

**Step 4:** Run the resolver tests and confirm they pass.

### Task 3: Render logos beside flight numbers test-first

**Files:**
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/App.css`

**Step 1:** Add failing tests for the correct known-airline logo, no unknown-airline logo, and preserved FlightRadar24 link.

**Step 2:** Render the resolved logo before the flight-number link.

**Step 3:** Add a fixed responsive logo slot with `object-fit: contain` and no column growth.

**Step 4:** Run focused flight tests.

### Task 4: Verify the complete integration

**Step 1:** Run all flight tests.

**Step 2:** Run scoped ESLint on modified JavaScript and tests.

**Step 3:** Run the production build and `git diff --check`.

**Step 4:** Run the asset/source coverage audit and confirm zero missing IATA codes.
