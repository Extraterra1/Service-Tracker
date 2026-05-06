---
name: Service Tracker
description: Mobile-first operations board for rental-car deliveries and pickups.
colors:
  daylight-bg: "#eef2f7"
  daylight-text: "#111827"
  daylight-muted: "#5a657d"
  service-red: "#f83848"
  service-red-strong: "#db243b"
  action-red: "#b71d34"
  return-teal: "#1c7f92"
  ready-green: "#0e6a2d"
  note-yellow: "#ffe95f"
  night-bg: "#0d131f"
  night-text: "#f4f6fb"
  night-muted: "#a7b2c7"
  night-panel: "#0b111c"
  item-ink: "#0f172a"
  item-meta: "#4f607e"
  border-ink: "#11182724"
typography:
  display:
    fontFamily: "Sora, Urbanist, sans-serif"
    fontSize: "clamp(2.2rem, 5vw, 2.6rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0"
  headline:
    fontFamily: "Sora, Urbanist, sans-serif"
    fontSize: "1.04rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  title:
    fontFamily: "Sora, Urbanist, sans-serif"
    fontSize: "0.87rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
  body:
    fontFamily: "Urbanist, Segoe UI, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  label:
    fontFamily: "Urbanist, Segoe UI, sans-serif"
    fontSize: "0.62rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  xs: "2px"
  sm: "6px"
  md: "7px"
  lg: "8px"
  panel: "10px"
  dialog: "14px"
  pill: "999px"
spacing:
  micro: "0.18rem"
  xs: "0.3rem"
  sm: "0.4rem"
  md: "0.45rem"
  lg: "0.52rem"
  xl: "0.8rem"
components:
  button-primary:
    backgroundColor: "{colors.action-red}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0 0.68rem"
    height: "1.9rem"
  button-ghost:
    backgroundColor: "#ffffff"
    textColor: "{colors.daylight-text}"
    rounded: "{rounded.md}"
    padding: "0 0.68rem"
    height: "1.9rem"
  service-card:
    backgroundColor: "#ffffff"
    textColor: "{colors.item-ink}"
    rounded: "{rounded.lg}"
    padding: "0.4rem 0.45rem"
  service-pane:
    backgroundColor: "#ffffff"
    textColor: "{colors.daylight-text}"
    rounded: "{rounded.panel}"
    padding: "0"
  status-pill:
    backgroundColor: "#fff4f5"
    textColor: "{colors.service-red}"
    rounded: "{rounded.pill}"
    padding: "0.12rem 0.34rem"
---

# Design System: Service Tracker

## 1. Overview

**Creative North Star: "The Daylight Service Board"**

Service Tracker should feel like a clear operations board carried in a pocket: dense, practical, legible in daylight, and calm enough to live with for an entire shift. The current system uses a restrained light surface, a red service accent, compact rows, and small tactile controls to keep deliveries and pickups visible without turning the app into a dashboard spectacle.

The interface is product-first. It does not chase brand expression on workflow screens; it protects list scanning, completion confidence, and team trust. Dark mode exists for low-light use, but the default posture is a daylight field tool with strong contrast and stable surfaces.

It explicitly rejects the PRODUCT.md anti-references: "clutter that makes the service list harder to scan", flashy SaaS dashboards, decorative marketing styling, oversized visual effects, low-density card sprawl, toy-like gamification, and status treatments that compete with delivery and pickup information.

**Key Characteristics:**

- Compact two-column service board, even on mobile.
- Red accent reserved for service identity, primary actions, counts, and completion feedback.
- Borders plus soft shadows separate dense surfaces without visual drama.
- Typography favors quick recognition: time first, client second, metadata third.
- Interactions are tactile, small, and close to the row they affect.

## 2. Colors

The palette is a daylight-neutral operations surface with a red service accent, a teal return marker, and a few functional status colors.

### Primary

- **Service Red**: The primary accent for service identity, counts, selected states, completion marks, and high-salience action feedback. It should remain scarce enough that it still means "look here".
- **Action Red**: The deeper primary button color for committed actions such as saving or submitting.

### Secondary

- **Return Teal**: A functional marker used for return movement in plate popups. It should never compete with Service Red as the main product color.
- **Ready Green**: Used only for ready/done-adjacent state confirmation and WhatsApp affordances.

### Tertiary

- **Note Yellow**: A bright note highlight for customer or service notes that must stand out inside a dense card.

### Neutral

- **Daylight Background**: The default app field, slightly cool and never pure white.
- **Daylight Text**: Primary text for headers and important row content.
- **Daylight Muted**: Secondary copy, helper text, and metadata.
- **Item Ink**: High-contrast row content, especially time, client, car, and plate.
- **Item Meta**: Supporting row content such as location, footer, and IDs.
- **Night Background / Night Panel**: Dark-mode surfaces for low-light use; they mirror the same hierarchy rather than creating a separate visual language.

### Named Rules

**The Red Means Work Rule.** Red is not decorative. It identifies service state, primary actions, and row feedback; do not use it for ornamental flourishes.

**The Daylight First Rule.** Default new surfaces should be readable on phones in bright outdoor conditions before they are optimized for ambience.

## 3. Typography

**Display Font:** Sora (with Urbanist and sans-serif fallback)  
**Body Font:** Urbanist (with Segoe UI and sans-serif fallback)  
**Label/Mono Font:** Urbanist uppercase labels; no mono style is established.

