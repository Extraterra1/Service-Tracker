# Porta-chaves Multi-plate Design

## Goal

Allow staff to add multiple vehicle plates and generate a print sheet using the available A4 space efficiently.

## Layout

The existing 167.5 mm by 28.4 mm insert row remains unchanged. Eight rows fit on one A4 page with a 2.2 mm vertical gap, starting at the reference top offset and leaving a safe bottom margin. A ninth selected plate starts a second A4 page with the same geometry. Each row contains two identical physical keyring copies for its plate.

## Interaction

The fuzzy combobox adds a plate to an ordered selected list rather than replacing the previous selection. Duplicate plates are ignored. Selected plates appear as removable pills beneath the search field; clearing one updates the row preview and generated output. The generate action requires at least one selected plate. The preview shows every selected row in print order and labels the page capacity when the list exceeds eight.

## Data and Verification

PDF assembly accepts an array of plates, creates one or more A4 pages, embeds the existing artwork and Sora typography once per document, and preserves exact row dimensions. Tests cover eight-row capacity, pagination, duplicate prevention, add/remove interactions, and multi-page A4 metadata.
