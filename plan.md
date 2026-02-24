# Quote/Invoice Improvement Plan

## Issue 1: Customer name & address shown in full and editable in quote edit (without affecting saved customer)

**Current behaviour:** In `QuoteCreator.tsx` (~line 947-963), the customer selector is a search/dropdown that only shows the customer name in the input. The full address is not displayed or editable within the quote editor.

**Proposed change:** After a customer is selected, display the customer's full name, company, phone, email, and address below the selector as read-only initial values. Add an optional "Job Contact" override section (name + address fields) stored on the quote itself (not the customer record). This keeps the saved customer details untouched.

**Files to change:**
- `types.ts` — Add optional `contactName` and `contactAddress` fields to the `Quote` interface
- `components/QuoteCreator.tsx` (~line 947-963) — After customer selection, show full customer details and editable override fields

---

## Issue 2: "Mark as Sent" should confirm after PDF download; buttons hiding below tabs

**Current behaviour:** In `QuoteView.tsx` (~lines 370-498), the "Mark as Sent" button in the status stepper uses a simple `confirm()` dialog. The action buttons (status + secondary actions) sit below the stepper and can be hidden behind scrolling tabs. There's also a separate "Confirm Sent" button at ~line 489-498.

**Proposed change:**
1. When clicking "Mark as Sent" on a draft, first trigger the PDF download, then show a confirmation dialog asking "PDF downloaded. Mark as Sent?"
2. Fix the button visibility by ensuring the action buttons have proper spacing/padding and are not obscured by tab overflow. Add `overflow-visible` and remove `pb-2` constraints where they clip the content.

**Files to change:**
- `components/QuoteView.tsx` (~lines 370-498) — Wire PDF download before "sent" status change; fix overflow/spacing on action button rows

---

## Issue 3: Labour unit dropdown selector (hrs/days/week/custom)

**Current behaviour:** In `LabourItemRow.tsx` (~line 88), the unit is hardcoded as `hrs` text. The `LabourItem` type in `types.ts` has no `unit` field — it only has `hours` (a number) and `rate`.

**Proposed change:**
1. Add a `unit` field to the `LabourItem` interface (default: `'hrs'`), with options: `hrs`, `days`, `week`, `custom`.
2. In `LabourItemRow.tsx`, replace the static `hrs` label with a small dropdown selector showing the available units.
3. In `SettingsPage.tsx`, add a "Custom Labour Units" setting where users can define their own unit labels.
4. Add `customLabourUnits` to `AppSettings` in `types.ts`.
5. Pass available units through from settings to the section editor and labour row.

**Files to change:**
- `types.ts` — Add `unit?: string` to `LabourItem`; add `customLabourUnits?: string[]` to `AppSettings`
- `components/quote/LabourItemRow.tsx` — Replace hardcoded `hrs` with a dropdown
- `components/quote/QuoteSectionEditor.tsx` — Pass unit options through
- `components/SettingsPage.tsx` — Add custom labour units config
- `src/utils/quoteCalculations.ts` — No change needed (calculation stays the same, unit is display-only; the `hours` field represents the quantity)

---

## Issue 4: More space for work section descriptions

**Current behaviour:** In `QuoteSectionEditor.tsx` (~lines 123-161), the description starts collapsed as a single truncated line (`text-[9px]` on mobile). When expanded, the textarea has `minHeight: '3em'` and auto-resizes, but the collapsed placeholder is very small and easy to miss.

**Proposed change:**
1. Make the description always start expanded (not collapsed) with a larger min-height of `5em` on mobile and `6em` on desktop.
2. Increase the font size from `text-xs md:text-sm` to `text-sm md:text-base` when expanded.
3. Keep the auto-resize behaviour but with a more generous starting height.

**Files to change:**
- `components/quote/QuoteSectionEditor.tsx` (~lines 87, 123-161) — Increase default expansion, min-height, and font size

---

