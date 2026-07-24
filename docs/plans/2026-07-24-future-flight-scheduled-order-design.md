# Future Flight Scheduled Arrival Ordering Design

## Goal

Always display future flights from earliest to latest scheduled arrival.

## Design

Keep the shared sorter used by current/live flights unchanged. Add a future-flight-specific sorter that reads only `scheduledArrivalLocal`, because the future-flight board displays only the programmed arrival time. Valid scheduled times sort ascending; missing or invalid times sort last; equal times use normalized flight number as a stable tie-breaker. The sorter returns a new array so API and cached result arrays are not mutated.

## Verification

Add unit coverage proving estimated or actual fields cannot override scheduled ordering, and update the workspace regression test to describe scheduled ordering. Run focused flight tests, the full suite, lint for changed files, and the production build.
