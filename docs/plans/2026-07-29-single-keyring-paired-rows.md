# Single Keyring Paired Rows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce one keyring per car, pair two cars on each row, and fit eighteen cars on an A4 page.

**Architecture:** Group normalized plates into row pairs in the shared PDF model. Render each row at half or full width according to occupancy, and derive preview grouping and pagination from the same two-cars-per-row geometry.

**Tech Stack:** React, JavaScript, pdf-lib, Vitest, Testing Library, CSS

---

### Task 1: Pair cars in the PDF model

**Files:**
- Modify: `src/features/keyrings/__tests__/keyringPdf.test.js`
- Modify: `src/features/keyrings/keyringPdf.js`

**Step 1: Write failing model tests**

Assert that one car creates one row with two cells and one plate/phone pair, two cars share a four-cell row, and three cars create a full row followed by a half-width row.

**Step 2: Verify the tests fail**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: FAIL because each plate currently creates a duplicated four-cell row.

**Step 3: Implement paired model rows**

Chunk normalized plates into pairs. Build two cells per car, expose each row's occupied width, and retain the existing cell dimensions and nine physical rows per page.

**Step 4: Verify the focused tests pass**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

### Task 2: Render paired rows and eighteen-car pagination

**Files:**
- Modify: `src/features/keyrings/__tests__/keyringPdf.test.js`
- Modify: `src/features/keyrings/keyringPdf.js`

**Step 1: Write failing PDF tests**

Assert that an odd final row draws only a half-width boundary, eighteen cars fit on one page, and a nineteenth creates page two.

**Step 2: Verify the tests fail**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

**Step 3: Implement variable-width grouped drawing**

Draw each page's occupied grid without an empty right half on odd final rows, preserve shared horizontal edges, draw one divider per adjacent cell, and paginate by eighteen cars/nine paired rows.

**Step 4: Verify the focused tests pass**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

### Task 3: Pair cars in the preview

**Files:**
- Modify: `src/features/keyrings/KeyringsWorkspace.jsx`
- Modify: `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`
- Modify: `src/App.css` if styling adjustments are required

**Step 1: Write failing preview tests**

Assert that two selected cars render inside one strip, a third creates a second half-width strip, and capacity copy says eighteen cars per page and one keyring per car.

**Step 2: Verify the tests fail**

Run: `npm test -- src/features/keyrings`

**Step 3: Implement paired preview grouping**

Group selected plates into page rows of two, render one insert per car, size odd rows to half width, and paginate after nine rows/eighteen cars.

**Step 4: Verify feature tests pass**

Run: `npm test -- src/features/keyrings`

### Task 4: Complete verification

**Step 1: Run the full suite**

Run: `npm test -- --run`

**Step 2: Run the production build**

Run: `npm run build`

**Step 3: Review the scoped diff**

Run: `git diff --check && git diff -- src/features/keyrings src/App.css docs/plans/2026-07-29-single-keyring-paired-rows*`

**Step 4: Commit the implementation**

Run: `git add src/features/keyrings src/App.css docs/plans/2026-07-29-single-keyring-paired-rows.md && git commit -m "feat: pair cars on keyring rows"`
