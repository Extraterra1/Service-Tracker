# SVG Logo Design

## Goal

Replace the raster JustDrive logo with the supplied vector logo everywhere the app displays the brand.

## Design

Copy the supplied `Logo Base.svg` into the app's asset directory and import that local asset from the header and signed-out landing components. Preserve the existing `<img>` markup, accessible names, sizing classes, and logo click behavior. Remove the superseded PNG after confirming it has no remaining references.

This keeps builds self-contained, reduces the logo asset size, and allows the browser to render it sharply at every screen density.

## Verification

A source regression test will assert both logo components import the SVG and that the PNG has no remaining source references. Existing header behavior tests, the full suite, lint, and the production build will run before a local-only merge.
