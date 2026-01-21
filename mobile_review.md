# Mobile View Code Review & Recommendations

**Date:** 2026-01-21
**Focus:** Visuals, Formatting, Tablet/Mobile Experience (Code Review)
**Goal:** Identifying areas for aesthetic and usability improvement without logical refactoring.

## Executive Summary
The application has a solid responsive foundation (`md:` breakpoints are used extensively), but the mobile "feel" struggles between a "responsive website" and a "native app". To achieve a premium, polished mobile experience, consistent typography sizing, branding alignment (Teal/Slate), and component adaptation (Tables -> Cards) are required.

---

## 1. Visual Consistency & Branding
*Current State:* The app is transitioning to a **Teal/Slate** theme, but legacy colors (Amber/Orange) and inconsistent "rainbow" buttons remain.

### Specific Findings
- **Home.tsx (Quick Actions):** Uses a "rainbow" of gradients (`from-amber-400`, `from-rose-400`, `from-violet-400`).
    - *Recommendation:* While colorful, this dilutes the "Premium Professional" feel. Consider unifying these to **Slate-900** (primary) and **Teal-500** (active/secondary) or subtle varied shades of slate/teal. If color coding is needed, use it as a subtle border or icon color, not a full gradient background.
- **BankImportPage.tsx:** Uses `amber-600` and `amber-100` for active steps.
    - *Recommendation:* Replace all `amber` references with `teal` to match the new brand identity.
- **Shadows:** The app uses default Tailwind shadows.
    - *Recommendation:* Use colored shadows (e.g., `shadow-teal-500/20`) for active elements to give a modern "glow" effect, and softer `shadow-slate-200/50` for cards.

## 2. Typography & Readability
*Current State:* Text sizes on mobile are frequently set to `text-[9px]` or `text-[10px]`.

### Specific Findings
- **Home.tsx / Layout.tsx:** Navigation labels and button text use `text-[8px]` or `text-[9px]`.
    - *Observation:* This is below accessible standards and feels "cramped".
    - *Recommendation:* **Minimum font size should be 11px** for secondary labels and **13px** for primary text. Increase icon size relative to text if space is an issue, or remove text labels for obvious icons in dense grids.
- **Headings:** Inconsistent sizing logic (some `text-xl`, some `text-3xl`).
    - *Recommendation:* Create a reusable `<MobilePageHeader />` component to enforce consistent padding, font-size (`text-2xl`), and sticky behavior across all pages.

## 3. Layout & Structure
*Current State:* Some desktop metaphors (Tables, boxed containers) persist on mobile.

### Specific Findings
- **BankImportPage.tsx (Preview Table):** Uses a standard HTML `<table>`.
    - *Issue:* Horizontal scrolling on mobile is poor UX.
    - *Recommendation:* **"Card-ify" tables on mobile.** Render a stack of `<div className="p-4 border-b">` cards for each transaction row instead of a table row.
- **QuoteView.tsx (Document Preview):** Forces a fixed width (`750px`).
    - *Issue:* Users have to scroll horizontally to see the document.
    - *Recommendation:* Use CSS `transform: scale(...)` or a responsive container query to fit the document preview within the mobile viewport width (approx 350-390px).
- **Layout.tsx (More Menu):** The full-screen overlay menu feels heavy.
    - *Recommendation:* Implement a **Bottom Sheet / Drawer** pattern. This is more ergonomic for thumbs on mobile devices.

## 4. Spacing & Touch Targets
*Current State:* Touch targets are generally good (`min-h-[44px]` seen in CSS), but visual padding is tight.

### Specific Findings
- **Container Margins:** Pages often use `px-3` (`12px`) on mobile.
    - *Recommendation:* Standardize on **`px-4` (16px)** or even `px-5` (20px) for the main container. This extra breathing room significantly increases the "premium" feel.
- **Safe Areas:** usage of `pb-10` in `Home.tsx` might conflict with or duplicate `pb-24` in `Layout.tsx`.
    - *Recommendation:* Audit all bottom padding to ensuring it accounts for the *Floating Navigation* + *Safe Area Inset*.

## 5. Micro-Interactions
*Current State:* `active:scale-95` is used, which is excellent.

### Recommendations
- **List Items:** Add `active:bg-slate-50` to all list items (e.g., in Bank Import, Job Lists) to provide immediate feedback on touch.
- **Transitions:** Ensure all hover/active state changes have `transition-all duration-200` for smoothness. Avoid instant color snaps.

---

## Action Plan (Summary)
1.  **theme.ts:** Define a strict color palette (Teal/Slate) and remove Amber/Orange from the codebase.
2.  **Typography Bump:** Find/Replace `text-[9px]` -> `text-xs` (12px) or `text-[11px]`.
3.  **Table Mobile-View:** Refactor `BankImportPage` and `JobPackList` to use conditional rendering (Table on Desktop, List on Mobile).
4.  **Full-Bleed Headers:** Ensure all mobile headers are sticky and full-width.