## Issue 5: Add a Design section (colours, layout) in quote edit

**Current behaviour:** There's no design/appearance section in the QuoteCreator. Layout/display customisation only exists in QuoteView's "Layout Options" customiser panel.

**Proposed change:** Add a collapsible "Design & Layout" section in `QuoteCreator.tsx` (between the Document Terms section and the Discount section). This would include:
- Document template selector (professional/spacious/classic)
- Colour scheme picker (the existing `invoiceColorScheme`/`quoteColorScheme` options)
- This stores the chosen template/colour on the quote's settings or uses the global settings

**Files to change:**
- `components/QuoteCreator.tsx` — Add a collapsible Design & Layout section after Document Terms

---

## Issue 6: Smaller material item boxes (less height, more horizontal writing)

**Current behaviour:** In `MaterialItemRow.tsx`, each material row has a full card layout with generous padding (`p-0.5 md:p-3`), a name+description block, and a Qty/Price/Total grid that uses tall input boxes (`h-6 md:h-11`).

**Proposed change:**
1. Reduce vertical padding on the material card from `p-0.5 md:p-3` to `p-0.5 md:p-2`.
2. Make the name/description inputs single-line and inline rather than stacked vertically, using a more horizontal layout.
3. Reduce the Qty/Price/Total row heights from `h-6 md:h-11` to `h-5 md:h-9`.
4. Reduce overall spacing between material rows.

**Files to change:**
- `components/quote/MaterialItemRow.tsx` — Reduce padding, heights, and make layout more compact/horizontal
- `components/quote/QuoteSectionEditor.tsx` — Reduce spacing between material items if needed

---

## Issue 7: Labour rate preset names should pre-fill the description box

**Current behaviour:** In `LabourItemRow.tsx` (~line 34), when a user selects a rate preset, only `item.rate` is updated via `onUpdate(sectionId, item.id, { rate: preset.rate })`. The description stays empty (defaults to empty string from `addLabourItem` at QuoteCreator.tsx:737).

**Proposed change:**
1. When a labour rate preset is selected, also set the description to the preset's name (e.g., "Callout 1st Hour") if the description is currently empty or still the default.
2. In `addLabourItem` (QuoteCreator.tsx:737), change the default description from `''` to `'Labour Work'` so there's always a sensible default.

**Files to change:**
- `components/quote/LabourItemRow.tsx` (~line 34-37) — When preset selected, also update description if empty
- `components/QuoteCreator.tsx` (~line 737) — Set default description to `'Labour Work'`

---

## Issue 8: Labour summary description doesn't match the rate preset selection

**Current behaviour:** In `QuoteSectionEditor.tsx` (~line 283-284), the labour summary shows `Total: {hours} hours × £{sectionRate}` — this always uses the section-level default rate, which may not match individual items that have different preset rates.

**Proposed change:** When labour items exist with mixed rates, show a more accurate summary. If all items share the same rate, show `Total: X hours × £Y`. If rates vary, show just `Total: X hours` without the rate, since the total cost already reflects the per-item rates.

**Files to change:**
- `components/quote/QuoteSectionEditor.tsx` (~lines 280-289) — Fix the labour summary to reflect actual item rates

---

## Issue 9: Quote/invoice price in list view should show pence (not rounded to pound)

**Current behaviour:**
- `QuotesList.tsx` (~line 343): `minimumFractionDigits: 0, maximumFractionDigits: 0` — rounds to nearest pound
- `InvoicesList.tsx` (~line 414): `minimumFractionDigits: 0, maximumFractionDigits: 0` — rounds to nearest pound

**Proposed change:** Change both to `minimumFractionDigits: 2, maximumFractionDigits: 2` so prices show as e.g. "£1,234.56" instead of "£1,235".

**Files to change:**
- `components/QuotesList.tsx` (~line 343) — Change fraction digits to 2
- `components/InvoicesList.tsx` (~line 414) — Change fraction digits to 2
