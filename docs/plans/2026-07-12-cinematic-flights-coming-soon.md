# Cinematic Voos Coming-Soon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the boxed Voos placeholder with a cinematic, responsive runway-horizon teaser.

**Architecture:** Keep the existing lazy workspace and route, changing only its semantic markup and scoped CSS. Use CSS-native decoration and one-shot motion so no image assets or new dependencies are needed.

**Tech Stack:** React 19, CSS, Lucide React, Vitest, Testing Library.

---

### Task 1: Lock the new content contract

**Files:**
- Modify: `src/features/flights/__tests__/FlightsComingSoonWorkspace.test.jsx`
- Modify: `src/features/flights/FlightsComingSoonWorkspace.jsx`

1. Change the test to require the `VOOS` kicker, `Proximamente…` heading, and concise arrival copy.
2. Run the focused test and confirm it fails.
3. Implement the semantic scene markup with decorative elements hidden from assistive technology.
4. Run the focused test and confirm it passes.

### Task 2: Build the cinematic responsive scene

**Files:**
- Modify: `src/App.css`

1. Replace the card-like placeholder rules with an open full-height composition.
2. Add responsive headline sizing, runway perspective, restrained glow, safe clipping, and light/dark-compatible token colors.
3. Add one-shot reveal motion and a reduced-motion override.
4. Run scoped lint, the full test suite, and `npm run build`.
