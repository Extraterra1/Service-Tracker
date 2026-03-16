# Leaderboard Period History Design

**Topic:** previous week and month navigation inside the leaderboard popup

## Goal

Allow staff to inspect older leaderboard periods from the existing popup without changing the leaderboard scoring model or backend query shape.

## Chosen approach

Keep the existing `Semana`, `Mês`, and `All time` tabs and add period history navigation for the `weekly` and `monthly` tabs.

- `weekly` gets previous and next week controls
- `monthly` gets previous and next month controls
- `all_time` keeps the current behavior and ignores history navigation

The current week or current month is the newest selectable period. Forward navigation is disabled once the popup is already showing the current period.

## Architecture

The feature stays client-side.

- `App.jsx` owns the selected period plus a per-period anchor date
- `useLeaderboardData` accepts both `period` and `now` so cached responses are keyed by the selected period window instead of only by tab name
- `leaderboardStore` continues deriving the Firestore query range from `period` and `now`
- `LeaderboardPopup.jsx` renders the navigation controls and a human-readable label for the selected week or month

## Data flow

1. Opening the popup loads the active tab using that tab's current anchor date.
2. Clicking `Semana` or `Mês` resets that tab's anchor date to `new Date()` and fetches the current period.
3. Clicking the back button shifts the anchor one week or one month earlier and fetches the prior period.
4. Clicking the forward button shifts the anchor toward the present and stops at the current week or month.
5. Cached responses are stored per `period + anchor date` so revisiting recent history does not refetch unnecessarily.

## UI behavior

- Show left and right navigation buttons only for `weekly` and `monthly`
- Show a centered label describing the selected window
- Disable the forward button for the current week or month
- Disable both navigation buttons while a leaderboard request is in flight
- Preserve the existing skeleton, loading overlay, empty state, and error banner behavior

## Error handling

No new backend error cases are introduced.

- failed requests still surface through the existing popup error banner
- outdated async responses must still not overwrite the currently selected period window
- navigation state must not allow moving into future periods

## Testing

Add regression coverage for:

- range generation for prior weeks and months in `leaderboardStore`
- cache separation for different anchor dates in `useLeaderboardData`
- popup navigation controls, labels, and disabled states in `LeaderboardPopup`
- app-level integration that period navigation triggers the correct fetch arguments
