# Cinematic Voos Coming-Soon Design

## Goal

Transform the bottom-tab Voos placeholder into a cinematic, mobile-first teaser while preserving the normal application header and bottom navigation.

## Composition

The workspace becomes an open, full-height scene rather than a boxed empty-state card. A small, widely tracked `VOOS` label introduces an oversized responsive `Proximamente…` headline. Short supporting copy reads: `Uma nova forma de acompanhar os voos está a chegar.`

A restrained runway horizon anchors the lower part of the composition. A thin perspective line and subtle red-tinted atmospheric glow suggest an airport without competing with the operational app chrome. A small plane silhouette sits near the horizon and provides the only illustrative element.

## Responsive behavior

The scene fills the available space between the application header and fixed bottom bar. On narrow phones, headline sizing uses a bounded responsive scale, horizontal padding remains safe, and the runway decoration stays clipped inside the workspace. The copy remains readable without forcing scrolling on common mobile viewport heights.

## Motion and accessibility

The headline and plane receive a restrained initial reveal. Motion communicates arrival into the scene and runs once; it does not loop. `prefers-reduced-motion` disables animation and shows the final state immediately. Semantic heading structure and strong light/dark contrast remain intact.

