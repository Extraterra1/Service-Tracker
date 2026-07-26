# TV Second Recolha Design

## Goal

Show the second pending recolha in the unused right side of the recolha field without weakening the next recolha's priority.

## Selection

Sort unfinished recolhas using the same reservation-time ordering already used by the TV board. The first item remains the main recolha; the second item becomes the compact `A seguir` entry. Completed items are excluded before either position is chosen.

## Presentation

- Keep the current primary recolha composition unchanged.
- Add a compact, open typographic block at the right side only when a second unfinished recolha exists.
- Show only `A seguir`, reservation time, uppercase client name, location, and license plate.
- Do not add a card, colored panel, vertical stripe, icon, car model, reservation number, or placeholder.
- When there is no second pending recolha, render nothing and preserve the existing one-recolha layout.

## Responsive behavior

At the target 961 × 541 viewport, the recolha service row gains a narrow third column for the secondary entry. At portrait or narrow aspect ratios, the secondary entry follows the primary recolha details in document order without introducing horizontal overflow.

## Verification

- Unit tests cover selection of the first two unfinished items, including completed entries and stable time ordering.
- Component tests cover the four displayed secondary fields and confirm the slot is absent with only one pending recolha.
- Style tests protect the compact third-column layout and prohibit card-like decoration.
- Browser inspection at 961 × 541 confirms no overlap, clipping, or page overflow.

