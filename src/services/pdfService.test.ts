import { buildPDFFilename, buildPDFReference } from './pdfService';
import { createMockQuote, createMockSettings } from '../test/factories';

describe('pdfService', () => {
  describe('buildPDFFilename', () => {
    it('builds filename for estimate with default prefix', () => {
      const quote = createMockQuote({ title: 'Kitchen Renovation', referenceNumber: 1, type: 'estimate' });
      const settings = createMockSettings({ quotePrefix: 'EST-' });
      expect(buildPDFFilename(quote, settings)).toBe('EST-0001_kitchen_renovation.pdf');
    });

    it('builds filename for invoice with custom prefix', () => {
      const quote = createMockQuote({ title: 'Bathroom Refit', referenceNumber: 23, type: 'invoice' });
      const settings = createMockSettings({ invoicePrefix: 'INV-' });
      expect(buildPDFFilename(quote, settings)).toBe('INV-0023_bathroom_refit.pdf');
    });

    it('sanitises special characters in title', () => {
      const quote = createMockQuote({ title: 'Mr Smith\'s "Kitchen" (Phase 1)', referenceNumber: 5, type: 'quotation' });
      const settings = createMockSettings({ quotePrefix: 'QUO-' });
      expect(buildPDFFilename(quote, settings)).toBe('QUO-0005_mr_smith_s__kitchen___phase_1_.pdf');
    });

    it('handles missing title gracefully', () => {
      const quote = createMockQuote({ title: '', referenceNumber: 1, type: 'estimate' });
      const settings = createMockSettings();
      expect(buildPDFFilename(quote, settings)).toBe('Q-0001_document.pdf');
    });

    it('pads reference number to 4 digits', () => {
      const quote = createMockQuote({ referenceNumber: 7, type: 'invoice', title: 'test' });
      const settings = createMockSettings({ invoicePrefix: 'INV-' });
      expect(buildPDFFilename(quote, settings)).toBe('INV-0007_test.pdf');
    });

    it('handles reference number above 9999', () => {
      const quote = createMockQuote({ referenceNumber: 12345, type: 'invoice', title: 'test' });
      const settings = createMockSettings({ invoicePrefix: 'INV-' });
      expect(buildPDFFilename(quote, settings)).toBe('INV-12345_test.pdf');
    });

    it('uses fallback prefix when settings prefix is empty', () => {
      const quote = createMockQuote({ type: 'estimate', title: 'test', referenceNumber: 1 });
      const settings = createMockSettings({ quotePrefix: undefined });
      expect(buildPDFFilename(quote, settings)).toBe('EST-0001_test.pdf');
    });
  });

  describe('buildPDFReference', () => {
    it('builds reference for estimate', () => {
      const quote = createMockQuote({ type: 'estimate', referenceNumber: 42 });
      const settings = createMockSettings({ quotePrefix: 'EST-' });
      expect(buildPDFReference(quote, settings)).toBe('EST-0042');
    });

    it('builds reference for invoice', () => {
      const quote = createMockQuote({ type: 'invoice', referenceNumber: 100 });
      const settings = createMockSettings({ invoicePrefix: 'INV-' });
      expect(buildPDFReference(quote, settings)).toBe('INV-0100');
    });

    it('builds reference for quotation using quote prefix', () => {
      const quote = createMockQuote({ type: 'quotation', referenceNumber: 3 });
      const settings = createMockSettings({ quotePrefix: 'QUO-' });
      expect(buildPDFReference(quote, settings)).toBe('QUO-0003');
    });
  });
});
