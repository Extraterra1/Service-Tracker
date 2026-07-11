# Porta-chaves PDF Design

## Goal

Add a "Porta-chaves" workspace where an authenticated user selects a known vehicle and downloads an A4 PDF containing two identical, print-ready keyring inserts at the exact physical size and position of the supplied reference PDF.

## Source and Layout

The supplied `keyring.pdf` is a one-page A4 document measuring 595.32 by 841.92 PDF points. Its printable artwork is a single horizontal strip containing two identical inserts. Each insert has a logo-and-license-plate half and a WhatsApp-icon-and-phone-number half, separated by thin cut lines.

The generated file will preserve the A4 page size and encode all artwork positions in millimetres. Shared layout constants will define the strip bounds, four cell bounds, artwork boxes, text baselines, and border widths. Both inserts will be rendered from the same selected plate value to prevent accidental differences.

## User Experience

"Porta-chaves" will appear as a workspace action in the existing header menu. Selecting it closes the menu, updates the URL hash, and opens a focused workspace that matches the current application shell and themes.

The workspace will load vehicle options through the existing car-history data flow used by "Histórico de viaturas." It will provide a searchable license-plate selector, an A4 preview, and a primary PDF-generation button. The generation action remains disabled until a plate is selected. Loading, empty, and data-loading error states will be explicit and accessible.

The downloaded filename will include the normalized selected plate. PDF generation happens entirely in the browser; the PDF is neither uploaded nor retained by the app.

## Artwork

The existing `src/assets/Logo Base.svg` remains the single source for the JustDrive logo. The PDF generator will load and rasterize that SVG at sufficient resolution for crisp print output before embedding it. A WhatsApp SVG icon from the project's existing icon dependencies will be rendered using the official green treatment and embedded in the same manner.

The WhatsApp number is fixed at `+351 927 491 323`, visually formatted to match the reference. Only the selected license plate varies.

## Architecture and Data Flow

Workspace routing will be extended to recognize `#porta-chaves` for authorized users. `App` will reuse the car-history hook and request plate options when the workspace opens. The new workspace receives plate options and loading/error state as props, owns selection and search state, and calls a dedicated PDF module.

The PDF module will contain pure helpers for page/layout specifications and a browser adapter for loading SVG assets, rendering them to images, creating the A4 document, and triggering download. Keeping geometric constants and document assembly outside React makes exact output behavior independently testable.

## Error Handling

PDF generation will catch asset-loading, canvas-rendering, and document-generation failures. The workspace will keep the selected plate, re-enable the action, and show a concise retryable error. Object URLs and temporary DOM/canvas resources will be released after use.

## Verification

Automated tests will cover workspace hash resolution, menu navigation, car-history loading on entry, plate search and selection, disabled and loading states, filename normalization, fixed page size, duplicated plate text, fixed phone content, and stable layout constants.

After implementation, a sample PDF will be generated, inspected with PDF metadata tools, rendered to PNG, and visually compared with the supplied reference. The final checks will also run the focused tests, complete test suite, lint, and production build.
