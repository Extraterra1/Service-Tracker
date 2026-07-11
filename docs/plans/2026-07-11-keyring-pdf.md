# Porta-chaves PDF Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Porta-chaves workspace that selects a vehicle from the car-history fleet and downloads an exact-size A4 PDF with two matching keyring inserts.

**Architecture:** Extend the existing hash workspace shell and reuse `useCarHistory` as the fleet source. Keep PDF dimensions and document assembly in a dedicated module using `pdf-lib`; rasterize the existing logo SVG and a local WhatsApp SVG at print resolution before embedding them. A focused React workspace handles selection, preview, progress, and recoverable errors.

**Tech Stack:** React 19, Vite, Vitest/Testing Library, `pdf-lib`, browser Canvas/SVG APIs, existing Firebase car-history store.

---

### Task 1: Add Porta-chaves workspace routing

**Files:**
- Modify: `src/lib/workspaceNavigation.js`
- Modify: `src/lib/__tests__/workspaceNavigation.test.js`
- Modify: `src/App.jsx`

**Step 1: Write the failing routing tests**

Add expectations that `resolveWorkspace('#porta-chaves', true)` returns `keyrings`, that the workspace is available to any allowed user rather than admin-only, and that unknown hashes still resolve to `services`.

**Step 2: Run the focused test and verify failure**

Run: `npm test -- src/lib/__tests__/workspaceNavigation.test.js`

Expected: FAIL because `#porta-chaves` is not recognized.

**Step 3: Implement the route**

Add the `keyrings` workspace/hash mapping and update `App` hash derivation and `handleWorkspaceChange` so `keyrings` pushes `#porta-chaves`. Preserve admin checks for `reservations` and `flights` only.

**Step 4: Run the focused test**

Run: `npm test -- src/lib/__tests__/workspaceNavigation.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/workspaceNavigation.js src/lib/__tests__/workspaceNavigation.test.js src/App.jsx
git commit -m "feat: add keyring workspace route"
```

### Task 2: Add menu navigation and title behavior

**Files:**
- Modify: `src/components/AppHeaderMenu.jsx`
- Modify: `src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`
- Modify: `src/App.jsx`

**Step 1: Write the failing menu test**

Render the menu in the services workspace, click `Porta-chaves`, and assert `onWorkspaceChange('keyrings')`. Also verify that `Lista de Serviço` appears while keyrings is active and that the page title becomes `Porta-chaves`.

**Step 2: Run the focused test and verify failure**

Run: `npm test -- src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`

Expected: FAIL because the action does not exist.

**Step 3: Add the menu action**

Import a suitable key/tag icon from `lucide-react`, add the top-level workspace action, and update the header title expression. Keep it visible for all users with allowed access.

**Step 4: Run the focused test**

Run: `npm test -- src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/AppHeaderMenu.jsx src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx src/App.jsx
git commit -m "feat: add Porta-chaves menu entry"
```

### Task 3: Define and test the exact PDF specification

