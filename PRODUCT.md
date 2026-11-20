# Product Specification

<!-- impeccable:product-schema 1 -->

## 1. Executive Summary

**CEAL Calendar** is a centralized, role-governed campus event coordination and calendar management platform designed for collegiate institutions. It unifies club event scheduling, enforces multi-tier club hierarchies, eliminates room and time booking conflicts, and automatically keeps students and faculty informed through automated daily email digests.

---

## 2. Platform & Target Environments

- **Target Platforms:** Responsive Web (Desktop, Tablet, Mobile browsers).
- **Primary Viewport Requirements:** Mobile-first responsive optimization (iOS Safari, Android Chrome) and full-screen desktop administrative workstations.
- **Offline / Network Resilience:** Graceful handling of campus Wi-Fi instability with clear toast notifications and client-side error boundaries.

---

## 3. Users & Personas

### Primary: Club Leads & Student Coordinators
- **Responsibilities:** Scheduling workshops, hackathons, seminars, general body meetings, and intra-college fests.
- **Key Needs:**
  - Create events specifically for their designated club or sub-club.
  - Add cross-club collaborations (e.g., FOSS collaborating with IEEE and IEDC) without creating duplicate calendar entries.
  - Real-time conflict visibility to avoid overlapping with competing events.
  - Edit or cancel events with full audit logging.

### Secondary: General Campus Students & Attendees
- **Responsibilities:** Discovering campus events, syncing dates with personal schedules, and participating in club activities.
- **Key Needs:**
  - Fast, responsive calendar grid in Month, Week, or Day views.
  - Multi-club filter sidebar to selectively view events for clubs they care about.
  - Search by club name or keyword.
  - Export event agendas to formatted PDF or personal calendar feeds.
  - Configurable daily email digest of upcoming events.

### Tertiary: Faculty Advisors, Staff & Superadmins
- **Responsibilities:** Institutional oversight, club governance, and user role assignments.
- **Key Needs:**
  - Manage user roles (`Superadmin`, `Staff`, club affiliations: Main Club, Sub-Club, Extra Clubs).
  - Configure club hierarchy (assigning sub-clubs to parent clubs, reordering, updating club colors).
  - Configure club-specific email sender credentials (`sender_email`, encrypted SMTP passwords).
  - Audit trail of deleted events and platform activity logs.

---

## 4. Core Features & Capabilities

### 4.1 Hierarchical Club Architecture
- **Multi-Tier Organization:** Supports parent clubs (e.g., FOSS, IEDC, IEEE) with unlimited nested sub-clubs (e.g., IEEE CS, IEEE PES, CREATE101, EMBED202).
- **Flexible User Affiliations:** Each coordinator can be linked to a Main Club, a primary Sub-Club, and multiple secondary Extra Clubs, dictating exact event creation permissions.
- **Visual Club Identity:** Unique brand color per club with automated high-contrast text computation for badges, calendar pills, and filters.

### 4.2 Event Scheduling & Multi-Club Collaboration
- **Single Host Club Ownership:** Every event belongs to a designated host club or sub-club ("Creating for Club").
- **Searchable Cross-Club Collaborations:** Host coordinators can tag multiple collaborating clubs using an intelligent fuzzy-search dropdown with score-ranked matching, prefix prioritization, and smart auto-dropup positioning.
- **Date & Time Intelligence:**
  - Supports 12-hour (`hh:mm A`) and 24-hour (`HH:mm`) formats according to user preference.
  - Precise date-time selection with duration tracking.
- **Event Audit Logs:** System tracks who created the event and records `updated_by` attribution and `DeletedEventLog` for accountability.

### 4.3 Interactive Calendar Interface
- **FullCalendar Engine:** High-performance Month, Week, and Day views with fluid responsive layouts.
- **Custom Collegiate Toolbar:** Quick navigation (`Today`, chevron month increment/decrement, dropdown month-year selector, view switcher).
- **Responsive Club Filter Sidebar:**
  - Tree-structured checkbox list with parent-child relationship indicators.
  - "Select All" and "Clear None" bulk filters.
  - Mobile slide-over drawer styled in unified `neutral-900` dark theme, eliminating blue tinting or viewport scroll clipping.
  - Persistent user profile card at the bottom with quick sign-in / profile routing.

### 4.4 Automated Daily Digest & Email Notification Engine
- **Asynchronous Worker:** Powered by Celery and Redis.
- **Personalized Notification Times:** Users can configure their preferred daily digest delivery time or rely on an evenly distributed morning schedule to avoid institutional mail server throttling.
- **Club Email Integration:** Dedicated club sender emails with encrypted passwords for authentic outbound event notices.

### 4.5 Administrative Dashboard & Governance
- **User Role Management:** Filter and search users by username, email, or club membership; assign staff or superadmin privileges; edit club hierarchy memberships.
- **Club Hierarchy Manager:** Create clubs, nest sub-clubs under parent clubs, customize hex colors with instant visual preview, and manage club display order.
- **Mobile-Optimized Administration:** Responsive reflow of complex user and club tables into touch-friendly cards on smaller viewports.

### 4.6 Personalization & Account Security
- **Timezone & Time Format Preferences:** 12-hour / 24-hour switching applied globally across calendar components.
- **Theme Selection:** Flawless light and dark modes with system preference detection.
- **Security & Auth:** JWT-based authentication with token refresh, password reset workflows, and secure credential storage.
- **Export Utility:** Event agenda generation and formatted PDF export service (`pdfExportService.js`).

---

## 5. Technical Architecture & Tech Stack

### Frontend
- **Framework:** React 18 with Vite.
- **Styling:** Tailwind CSS with custom design tokens, dark mode class strategy, and custom scrollbars.
- **Calendar Core:** FullCalendar (`@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`).
- **Icons & UI:** Heroicons SVG icons, `react-datepicker`, and custom toast notification system.
- **Utilities:** Custom fuzzy search algorithm (`fuzzySearch.js`), contrast calculator (`colorUtils.js`), and HTML2Canvas/jsPDF integration.

### Backend
- **Framework:** Django 5 & Django REST Framework (DRF).
- **Database:** PostgreSQL (with SQLite for local development/testing).
- **Asynchronous Task Queue:** Celery with Redis broker for daily digests and event notifications.
- **Authentication:** DRF SimpleJWT with token lifecycle management.
- **Security:** Encrypted club sender passwords, rate-limited auth endpoints, and strict permission classes (`IsSuperAdmin`, `IsStaffOrClubLead`).

---

## 6. Product Principles & Commitments

1. **Operational Efficiency First:** CEAL Calendar is a student and faculty work utility. High information density, fast response times, and clear data visualization take precedence over decorative gimmicks.
2. **Strict Hierarchy & Role Transparency:** Coordinators can only create and manage events for clubs they legitimately represent, preventing unauthorized campus announcements.
3. **Calm, Disciplined Swiss Aesthetic:** Clean 1px borders, restrained elevations, intentional whitespace, and authentic SVG iconography replace generic AI slop (heavy neon gradients, gratuitous glassmorphism, or emoji badges).
4. **Resilient Across Themes & Devices:** First-class light and dark experiences with zero contrast failures and zero double-scroll viewport traps on mobile.
