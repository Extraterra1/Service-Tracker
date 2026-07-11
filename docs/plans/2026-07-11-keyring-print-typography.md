# Porta-chaves Print Typography Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enlarge and vertically center the keyring logo and embed Sora SemiBold for PDF text.

**Architecture:** Bundle an open-license Sora font asset and register it with `pdf-lib` through `@pdf-lib/fontkit`. Move print artwork measurements into the tested layout specification and mirror them in the CSS preview.

**Tech Stack:** React, CSS, pdf-lib, @pdf-lib/fontkit, Vitest, Poppler.

---

### Task 1: Protect the new print specification

1. Add failing tests for a 34 mm logo, vertically centered logo zone, and Sora font use.
2. Run focused PDF tests and confirm failure.
3. Add layout constants and local font loading.
4. Embed Sora SemiBold with fontkit and center the logo geometrically.
5. Run focused tests and confirm success.

### Task 2: Synchronize preview and verify output

1. Update preview logo proportions and Sora typography.
2. Run keyring tests, changed-file lint, full tests, and production build.
3. Generate a real sample PDF, render it to PNG, and inspect logo centering, text fit, and A4 dimensions.
4. Remove temporary verification files and commit.
