# Reservation Phone Display Format Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Format valid international phone numbers in the reservation showcase as a country calling code followed by left-to-right groups of three digits.

**Architecture:** Add a display-only helper to the shared phone module, reusing its existing country calling-code knowledge. Consume it only for the reservation detail phone field so WhatsApp normalization and stored data remain unchanged.

**Tech Stack:** React 19, JavaScript, Vitest, Testing Library

---

### Task 1: Specify phone display grouping

**Files:**
- Modify: `src/lib/__tests__/phone.test.js`
- Modify: `src/lib/phone.js`

**Step 1: Write the failing tests**

Import `formatPhoneForDisplay` and assert:

```js
expect(formatPhoneForDisplay('+351961339825')).toBe('+351 961 339 825');
expect(formatPhoneForDisplay('+447700900123')).toBe('+44 770 090 012 3');
expect(formatPhoneForDisplay('ver notas')).toBe('ver notas');
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/phone.test.js`
Expected: FAIL because `formatPhoneForDisplay` is not exported.

**Step 3: Write minimal implementation**

Resolve a recognized calling-code prefix from normalized international digits, split the remaining digits into `/.{1,3}/g` groups, and return the untouched trimmed input when recognition is unsafe.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/phone.test.js`
Expected: PASS.

### Task 2: Use formatting in the reservation showcase

**Files:**
- Modify: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`

**Step 1: Write the failing integration assertion**

Open a reservation containing `+44 7700 900123`, assert the phone link displays `+44 770 090 012 3`, and assert its `href` remains `https://wa.me/447700900123`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`
Expected: FAIL because the showcase displays the stored value.

**Step 3: Write minimal implementation**

Import `formatPhoneForDisplay` and use it only for the `clientPhone` field's visible text.

**Step 4: Run focused tests and verification**

Run: `npm test -- src/lib/__tests__/phone.test.js src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`
Expected: PASS.

Run: `npm test && npm run lint && npm run build`
Expected: all commands exit successfully.
