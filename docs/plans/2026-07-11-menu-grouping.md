# Menu Grouping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Group account and service-management controls under two expandable parent sections without changing their existing behavior.

**Architecture:** Extend `AppHeaderMenu`'s controlled disclosure state with `accountGroup` and `serviceManagement` parent keys. Nest the existing account/access and time/activity/history sections inside those parents, retaining existing callbacks, permissions, and animation helpers.

**Tech Stack:** React 19, Testing Library, Vitest, CSS

---

### Task 1: Specify the nested menu behavior

**Files:**
- Modify: `src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`

**Step 1:** Add tests asserting that Conta and Gerir Serviço reveal their expected children only after parent expansion.

**Step 2:** Add coverage that child accordions and popup actions still work inside their expanded parent.

**Step 3:** Run `npm test -- src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx` and confirm the new assertions fail.

### Task 2: Implement parent groups

**Files:**
- Modify: `src/components/AppHeaderMenu.jsx`
- Modify: `src/App.css`

**Step 1:** Add controlled state keys for the two new parent disclosures.

**Step 2:** Wrap Conta e PIN and the conditional Pedidos de Acesso disclosure in the Conta parent.

**Step 3:** Wrap Alterar Hora, Atividade, and Histórico de Viaturas in the Gerir Serviço parent.

**Step 4:** Add minimal nested-section styling to preserve hierarchy and compact spacing.

**Step 5:** Run the focused test and confirm it passes.

### Task 3: Verify the application

**Files:**
- Verify: `src/components/AppHeaderMenu.jsx`
- Verify: `src/App.css`
- Verify: `src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`

**Step 1:** Run `npm test` and confirm all tests pass.

**Step 2:** Run `npm run lint` and confirm there are no lint errors.

**Step 3:** Run `npm run build` and confirm the production build succeeds.
