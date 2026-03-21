# WhatsApp Phone Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Open a direct WhatsApp chat when a client phone number can be normalized to a valid international number, while leaving ambiguous numbers as plain text.

**Architecture:** Add a reusable WhatsApp URL helper to `src/lib/phone.js` so phone parsing stays outside the UI. `src/components/ServiceItemCard.jsx` will consume that helper and render the existing phone text as an anchor only when the helper returns a valid `wa.me` URL.

**Tech Stack:** React 19, Vite, Vitest, Testing Library

---

### Task 1: Add failing normalization coverage

**Files:**
- Modify: `src/lib/__tests__/phone.test.js`

**Step 1: Write the failing test**

Add tests that:
- expect `+351 912 345 678` to normalize to `https://wa.me/351912345678`
- expect `00351 912 345 678` to normalize to the same URL
- expect a local Portuguese number like `912 345 678` to normalize to the same URL
- expect an invalid or ambiguous value like `abc123` to return an empty string

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/phone.test.js`
Expected: FAIL because `getWhatsAppHref` does not exist yet.

### Task 2: Add failing card-render coverage

**Files:**
- Modify: `src/components/__tests__/ServiceItemCard.locationLink.test.jsx`

**Step 1: Write the failing test**

Add tests that:
- expect a normalizable phone number to render a WhatsApp link with the original text preserved
- expect a non-normalizable phone number to stay plain text without a link

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
Expected: FAIL because the phone row currently renders text only.

### Task 3: Implement the minimal WhatsApp-link behavior

**Files:**
- Modify: `src/lib/phone.js`
- Modify: `src/components/ServiceItemCard.jsx`
- Modify: `src/App.css`

**Step 1: Write minimal implementation**

Add `getWhatsAppHref(phoneRaw)` in `src/lib/phone.js` to:
- strip formatting characters
- keep international numbers in digits-only form
- upgrade recognized local Portuguese numbers to `351`
- return `https://wa.me/<digits>` only when normalization is valid

Update `ServiceItemCard` to:
- compute the WhatsApp href once from the current phone value
- render the phone text as a link only when that href exists
- keep the current flag rendering and fallback text behavior

Add minimal link styling in `src/App.css` so the phone link inherits the current inline row appearance.

**Step 2: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/phone.test.js src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
Expected: PASS

### Task 4: Run focused regression verification

**Files:**
- Test: `src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
- Test: `src/components/__tests__/ServiceItemCard.carHistoryClick.test.jsx`

**Step 1: Run targeted regressions**

Run: `npm test -- src/components/__tests__/ServiceItemCard.timeValidation.test.jsx src/components/__tests__/ServiceItemCard.carHistoryClick.test.jsx`
Expected: PASS
