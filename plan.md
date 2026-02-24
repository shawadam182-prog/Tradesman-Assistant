# Quote/Invoice UI Improvements - Implementation Plan

## 1. Customer Name & Address Shown in Quote Editor (Editable, Non-Destructive)

**Problem:** When editing a quote, only a customer search/selector is shown — the full name and address are not displayed or editable inline on the quote.

**Files:** `components/QuoteCreator.tsx` (~line 946-963)

**Plan:**
- After a customer is selected (when `formData.customerId` resolves to a customer), display their full name, email, phone, and address below the client selector.
- Add local state fields (`quoteCustomerName`, `quoteCustomerAddress`) that are initialized from the selected customer but stored **only on the quote** (not written back to the Customer record).
- These override fields would be saved as `customerNameOverride` / `customerAddressOverride` on the Quote object (add to `types.ts` Quote interface).
- The PDF/QuoteDocument already uses `customer.name` and `customer.address` — it would check for overrides first.
- This means editing the name/address on a quote does NOT change the saved customer details.

**Changes:**
- `types.ts`: Add `customerNameOverride?: string` and `customerAddressOverride?: string` to Quote interface.
- `components/QuoteCreator.tsx`: Below the client selector, render editable fields showing the resolved customer name + address, bound to override fields.
- `components/quote-view/QuoteDocument.tsx`: Use override fields if present, otherwise fall back to customer record.
- PDF templates (`src/lib/invoiceTemplates.ts`, `src/utils/invoicePdfExportV2.ts`): Same override logic.

---

## 2. "Mark as Sent" — Confirm After PDF Download; Fix Buttons Hidden Below Tabs

**Problem:** "Mark as Sent" should only confirm after the user has downloaded the PDF. Currently the status buttons and action buttons can overlap or be hidden by the tabs.

**Files:** `components/QuoteView.tsx` (~lines 342-575)

**Plan:**
- **Confirm after PDF:** Change the "Mark as Sent" / "Confirm Sent" button (line ~489-498) to first trigger a PDF download, and then show a confirm dialog asking "PDF downloaded — mark as sent?". Only update status on confirm.
- **Buttons hidden below tabs:** The status stepper (lines 344-484) and action buttons (lines 486-575) are stacked inside `flex flex-col gap-2`. The secondary actions row at line 578 uses `overflow-x-auto` but may overflow below tabs on small screens. Fix by ensuring the action rows have adequate z-index and are not clipped by the tab container. Add `overflow-visible` or adjust padding/scroll to make all buttons accessible.

**Changes:**
- `components/QuoteView.tsx`: Refactor "Confirm Sent" button to trigger PDF download first, then show a confirmation dialog. Add a `ConfirmDialog` for "Mark as Sent" flow.
- Adjust CSS classes on the action button containers to prevent clipping.

---

## 3. Labour Unit Selector Dropdown (hrs/days/week/custom)

**Problem:** Labour items currently only support hours (`hrs`). Need a dropdown to switch units between hrs/days/week/custom (custom units editable in settings).

**Files:**
- `types.ts` (LabourItem interface)
- `components/quote/LabourItemRow.tsx`
- `components/quote/QuoteSectionEditor.tsx`
- `components/SettingsPage.tsx`
- `src/utils/quoteCalculations.ts`

**Plan:**
- Add `unit?: string` to the `LabourItem` interface (default `'hrs'`).
- Add `labourUnitPresets?: string[]` to `AppSettings` (default `['hrs', 'days', 'week']`).
- In `LabourItemRow.tsx`, add a unit dropdown next to the hours input that shows the current unit and allows switching between hrs/days/week/custom.
- In `SettingsPage.tsx`, add a section under labour settings for managing custom labour units.
- In `quoteCalculations.ts`, the calculation `hours * rate` remains the same — `hours` is really "quantity" and the rate is per-unit. The label just changes. No calculation logic change needed.

**Changes:**
- `types.ts`: Add `unit` field to `LabourItem`, add `labourUnitPresets` to `AppSettings`.
- `components/quote/LabourItemRow.tsx`: Add unit dropdown next to the `hrs` label (line ~88).
- `components/quote/QuoteSectionEditor.tsx`: Update labour summary text to use the item's unit.
- `components/SettingsPage.tsx`: Add custom labour units editor.

---

## 4. Larger Description Area for Work Sections

**Problem:** The description textarea in QuoteSectionEditor is too small and squashed.

**Files:** `components/quote/QuoteSectionEditor.tsx` (~lines 123-161)

**Plan:**
- Increase the `minHeight` of the description textarea from `3em` to `5em` or `6em`.
- When collapsed, show more of the text (remove truncation or increase visible lines).
- Make the collapsed preview taller (change from `text-[9px]` to larger text).
- Auto-expand: start expanded by default instead of collapsed.

**Changes:**
- `components/quote/QuoteSectionEditor.tsx`: Increase textarea min-height, start expanded by default, make collapsed preview larger.

