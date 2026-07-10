# Direct Flight API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flight Firebase callable with direct browser requests to the public CORS-enabled Aviability API.

**Architecture:** Aviability registers public CORS support and remains the sole flight lookup backend. Service Tracker retains its native UI and batching but uses `fetch` against a configurable API URL, then removes and deletes the obsolete Firebase flight function.

**Tech Stack:** Fastify, `@fastify/cors`, React, Vite, Vitest, Firebase CLI, Vercel CLI.

---

### Task 1: Add and verify Aviability CORS

**Files:**
- Modify: `/Users/cpires/.config/superpowers/worktrees/Aviability-Scraper/direct-flight-api/package.json`
- Modify: `/Users/cpires/.config/superpowers/worktrees/Aviability-Scraper/direct-flight-api/package-lock.json`
- Modify: `/Users/cpires/.config/superpowers/worktrees/Aviability-Scraper/direct-flight-api/src/build-app.ts`
- Create: `/Users/cpires/.config/superpowers/worktrees/Aviability-Scraper/direct-flight-api/test/cors.test.ts`

1. Write failing tests for `OPTIONS /arrivals` and `POST /arrivals` CORS headers.
2. Run the focused tests and confirm RED.
3. Install/register `@fastify/cors` with public origin, POST/OPTIONS methods, and content-type.
4. Run focused and full scraper tests and build.
5. Commit `feat: allow browser flight API requests`.
6. Deploy Aviability to production and verify CORS with `curl`.

### Task 2: Switch Service Tracker to direct fetch

**Files:**
- Modify: `src/features/flights/flightsApi.js`
- Modify: `src/features/flights/__tests__/flightsApi.test.js`
- Modify: `.env.example`

1. Replace Firebase mocks with fetch-boundary tests for URL, POST headers/body, sequential 20-item batching, merge order, summaries, non-2xx, and invalid JSON.
2. Run focused tests and confirm RED.
3. Implement direct fetch using `VITE_FLIGHTS_API_URL`, defaulting to `https://fncfutures.vercel.app/arrivals`.
4. Run focused and full frontend tests and build.
5. Commit `refactor: use Aviability API for flights`.

### Task 3: Remove obsolete Firebase flight backend

**Files:**
- Modify: `functions/src/index.js`
- Delete: `functions/src/flights/**`
- Delete: `functions/test/*.test.js`
- Modify: `functions/package.json`
- Modify: `vite.config.js`
- Modify: flight sections in `docs/agents/*.md`

1. Add/adjust tests or static assertions so the frontend no longer imports `firebase/functions` and the Functions entrypoint no longer exports `getFlightArrivals`.
2. Remove only flight-specific Functions code/tests and obsolete test-runner configuration.
3. Update architecture, feature, and testing docs for the direct API/CORS boundary.
4. Run frontend tests, remaining project checks, and build.
5. Commit `refactor: remove flight Firebase function`.
6. Delete only the deployed `getFlightArrivals` function after the direct flow is live.

### Task 4: End-to-end verification

1. Run Aviability tests/build and Service Tracker tests/build.
2. Verify browser preflight and direct POST against production Aviability.
3. Run Service Tracker locally and confirm `#voos` loads flight cards without a Cloud Functions request.
4. Inspect git diffs/status in both repositories and confirm no unrelated changes or secrets.
