# React-PDF Invoice Implementation

## Summary

This document describes the new vector-based PDF export system using `@react-pdf/renderer`. This implementation runs **parallel** to the existing html2canvas-based system and is designed for a gradual rollout.

## What Was Built

### New Files Created

1. **`components/invoice-templates/pdf/InvoicePDFStyles.ts`**
   - All color definitions (hex values matching Tailwind colors)
   - Color scheme configurations for all 7 themes
   - StyleSheet definitions for each template (professional, classic, spacious)

2. **`components/invoice-templates/pdf/InvoicePDFDocument.tsx`**
   - Main react-pdf Document component
   - Three template implementations: Professional, Classic, Spacious
   - Full feature parity with existing templates:
     - Company header with logo
     - Customer/Bill To section
     - Date and reference information
     - Line items table with section headers
     - Materials and labour support
     - VAT, CIS, discounts
     - Part payments
     - Bank details
     - Notes/terms
     - Footer logos

3. **`components/invoice-templates/pdf/index.ts`**
   - Clean exports for all PDF components and styles

4. **`src/utils/invoicePdfExportV2.ts`**
   - `generateInvoicePDF()` - Main export function returning blob + filename
   - `downloadInvoicePDF()` - Convenience function for direct download
   - `generateInvoicePDFDataUrl()` - For previews/embedding
   - `createInvoicePDFFile()` - For Web Share API
   - `isReactPdfAvailable()` - Feature detection
   - `getInvoiceFilename()` / `getInvoiceReference()` - Helpers

5. **`src/hooks/useQuotePDFV2.ts`**
   - Drop-in replacement hook for `useQuotePDF`
   - Same interface, uses react-pdf internally
   - WhatsApp, Email, Download all working

6. **`components/invoice-templates/pdf/TestPDFExport.tsx`**
   - Debug component for testing
   - Can be added temporarily to QuoteView for A/B comparison

## How to Test

### Method 1: Add Test Component to QuoteView

1. Open `components/QuoteView.tsx`
2. Add import at top:
   ```tsx
   import { TestPDFExport } from './invoice-templates/pdf/TestPDFExport';
   ```
3. Add component somewhere visible (e.g., after action buttons):
   ```tsx
   <TestPDFExport quote={activeQuote} customer={customer} settings={settings} totals={totals} />
   ```
4. Run the dev server and test PDF export
5. Compare with existing "Download PDF" button
6. Remove the component when done testing

### Method 2: Console Testing

In browser dev console:
```javascript
// Import the module
import { generateInvoicePDF } from '/src/utils/invoicePdfExportV2.ts';

// Or access via window if you expose it
```

### Method 3: Replace the Hook

In `QuoteView.tsx`, swap the hook import:
```tsx
// Before:
import { useQuotePDF } from '../src/hooks/useQuotePDF';

// After (for testing):
import { useQuotePDFV2 as useQuotePDF } from '../src/hooks/useQuotePDFV2';
```

Note: The V2 hook returns `documentRef: { current: null }` since react-pdf doesn't need a DOM reference.

## What's Different

### Advantages of react-pdf

1. **Vector text** - Crisp at any zoom level, fully selectable
2. **Smaller file size** - No rasterized images
3. **True PDF structure** - Headers, tables, etc. as semantic elements
4. **No DOM dependency** - Can generate without rendering to screen
5. **Consistent output** - Same result on all devices/browsers

### Limitations

1. **No CSS shadows** - react-pdf doesn't support box-shadow
2. **Limited fonts** - Using Helvetica (built-in), custom fonts need registration
3. **No oklch colors** - All colors converted to hex
4. **Bundle size** - Adds ~175KB gzipped to vendor chunk

## Migration Path

### Phase 1: Testing (Current)
- Use TestPDFExport component for side-by-side comparison
- Verify all templates render correctly
- Check all features work (VAT, CIS, part payments, etc.)

### Phase 2: Feature Flag
- Add a setting toggle: "Use new PDF engine"
- Let users opt-in to the new system

### Phase 3: Default
- Make react-pdf the default
- Keep old system as fallback

### Phase 4: Cleanup
- Remove html2canvas dependency (if no longer needed elsewhere)
- Remove old PDF generation code

## Rollback

If issues are found, simply:
1. Remove any hook imports using V2
2. Remove TestPDFExport component
3. The old html2canvas system remains fully functional

## Files NOT Modified

The following files are unchanged and still work as before:
- `components/QuoteView.tsx`
- `src/hooks/useQuotePDF.ts`
- `src/lib/invoiceTemplates.ts`
- `components/invoice-templates/ClassicTemplate.tsx`

## Bundle Impact

After build:
- `vendor-pdf-*.js`: 592.07 kB (175.92 kB gzipped)

This is lazy-loaded, so it only downloads when PDF generation is used.

## Template Parity Checklist

| Feature | Professional | Classic | Spacious |
|---------|--------------|---------|----------|
| Company logo | ✅ | ✅ | ✅ |
| Company details | ✅ | ✅ | ✅ |
| Invoice/Quote title | ✅ | ✅ | ✅ |
| Reference number | ✅ | ✅ | ✅ |
| Balance due header | ✅ | ✅ | ✅ |
| Bill To section | ✅ | ✅ | ✅ |
| Dates (invoice, due) | ✅ | ✅ | ✅ |
| Line items table | ✅ | ✅ | ✅ |
| Section headers | ✅ | ✅ | ✅ |
| Section descriptions | ✅ | ✅ | ✅ |
| Line numbers | ✅ | ❌ | ✅ |
| Qty column | ✅ | ✅ | ✅ |
| Rate column | ✅ | ✅ | ✅ |
| Amount column | ✅ | ✅ | ✅ |
| Subtotal | ✅ | ✅ | ✅ |
| Discount | ✅ | ✅ | ✅ |
| VAT | ✅ | ✅ | ✅ |
| CIS deduction | ✅ | ✅ | ✅ |
| Grand total | ✅ | ✅ | ✅ |
| Part payment | ✅ | ❌ | ❌ |
| Bank details | ✅ | ✅ | ✅ |
| Notes | ✅ | ✅ | ✅ |
| Footer logos | ✅ | ❌ | ❌ |
| Color schemes | ✅ | ✅ | ✅ |
| Display options | ✅ | ✅ | ✅ |

## Author

Implemented: 2026-01-31
Status: Testing phase
