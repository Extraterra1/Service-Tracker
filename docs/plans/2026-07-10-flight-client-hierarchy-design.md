# Flight Client Hierarchy Design

## Goal

Make client details clearly subordinate to, and visibly contained by, their associated flight card.

## Approved design

The client list becomes a compact inset section inside the flight article. A quiet `Clients` label, subtle tinted background, inset spacing, and shared rounded boundary establish ownership without adding a separate card for each client. Thin dividers separate multiple clients within the same section.

Client typography, flags, controls, and vertical spacing shrink by roughly 10–15 percent. The reservation action remains secondary. The phone number uses the standard text color while only the WhatsApp icon retains the green action cue. Mobile keeps the same containment and compact hierarchy while wrapping details into the existing responsive grid.

## Verification

A CSS regression test protects the inset container, reduced sizing, and phone/icon color split. Existing flight behavior tests, the full suite, changed-file lint, and the production build run before a local-only merge.
