/**
 * InvoicePDFDocument.tsx - Main react-pdf document component
 * 
 * This component renders invoices/quotes as vector PDFs using @react-pdf/renderer.
 * It produces crisp, selectable text unlike the html2canvas rasterization approach.
 * 
 * IMPORTANT: This is a NEW implementation that runs parallel to the existing system.
 * The old html2canvas approach is kept as fallback.
 */

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

import type { Quote, Customer, AppSettings, QuoteDisplayOptions, QuoteSection } from '../../../types';
import {
  baseStyles,
  classicStyles,
  COLORS,
  getPDFColorScheme,
} from './InvoicePDFStyles';

// Props interface
export interface InvoicePDFDocumentProps {
  quote: Quote;
  customer: Customer;
  settings: AppSettings;
  totals: {
    clientSubtotal: number;
    taxAmount: number;
    cisAmount: number;
    discountAmount: number;
    grandTotal: number;
  };
  reference: string;
}

// Line item type for flattened items
interface LineItem {
  type: 'header' | 'item';
  lineNum: number;
  name: string;
  description: string;
  subtext?: string;
  qty: string;
  rate?: number;
  amount: number;
  isHeading?: boolean;
  isDescription?: boolean;
  itemType?: 'material' | 'labour';
}

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return `£${amount.toFixed(2)}`;
};

// Helper to check if logo is renderable
// Logo is now pre-rendered with html2canvas in invoicePdfExportV2.ts
const isRenderableLogo = (logoUrl?: string): boolean => {
  if (!logoUrl) return false;
  if (logoUrl.trim() === '') return false;
  return true;
};

// Helper to format date
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB');
};

/**
 * Get all line items flattened for rendering in a single table.
 * Respects displayOptions for filtering materials and labour.
 */
const getAllLineItems = (
  quote: Quote,
  settings: AppSettings,
  displayOptions: QuoteDisplayOptions
): LineItem[] => {
  const items: LineItem[] = [];
  const markupMultiplier = 1 + ((quote.markupPercent || 0) / 100);
  let lineNum = 1;

  const hasMaterialsToShow = displayOptions.showMaterials;
  const hasLabourToShow = displayOptions.showLabour;

  (quote.sections || []).forEach((section) => {
    // Determine if this section has visible content
    const sectionHasMaterials = hasMaterialsToShow && (section.items || []).length > 0;
    const sectionHasLabour = hasLabourToShow && (
      (section.labourItems && section.labourItems.length > 0) ||
      (section.labourHours || 0) > 0
    );

    // Only add section header if it has visible content
    if (sectionHasMaterials || sectionHasLabour) {
      // Add section title
      items.push({
        type: 'header',
        lineNum: 0,
        name: section.title || 'Work Section',
        description: section.title || 'Work Section',
        qty: '',
        amount: 0,
        isHeading: true,
        isDescription: false,
      });

      // Add section description if present
      if (section.description) {
        items.push({
          type: 'header',
          lineNum: 0,
          name: section.description,
          description: section.description,
          qty: '',
          amount: 0,
          isHeading: true,
          isDescription: true,
        });
      }
    }

    // Add materials (only if showMaterials is enabled)
    if (hasMaterialsToShow) {
      (section.items || []).forEach((item) => {
        if (item.isHeading) {
          items.push({
            type: 'item',
            lineNum: 0,
            name: item.name || 'Section',
            description: item.name || 'Section',
            qty: '',
            amount: 0,
            isHeading: true,
            itemType: 'material',
          });
        } else {
          const unitPrice = (item.unitPrice || 0) * markupMultiplier;
          items.push({
            type: 'item',
            lineNum: lineNum++,
            name: item.name || '',
            description: [item.name, item.description].filter(Boolean).join(' '),
            subtext: item.description || undefined,
            qty: `${item.quantity}`,
            rate: unitPrice,
            amount: (item.totalPrice || 0) * markupMultiplier,
            itemType: 'material',
          });
        }
      });
    }

    // Add labour items (only if showLabour is enabled)
    if (hasLabourToShow) {
      if (section.labourItems && section.labourItems.length > 0) {
        section.labourItems.forEach((labour) => {
          const rate = (labour.rate || section.labourRate || quote.labourRate || settings.defaultLabourRate) * markupMultiplier;
          items.push({
            type: 'item',
            lineNum: lineNum++,
            name: labour.description || 'Labour',
            description: labour.description || 'Labour',
            qty: `${labour.hours}`,
            rate: rate,
            amount: labour.hours * rate,
            itemType: 'labour',
          });
        });
      } else if ((section.labourHours || 0) > 0) {
        const rate = (section.labourRate || quote.labourRate || settings.defaultLabourRate) * markupMultiplier;
        items.push({
          type: 'item',
          lineNum: lineNum++,
          name: 'Labour',
          description: 'Labour',
          qty: `${section.labourHours}`,
          rate: rate,
          amount: (section.labourHours || 0) * rate,
          itemType: 'labour',
        });
      }
    }
  });

  return items;
};

