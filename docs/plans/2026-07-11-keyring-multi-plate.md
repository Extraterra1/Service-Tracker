# Porta-chaves Multi-plate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multiple plates to one print job with eight keyring rows per A4 page and automatic pagination.

**Architecture:** Keep row geometry in the PDF layout model and add a normalized plate-array model. The React workspace owns ordered selected values and renders pills plus a row preview; the PDF module maps each plate to a row and creates additional A4 pages when needed.

**Tech Stack:** React, pdf-lib, @pdf-lib/fontkit, Vitest, Testing Library.

---

### Task 1: Add failing multi-plate PDF model tests

Modify `src/features/keyrings/__tests__/keyringPdf.test.js` and `src/features/keyrings/keyringPdf.js`.

Test eight rows per page, 2.2 mm row gaps, two copies per plate, pagination for nine plates, and normalized duplicate-safe plate arrays. Run the focused tests and confirm failure before implementation.

### Task 2: Implement multi-page PDF generation

Update the pure model and `createKeyringPdfBytes` to accept arrays, draw one row per plate, create A4 pages at each page boundary, and keep single-plate calls backward-compatible. Update filename generation for multi-plate jobs. Run focused PDF tests.

### Task 3: Add failing multi-selection workspace tests

Modify `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx` to cover adding two plates, ignoring duplicate adds, rendering/removing pills, preview row count, and enabling generation when the list is non-empty.

### Task 4: Implement multi-selection UI and preview

Update `KeyringsWorkspace.jsx` and `src/App.css`. Replace singular selection state with ordered selected plates, add pills with accessible remove buttons, keep the fuzzy combobox reusable, and render rows in eight-row page groups. Run focused workspace tests.

### Task 5: Verify and commit

Run changed-file lint, the full test suite, and production build. Generate and render a nine-plate PDF to verify two A4 pages, row spacing, no clipping, and correct order. Remove temporary artifacts and commit the implementation.
