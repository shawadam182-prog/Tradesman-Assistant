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
  professionalStyles,
  classicStyles,
  spaciousStyles,
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

// Helper to check if logo is renderable (not SVG, not broken)
// react-pdf doesn't render SVGs well in Image component
const isRenderableLogo = (logoUrl?: string): boolean => {
  if (!logoUrl) return false;
  
  // Skip SVG files - react-pdf Image component doesn't handle them well
  if (logoUrl.toLowerCase().includes('.svg')) return false;
  if (logoUrl.startsWith('data:image/svg')) return false;
  
  // Skip blob URLs that might be SVGs
  if (logoUrl.startsWith('blob:')) return false;
  
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
 * Professional Template (Zoho-style)
 */
const ProfessionalTemplate: React.FC<InvoicePDFDocumentProps> = ({
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

  // Determine which columns to show
  const showQtyColumn = (displayOptions.showMaterials && displayOptions.showMaterialQty) ||
    (displayOptions.showLabour && displayOptions.showLabourQty);
  const showRateColumn = (displayOptions.showMaterials && displayOptions.showMaterialUnitPrice) ||
    (displayOptions.showLabour && displayOptions.showLabourUnitPrice);
  const showAmountColumn = (displayOptions.showMaterials && displayOptions.showMaterialLineTotals) ||
    (displayOptions.showLabour && displayOptions.showLabourLineTotals);

  return (
    <Page size="A4" style={baseStyles.page}>
      {/* Header */}
      <View style={professionalStyles.header}>
        {/* Company Info */}
        <View style={professionalStyles.companyInfo}>
          {displayOptions.showLogo && isRenderableLogo(settings.companyLogo) && (
            <Image src={settings.companyLogo} style={[baseStyles.logo, { marginBottom: 8 }]} />
          )}
          <Text style={professionalStyles.companyName}>{settings.companyName}</Text>
          {settings.companyAddress && (
            <Text style={professionalStyles.companyDetails}>{settings.companyAddress}</Text>
          )}
          {settings.phone && <Text style={professionalStyles.companyDetails}>{settings.phone}</Text>}
          {settings.email && <Text style={professionalStyles.companyDetails}>{settings.email}</Text>}
          {settings.vatNumber && <Text style={professionalStyles.companyDetails}>VAT: {settings.vatNumber}</Text>}
        </View>

        {/* Invoice Header */}
        <View style={professionalStyles.invoiceHeader}>
          <Text style={professionalStyles.invoiceTitle}>
            {quote.type === 'invoice' ? 'INVOICE' : 'QUOTE'}
          </Text>
          <Text style={professionalStyles.invoiceRef}>
            {quote.type === 'invoice' ? 'Invoice' : 'Quote'}# {reference}
          </Text>
          <View style={professionalStyles.balanceDue}>
            <Text style={professionalStyles.balanceLabel}>Balance Due</Text>
            <Text style={professionalStyles.balanceAmount}>{formatCurrency(totals.grandTotal)}</Text>
          </View>
        </View>
      </View>

      {/* Bill To + Dates Row */}
      <View style={professionalStyles.billToRow}>
        <View style={professionalStyles.billToSection}>
          <Text style={professionalStyles.sectionLabel}>Bill To</Text>
          <Text style={professionalStyles.customerName}>{customer?.name}</Text>
          {customer?.company && <Text style={professionalStyles.customerDetails}>{customer.company}</Text>}
          {customer?.address && <Text style={professionalStyles.customerDetails}>{customer.address}</Text>}
        </View>
        <View style={professionalStyles.datesSection}>
          <View style={professionalStyles.dateRow}>
            <Text style={professionalStyles.dateLabel}>Invoice Date :</Text>
            <Text style={professionalStyles.dateValue}>{formatDate(quote.date)}</Text>
          </View>
          <View style={professionalStyles.dateRow}>
            <Text style={professionalStyles.dateLabel}>Terms :</Text>
            <Text style={professionalStyles.dateValue}>Due on Receipt</Text>
          </View>
          {quote.dueDate && (
            <View style={professionalStyles.dateRow}>
              <Text style={professionalStyles.dateLabel}>Due Date :</Text>
              <Text style={professionalStyles.dateValue}>{formatDate(quote.dueDate)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Line Items Table */}
      <View style={professionalStyles.table}>
        {/* Table Header */}
        <View style={[professionalStyles.tableHeader, { backgroundColor: colorScheme.headerBg }]}>
          <Text style={[professionalStyles.colNum, { color: colorScheme.headerText, fontWeight: 'bold' }]}>#</Text>
          <Text style={[professionalStyles.colDesc, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Item & Description</Text>
          {showQtyColumn && (
            <Text style={[professionalStyles.colQty, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Qty</Text>
          )}
          {showRateColumn && (
            <Text style={[professionalStyles.colRate, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Rate</Text>
          )}
          {showAmountColumn && (
            <Text style={[professionalStyles.colAmount, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Amount</Text>
          )}
        </View>

        {/* Table Body */}
        {items.map((item, idx) => (
          item.type === 'header' ? (
            item.isDescription ? (
              <View key={`desc-${idx}`} style={professionalStyles.sectionDesc}>
                <Text style={{ color: COLORS.slate500, fontStyle: 'italic' }}>{item.description}</Text>
              </View>
            ) : (
              <View key={`header-${idx}`} style={[professionalStyles.sectionHeader, { backgroundColor: colorScheme.accentBg }]}>
                <Text style={[professionalStyles.sectionTitle, { color: colorScheme.accentText }]}>{item.description}</Text>
              </View>
            )
          ) : item.isHeading ? (
            <View key={`heading-${idx}`} style={[professionalStyles.tableRow, { backgroundColor: COLORS.slate50 }]}>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: COLORS.slate500, textTransform: 'uppercase' }}>
                {item.description}
              </Text>
            </View>
          ) : (
            <View key={`item-${idx}`} style={professionalStyles.tableRow}>
              <Text style={professionalStyles.colNum}>{item.lineNum}</Text>
              <View style={professionalStyles.colDesc}>
                <Text style={professionalStyles.itemName}>{item.name}</Text>
                {item.subtext && <Text style={professionalStyles.itemDesc}>{item.subtext}</Text>}
              </View>
              {showQtyColumn && <Text style={professionalStyles.colQty}>{item.qty}</Text>}
              {showRateColumn && <Text style={professionalStyles.colRate}>{item.rate ? formatCurrency(item.rate) : '-'}</Text>}
              {showAmountColumn && <Text style={professionalStyles.colAmount}>{formatCurrency(item.amount)}</Text>}
            </View>
          )
        ))}
      </View>

      {/* Totals */}
      <View style={professionalStyles.totalsContainer}>
        <View style={professionalStyles.totalsBox}>
          <View style={professionalStyles.totalRow}>
            <Text style={professionalStyles.totalLabel}>Sub Total</Text>
            <Text style={professionalStyles.totalValue}>{formatCurrency(totals.clientSubtotal)}</Text>
          </View>
          {totals.discountAmount > 0 && (
            <View style={professionalStyles.totalRow}>
              <Text style={professionalStyles.totalLabel}>Discount</Text>
              <Text style={professionalStyles.totalValue}>-{formatCurrency(totals.discountAmount)}</Text>
            </View>
          )}
          {settings.enableVat && displayOptions.showVat && totals.taxAmount > 0 && (
            <View style={professionalStyles.totalRow}>
              <Text style={professionalStyles.totalLabel}>VAT ({quote.taxPercent}%)</Text>
              <Text style={professionalStyles.totalValue}>{formatCurrency(totals.taxAmount)}</Text>
            </View>
          )}
          {settings.enableCis && displayOptions.showCis && totals.cisAmount > 0 && (
            <View style={professionalStyles.totalRow}>
              <Text style={professionalStyles.totalLabel}>CIS Deduction</Text>
              <Text style={professionalStyles.totalValue}>-{formatCurrency(totals.cisAmount)}</Text>
            </View>
          )}
          <View style={[professionalStyles.grandTotalRow, { backgroundColor: colorScheme.accentBg }]}>
            <Text style={[professionalStyles.grandTotalLabel, { color: colorScheme.accentText }]}>Balance Due</Text>
            <Text style={[professionalStyles.grandTotalValue, { color: colorScheme.accentText }]}>{formatCurrency(totals.grandTotal)}</Text>
          </View>
        </View>

        {/* Part Payment */}
        {quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue && (
          <View style={[professionalStyles.partPaymentBox, { width: 180 }]}>
            <View style={professionalStyles.partPaymentRow}>
              <Text style={professionalStyles.partPaymentLabel}>
                {quote.partPaymentLabel || 'Due Now'}
              </Text>
              <Text style={professionalStyles.partPaymentValue}>
                {formatCurrency(
                  quote.partPaymentType === 'percentage'
                    ? totals.grandTotal * (quote.partPaymentValue / 100)
                    : quote.partPaymentValue
                )}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Bank Details */}
      {settings.bankAccountName && (
        <View style={professionalStyles.bankDetails}>
          <Text style={professionalStyles.bankTitle}>Payment Details</Text>
          <Text style={professionalStyles.bankText}>
            Account Name: {settings.bankAccountName}
          </Text>
          <Text style={professionalStyles.bankText}>
            Account Number: {settings.bankAccountNumber} | Sort Code: {settings.bankSortCode}
            {settings.bankName && ` | Bank: ${settings.bankName}`}
          </Text>
        </View>
      )}

      {/* Notes */}
      {displayOptions.showNotes && (quote.notes || (quote.type === 'invoice' ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes)) && (
        <View style={professionalStyles.notes}>
          <Text style={professionalStyles.notesTitle}>Notes</Text>
          <Text style={professionalStyles.notesText}>
            {quote.notes || (quote.type === 'invoice' ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes)}
          </Text>
        </View>
      )}

      {/* Footer Logos */}
      {displayOptions.showLogo && settings.footerLogos && settings.footerLogos.filter(isRenderableLogo).length > 0 && (
        <View style={professionalStyles.footerLogos}>
          {settings.footerLogos.filter(isRenderableLogo).map((logo, idx) => (
            <Image key={idx} src={logo} style={professionalStyles.footerLogo} />
          ))}
        </View>
      )}
    </Page>
  );
};

/**
 * Classic Template (compact)
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
    <Page size="A4" style={[baseStyles.page, { padding: 24, fontSize: 9 }]}>
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
            <Text style={[classicStyles.companyDetails, { fontSize: 7 }]}>VAT: {settings.vatNumber}</Text>
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
              <View key={`desc-${idx}`} style={{ paddingHorizontal: 12, paddingVertical: 2 }}>
                <Text style={{ fontSize: 8, fontStyle: 'italic', color: COLORS.slate500 }}>{item.description}</Text>
              </View>
            ) : (
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
          {settings.enableVat && displayOptions.showVat && totals.taxAmount > 0 && (
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
 * Spacious Template (larger text and spacing)
 */
const SpaciousTemplate: React.FC<InvoicePDFDocumentProps> = ({
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
    <Page size="A4" style={[baseStyles.page, spaciousStyles.page]}>
      {/* Header */}
      <View style={spaciousStyles.header}>
        <View style={spaciousStyles.companyInfo}>
          {displayOptions.showLogo && isRenderableLogo(settings.companyLogo) && (
            <Image src={settings.companyLogo} style={[baseStyles.logoLarge, { marginBottom: 12 }]} />
          )}
          <Text style={spaciousStyles.companyName}>{settings.companyName}</Text>
          {settings.companyAddress && (
            <Text style={spaciousStyles.companyDetails}>{settings.companyAddress}</Text>
          )}
          {settings.phone && <Text style={spaciousStyles.companyDetails}>{settings.phone}</Text>}
          {settings.email && <Text style={spaciousStyles.companyDetails}>{settings.email}</Text>}
          {settings.vatNumber && <Text style={spaciousStyles.companyDetails}>VAT: {settings.vatNumber}</Text>}
        </View>

        <View style={spaciousStyles.invoiceHeader}>
          <Text style={spaciousStyles.invoiceTitle}>
            {quote.type === 'invoice' ? 'INVOICE' : 'QUOTE'}
          </Text>
          <Text style={spaciousStyles.invoiceRef}>
            {quote.type === 'invoice' ? 'Invoice' : 'Quote'}# {reference}
          </Text>
          <Text style={spaciousStyles.balanceLabel}>Balance Due</Text>
          <Text style={spaciousStyles.balanceAmount}>{formatCurrency(totals.grandTotal)}</Text>
        </View>
      </View>

      {/* Bill To + Dates Row */}
      <View style={spaciousStyles.billToRow}>
        <View style={spaciousStyles.billToSection}>
          <Text style={spaciousStyles.sectionLabel}>Bill To</Text>
          <Text style={spaciousStyles.customerName}>{customer?.name}</Text>
          {customer?.company && <Text style={spaciousStyles.customerDetails}>{customer.company}</Text>}
          {customer?.address && <Text style={spaciousStyles.customerDetails}>{customer.address}</Text>}
        </View>
        <View style={spaciousStyles.datesSection}>
          <View style={spaciousStyles.dateRow}>
            <Text style={spaciousStyles.dateLabel}>Invoice Date :</Text>
            <Text style={spaciousStyles.dateValue}>{formatDate(quote.date)}</Text>
          </View>
          <View style={spaciousStyles.dateRow}>
            <Text style={spaciousStyles.dateLabel}>Terms :</Text>
            <Text style={spaciousStyles.dateValue}>Due on Receipt</Text>
          </View>
          {quote.dueDate && (
            <View style={spaciousStyles.dateRow}>
              <Text style={spaciousStyles.dateLabel}>Due Date :</Text>
              <Text style={spaciousStyles.dateValue}>{formatDate(quote.dueDate)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Line Items Table */}
      <View style={spaciousStyles.table}>
        <View style={[spaciousStyles.tableHeader, { backgroundColor: colorScheme.headerBg }]}>
          <Text style={[spaciousStyles.colNum, { color: colorScheme.headerText, fontWeight: 'bold' }]}>#</Text>
          <Text style={[spaciousStyles.colDesc, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Item & Description</Text>
          {showQtyColumn && (
            <Text style={[spaciousStyles.colQty, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Qty</Text>
          )}
          {showRateColumn && (
            <Text style={[spaciousStyles.colRate, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Rate</Text>
          )}
          {showAmountColumn && (
            <Text style={[spaciousStyles.colAmount, { color: colorScheme.headerText, fontWeight: 'bold' }]}>Amount</Text>
          )}
        </View>

        {items.map((item, idx) => (
          item.type === 'header' ? (
            item.isDescription ? (
              <View key={`desc-${idx}`} style={spaciousStyles.sectionDesc}>
                <Text style={{ color: COLORS.slate500, fontStyle: 'italic' }}>{item.description}</Text>
              </View>
            ) : (
              <View key={`header-${idx}`} style={[spaciousStyles.sectionHeader, { backgroundColor: colorScheme.accentBg }]}>
                <Text style={[spaciousStyles.sectionTitle, { color: colorScheme.accentText }]}>{item.description}</Text>
              </View>
            )
          ) : item.isHeading ? (
            <View key={`heading-${idx}`} style={[spaciousStyles.tableRow, { backgroundColor: COLORS.slate50 }]}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.slate500, textTransform: 'uppercase' }}>
                {item.description}
              </Text>
            </View>
          ) : (
            <View key={`item-${idx}`} style={spaciousStyles.tableRow}>
              <Text style={spaciousStyles.colNum}>{item.lineNum}</Text>
              <View style={spaciousStyles.colDesc}>
                <Text style={spaciousStyles.itemName}>{item.name}</Text>
                {item.subtext && <Text style={spaciousStyles.itemDesc}>{item.subtext}</Text>}
              </View>
              {showQtyColumn && <Text style={spaciousStyles.colQty}>{item.qty}</Text>}
              {showRateColumn && <Text style={spaciousStyles.colRate}>{item.rate ? formatCurrency(item.rate) : '-'}</Text>}
              {showAmountColumn && <Text style={spaciousStyles.colAmount}>{formatCurrency(item.amount)}</Text>}
            </View>
          )
        ))}
      </View>

      {/* Totals */}
      <View style={spaciousStyles.totalsContainer}>
        <View style={spaciousStyles.totalsBox}>
          <View style={spaciousStyles.totalRow}>
            <Text style={spaciousStyles.totalLabel}>Sub Total</Text>
            <Text style={spaciousStyles.totalValue}>{formatCurrency(totals.clientSubtotal)}</Text>
          </View>
          {totals.discountAmount > 0 && (
            <View style={spaciousStyles.totalRow}>
              <Text style={spaciousStyles.totalLabel}>Discount</Text>
              <Text style={spaciousStyles.totalValue}>-{formatCurrency(totals.discountAmount)}</Text>
            </View>
          )}
          {settings.enableVat && displayOptions.showVat && totals.taxAmount > 0 && (
            <View style={spaciousStyles.totalRow}>
              <Text style={spaciousStyles.totalLabel}>VAT ({quote.taxPercent}%)</Text>
              <Text style={spaciousStyles.totalValue}>{formatCurrency(totals.taxAmount)}</Text>
            </View>
          )}
          {settings.enableCis && displayOptions.showCis && totals.cisAmount > 0 && (
            <View style={spaciousStyles.totalRow}>
              <Text style={spaciousStyles.totalLabel}>CIS Deduction</Text>
              <Text style={spaciousStyles.totalValue}>-{formatCurrency(totals.cisAmount)}</Text>
            </View>
          )}
          <View style={[spaciousStyles.grandTotalRow, { backgroundColor: colorScheme.accentBg }]}>
            <Text style={[spaciousStyles.grandTotalLabel, { color: colorScheme.accentText }]}>Balance Due</Text>
            <Text style={[spaciousStyles.grandTotalValue, { color: colorScheme.accentText }]}>{formatCurrency(totals.grandTotal)}</Text>
          </View>
        </View>
      </View>

      {/* Bank Details */}
      {settings.bankAccountName && (
        <View style={spaciousStyles.bankDetails}>
          <Text style={spaciousStyles.bankTitle}>Payment Details</Text>
          <Text style={spaciousStyles.bankText}>
            Account Name: {settings.bankAccountName}
          </Text>
          <Text style={spaciousStyles.bankText}>
            Account Number: {settings.bankAccountNumber} | Sort Code: {settings.bankSortCode}
            {settings.bankName && ` | Bank: ${settings.bankName}`}
          </Text>
        </View>
      )}

      {/* Notes */}
      {displayOptions.showNotes && (quote.notes || (quote.type === 'invoice' ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes)) && (
        <View style={spaciousStyles.notes}>
          <Text style={spaciousStyles.notesTitle}>Notes</Text>
          <Text style={spaciousStyles.notesText}>
            {quote.notes || (quote.type === 'invoice' ? settings.defaultInvoiceNotes : settings.defaultQuoteNotes)}
          </Text>
        </View>
      )}
    </Page>
  );
};

/**
 * Main InvoicePDFDocument component
 * Selects the appropriate template based on settings
 */
export const InvoicePDFDocument: React.FC<InvoicePDFDocumentProps> = (props) => {
  const templateId = props.settings.documentTemplate || 'professional';

  return (
    <Document>
      {templateId === 'classic' ? (
        <ClassicTemplate {...props} />
      ) : templateId === 'spacious' ? (
        <SpaciousTemplate {...props} />
      ) : (
        <ProfessionalTemplate {...props} />
      )}
    </Document>
  );
};

export default InvoicePDFDocument;
