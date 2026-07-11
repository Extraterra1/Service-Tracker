# Porta-chaves Selection Pill Design

## Goal

Make pointer selection reliable in the fuzzy plate combobox and clearly display the selected vehicle beneath the search field.

## Design

Combobox result pointer-down will retain input focus so the browser cannot remove the result before its click handler runs. Clicking or keyboard-selecting a plate will keep the existing selection behavior and reveal a compact selected-plate pill below the field. The pill includes an accessible clear button that removes the selection, clears the input, and disables PDF generation.

Regression tests will reproduce the real pointer-down, null-related-target blur, and click ordering, then verify the selected pill, preview, clear action, and generation state.
