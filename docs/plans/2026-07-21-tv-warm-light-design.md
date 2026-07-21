# TV Warm-Light Refinement Design

## Goal

Convert the hidden `#tv` board to a fixed warm-light presentation optimized for a 961×541 television viewport without changing its data, routing, or 70/30 hierarchy.

## Visual treatment

Use a soft ivory delivery surface, a slightly deeper warm-stone recolha surface, charcoal primary text, warm-gray supporting text, and the existing muted red for the service index, time-source label, and delivery rail. The TV palette stays light regardless of the app's saved theme.

At 961×541, retain the two-column layout inside each section. Tighten headings, gaps, metadata, and fluid type minima so both populated sections fit without clipping or scrolling. Larger 16:9 displays continue to scale through the existing `clamp()` rules.

## Verification

Add CSS regression assertions for the warm-light palette and compact 961×541 breakpoint. Run the TV tests, full suite, changed-file lint, and production build. Inspect populated and empty states at exactly 961×541 and confirm the document has no overflow.