**Character:** The pairing is compact and sturdy. Sora gives headers enough structure to anchor panes and dialogs, while Urbanist keeps row content soft enough for all-day use.

### Hierarchy

- **Display** (800, clamp(2.2rem, 5vw, 2.6rem), 1.1): Used on the signed-out landing only; not a workflow-screen default.
- **Headline** (700, 1.04rem, 1.15): Popup titles and focused secondary surfaces.
- **Title** (700, 0.87rem, 1.2): Pane titles and compact section headers.
- **Body** (600, 0.74rem, 1.35): Dense service row metadata, controls, helper text, and operational copy.
- **Label** (800, 0.62rem, 0.08em): Service labels, kickers, status chips, and compact uppercase identifiers.

### Named Rules

**The Time First Rule.** In service rows, the time is the visual anchor. Do not let names, notes, badges, or actions outrank it.

**The Small Type Is Still Working Type Rule.** Compact text must stay high contrast and purposeful; never shrink copy to make room for decorative UI.

## 4. Elevation

The elevation philosophy is layered but quiet. The app uses thin borders and soft shadows to separate panels, cards, popups, and menus. Depth is structural, not atmospheric; it helps dense rows remain distinct while keeping the list easy to scan.

### Shadow Vocabulary

- **Panel Shadow** (`box-shadow: 0 12px 26px rgba(17, 24, 39, 0.12)`): Default light-mode separation for app header, toolbar, panes, menus, banners, and status lines.
- **Dark Panel Shadow** (`box-shadow: 0 18px 38px rgba(6, 10, 16, 0.45)`): Dark-mode counterpart for the same structural surfaces.
- **Dialog Shadow** (`box-shadow: 0 16px 36px color-mix(in oklab, var(--shadow), transparent 30%)`): Auth and access-gate emphasis.
- **Leaderboard Shadow** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`): Legacy popup elevation; keep it contained to leaderboard-style modal surfaces.

### Named Rules

**The Quiet Separation Rule.** Use a border before adding more shadow. If a surface starts to feel floaty, the shadow is too loud.

## 5. Components

### Buttons

- **Shape:** Small rectangular controls use compact corners (7px). Icon-only and completion controls use pills (999px).
- **Primary:** Action Red background with white text, 1.9rem minimum height, 0.68rem horizontal padding, 700 weight.
- **Hover / Focus:** Hover darkens the primary action. Focus uses a 2px red-tinted outline with 2px offset.
- **Secondary / Ghost:** White or tokenized ghost surfaces with a thin border; hover shifts border toward Service Red.

### Chips

- **Style:** Pills carry status, service movement, shared-plate, ready, and activity meaning. They use color-tinted backgrounds with borders rather than large filled blocks.
- **State:** Selected and checked states tint the whole pill and add a clear icon or check mark; do not rely on color alone.

### Cards / Containers

- **Corner Style:** Service cards use compact corners (8px); panes use panel corners (10px); dialogs use 14px.
- **Background:** Rows sit on item surfaces; panes and menus sit on stronger panel surfaces.
- **Shadow Strategy:** Cards rely mostly on border separation. Larger containers use the Panel Shadow.
- **Border:** Every dense work surface uses a thin border to survive daylight glare and dark-mode contrast changes.
- **Internal Padding:** Service cards stay tight at 0.4rem by 0.45rem. Do not expand row padding unless scan speed improves.

### Inputs / Fields

- **Style:** Inputs use 7px corners, thin tokenized borders, strong foreground text, and white or dark-panel backgrounds.
- **Focus:** Focus should use the existing red-tinted 2px outline pattern.
- **Error / Disabled:** Errors use red-tinted backgrounds and borders; disabled controls retain shape and placement but reduce opacity.

### Navigation

- **Style:** Header, toolbar, and date navigation are compact utility surfaces. They use the same border, panel background, and soft shadow language as panes.
- **Mobile Treatment:** Horizontal controls may scroll, but the two service panes remain the central first-screen signal.

### Service Item

The service item is the signature component. It is a compact operational record with time, service type, completion control, identity, car/plate, location, notes, and update footer in one readable unit. Every new row-level feature must justify its place against the row's scan speed.

### Service Pane

The pane is a sticky-headed list column for Entregas or Recolhas. It carries only a title and count in the header, then lets the list do the work. Empty, locked, loading, and completed states should preserve this structure.

## 6. Do's and Don'ts

### Do:

- **Do** keep the service list as the dominant interface. New UI should support deliveries and pickups, not decorate around them.
- **Do** use Service Red for operational meaning: service identity, counts, primary actions, and completion feedback.
- **Do** maintain daylight readability with strong contrast, visible borders, and large enough tap targets.
- **Do** keep row actions close to the row content they affect.
- **Do** use icons for compact operational actions when the meaning is familiar, with accessible labels.
- **Do** preserve reduced-motion support for accordions, row animations, and loading states.

### Don't:

- **Don't** add clutter that makes the service list harder to scan.
- **Don't** create flashy SaaS dashboards, decorative marketing styling, oversized visual effects, or low-density card sprawl.
- **Don't** add toy-like gamification or celebratory UI that competes with service information.
- **Don't** use status treatments that rely on color alone or compete with delivery and pickup information.
- **Don't** inflate row padding, headings, or badges unless it makes the next service easier to recognize.
- **Don't** use side-stripe card accents, gradient text, glassmorphism, or nested cards.
