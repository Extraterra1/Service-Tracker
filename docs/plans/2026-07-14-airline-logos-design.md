# Airline Logos in Live Flights — Design

## Goal

Display the corresponding airline logo directly beside each flight number for every carrier represented in `airlineCodes.json`.

## Asset strategy

- Bundle SVG files locally so the operational flight list never depends on a third-party logo request.
- Cover all 34 distinct IATA identities represented by the 37 ICAO conversion rows.
- Reuse a parent-brand logo for operational variants that share branding, such as easyJet and Smartwings.
- Record the source URL and license/provenance for each asset in a manifest.
- Do not render a placeholder for unknown carriers; preserve the current flight-number layout instead.

## Resolution and rendering

Extract the normalized IATA prefix from the displayed/API flight number and resolve it through one airline-brand module generated from the existing JSON. Render the SVG in a fixed, compact, `object-fit: contain` slot immediately before the linked flight number. The logo receives the airline name as accessible alternative text while the existing FlightRadar24 link and flight-number text remain unchanged.

## Responsive behavior

The logo slot remains fixed-size on desktop and mobile so status-dependent columns and the protagonist arrival time do not shift. Wide wordmarks are contained rather than allowed to expand the flight identity column.

## Failure handling

Unknown airline prefixes and missing assets render no image and leave the existing identity spacing intact. Asset lookup is local and synchronous, so it cannot introduce loading skeletons or runtime network errors.

## Testing

- Assert every conversion row resolves to a logo and airline name.
- Assert known flights render the correct accessible logo and unknown flights render none.
- Keep existing FlightRadar24 link behavior intact.
- Run flight suites, scoped lint, build, and a missing-asset audit.
