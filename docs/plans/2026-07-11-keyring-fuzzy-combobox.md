# Porta-chaves Fuzzy Combobox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the keyring workspace's separate search and select controls with one accessible fuzzy plate combobox.

**Architecture:** Export a small pure ranker from the keyring workspace module and use it to derive ordered results from the input value. The React component owns open, highlighted, input, and selected states while retaining the existing preview and PDF-generation flow.

**Tech Stack:** React 19, Vitest, Testing Library, existing CSS.

---

### Task 1: Add fuzzy plate ranking

**Files:**
- Modify: `src/features/keyrings/KeyringsWorkspace.jsx`
- Modify: `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`

**Step 1: Write failing tests**

Add assertions that `bf7`, `bf 07`, and `b07j` match `BF-07-JZ`, and that exact/contiguous matches rank above loose subsequence matches.

**Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`

Expected: FAIL because the current filter only performs contiguous normalized substring matching.

**Step 3: Implement the minimal ranker**

Normalize case and separators, score exact matches first, then prefixes, contiguous substrings, and finally ordered character subsequences. Exclude non-matches and retain label ordering for score ties.

**Step 4: Run the focused tests**

Run: `npm test -- src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`

Expected: PASS.

### Task 2: Replace search and select with one combobox

**Files:**
- Modify: `src/features/keyrings/KeyringsWorkspace.jsx`
- Modify: `src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`
- Modify: `src/App.css`

**Step 1: Write failing interaction tests**

Assert there is one combobox and no separate select. Cover mouse selection, ArrowDown/ArrowUp highlighting, Enter selection, Escape closing, focus reopening, selected label persistence, preview updates, and PDF generation.

**Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx`

Expected: FAIL because the current UI has an input plus native select.

**Step 3: Implement the accessible combobox**

Use `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, a `role="listbox"`, and `role="option"` results. Select via pointer or keyboard and preserve all loading, empty, error, preview, and generation behavior.

**Step 4: Update styling**

Remove obsolete select rules and add a compact anchored result panel with visible hover/highlight/selected states and safe mobile overflow.

**Step 5: Run focused and full verification**

Run:

```bash
npm test -- src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx
npm test
npm run build
```

Expected: all commands exit 0.

**Step 6: Commit**

```bash
git add src/features/keyrings/KeyringsWorkspace.jsx src/features/keyrings/__tests__/KeyringsWorkspace.test.jsx src/App.css
git commit -m "refactor: use fuzzy keyring plate combobox"
```
