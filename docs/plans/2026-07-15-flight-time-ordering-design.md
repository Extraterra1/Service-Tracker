# Flight Time Ordering Design

## Goal

Display every flight list chronologically, with the earliest effective arrival first.

## Design

A shared sorting helper derives each flight's effective arrival time using the same priority as the prominent current-flight time: `arrivalTimeLocal`, `actualArrivalLocal`, `estimatedArrivalLocal`, then `scheduledArrivalLocal`.

Valid times sort ascending. Flights with missing or invalid times appear after timed flights. Equal or missing times use the normalized flight number as a deterministic tie-breaker. The helper returns a copied array so API responses and cached results are not mutated.

The current and `Anteriores` groups are sorted independently after grouping. The future-flight showcase sorts its displayed results with the same helper.

## Testing

Unit tests cover effective-time priority, ascending order, missing times last, deterministic ties, and input immutability. Workspace tests confirm both current and future lists render in chronological order.
