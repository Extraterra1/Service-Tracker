# ICAO to IATA Flight Number Design

## Goal

Canonicalize recognized three-letter ICAO airline prefixes to the IATA prefixes accepted by the flight APIs.

## Data boundary

The conversion is part of shared flight-number normalization. Input is trimmed, internal whitespace is removed, and letters are uppercased before the first three characters are checked against the airline table copied from Aviability-Scraper. Recognized ICAO prefixes are replaced with IATA; existing IATA and unknown prefixes remain unchanged.

Using the canonical IATA number throughout the flight feature keeps API requests, displayed rows, client grouping, deduplication, and cache keys aligned.

## Verification

Unit tests cover `EZS` to `U2`, unchanged IATA input, unknown prefixes, deduplication across ICAO/IATA aliases, and the current-flight API request payload.

## Current-flight hierarchy

The current-day board treats the single operational arrival time as the row's primary datum. It uses the largest and heaviest row typography while the flight identity and semantic status remain supporting scan cues. Future-flight rows retain their existing three-time hierarchy.
