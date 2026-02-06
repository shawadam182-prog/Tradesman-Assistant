/**
 * TestPDFExport.tsx - Debug component for testing react-pdf export
 * 
 * This component can be temporarily added to QuoteView to test the new
 * PDF export system alongside the old one.
 * 
 * USAGE:
 * 1. Import this component in QuoteView.tsx:
 *    import { TestPDFExport } from './invoice-templates/pdf/TestPDFExport';
 * 
 * 2. Add it somewhere in the JSX (e.g., after the action buttons):
 *    <TestPDFExport quote={activeQuote} customer={customer} settings={settings} totals={totals} />
 * 
 * 3. Use the "Test react-pdf Export" button to generate a PDF
 * 
 * 4. Compare the output with the existing "Download PDF" button
 * 
 * NOTE: Remove this component once testing is complete.
 */

import React, { useState } from 'react';
import { Quote, Customer, AppSettings } from '../../../types';
import { generateInvoicePDF, getInvoiceReference } from '../../../src/utils/invoicePdfExportV2';
import { FileDown, Loader2, Check, X } from 'lucide-react';

interface TestPDFExportProps {
  quote: Quote;
  customer: Customer;
  settings: AppSettings;
  totals: {
    clientSubtotal: number;
    taxAmount: number;
    cisAmount: number;
    discountAmount?: number;
    grandTotal: number;
  };
}

export const TestPDFExport: React.FC<TestPDFExportProps> = ({
  quote,
  customer,
  settings,
  totals,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTestExport = async () => {
    setIsGenerating(true);
    setResult(null);
    setErrorMessage(null);

    try {
      const reference = getInvoiceReference(quote, settings);
      const pdfTotals = {
        clientSubtotal: totals.clientSubtotal,
        taxAmount: totals.taxAmount,
        cisAmount: totals.cisAmount,
        discountAmount: totals.discountAmount || 0,
        grandTotal: totals.grandTotal,
      };

      const { blob, filename } = await generateInvoicePDF(
        quote,
        customer,
        settings,
        pdfTotals,
        reference
      );

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NEW_${filename}`; // Prefix with NEW_ to distinguish from old export
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setResult('success');
    } catch (err) {
      console.error('❌ react-pdf export failed:', err);
      setResult('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 my-4 print:hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-violet-900">🧪 New PDF Export (react-pdf)</h3>
        <span className="text-[10px] bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-bold">
          TESTING
        </span>
      </div>
      <p className="text-xs text-violet-700 mb-3">
        Test the new vector PDF export. Text will be crisp and selectable!
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleTestExport}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown size={16} />
              Test react-pdf Export
            </>
          )}
        </button>
        {result === 'success' && (
          <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
            <Check size={16} /> Success! Check downloads
          </span>
        )}
        {result === 'error' && (
          <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
            <X size={16} /> Failed: {errorMessage}
          </span>
        )}
      </div>
      <div className="mt-3 text-[10px] text-violet-500">
        <p>Template: <strong>{settings.documentTemplate || 'professional'}</strong></p>
        <p>Color scheme: <strong>{(quote.type === 'invoice' ? settings.invoiceColorScheme : settings.quoteColorScheme) || 'default'}</strong></p>
      </div>
    </div>
  );
};

export default TestPDFExport;
