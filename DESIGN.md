---
name: CEAL Calendar
description: College event coordination and club calendar management system
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  slate-dark: "#0f172a"
  bg-light: "#f8fafc"
  bg-dark: "#171717"
  surface-dark: "#171717"
  surface-dark-subtle: "#0a0a0a"
  card-light: "#ffffff"
  card-dark: "#171717"
  border-light: "#e2e8f0"
  border-dark: "#262626"
  border-dark-subtle: "#27272a"
  text-primary-light: "#0f172a"
  text-primary-dark: "#ffffff"
  text-secondary-light: "#64748b"
  text-secondary-dark: "#a3a3a3"
typography:
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  heading:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 20px"
---

## Overview

CEAL Calendar's design system adheres to a Swiss-inspired, disciplined collegiate administrative aesthetic. The interface is engineered for daily operational clarity: student leads scheduling multi-club events, students exploring campus activity, and faculty administrators managing club roles and governance. 

All decorative AI slop—gratuitous glassmorphism, heavy neon glows, arbitrary gradient overlays, and emoji icons—is strictly forbidden in favor of crisp 1px borders, purposeful typographic hierarchy, accessible color contrast ratios, and authentic SVG iconography.

---

## 1. Color Palette & Theming

### Neutral Surfaces
- **Light Theme:**
  - Page Background: `#f8fafc` (`slate-50`)
  - Elevated Cards & Modals: `#ffffff` (`white`)
  - Border Hairlines: `#e2e8f0` (`slate-200`) or `#f1f5f9` (`slate-100`)
  - Text Primary: `#0f172a` (`slate-900`)
  - Text Secondary: `#64748b` (`slate-500`)
- **Dark Theme:**
  - Page Background: `#171717` (`neutral-900`) across both mobile and desktop (never jarring pure `#000000` or tinted blues)
  - Elevated Cards & Popovers: `#171717` (`neutral-900`) with `#0a0a0a` (`neutral-950`) inset inputs
  - Border Hairlines: `#262626` (`neutral-800`) or `#3f3f46` (`neutral-700`)
  - Text Primary: `#ffffff` (`white`)
  - Text Secondary: `#a3a3a3` (`neutral-400`)

### Brand & Accents
- **Primary Brand:** Collegiate Blue (`#2563eb` / hover `#1d4ed8`). Used selectively for primary actions, active navigation indicators, and focused form outlines.
- **Destructive:** Crimson (`#e11d48` / `#be123c`). Used strictly for deleting events or irreversible member removals.
- **Success:** Emerald (`#10b981`). Used for confirmed states and event success toasts.

### Dynamic Club Color System
Every campus club possesses a unique brand color stored in the database.
- **Computed Contrast:** All pill tags and badges calculate foreground text color dynamically using relative luminance (`getContrastColor(hex)`):
  $$\text{Luminance} = 0.299R + 0.587G + 0.114B$$
  - Luminance $> 160 \implies$ Dark slate text (`#0f172a`)
  - Luminance $\le 160 \implies$ Pure white text (`#ffffff`)
- **Pills & Badges:** Solid borders with subtle 10-15% opacity tint for inactive badges, shifting to full solid club fill with computed contrast text when selected.

---

## 2. Typography