/**
 * Classic Template
 */
const ClassicTemplate: React.FC<InvoicePDFDocumentProps> = ({
  quote,
  customer,
  settings,
  totals,
  reference,
}) => {
  const displayOptions = quote.displayOptions || settings.defaultDisplayOptions;
  const colorSchemeId = quote.type === 'invoice' ? settings.invoiceColorScheme : settings.quoteColorScheme;
  const colorScheme = getPDFColorScheme(colorSchemeId);
  const items = getAllLineItems(quote, settings, displayOptions);

  const showQtyColumn = (displayOptions.showMaterials && displayOptions.showMaterialQty) ||
    (displayOptions.showLabour && displayOptions.showLabourQty);
  const showRateColumn = (displayOptions.showMaterials && displayOptions.showMaterialUnitPrice) ||
    (displayOptions.showLabour && displayOptions.showLabourUnitPrice);
  const showAmountColumn = (displayOptions.showMaterials && displayOptions.showMaterialLineTotals) ||
    (displayOptions.showLabour && displayOptions.showLabourLineTotals);

  return (
    <Page size="A4" style={[baseStyles.page, { padding: 24, fontSize: 11 }]}>
      {/* Header */}
      <View style={[classicStyles.header, { borderBottomColor: colorScheme.headerBg }]}>
        <View style={classicStyles.companySection}>
          {displayOptions.showLogo && isRenderableLogo(settings.companyLogo) && (
            <Image src={settings.companyLogo} style={{ height: 35, marginBottom: 4 }} />
          )}
          <Text style={classicStyles.companyName}>{settings.companyName}</Text>
          <Text style={classicStyles.companyDetails}>
            {settings.companyAddress?.split('\n').join(' • ')}
          </Text>
          <Text style={classicStyles.companyDetails}>
            {[settings.phone, settings.email].filter(Boolean).join(' • ')}
          </Text>
          {settings.vatNumber && (
            <Text style={[classicStyles.companyDetails, { fontSize: 9 }]}>VAT: {settings.vatNumber}</Text>
          )}
        </View>
        <View style={classicStyles.invoiceSection}>
          <Text style={classicStyles.invoiceType}>
            {quote.type === 'invoice' ? 'Invoice' : 'Quote'}
          </Text>
          <Text style={classicStyles.invoiceRef}>{reference}</Text>
          <Text style={classicStyles.invoiceDate}>{formatDate(quote.date)}</Text>
        </View>
      </View>

      {/* Client + Project */}
      <View style={classicStyles.clientProjectRow}>
        <View style={classicStyles.clientSection}>
          <Text style={classicStyles.label}>Bill To</Text>
          <Text style={classicStyles.clientName}>{customer?.name}</Text>
          {customer?.company && <Text style={classicStyles.clientDetails}>{customer.company}</Text>}
          {customer?.address && <Text style={classicStyles.clientDetails}>{customer.address}</Text>}
        </View>
        <View style={classicStyles.projectSection}>
          <Text style={classicStyles.label}>Project</Text>
          <Text style={classicStyles.projectTitle}>{quote.title}</Text>
          {quote.jobAddress && (
            <>
              <Text style={[classicStyles.label, { marginTop: 3, color: '#d97706' }]}>Site Address</Text>
              <Text style={classicStyles.clientDetails}>{quote.jobAddress}</Text>
            </>
          )}
          {quote.dueDate && (
            <Text style={classicStyles.dueDate}>Due: {formatDate(quote.dueDate)}</Text>
          )}
        </View>
      </View>

      {/* Items Table */}
      <View style={classicStyles.table}>
        <View style={[classicStyles.tableHeader, { backgroundColor: colorScheme.headerBg }]}>
          <Text style={[classicStyles.colDesc, { color: colorScheme.headerText, fontWeight: 'bold', paddingLeft: 0 }]}>Description</Text>
          {showQtyColumn && <Text style={[classicStyles.colQty, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Qty</Text>}
          {showRateColumn && <Text style={[classicStyles.colRate, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Rate</Text>}
          {showAmountColumn && <Text style={[classicStyles.colAmount, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Amount</Text>}
        </View>

        {items.map((item, idx) => (
          item.type === 'header' ? (
            item.isDescription ? (
              /* Description row - WHITE background, clearly separate from title */
              <View key={`desc-${idx}`} style={{ 
                paddingHorizontal: 14, 
                paddingVertical: 6, 
                backgroundColor: COLORS.white,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.slate200,
                borderBottomStyle: 'solid',
              }}>
                <Text style={{ fontSize: 11, fontStyle: 'italic', color: COLORS.slate500, lineHeight: 1.4 }}>{item.description}</Text>
              </View>
            ) : (
              /* Section title - colored background */
              <View key={`header-${idx}`} style={[classicStyles.sectionHeader, { backgroundColor: colorScheme.headerBg, borderLeftColor: colorScheme.headerText }]}>
                <Text style={[classicStyles.sectionTitle, { color: colorScheme.headerText }]}>{item.description}</Text>
              </View>
            )
          ) : (
            <View key={`item-${idx}`} style={classicStyles.tableRow}>
              <Text style={classicStyles.colDesc}>{item.description}</Text>
              {showQtyColumn && <Text style={classicStyles.colQty}>{item.qty}</Text>}
              {showRateColumn && <Text style={classicStyles.colRate}>{item.rate ? formatCurrency(item.rate) : '-'}</Text>}
              {showAmountColumn && <Text style={classicStyles.colAmount}>{formatCurrency(item.amount)}</Text>}
            </View>
          )
        ))}
      </View>

      {/* Totals */}
      <View style={classicStyles.totalsContainer}>
        <View style={classicStyles.totalsBox}>
          <View style={classicStyles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(totals.clientSubtotal)}</Text>
          </View>
          {totals.discountAmount > 0 && (
            <View style={classicStyles.totalRow}>
              <Text>Discount</Text>
              <Text>-{formatCurrency(totals.discountAmount)}</Text>
            </View>
          )}
          {displayOptions.showVat && totals.taxAmount > 0 && (
            <View style={classicStyles.totalRow}>
              <Text>VAT ({quote.taxPercent}%)</Text>
              <Text>{formatCurrency(totals.taxAmount)}</Text>
            </View>
          )}
          {settings.enableCis && displayOptions.showCis && totals.cisAmount > 0 && (
            <View style={classicStyles.totalRow}>
              <Text>CIS Deduction</Text>
              <Text>-{formatCurrency(totals.cisAmount)}</Text>
            </View>
          )}
          <View style={[classicStyles.grandTotalRow, { borderTopColor: colorScheme.headerBg }]}>
            <Text>Total</Text>
            <Text>{formatCurrency(totals.grandTotal)}</Text>
          </View>
        </View>
      </View>

      {/* Bank Details */}
      {settings.bankAccountName && (
        <View style={classicStyles.bankDetails}>
          <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Payment Details</Text>
          <Text>
            {settings.bankAccountName} | {settings.bankAccountNumber} | {settings.bankSortCode}
            {settings.bankName && ` | ${settings.bankName}`}
          </Text>
        </View>
      )}

      {/* Notes */}
      {displayOptions.showNotes && (quote.notes || (quote.type === 'invoice' ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes)) && (
        <View style={classicStyles.notes}>
          <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Notes</Text>
          <Text>{quote.notes || (quote.type === 'invoice' ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes)}</Text>
        </View>
      )}
    </Page>
  );
};

/**
 * Main InvoicePDFDocument component
 */
export const InvoicePDFDocument: React.FC<InvoicePDFDocumentProps> = (props) => {
  return (
    <Document>
      <ClassicTemplate {...props} />
    </Document>
  );
};

export default InvoicePDFDocument;
