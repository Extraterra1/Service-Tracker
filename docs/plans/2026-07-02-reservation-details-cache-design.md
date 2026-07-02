# Reservation Details Cache Design

## Goal

Avoid refetching reservation details when a user closes and reopens the same reservation popup during one page session.

## Design

Keep successful reservation responses in a module-level `Map`, keyed by the normalized reservation reference. A module-level cache survives popup unmounts but is naturally cleared by a page refresh, matching the requested lifetime.

The popup checks the cache before starting a network request. A cache hit renders the existing reservation details popup immediately, without a loading skeleton. Successful requests populate the cache; failed requests are never cached, so the existing retry action continues to make a fresh request.

## Testing

Exercise the behavior through `ServiceWorkspace`: open a reservation, allow the request to succeed, close the popup, reopen it, and assert that the callable was invoked only once and the details appear immediately.
