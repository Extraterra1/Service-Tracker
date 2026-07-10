# Pulsing Flight Skeleton Design

## Goal

Make the flight-loading state feel recognizably connected to the arrivals list while keeping its motion quiet and unobtrusive.

## Approved approach

The skeleton keeps the same four-row arrivals-board footprint as the loaded view. Each row mirrors the real information hierarchy: a flight-number placeholder, three time columns with short labels and value placeholders, a rounded status placeholder, and a circular source-link placeholder.

The current horizontal shimmer is removed. Instead, each complete row uses a soft 1.4-second opacity pulse. Consecutive rows receive a small delay so the loading state has gentle depth without becoming a prominent animation. Users who prefer reduced motion see a static skeleton.

Desktop and mobile layouts continue to follow the loaded flight-row layout so content does not jump when data arrives. The existing accessible status label remains the only announced content; decorative placeholders stay hidden from assistive technology.

## Verification

Component tests will assert the row count, representative row structure, and staggered delay values. CSS tests will protect the pulse duration and reduced-motion fallback. The focused flight tests, full test suite, lint, and production build will run before integration.
