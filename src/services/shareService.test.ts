import {
  buildWhatsAppMessage,
  buildSmsMessage,
  buildEmailContent,
} from './shareService';
import {
  createMockQuote,
  createMockCustomer,
  createMockSettings,
  createMockQuoteSection,
  createMockMaterialItem,
  defaultDisplayOptions,
} from '../test/factories';
import type { QuoteTotals } from '../utils/quoteCalculations';

function createMockTotals(overrides: Partial<QuoteTotals> = {}): QuoteTotals {
  return {
    rawSubtotal: 1000,
    clientSubtotal: 1000,
    discountAmount: 0,
    taxableAmount: 1000,
    taxAmount: 200,
    cisAmount: 0,
    grandTotal: 1200,
    ...overrides,
  };
}

describe('shareService', () => {
  describe('buildWhatsAppMessage', () => {
    it('includes customer name and document type', () => {
      const quote = createMockQuote({ title: 'Kitchen', type: 'quotation' });
      const customer = createMockCustomer({ name: 'Jane Doe' });
      const settings = createMockSettings();
      const totals = createMockTotals();

      const msg = buildWhatsAppMessage(quote, customer, settings, totals, defaultDisplayOptions);

      expect(msg).toContain('Hi Jane Doe');
      expect(msg).toContain('Your Quote is ready!');
    });

    it('includes reference and project title', () => {
      const quote = createMockQuote({ title: 'Bathroom Refit', referenceNumber: 5, type: 'estimate' });
      const customer = createMockCustomer();
      const settings = createMockSettings({ quotePrefix: 'EST-' });
      const totals = createMockTotals();

      const msg = buildWhatsAppMessage(quote, customer, settings, totals, defaultDisplayOptions);

      expect(msg).toContain('EST-0005');
      expect(msg).toContain('Bathroom Refit');
    });

    it('includes section breakdown when sections exist', () => {
      const section = createMockQuoteSection({
        title: 'Plumbing',
        items: [createMockMaterialItem({ totalPrice: 500 })],
        labourHours: 8,
      });
      const quote = createMockQuote({ sections: [section], labourRate: 50 });
      const customer = createMockCustomer();
      const settings = createMockSettings();
      const totals = createMockTotals();

      const msg = buildWhatsAppMessage(quote, customer, settings, totals, defaultDisplayOptions);

      expect(msg).toContain('Plumbing');
      expect(msg).toContain('Materials:');
      expect(msg).toContain('Labour (8hrs)');
    });

    it('shows part payment info for invoices', () => {
      const quote = createMockQuote({
        type: 'invoice',
        partPaymentEnabled: true,
        partPaymentType: 'percentage',
        partPaymentValue: 30,
        partPaymentLabel: 'Deposit',
      });
      const customer = createMockCustomer();
      const settings = createMockSettings();
      const totals = createMockTotals({ grandTotal: 1000 });

      const msg = buildWhatsAppMessage(quote, customer, settings, totals, defaultDisplayOptions);

      expect(msg).toContain('Deposit');
      expect(msg).toContain('£300.00');
    });

    it('includes company contact in footer', () => {
      const quote = createMockQuote();
      const customer = createMockCustomer();
      const settings = createMockSettings({ companyName: 'Smith Plumbing', phone: '07700 123456', email: 'info@smith.co.uk' });
      const totals = createMockTotals();

      const msg = buildWhatsAppMessage(quote, customer, settings, totals, defaultDisplayOptions);

      expect(msg).toContain('Smith Plumbing');
      expect(msg).toContain('07700 123456');
      expect(msg).toContain('info@smith.co.uk');
    });
  });

  describe('buildSmsMessage', () => {
    it('includes customer first name and total', () => {
      const quote = createMockQuote({ title: 'Kitchen', type: 'estimate', referenceNumber: 1 });
      const customer = createMockCustomer({ name: 'John Smith' });
      const settings = createMockSettings({ quotePrefix: 'EST-' });
      const totals = createMockTotals({ grandTotal: 1500 });

      const msg = buildSmsMessage(quote, customer, settings, totals);

      expect(msg).toContain('Hi John');
      expect(msg).toContain('£1500.00');
      expect(msg).toContain('EST-0001');
    });

    it('includes share URL when provided', () => {
      const quote = createMockQuote();
      const customer = createMockCustomer();
      const settings = createMockSettings();
      const totals = createMockTotals();

      const msg = buildSmsMessage(quote, customer, settings, totals, 'https://app.tradesync.co.uk/q/abc123');

      expect(msg).toContain('View online: https://app.tradesync.co.uk/q/abc123');
    });

    it('omits share URL when not provided', () => {
      const quote = createMockQuote();
      const customer = createMockCustomer();
      const settings = createMockSettings();
      const totals = createMockTotals();

      const msg = buildSmsMessage(quote, customer, settings, totals);

      expect(msg).not.toContain('View online');
    });
  });

  describe('buildEmailContent', () => {
    it('returns subject with document type and reference', () => {
      const quote = createMockQuote({ title: 'Loft Conversion', referenceNumber: 12, type: 'quotation' });
      const customer = createMockCustomer();
      const settings = createMockSettings({ quotePrefix: 'QUO-' });
      const totals = createMockTotals();

      const email = buildEmailContent(quote, customer, settings, totals);

      expect(email.subject).toBe('Quote - Loft Conversion (QUO-0012)');
    });

    it('returns invoice subject for invoices', () => {
      const quote = createMockQuote({ title: 'Boiler Install', referenceNumber: 3, type: 'invoice' });
      const customer = createMockCustomer();
      const settings = createMockSettings({ invoicePrefix: 'INV-' });
      const totals = createMockTotals();

      const email = buildEmailContent(quote, customer, settings, totals);

      expect(email.subject).toBe('Invoice - Boiler Install (INV-0003)');
    });

    it('includes customer name in body', () => {
      const quote = createMockQuote();
      const customer = createMockCustomer({ name: 'Sarah Connor' });
      const settings = createMockSettings();
      const totals = createMockTotals();

      const email = buildEmailContent(quote, customer, settings, totals);

      expect(email.body).toContain('Dear Sarah Connor');
    });

    it('includes part payment line for invoices with deposits', () => {
      const quote = createMockQuote({
        type: 'invoice',
        partPaymentEnabled: true,
        partPaymentType: 'fixed',
        partPaymentValue: 500,
        partPaymentLabel: 'Deposit Required',
      });
      const customer = createMockCustomer();
      const settings = createMockSettings();
      const totals = createMockTotals({ grandTotal: 2000 });

      const email = buildEmailContent(quote, customer, settings, totals);

      expect(email.body).toContain('Deposit Required: £500.00');
    });

    it('returns customer email as recipientEmail', () => {
      const quote = createMockQuote();
      const customer = createMockCustomer({ email: 'customer@test.com' });
      const settings = createMockSettings();
      const totals = createMockTotals();

      const email = buildEmailContent(quote, customer, settings, totals);

      expect(email.recipientEmail).toBe('customer@test.com');
    });

    it('includes company contact details in body', () => {
      const quote = createMockQuote();
      const customer = createMockCustomer();
      const settings = createMockSettings({ companyName: 'Acme Builders', phone: '020 1234 5678' });
      const totals = createMockTotals();

      const email = buildEmailContent(quote, customer, settings, totals);

      expect(email.body).toContain('Acme Builders');
      expect(email.body).toContain('020 1234 5678');
    });
  });
});
