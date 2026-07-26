# Smaller Right-Aligned Secondary Recolha Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the secondary recolha smaller and position it against the right edge of the TV layout.

**Architecture:** Keep the existing component and selection logic unchanged. Update only the TV CSS grid and secondary typography, protected by the existing stylesheet contract test.

**Tech Stack:** CSS, Vitest

---

### Task 1: Tighten the secondary recolha

**Files:**
- Modify: `src/features/tv/__tests__/tvBoardStyles.test.js`
- Modify: `src/App.css`

1. Update the stylesheet contract to require right alignment and the narrower compact column.
2. Run the style test and confirm it fails.
3. Reduce the secondary column and typography, and align the block to the right.
4. Run the TV tests and production build.
5. Commit and merge the isolated branch into `master` without touching unrelated changes.

