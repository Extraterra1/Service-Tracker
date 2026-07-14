# ICAO to IATA Flight Numbers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert recognized ICAO airline prefixes to canonical IATA flight numbers before flight API requests.

**Architecture:** Vendor Aviability-Scraper's airline code table into the flight feature and build an ICAO-to-IATA lookup map. Extend the existing shared normalizer so every downstream consumer uses one canonical identifier.

**Tech Stack:** JavaScript, JSON modules, Vitest, Vite

---

### Task 1: Define canonical normalization behavior

**Files:**
- Modify: `src/features/flights/__tests__/flightNumbers.test.js`
- Modify: `src/features/flights/__tests__/currentFlightsApi.test.js`

1. Add expectations for ICAO conversion, unchanged IATA/unknown prefixes, alias deduplication, and the FR24 payload.
2. Run the focused tests and confirm they fail on unconverted ICAO input.

### Task 2: Add the conversion table and normalize

**Files:**
- Create: `src/features/flights/airlineCodes.json`
- Modify: `src/features/flights/flightNumbers.js`

1. Copy the code mappings from `/Users/cpires/Aviability-Scraper/codes.json`.
2. Build a module-level ICAO-to-IATA map.
3. Replace only a recognized three-letter prefix that is followed by a flight identifier.
4. Run flight-number, current-flight API, workspace, cache, lint, and build verification.

No commit or push is included, per user instruction.