- **Font Family:** `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Typographic Scale:**
  - **Brand Script Title:** Script font (`font-['Caveat']` or SVG brandmark) for the masthead "Calendar" mark.
  - **Page / Modal Headings:** `1.25rem` to `1.5rem` (`20px - 24px`), font-weight 700, tight tracking.
  - **Section Subheadings:** `0.875rem` to `1rem` (`14px - 16px`), font-weight 600.
  - **Body & Inputs:** `0.875rem` (`14px`), font-weight 400, line-height 1.5.
  - **Labels & Captions:** `0.75rem` (`12px`), font-weight 600, uppercase or sentence case.
  - **Badges, Chips & Microcopy:** `0.6875rem` (`11px`) or `0.625rem` (`10px`), font-weight 600.

---

## 3. Elevation, Shadows & Borders

- **Border-First Design:** Depth is established primarily via crisp 1px borders (`border border-slate-200 dark:border-neutral-800`), not heavy drop shadows.
- **Restrained Shadows:**
  - Cards & Sidebars: `shadow-xs` or `shadow-sm`.
  - Floating Popovers & Modals: `shadow-xl` or `shadow-2xl` with a crisp border defining the silhouette.
- **Glassmorphism Prohibition:** No frosted glass or heavy blur haloes (`backdrop-blur-xl`). Overlays use solid translucent scrims (`bg-black/60`) without color tinting.

---

## 4. Layout & Responsive Principles

### Desktop Layout
- **Main Container:** Centered `max-w-7xl` or full-width viewport split with fixed/collapsible sidebar.
- **Calendar Grid:** Clean FullCalendar integration utilizing full available container height without nested scrollbars.
- **Admin Dashboard:** Responsive tabbed structure (Manage Users & Roles, Club Hierarchy) with balanced split layouts.

### Mobile Layout
- **Viewport Utilization:** Zero double-scroll traps. The calendar grid uses available viewport height cleanly.
- **Slide-Over Sidebar:** 
  - Off-canvas drawer sliding from the left (`z-50`).
  - Solid background in `#171717` (`neutral-900`) in dark mode, matching the main page theme (no blue tints, no pitch-black mismatch).
  - One-touch close button and backdrop dismissal.
  - Compact club toggles with "All" and "None" quick actions.
- **Mobile Admin Cards:** Admin user list reflows gracefully on mobile viewports into touch-friendly cards with stacked badges and clear actions, avoiding horizontal table clipping.

---

## 5. Component Patterns

### Event Modal & Forms
- **Host Club Selector ("Creating for Club"):** Single-selection pill group. Inactive state: clean solid border (`border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950`). Active state: full club background fill with computed high-contrast text. No dashed or dotted borders.
- **Collaborating Clubs Multi-Select:**
  - Real-time fuzzy search input powered by fuzzy search algorithm (`fuzzySearch.js`).
  - **Smart Dynamic Dropdown Placement:** Dynamically opens upward (`bottom-full mb-1.5`) when near the bottom of the modal, ensuring zero scrollbar expansion or submit-button clipping.
  - **Collaborator Chips:** Rendered cleanly below the search input with club color dot, title, and quick-remove button.
- **Date & Time Controls:** Integration with `react-datepicker` styled with native dark/light theme classes and respecting the user's preferred 12h (`hh:mm A`) or 24h (`HH:mm`) format.

### Club Filter Sidebar
- **Hierarchical Tree:** Main clubs display with primary color dot. Sub-clubs nest directly underneath with indented guides (`border-l` or `pl-4`).
- **Selection State:** Multi-checkbox selection filtering calendar events instantly on the client side.
- **Persistent User Tile:** Pinned at bottom showing current user initials, institutional role tag, and quick access to Profile or Login.

### Data Tables & Role Badges
- **Role Hierarchy Badges:**
  - `Superadmin`: Indigo accent tag.
  - `Staff`: Amber/Slate accent tag.
  - `Main Club`: Primary club color fill.
  - `Sub-Club`: Sub-club tag with subtle indicator.
  - `Extra Clubs`: Compact colored badge group.

---

## 6. Do's and Don'ts

### Do:
- **Use authentic SVG icons** (Heroicons/Lucide style) for every action, chevron, filter, search, and close button.
- **Calculate dynamic contrast** using `getContrastColor` for any surface displaying a dynamic club color.
- **Preserve dark mode surface unity**: Maintain `#171717` (`neutral-900`) as the surface background in dark mode across desktop, mobile sidebars, and cards.
- **Keep form dropdowns contained**: Use auto-dropup positioning for bottom-docked inputs to avoid creating artificial scroll containers.
- **Support both 12-hour and 24-hour time displays** seamlessly across calendar headers, event popovers, and pickers.

### Don't:
- **No emoji iconography**: Never use emojis (👑, 🛡️, 📅, 🔍, 🕒) in place of professional SVG icons.
- **No dashed or dotted outlines on club pills**: Keep pills solid and structured.
- **No pitch-black (`#000000`) or blue-tinted dark backgrounds**: Stick to the unified `neutral-900` / `neutral-800` theme token set.
- **No nested or double scrollbars**: Calendar views and modals must fit their viewports gracefully without accidental scroll overflow.
- **No decorative AI slop**: Eliminate glowing neon boxes, multi-stop gradient text, and heavy backdrop blur filters.
