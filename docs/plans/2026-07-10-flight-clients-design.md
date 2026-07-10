# Flight Clients Design

## Goal

Show the pickup clients assigned to each arrival without making users leave or expand the flight row.

## Approved design

Pickup services are grouped by a normalized flight number: surrounding whitespace is trimmed, internal spaces are removed, and matching is case-insensitive. Each flight result keeps its existing arrival summary and receives a client section immediately beneath it. When multiple pickups share the flight, their client rows stack in source order.

Each client row shows a flag derived from the phone number, client name, car model, plate, a WhatsApp-linked phone number, and a `Reservations` link that opens the service item's reservation URL in a new tab. Missing values use a quiet dash, while missing or unsafe links are shown as unavailable rather than rendered as broken actions.

The layout is a compact single row on wider screens and wraps predictably on mobile. Flight and client content remain within the same article so assistive technology preserves the relationship. Loading placeholders gain a short client strip beneath each illustrative flight row.

## Verification

Tests cover normalized matching, multiple clients under one flight, phone-derived flags, WhatsApp URLs, safe reservation URLs, missing data, and skeleton structure. Focused flight tests, the full suite, changed-file lint, and the production build run before a local merge.
