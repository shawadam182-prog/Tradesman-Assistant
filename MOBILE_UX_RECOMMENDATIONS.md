# Mobile UX & Visual Upgrade Recommendations

This document outlines 25 high-impact recommendations to transform the mobile experience of the app. The goal is to create a "super easy, intuitive" interface that feels professional, clean, and unjumbled on smartphones, with a strict adherence to the **Teal & Slate** brand identity.

## I. Global Visual Identity (The "Teal & Slate" Standard)

1.  **Primary Brand Color Switch:** Replace all instances of `amber-500` (and related orange shades) with `teal-500` as the primary action color. This aligns the app with the landing page and provides a calmer, more professional "trade" aesthetic.
2.  **Professional Backgrounds:** Shift from warm/tinted backgrounds (e.g., `bg-amber-50`) to cool neutrals (`bg-slate-50` or pure `bg-white`). This immediately makes the app feel cleaner and less "busy."
3.  **High-Contrast Text:** Standardize body text to `text-slate-600` and headings/important values to `text-slate-900`. Avoid low-contrast grays that are hard to read on mobile outdoors.
4.  **Button Hierarchy:**
    *   **Primary CTA:** `bg-slate-900 text-white` (Solid, authoritative).
    *   **Secondary/Accent:** `bg-teal-500 text-white` (Highlight actions).
    *   **Tertiary/Cancel:** `bg-slate-100 text-slate-600` (Subtle).
    *   *Action:* Audit all buttons to fit these three categories.
5.  **Remove Gradients:** Replace complex gradients (e.g., in Quick Action buttons) with solid colors or very subtle flat styles to reduce visual noise and improve "cleanliness."

## II. Touch & Typography (Mobile First)

6.  **Stop iOS Zoom:** Enforce a global rule that all `<input>`, `<select>`, and `<textarea>` elements use `text-base` (16px) or larger on mobile. This prevents the browser from auto-zooming when an input is tapped.
7.  **Chunky Touch Targets:** Increase the vertical padding of all inputs and buttons to at least `py-3` or `py-4`. A touch target should be at least **44px** tall.
8.  **Full-Width Mobile Controls:** On screens smaller than `md`, force all buttons and inputs to `w-full`. Do not make users hunt for small buttons aligned to the left or right.
9.  **Readable Labels:** Change form labels from tiny `text-[10px]` to `text-xs` (12px) font-bold uppercase. Add `mb-1.5` spacing between label and input for breathing room.
10. **Smart Keyboards:** Ensure every input has the correct `inputMode` (e.g., `numeric` for prices, `tel` for phone numbers, `email` for emails) so the most helpful mobile keyboard appears automatically.

## III. Layout & Structure (Reducing Scroll)

11. **Bottom Sheet Modals:** On mobile, convert centered modals (which can get cut off) into **Bottom Sheet Drawers** that slide up from the bottom. This is more ergonomic (closer to the thumb) and handles scrolling better.
12. **Sticky Actions:** For long forms (like Quote Creator), keep the "Save" or "Next" button in a **Sticky Footer** (`fixed bottom-0`) so users don't have to scroll to the very end to take action.
13. **Collapsible Sections:** In the Quote/Job views, strictly use **Accordions** for sections (e.g., "Work Section 1", "Materials"). Auto-collapse non-active sections to drastically reduce page length.
14. **Tabbed Navigation within Pages:** Instead of stacking "Photos", "Notes", and "Documents" vertically on a Job Pack page, use a **Horizontal Segmented Control** (Tabs) to switch views without making the page 2000px long.
15. **Horizontal Scrolling Containers:** For elements like "Week Ahead" or "Quick Actions," ensure they scroll horizontally (with hidden scrollbars) rather than wrapping and taking up valuable vertical screen real estate.

## IV. Component Specific Improvements

16. **Home Dashboard "Unjumbling":**
    *   Redesign the "Quick Actions" grid to be a single row of horizontal scrolling icons (like Instagram Stories or banking app shortcuts) to save vertical space.
    *   Simplifies the "Daily Brief" header to be more compact.
17. **Quote Creator Optimization:**
    *   Move the "Add Item" form into a separate Bottom Sheet or Modal. Do not embed the full "Add Material" form inline, which clutters the view. Show only the list of added items.
    *   Group "Project Details" (Title, Client, Date) into a single compact card at the top that can be collapsed.
18. **List View Cards:**
    *   Remove borders (`border-0`) and use `shadow-sm` with `bg-white` for list items (Job Packs, Quotes).
    *   Remove complex hover effects on mobile (they don't work well).
    *   Make the entire card clickable, not just a "View" button.
19. **Mobile Navigation Bar:**
    *   Increase height to **60px + safe-area**.
    *   Use bold, filled icons for the active state (`text-teal-500`) and outline icons for inactive (`text-slate-400`).
    *   Remove text labels if icons are clear enough, or keep them tiny (`text-[10px]`).
20. **Search Experience:**
    *   Make search bars "sticky" at the top of list views (Jobs/Quotes) so they are always accessible.
    *   Add a "Clear" (X) button inside all search inputs.

## V. Polish & Feel ("Intuitive")

21. **Haptic Feedback:** Implement `hapticTap()` on *all* significant interactions (tab switches, save buttons, delete actions, completing a task) to give the app a tactile, high-quality feel.
22. **Loading Skeletons:** Replace spinning loaders with **Skeleton Screens** (pulsing gray shapes) during data loading. This makes the app feel faster and less "broken" while waiting for data.
23. **Empty States:** Design helpful empty states (e.g., "No Jobs Yet") with a large illustration and a direct "Create Job" button, rather than just text.
24. **Toast Notifications:** Ensure success/error toasts appear at the **top** of the screen on mobile (so they don't cover the bottom navigation or keyboard) and auto-dismiss quickly.
25. **Photo Upload Experience:** Simplify the photo flow. When tapping "Camera," go straight to the native camera interface. After capture, show a simple preview with "Retake" or "Use Photo" buttons before uploading.