**Files:**
- Create: `src/features/keyrings/keyringPdf.js`
- Create: `src/features/keyrings/__tests__/keyringPdf.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Install the PDF dependency**

Run: `npm install pdf-lib`

Expected: `pdf-lib` is recorded in the package files.

**Step 2: Write failing pure-helper tests**

Test exported helpers and constants for:

- A4 page size: 210 x 297 mm.
- strip geometry derived from the reference: approximately x 20.7 mm, y 24.8 mm from the top, width 167.5 mm, height 28.4 mm;
- four equal cells and three internal dividers;
- two plate placements with identical normalized content;
- two phone placements containing fixed `+351927491323` display content;
- filename `porta-chaves-BF-07-JZ.pdf` for plate `BF-07-JZ`.

**Step 3: Run the focused test and verify failure**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: FAIL because the module does not exist.

**Step 4: Implement the pure specification**

Create `KEYRING_PDF_LAYOUT`, `WHATSAPP_NUMBER`, `buildKeyringPdfModel(plate)`, and `getKeyringPdfFilename(plate)`. Convert millimetres to PDF points in one helper and reject empty plate input.

**Step 5: Run the focused test**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: PASS.

**Step 6: Commit**

```bash
git add package.json package-lock.json src/features/keyrings/keyringPdf.js src/features/keyrings/__tests__/keyringPdf.test.js
git commit -m "feat: define exact keyring pdf layout"
```

### Task 4: Add print artwork and browser PDF generation

**Files:**
- Create: `src/assets/whatsapp.svg`
- Modify: `src/features/keyrings/keyringPdf.js`
- Modify: `src/features/keyrings/__tests__/keyringPdf.test.js`

**Step 1: Add failing generation tests**

Mock asset-to-PNG conversion and assert that document assembly creates one A4 page, embeds the existing logo and WhatsApp artwork twice, draws the four-cell border, writes the selected plate twice, and writes the fixed number twice.

**Step 2: Run the test and verify failure**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: FAIL because generation is not implemented.

**Step 3: Add the WhatsApp SVG asset**

Create an accessible, green WhatsApp mark based on the existing `react-icons/fa` SVG path/license metadata. Keep it as a repository asset so PDF output is deterministic and does not depend on a network request.

**Step 4: Implement generation**

Implement `svgUrlToPngBytes`, `createKeyringPdfBytes`, and `downloadKeyringPdf`. Load `Logo Base.svg` and `whatsapp.svg` through Vite asset URLs, render at a high pixel density, preserve aspect ratios, use a bold built-in PDF font for plate and phone text, and revoke the download object URL after clicking.

**Step 5: Run the focused test**

Run: `npm test -- src/features/keyrings/__tests__/keyringPdf.test.js`

Expected: PASS.

**Step 6: Commit**

```bash
git add src/assets/whatsapp.svg src/features/keyrings/keyringPdf.js src/features/keyrings/__tests__/keyringPdf.test.js
git commit -m "feat: generate keyring pdf in browser"
```

### Task 5: Build the Porta-chaves workspace test-first

**Files:**
- Create: `src/features/keyrings/KeyringsWorkspace.jsx`
- Create: `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`
- Modify: `src/App.jsx`

**Step 1: Write failing component tests**

Cover searchable fleet options, selection, preview updates, disabled generation without a plate, loading/empty/error states, one generation call per click, busy state during generation, and a recoverable generation error.

**Step 2: Run the focused test and verify failure**

Run: `npm test -- src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`

Expected: FAIL because the component does not exist.

**Step 3: Implement the workspace**

Build a focused two-column desktop layout that collapses to one column on mobile. Use a searchable list/combobox of `plateOptions`, an A4-proportioned preview with two identical inserts, and a primary `Gerar PDF` button. Use the app's established field, status, and button patterns.

**Step 4: Wire fleet loading in App**

Lazy-load the workspace. When `activeWorkspace === 'keyrings'`, call the existing `loadCarHistory()` if plate options are not loaded and pass its `plateOptions`, `loading`, and `error`. Do not reset history merely when leaving the workspace, so reopening is immediate.

**Step 5: Run focused tests**

Run: `npm test -- src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx src/lib/__tests__/workspaceNavigation.test.js`

Expected: PASS.

**Step 6: Commit**

```bash
git add src/features/keyrings/KeyringsWorkspace.jsx src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx src/App.jsx
git commit -m "feat: build Porta-chaves workspace"
```

### Task 6: Style the workspace and exact preview

**Files:**
- Modify: `src/App.css`
- Modify: `src/features/keyrings/KeyringsWorkspace.jsx`
- Modify: `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`

**Step 1: Add responsive/accessibility assertions**

Assert the preview has an accessible label, generation status uses an appropriate live region, and the selector/button retain visible labels.

**Step 2: Implement styling**

Add scoped `keyring-*` rules using existing tokens. Represent the preview as an A4 white page with the strip positioned by percentages computed from the PDF millimetre constants. Preserve the reference's thin black cut lines, restrained white background, logo proportions, bold plate/phone typography, dark-mode page contrast, and mobile overflow safety.

**Step 3: Run component tests**

Run: `npm test -- src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/App.css src/features/keyrings/KeyringsWorkspace.jsx src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx
git commit -m "style: polish keyring pdf workspace"
```

### Task 7: Verify the generated artifact and application

**Files:**
- Create: `output/pdf/porta-chaves-BF-07-JZ.pdf` (temporary verification artifact; retain only if useful to the user)
- Create: `tmp/pdfs/porta-chaves-BF-07-JZ-1.png` (temporary)

**Step 1: Use the verification skill**

Invoke `superpowers:verification-before-completion` and follow its evidence requirements.

**Step 2: Run automated checks**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit 0.

**Step 3: Generate a real sample PDF**

Use the browser workspace with `BF-07-JZ`, or a small Node-compatible verification entry around the generator, and save the output under `output/pdf/`.

**Step 4: Check page metadata**

Run: `pdfinfo output/pdf/porta-chaves-BF-07-JZ.pdf`

Expected: one page, A4 size near 595.28 x 841.89 points, no encryption.

**Step 5: Render and inspect**

Run: `pdftoppm -png -r 180 output/pdf/porta-chaves-BF-07-JZ.pdf tmp/pdfs/porta-chaves-BF-07-JZ`

Inspect the PNG beside the rendered source PDF. Verify strip position and size, two identical plates, two fixed numbers, crisp artwork, unclipped text, correct dividers, and no unintended margins or scaling.

**Step 6: Remove temporary files and commit final fixes**

Delete temporary PNGs and any sample PDF not intended for delivery. Re-run affected checks after any visual adjustment, then commit only implementation files.

