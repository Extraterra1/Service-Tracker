# Porta-chaves Shared Cut Lines Design

## Goal

Pack multiple porta-chaves rows into a continuous cutting grid so adjacent rows reuse one horizontal cut line.

## Layout

Each row keeps its existing 167.5 mm width, 28.4 mm height, four equal cells, artwork, typography, and internal vertical dividers. Rows on the same A4 page have no vertical gap: the bottom edge of one row is the top edge of the next. The PDF draws one outer boundary around the page's row group and one horizontal separator at each row boundary, so a shared edge is never drawn twice.

Starting at the existing 24.8 mm top offset, nine rows fit on an A4 page and leave a safe bottom margin. A tenth selected vehicle begins a new page at the same top offset.

## Preview

The workspace preview mirrors the packed PDF layout. Consecutive rows touch and display a single shared boundary, while page-capacity messaging uses nine vehicles per page.

## Verification

Model tests verify zero-gap row coordinates and nine-row page capacity. PDF tests verify that nine vehicles remain on one A4 page and the tenth creates a second page. Workspace tests and styling checks verify that the preview uses the same packed layout and updated capacity text.
