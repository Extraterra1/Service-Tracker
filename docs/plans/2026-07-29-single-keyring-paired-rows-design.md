# Single Keyring Paired Rows Design

## Goal

Generate one physical keyring per selected car while placing up to two cars on each horizontal cutting row.

## Layout

Each car occupies two adjacent cells: one logo-and-plate cell followed by one WhatsApp-and-phone cell. The first car uses the left half of a row and the second car uses the right half. A third car starts the next row. When the final row contains only one car, the PDF and preview draw only the left half; the right half has no outline or empty cells.

The existing 28.4 mm row height, cell sizing, artwork, typography, shared horizontal cut lines, and nine-row A4 geometry remain unchanged. Nine rows allow up to eighteen selected cars per page; a nineteenth car starts a new page.

## Model and Rendering

The PDF model groups normalized plates into row pairs. Each row owns either two cells for one car or four cells for two cars. PDF pages draw a grouped boundary that follows each row's occupied width, including a half-width final row when needed, while continuing to draw internal vertical cell dividers once.

## Preview

The workspace groups selected cars in the same pairs as the PDF. Each preview strip renders one or two keyring inserts, uses the corresponding half- or full-row width, and retains shared edges between consecutive rows. Capacity copy changes to eighteen cars per page and one keyring per car.

## Verification

Model and PDF tests cover one, two, three, eighteen, and nineteen cars, including the half-width final row. Workspace tests verify two cars share a row, a third starts a new row, odd rows are half width, and the updated capacity copy is shown.
