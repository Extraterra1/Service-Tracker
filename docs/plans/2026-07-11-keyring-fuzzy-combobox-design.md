# Porta-chaves Fuzzy Combobox Design

## Goal

Replace the separate plate search field and vehicle select with one accessible fuzzy-search combobox.

## Interaction

The input displays matching plates directly beneath it. Matching ignores case and separators, supports ordered non-contiguous characters, and ranks exact and contiguous matches above looser subsequence matches. Clicking a result or pressing Enter selects it and updates the A4 preview. Arrow keys move the highlighted result, Escape closes the list, and focusing the field reopens available results.

The selected label remains in the input. Editing it reopens the result list without losing the current PDF selection until another plate is chosen. Loading, empty, data-error, generation-error, and PDF-generation behavior remain unchanged.

## Architecture and Testing

A small pure matcher and ranker will live with the keyring workspace rather than add a dependency. Component tests will cover separator-insensitive and subsequence matching, result ranking, mouse selection, keyboard selection, closing behavior, preview updates, and PDF generation.
