# Porta-chaves Shared Cut Lines Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make adjacent porta-chaves rows share one horizontal cut line and fit nine vehicles on each A4 page.

**Architecture:** Represent page rows as a gapless stack in the PDF model. Render each page as one outer boundary plus unique horizontal separators and per-row vertical dividers, then align the browser preview and capacity messaging with the same nine-row geometry.

**Tech Stack:** React, JavaScript, pdf-lib, Vitest, Testing Library, CSS

---

### Task 1: Specify gapless model geometry and pagination

**Files:**
- Modify: `src/features/keyrings/__tests__/keyringPdf.test.js`
- Modify: `src/features/keyrings/keyringPdf.js`

**Step 1: Write the failing tests**

Update the capacity expectation to nine and assert that the second row begins exactly at the first row's bottom edge:

```js
expect(KEYRING_ROWS_PER_PAGE).toBe(9);
const model = buildKeyringPdfModel(['BF-07-JZ', 'AA-11-BB']);
expect(model.rows[1].strip.top).toBe(model.rows[0].strip.top + model.rows[0].strip.height);
```

Change the pagination test to expect nine plates on one page and a tenth plate on page two.

**Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: FAIL because capacity is eight and row positions include a 2.2 mm gap.

**Step 3: Implement the gapless model**

Set `KEYRING_ROWS_PER_PAGE` to `9`, remove `KEYRING_ROW_GAP_MM`, and calculate row tops with:

```js
const rowTop = strip.top + rowIndex * strip.height;
```

Use the same gapless calculation when rows are remapped onto each PDF page.

**Step 4: Run the focused tests**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: model assertions pass; the PDF drawing assertion added in Task 2 may not exist yet.

### Task 2: Draw each shared boundary once

**Files:**
- Modify: `src/features/keyrings/__tests__/keyringPdf.test.js`
- Modify: `src/features/keyrings/keyringPdf.js`

**Step 1: Write a failing PDF structure test**

Generate a two-row PDF with object streams disabled, decode the page content streams, and assert that the grouped grid contains one outer rectangle and one horizontal row separator rather than two row rectangles.

**Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: FAIL because the current renderer draws one rectangle per row.

**Step 3: Implement grouped grid drawing**

For each page, draw one rectangle whose height is `rows.length * strip.height`. Draw horizontal lines only for row indexes after the first:

```js
rows.slice(1).forEach((_, rowIndex) => {
  const boundaryTop = strip.top + (rowIndex + 1) * strip.height;
  page.drawLine({
    start: { x: mmToPoints(strip.x), y: topToPdfY(boundaryTop) },
    end: { x: mmToPoints(strip.x + strip.width), y: topToPdfY(boundaryTop) },
    color: black,
    thickness: mmToPoints(KEYRING_PDF_LAYOUT.borderWidth)
  });
});
```

Continue drawing the three vertical dividers inside every row so each row retains four cells.

**Step 4: Run the focused tests**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: PASS.

### Task 3: Align the browser preview

**Files:**
- Modify: `src/features/keyrings/KeyringsWorkspace.jsx`
- Modify: the keyring rules in the applicable stylesheet found with `rg -n "keyring-strip" src`
- Modify: `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx` if present, otherwise the existing workspace test file returned by `rg -l "KeyringsWorkspace" src --glob "*.test.*"`

**Step 1: Write failing preview expectations**

Assert that capacity copy says nine per page and that row positioning uses the shared-edge layout rather than the previous percentage gap.

**Step 2: Run the workspace test to verify it fails**

Run: `npm test -- src/features/keyrings`

Expected: FAIL on the old eight-row copy or spaced row positioning.

**Step 3: Implement the preview change**

Derive row placement from the PDF geometry, remove visual spacing between consecutive strips, and avoid doubled adjacent borders using a grouped container or by suppressing each non-first row's top border.

**Step 4: Run feature tests**

Run: `npm test -- src/features/keyrings`

Expected: PASS.

### Task 4: Verify the complete change

**Files:**
- No additional files expected

**Step 1: Run all automated tests**

Run: `npm test -- --run`

Expected: PASS.

**Step 2: Run the production build**

Run: `npm run build`

Expected: PASS with no compilation errors.

**Step 3: Review the diff**

Run: `git diff --check && git diff -- src/features/keyrings docs/plans/2026-07-17-keyring-shared-cut-lines-design.md docs/plans/2026-07-17-keyring-shared-cut-lines.md`

Expected: no whitespace errors; changes remain limited to shared-cut behavior, preview alignment, tests, and documentation.

**Step 4: Commit the implementation**

```bash
git add src/features/keyrings docs/plans/2026-07-17-keyring-shared-cut-lines-design.md docs/plans/2026-07-17-keyring-shared-cut-lines.md
git commit -m "feat: share keyring row cut lines"
```
