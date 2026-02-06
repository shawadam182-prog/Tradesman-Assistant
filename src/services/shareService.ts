import type { Quote, Customer, AppSettings, QuoteDisplayOptions, QuoteSection } from '../../types';
import type { QuoteTotals } from '../utils/quoteCalculations';
import { buildPDFReference } from './pdfService';

export interface EmailContent {
  subject: string;
  body: string;
  recipientEmail: string;
}

/**
 * Build a rich WhatsApp message with quote/invoice breakdown.
 */
export function buildWhatsAppMessage(
  quote: Quote,
  customer: Customer,
  settings: AppSettings,
  totals: QuoteTotals,
  displayOptions: QuoteDisplayOptions
): string {
  const reference = buildPDFReference(quote, settings);
  const docType = quote.type === 'invoice' ? 'Invoice' : 'Quote';

  // Build detailed breakdown
  let breakdown = '';
  if (quote.sections && quote.sections.length > 0) {
    breakdown += '\n📋 *Work Breakdown:*\n';
    quote.sections.forEach((section: QuoteSection, idx: number) => {
      const markupMultiplier = 1 + ((quote.markupPercent || 0) / 100);
      const rawMaterialsTotal = (section.items || []).reduce((s: number, i: { totalPrice?: number }) => s + (i.totalPrice || 0), 0);
      const rawLabourTotal = (section.labourHours || 0) * (quote.labourRate || settings.defaultLabourRate || 0);
      const sectionTotal = (rawMaterialsTotal + rawLabourTotal) * markupMultiplier;

      breakdown += `\n${idx + 1}. ${section.title}`;
      if (section.items && section.items.length > 0) {
        breakdown += `\n   • Materials: £${(rawMaterialsTotal * markupMultiplier).toFixed(2)}`;
      }
      if (section.labourHours && section.labourHours > 0) {
        breakdown += `\n   • Labour (${section.labourHours}hrs): £${(rawLabourTotal * markupMultiplier).toFixed(2)}`;
      }
      breakdown += `\n   *Section Total: £${sectionTotal.toFixed(2)}*`;
    });
  }

  // Build totals section
  let totalsBreakdown = '\n\n💰 *Financial Summary:*';
  totalsBreakdown += `\nSubtotal: £${totals.clientSubtotal.toFixed(2)}`;
  if (settings.enableVat && displayOptions.showVat && totals.taxAmount > 0) {
    totalsBreakdown += `\nVAT (${quote.taxPercent}%): £${totals.taxAmount.toFixed(2)}`;
  }
  if (settings.enableCis && displayOptions.showCis && totals.cisAmount > 0) {
    totalsBreakdown += `\nCIS Deduction: -£${totals.cisAmount.toFixed(2)}`;
  }
  totalsBreakdown += `\n\n*TOTAL DUE: £${totals.grandTotal.toFixed(2)}*`;

  // Add part payment info if enabled
  let partPaymentInfo = '';
  if (quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue) {
    const partAmount = quote.partPaymentType === 'percentage'
      ? totals.grandTotal * (quote.partPaymentValue / 100)
      : quote.partPaymentValue;

    partPaymentInfo = `\n\n💳 *${quote.partPaymentLabel || 'Amount Due Now'}:* £${partAmount.toFixed(2)}`;
    if (quote.partPaymentType === 'percentage') {
      partPaymentInfo += ` (${quote.partPaymentValue}%)`;
    }
    partPaymentInfo += `\n*Balance Remaining:* £${(totals.grandTotal - partAmount).toFixed(2)}`;
  }

  return `Hi ${customer?.name || 'there'},

${quote.type === 'invoice' ? '📄' : '📝'} Your ${docType} is ready!

*Reference:* ${reference}
*Project:* ${quote.title}
*Date:* ${quote?.date ? new Date(quote.date).toLocaleDateString('en-GB') : 'N/A'}
${breakdown}
${totalsBreakdown}${partPaymentInfo}

${quote.type === 'invoice'
      ? '⏰ *Payment Terms:* Due within 14 days\n\nPlease arrange payment at your earliest convenience.'
      : '✅ Please review and let me know if you have any questions or need any adjustments.\n\nI\'m happy to discuss the details.'}

${quote.notes ? `\n📌 *Additional Notes:*\n${quote.notes}\n` : ''}
---
${settings?.companyName || 'TradeSync'}
${settings?.phone ? `📞 ${settings.phone}` : ''}
${settings?.email ? `📧 ${settings.email}` : ''}`;
}

/**
 * Open WhatsApp with the pre-built message.
 */
export function openWhatsApp(message: string, phone?: string): void {
  const phoneNumber = phone?.replace(/\D/g, '') || '';
  const url = phoneNumber
    ? `https://wa.me/${phoneNumber.startsWith('44') ? phoneNumber : '44' + phoneNumber.replace(/^0/, '')}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/**
 * Build a concise SMS message (respects character limits).
 */
export function buildSmsMessage(
  quote: Quote,
  customer: Customer,
  settings: AppSettings,
  totals: QuoteTotals,
  shareUrl?: string
): string {
  const reference = buildPDFReference(quote, settings);
  const docType = quote.type === 'invoice' ? 'Invoice' : 'Quote';

  return `Hi ${customer?.name?.split(' ')[0] || 'there'}, your ${docType} (${reference}) for "${quote.title}" is ready. Total: £${totals.grandTotal.toFixed(2)}${shareUrl ? `\n\nView online: ${shareUrl}` : ''}\n\n- ${settings?.companyName || 'TradeSync'}`;
}

/**
 * Open the SMS app with a pre-filled message.
 */
export function openSms(message: string, phone?: string): void {
  const phoneNumber = phone?.replace(/\D/g, '') || '';
  const url = phoneNumber
    ? `sms:${phoneNumber}?body=${encodeURIComponent(message)}`
    : `sms:?body=${encodeURIComponent(message)}`;
  window.location.href = url;
}

/**
 * Build email content (subject + body) for a quote/invoice.
 */
export function buildEmailContent(
  quote: Quote,
  customer: Customer,
  settings: AppSettings,
  totals: QuoteTotals
): EmailContent {
  const reference = buildPDFReference(quote, settings);
  const docType = quote.type === 'invoice' ? 'invoice' : 'quote';
  const customerName = customer?.name || 'there';
  const customerEmail = customer?.email || '';

  let partPaymentLine = '';
  if (quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue) {
    const partAmount = quote.partPaymentType === 'percentage'
      ? totals.grandTotal * (quote.partPaymentValue / 100)
      : quote.partPaymentValue;
    partPaymentLine = `\n\n${quote.partPaymentLabel || 'Amount Due Now'}: £${partAmount.toFixed(2)}`;
  }

  const subject = `${docType.charAt(0).toUpperCase() + docType.slice(1)} - ${quote.title} (${reference})`;
  const body = `Dear ${customerName},

Please find attached ${docType} as discussed.${partPaymentLine}

Thanks,
${settings?.companyName || ''}${settings?.phone ? `\n${settings.phone}` : ''}${settings?.email ? `\n${settings.email}` : ''}`;

  return { subject, body, recipientEmail: customerEmail };
}

/**
 * Open Google Maps for a given address.
 */
export function openMaps(address: string): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  window.open(url, '_blank');
}