---

## 5. Add Design Section (Colours, Layout) to Quote Editor

**Problem:** User wants a design section for specifying colours, layout preferences, etc.

**Files:** `components/QuoteCreator.tsx`, `types.ts`

**Plan:**
- Add `designNotes?: string` to the `Quote` interface.
- Add a "Design" card section in QuoteCreator (between the sections and the "Document Terms" card) with a textarea for colours, layout notes, etc.
- This would appear on the PDF/QuoteDocument in a dedicated "Design Specification" section.

**Changes:**
- `types.ts`: Add `designNotes?: string` to Quote.
- `components/QuoteCreator.tsx`: Add a design section card with textarea.
- `components/quote-view/QuoteDocument.tsx`: Render design notes if present.
- PDF templates: Include design notes in output.

---

## 6. Smaller Material Item Boxes (Less Height, More Horizontal Writing)

**Problem:** Material item rows are too tall, making the quote unusable with large material lists.

**Files:** `components/quote/MaterialItemRow.tsx`

**Plan:**
- Reduce vertical padding and spacing in material rows.
- Currently: Name input + Description input stacked vertically, then a row of Qty/Price/Total boxes in `bg-slate-50` with generous padding.
- Change to a more compact layout: single-line name + description side-by-side (or name above, description as smaller text), with Qty/Price/Total more compact.
- Reduce the `p-3`, `py-3`, heights (`h-11`) to smaller values on mobile.
- The key is less vertical space per item while maintaining readability and allowing wider text input.

**Changes:**
- `components/quote/MaterialItemRow.tsx`: Reduce padding, make inputs more compact, possibly put name+description on same line on desktop.

---

## 7. Labour Rate Preset Name as Default Description

**Problem:** When selecting a labour rate preset (e.g. "Callout 1st Hour"), the description box should auto-fill with that preset name instead of being blank. Currently defaults to empty or "Labour work".

**Files:** `components/quote/LabourItemRow.tsx`, `components/QuoteCreator.tsx`

**Plan:**
- In `LabourItemRow.tsx`, when a preset is selected via `handlePresetSelect`, also update the description if it's currently empty (or still the default).
- In `QuoteCreator.tsx` `addLabourItem`, set default description to "Labour" instead of empty string.
- When a user selects a preset rate, auto-fill description with the preset name (e.g. "Callout 1st Hour").

**Changes:**
- `components/quote/LabourItemRow.tsx`: In `handlePresetSelect`, call `onUpdate` with both `rate` AND `description` (if description is empty or default).
- `components/QuoteCreator.tsx`: Default labour item description to "Labour" or leave empty but let preset selection fill it.

---

## 8. Fix Labour Rate Description Mismatch

**Problem:** Small description under the labour rates doesn't match the selected rate preset.

**Files:** `components/quote/QuoteSectionEditor.tsx` (~line 250-252), `components/quote/LabourItemRow.tsx`

**Plan:**
- The labour summary line (line 284) shows `Total: {hours} hours × £{sectionRate}` — but this doesn't reflect per-item rates or preset names.
- Fix by showing a more accurate summary when items have mixed rates, or showing the preset name alongside the rate.
- Also check the rate display at line 251 (`Rate: £{sectionRate}/hr`) — this shows the section default rate but individual items may have different rates.

**Changes:**
- `components/quote/QuoteSectionEditor.tsx`: Update the labour summary to properly reflect mixed rates, or show "varies" when items have different rates.

---

## 9. Quote/Invoice List Price — Pence Accurate

**Problem:** Prices in the list view round to the nearest pound (£0 decimal places).

**Files:**
- `components/QuotesList.tsx` (line 343)
- `components/InvoicesList.tsx` (line 414)

**Plan:**
- In `QuotesList.tsx` line 343: Change `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }` to `{ minimumFractionDigits: 2, maximumFractionDigits: 2 }`.
- In `InvoicesList.tsx` line 414: Same change.

**Changes:**
- Both files: Update `toLocaleString` format options to show 2 decimal places.

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `types.ts` | Add `customerNameOverride`, `customerAddressOverride`, `designNotes` to Quote; add `unit` to LabourItem; add `labourUnitPresets` to AppSettings |
| `components/QuoteCreator.tsx` | Customer details display, design section, labour default description |
| `components/QuoteView.tsx` | Mark as sent flow, button visibility fix, debug removal |
| `components/quote/QuoteSectionEditor.tsx` | Description area size, labour summary accuracy |
| `components/quote/MaterialItemRow.tsx` | Compact height |
| `components/quote/LabourItemRow.tsx` | Unit dropdown, preset name → description, rate display |
| `components/QuotesList.tsx` | Price formatting (2 decimal places) |
| `components/InvoicesList.tsx` | Price formatting (2 decimal places) |
| `components/SettingsPage.tsx` | Custom labour units editor |
| `components/quote-view/QuoteDocument.tsx` | Customer overrides, design notes rendering |
