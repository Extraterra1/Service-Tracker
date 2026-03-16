# Leaderboard Winner Banner Design

**Topic:** historical winner banner for previous leaderboard periods

## Goal

Add a small celebratory banner to the first-place podium card when the leaderboard popup is showing a completed historical week or month.

## Chosen approach

Render a compact ribbon-style `Winner!` banner on the first-place podium card only.

- show it only for previous `weekly` and `monthly` periods
- hide it for the current week or current month
- hide it for `all_time`
- keep the badge scoped to the first-place podium card so it reads as a winner marker, not a popup-wide announcement

## Architecture

The feature stays entirely in the popup presentation layer.

- `App.jsx` already knows whether the selected period is historical via `canNavigateForward`
- `LeaderboardPopup.jsx` uses that state to decide when the first-place card should render the banner
- `App.css` adds a ribbon treatment that sits above the existing first-place avatar and trophy highlight without changing ranking logic or data fetching

## UI behavior

- text is exactly `Winner!`
- banner appears only when there is a first-place entry
- banner is attached to the first-place podium card, not to second or third place
- banner should feel decorative and polished, with a small ribbon or pill treatment matching the current warm leaderboard palette

## Testing

Add popup regression coverage for:

- rendering `Winner!` only on historical weekly/monthly views
- hiding the banner on the current period
- hiding the banner for `all_time`
