
import React from 'react';
import { Package, HardHat, Landmark, User, MapPin, Tag, Type } from 'lucide-react';
import { Quote, Customer, AppSettings, QuoteDisplayOptions, QuoteSection } from '../../types';
import { QuoteTotals, calculateSectionLabour } from '../../src/utils/quoteCalculations';
import { getTemplateConfig, getTableHeaderStyle, getColorScheme } from '../../src/lib/invoiceTemplates';
import { ClassicTemplate } from '../invoice-templates';

interface QuoteDocumentProps {
  quote: Quote;
  customer: Customer;
  settings: AppSettings;
  totals: QuoteTotals;
  displayOptions: QuoteDisplayOptions;
  reference: string;
  partPaymentAmount: number;
  documentRef: React.RefObject<HTMLDivElement | null>;
}

export const QuoteDocument: React.FC<QuoteDocumentProps> = ({
  quote,
  customer,
  settings,
  totals,
  displayOptions,
  reference,
  partPaymentAmount,
  documentRef,
}) => {
  // Template configuration
  const templateConfig = getTemplateConfig(settings.documentTemplate);
  const colorSchemeToUse = quote.type === 'invoice' ? settings.invoiceColorScheme : settings.quoteColorScheme;
  const tableHeaderStyle = getTableHeaderStyle(templateConfig, colorSchemeToUse);
  const colorScheme = getColorScheme(colorSchemeToUse || templateConfig.defaultColorScheme);

  const activeTemplate = settings.documentTemplate || 'professional';

  const costBoxThemes = {
    slate: 'bg-slate-900 text-white',
    amber: 'bg-amber-500 text-slate-950',
    blue: 'bg-blue-600 text-white'
  };

  const currentThemeClass = costBoxThemes[settings.costBoxColor || 'slate'];

  // Create templateStyle for backwards compatibility with existing rendering
  const templateStyle = {
    container: templateConfig.borderRadius,
    header: templateConfig.headerPadding,
    titleBar: `border-y border-slate-200 ${templateConfig.showBackgrounds ? 'bg-slate-50' : 'bg-white'} px-2 py-1`,
    clientSection: `px-2 py-1 ${templateConfig.showBackgrounds ? 'bg-slate-50' : ''}`,
    sectionPadding: templateConfig.containerPadding,
    sectionSpacing: templateConfig.sectionGap,
    sectionTitle: `${templateConfig.fontSize} font-bold text-slate-900 uppercase tracking-wide`,
    materialHeader: templateConfig.sectionHeaderStyle || 'flex items-center gap-1.5 border-b border-slate-100 pb-1',
    tableText: templateConfig.fontSize,
    footerRounding: templateConfig.borderRadius === 'rounded-none' ? '' : 'rounded-b-xl',
    borderStyle: 'border-slate-200'
  };

  // Helper function to calculate section labour
  const getSectionLabour = (section: QuoteSection) => {
    return calculateSectionLabour(section, quote.labourRate, settings.defaultLabourRate);
  };

  // Helper to flatten all items (materials + labour) into a single table
  // Respects displayOptions for filtering materials and labour
  const getAllLineItems = () => {
    const items: Array<{
      type?: 'header' | 'item';
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
    }> = [];

    const markupMultiplier = 1 + ((quote.markupPercent || 0) / 100);
    let lineNum = 1;

    // Check if we have ANY content to show in this section
    const hasMaterialsToShow = displayOptions.showMaterials;
    const hasLabourToShow = displayOptions.showLabour;

    (quote.sections || []).forEach(section => {
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
      let sectionMaterialsTotal = 0;
      if (hasMaterialsToShow) {
        // Calculate total regardless of whether we show items
        (section.items || []).forEach(item => {
          if (!item.isHeading) {
            sectionMaterialsTotal += (item.totalPrice || 0) * markupMultiplier;
          }
        });

        // Only add individual line items if showMaterialItems is true
        if (displayOptions.showMaterialItems) {
          (section.items || []).forEach(item => {
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
              const lineTotal = (item.totalPrice || 0) * markupMultiplier;
              items.push({
                type: 'item',
                lineNum: lineNum++,
                name: item.name || '',
                description: [item.name, item.description].filter(Boolean).join(' '),
                subtext: item.description || undefined,
                qty: `${item.quantity}`,
                rate: unitPrice,
                amount: lineTotal,
                itemType: 'material',
              });
            }
          });
        }

        // Add Materials Total row if enabled and has materials
        if (displayOptions.showMaterialSectionTotal && sectionMaterialsTotal > 0) {
          items.push({
            type: 'item',
            lineNum: 0,
            name: 'Materials Total',
            description: 'Materials Total',
            qty: '',
            amount: sectionMaterialsTotal,
            isHeading: false,
            itemType: 'material',
            isSubtotal: true,
          } as any);
        }
      }

      // Add labour items (only if showLabour is enabled)
      let sectionLabourTotal = 0;
      if (hasLabourToShow) {
        // Calculate total regardless of whether we show items
        if (section.labourItems && section.labourItems.length > 0) {
          section.labourItems.forEach(labour => {
            const rate = (labour.rate || section.labourRate || quote.labourRate || settings.defaultLabourRate) * markupMultiplier;
            sectionLabourTotal += labour.hours * rate;
          });
        } else if ((section.labourHours || 0) > 0) {
          const rate = (section.labourRate || quote.labourRate || settings.defaultLabourRate) * markupMultiplier;
          sectionLabourTotal += (section.labourHours || 0) * rate;
        }

        // Only add individual line items if showLabourItems is true
        if (displayOptions.showLabourItems) {
          if (section.labourItems && section.labourItems.length > 0) {
            section.labourItems.forEach(labour => {
              const rate = (labour.rate || section.labourRate || quote.labourRate || settings.defaultLabourRate) * markupMultiplier;
              const lineTotal = labour.hours * rate;
              items.push({
                type: 'item',
                lineNum: lineNum++,
                name: labour.description || 'Labour',
                description: labour.description || 'Labour',
                qty: `${labour.hours}`,
                rate: rate,
                amount: lineTotal,
                itemType: 'labour',
              });
            });
          } else if ((section.labourHours || 0) > 0) {
            const rate = (section.labourRate || quote.labourRate || settings.defaultLabourRate) * markupMultiplier;
            const lineTotal = (section.labourHours || 0) * rate;
            items.push({
              type: 'item',
              lineNum: lineNum++,
              name: 'Labour',
              description: 'Labour',
              qty: `${section.labourHours}`,
              rate: rate,
              amount: lineTotal,
              itemType: 'labour',
            });
          }
        }

        // Add Labour Total row if enabled and has labour
        if (displayOptions.showLabourSectionTotal && sectionLabourTotal > 0) {
          items.push({
            type: 'item',
            lineNum: 0,
            name: 'Labour Total',
            description: 'Labour Total',
            qty: '',
            amount: sectionLabourTotal,
            isHeading: false,
            itemType: 'labour',
            isSubtotal: true,
          } as any);
        }
      }
    });

    return items;
  };

  return (
    <>
      {/* Responsive document preview wrapper - scales 750px doc to fit mobile viewports */}
      <div className="w-full overflow-hidden md:overflow-visible print:overflow-visible" ref={(el) => {
        if (!el) return;
        const updateScale = () => {
          const docEl = el.querySelector('[data-document]') as HTMLElement;
          if (!docEl) return;
          const containerWidth = el.clientWidth;
          if (containerWidth < 750) {
            const scale = containerWidth / 750;
            docEl.style.transform = `scale(${scale})`;
            docEl.style.transformOrigin = 'top left';
            el.style.height = `${docEl.scrollHeight * scale}px`;
          } else {
            docEl.style.transform = '';
            docEl.style.transformOrigin = '';
            el.style.height = '';
          }
        };
        // Run on mount and on resize
        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(el);
        // Cleanup on unmount via MutationObserver trick isn't clean here,
        // but ResizeObserver will be GC'd when element is removed
      }}>
        <div data-document ref={documentRef} className={`bg-white ${templateStyle.container} shadow-xl border ${templateStyle.borderStyle} overflow-hidden print:border-none print:shadow-none print:rounded-none print:!transform-none mx-auto`} style={{ width: '750px' }}>
          {/* Use ClassicTemplate component for classic template */}
          {activeTemplate === 'classic' ? (
            <ClassicTemplate
              quote={quote}
              customer={customer}
              settings={settings}
              totals={totals}
              reference={reference}
              displayOptions={displayOptions}
            />
          ) : (
            <>
              {/* Company Header - Statement template has special Zoho-style layout */}
              {activeTemplate === 'professional' ? (
                /* PROFESSIONAL TEMPLATE HEADER - Matches Zoho screenshot */
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    {/* Left: Logo + Company */}
                    <div className="flex-1">
                      {displayOptions.showLogo && settings.companyLogo && (
                        <img src={settings.companyLogo} alt={settings.companyName || 'Logo'} className="h-16 w-auto object-contain mb-2" style={{ maxWidth: '120px' }} />
                      )}
                      <h2 className="text-sm font-bold text-slate-900">{settings.companyName}</h2>
                      {settings.companyAddress && (
                        <p className="text-[10px] text-slate-600 leading-snug whitespace-pre-line mt-0.5">{settings.companyAddress}</p>
                      )}
                      {settings.phone && <p className="text-[10px] text-slate-600 mt-0.5">{settings.phone}</p>}
                      {settings.email && <p className="text-[10px] text-slate-600">{settings.email}</p>}
                      {settings.vatNumber && <p className="text-[10px] text-slate-600">{settings.vatNumber}</p>}
                    </div>

                    {/* Right: INVOICE header + Balance */}
                    <div className="text-right">
                      <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        {quote.type === 'invoice' ? 'INVOICE' : 'QUOTE'}
                      </h1>
                      <p className="text-[10px] text-slate-600 font-semibold">{quote.type === 'invoice' ? 'Invoice' : 'Quote'}# {reference}</p>
                      <div className="mt-2">
                        <div className="text-[10px] text-slate-600 font-semibold">Balance Due</div>
                        <div className="text-xl font-bold text-slate-900">£{totals.grandTotal.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bill To + Dates Row */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-[10px] font-bold text-slate-900 mb-1">Bill To</div>
                      <p className="text-sm font-bold text-slate-900">{customer?.name}</p>
                      {customer?.company && <p className="text-[10px] text-slate-600">{customer.company}</p>}
                      {customer?.address && <p className="text-[10px] text-slate-600 leading-snug">{customer.address}</p>}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">Invoice Date :</span>
                        <span className="text-slate-900 font-medium">{quote?.date ? new Date(quote.date).toLocaleDateString('en-GB') : ''}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-600">Terms :</span>
                        <span className="text-slate-900 font-medium">Due on Receipt</span>
                      </div>
                      {quote.dueDate && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-600">Due Date :</span>
                          <span className="text-slate-900 font-medium">{new Date(quote.dueDate).toLocaleDateString('en-GB')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeTemplate === 'spacious' ? (
                /* SPACIOUS TEMPLATE HEADER - Like professional but with larger text */
                <div className={templateConfig.containerPadding}>
                  <div className={`flex justify-between items-start ${templateConfig.sectionGap.replace('space-y-', 'mb-')}`}>
                    {/* Left: Logo + Company */}
                    <div className="flex-1">
                      {displayOptions.showLogo && settings.companyLogo && (
                        <img src={settings.companyLogo} alt={settings.companyName || 'Logo'} className="h-20 w-auto object-contain mb-2" style={{ maxWidth: '160px' }} />
                      )}
                      <h2 className={`${templateConfig.headerFontSize} font-bold text-slate-900`}>{settings.companyName}</h2>
                      {settings.companyAddress && (
                        <p className={`${templateConfig.fontSize} text-slate-600 leading-snug whitespace-pre-line mt-0.5`}>{settings.companyAddress}</p>
                      )}
                      {settings.phone && <p className={`${templateConfig.fontSize} text-slate-600 mt-0.5`}>{settings.phone}</p>}
                      {settings.email && <p className={`${templateConfig.fontSize} text-slate-600`}>{settings.email}</p>}
                      {settings.vatNumber && <p className={`${templateConfig.fontSize} text-slate-600`}>{settings.vatNumber}</p>}
                    </div>

                    {/* Right: INVOICE header + Balance */}
                    <div className="text-right">
                      <h1 className="text-3xl font-bold text-slate-900 mb-1">
                        {quote.type === 'invoice' ? 'INVOICE' : 'QUOTE'}
                      </h1>
                      <p className={`${templateConfig.fontSize} text-slate-600 font-semibold`}>{quote.type === 'invoice' ? 'Invoice' : 'Quote'}# {reference}</p>
                      <div className="mt-2">
                        <div className={`${templateConfig.fontSize} text-slate-600 font-semibold`}>Balance Due</div>
                        <div className="text-2xl font-bold text-slate-900">£{totals.grandTotal.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bill To + Dates Row */}
                  <div className={`grid grid-cols-2 gap-4 ${templateConfig.sectionGap.replace('space-y-', 'mb-')}`}>
                    <div>
                      <div className={`${templateConfig.fontSize} font-bold text-slate-900 mb-1`}>Bill To</div>
                      <p className={`${templateConfig.headerFontSize} font-bold text-slate-900`}>{customer?.name}</p>
                      {customer?.company && <p className={`${templateConfig.fontSize} text-slate-600`}>{customer.company}</p>}
                      {customer?.address && <p className={`${templateConfig.fontSize} text-slate-600 leading-snug`}>{customer.address}</p>}
                    </div>
                    <div className="space-y-0.5">
                      <div className={`flex justify-between ${templateConfig.fontSize}`}>
                        <span className="text-slate-600">Invoice Date :</span>
                        <span className="text-slate-900 font-medium">{quote?.date ? new Date(quote.date).toLocaleDateString('en-GB') : ''}</span>
                      </div>
                      <div className={`flex justify-between ${templateConfig.fontSize}`}>
                        <span className="text-slate-600">Terms :</span>
                        <span className="text-slate-900 font-medium">Due on Receipt</span>
                      </div>
                      {quote.dueDate && (
                        <div className={`flex justify-between ${templateConfig.fontSize}`}>
                          <span className="text-slate-600">Due Date :</span>
                          <span className="text-slate-900 font-medium">{new Date(quote.dueDate).toLocaleDateString('en-GB')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* STANDARD HEADER - All other templates */
                <>
                  <div className={`${templateStyle.header} flex justify-between items-start`}>
                    {/* Logo & Company Info */}
                    <div className="flex items-start gap-2">
                      {displayOptions.showLogo && settings.companyLogo && (
                        <img
                          src={settings.companyLogo}
                          alt={settings.companyName || 'Company Logo'}
                          className="h-12 w-auto object-contain"
                          style={{ maxWidth: '120px' }}
                        />
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{settings.companyName}</h2>
                        {settings.companyAddress && (
                          <p className="text-[11px] text-slate-500 leading-tight whitespace-pre-line">{settings.companyAddress}</p>
                        )}
                        <div className="flex gap-2 mt-1 text-[11px] text-slate-400">
                          {settings.phone && <span>{settings.phone}</span>}
                          {settings.email && <span>{settings.email}</span>}
                        </div>
                        {settings.vatNumber && (
                          <p className="text-[10px] text-slate-400">VAT: {settings.vatNumber}</p>
                        )}
                      </div>
                    </div>

                    {/* Document Type Badge */}
                    <div className="text-right">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${quote.isCreditNote ? 'text-red-500' : 'text-slate-400'}`}>
                        {quote.isCreditNote ? 'Credit Note' : quote.type === 'invoice' ? 'Invoice' : quote.type === 'quotation' ? 'Quotation' : 'Estimate'}
                      </span>
                      <p className={`text-base font-mono font-bold ${quote.isCreditNote ? 'text-red-700' : 'text-slate-900'}`}>{reference}</p>
                      <p className="text-[11px] text-slate-500">{quote?.date ? new Date(quote.date).toLocaleDateString('en-GB') : ''}</p>
                      {quote.type === 'invoice' && quote.dueDate && !quote.isCreditNote && (
                        <p className="text-[11px] text-amber-600 font-bold">
                          Due: {new Date(quote.dueDate).toLocaleDateString('en-GB')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Project Title Bar */}
                  <div className={templateStyle.titleBar}>
                    <h1 className={templateStyle.sectionTitle}>{quote?.title || 'Proposed Works'}</h1>
                  </div>

                  {/* Client and Job Address Section */}
                  <div className={templateStyle.clientSection}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {/* To: Client Address */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <User size={9} /> To
                        </p>
                        <p className="text-sm font-bold text-slate-900">{customer?.name}</p>
                        {customer?.company && <p className="text-[11px] text-slate-600">{customer.company}</p>}
                        {customer?.address && (
                          <p className="text-[11px] text-slate-500 leading-snug">{customer.address}</p>
                        )}
                      </div>

                      {/* For: Job Address (only show if different from client) */}
                      {quote.jobAddress && quote.jobAddress !== customer?.address && (
                        <div>
                          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                            <MapPin size={9} /> Job Site
                          </p>
                          <p className="text-[11px] text-slate-500 leading-snug">{quote.jobAddress}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* COMBINED LINE ITEMS TABLE - For templates that combine materials + labour */}
              {templateConfig.combineLineItems ? (
                <div className="px-4 pb-2">
                  {/* Determine which columns to show based on displayOptions */}
                  {(() => {
                    const showQtyColumn = (displayOptions.showMaterials && displayOptions.showMaterialQty) ||
                      (displayOptions.showLabour && displayOptions.showLabourQty);
                    const showRateColumn = (displayOptions.showMaterials && displayOptions.showMaterialUnitPrice) ||
                      (displayOptions.showLabour && displayOptions.showLabourUnitPrice);
                    const showAmountColumn = (displayOptions.showMaterials && displayOptions.showMaterialLineTotals) ||
                      (displayOptions.showLabour && displayOptions.showLabourLineTotals) ||
                      displayOptions.showWorkSectionTotal;
                    const colSpan = 1 + (templateConfig.showLineNumbers ? 1 : 0) + (showQtyColumn ? 1 : 0) + (showRateColumn ? 1 : 0) + (showAmountColumn ? 1 : 0);

                    return (
                      <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
                        {templateConfig.showColumnHeaders && (
                          <thead>
                            <tr className={tableHeaderStyle}>
                              {templateConfig.showLineNumbers && (
                                <th className="py-2 px-2 text-left w-10 text-[10px] font-semibold">#</th>
                              )}
                              <th className="py-2 px-2 text-left text-[10px] font-semibold">Item & Description</th>
                              {showQtyColumn && (
                                <th className="py-2 px-2 text-center w-16 text-[10px] font-semibold">Qty</th>
                              )}
                              {showRateColumn && (activeTemplate === 'professional' || activeTemplate === 'spacious') && (
                                <th className="py-2 px-2 text-right w-24 text-[10px] font-semibold">Rate</th>
                              )}
                              {showAmountColumn && (
                                <th className="py-2 px-2 text-right w-24 text-[10px] font-semibold">Amount</th>
                              )}
                            </tr>
                          </thead>
                        )}

                        <tbody>
                          {getAllLineItems().map((item, idx) => (
                            (item as any).isSubtotal ? (
                              // Section subtotal row (Materials Total / Labour Total)
                              <tr key={`subtotal-${idx}`} className="bg-slate-50 border-t border-slate-200">
                                {templateConfig.showLineNumbers && <td className="py-1.5 px-2"></td>}
                                <td className="py-1.5 px-2">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${item.itemType === 'labour' ? 'text-blue-600' : 'text-amber-600'}`}>
                                    {item.description}
                                  </span>
                                </td>
                                {showQtyColumn && <td className="py-1.5 px-2"></td>}
                                {showRateColumn && (activeTemplate === 'professional' || activeTemplate === 'spacious') && <td className="py-1.5 px-2"></td>}
                                {showAmountColumn && (
                                  <td className={`py-1.5 px-2 text-right font-bold text-[11px] ${item.itemType === 'labour' ? 'text-blue-600' : 'text-amber-600'}`}>
                                    £{item.amount.toFixed(2)}
                                  </td>
                                )}
                              </tr>
                            ) : item.type === 'header' ? (
                              // Section Title or Section Description
                              <tr key={`header-${idx}`} style={{ borderBottom: item.isDescription ? 'none' : '1px solid #e2e8f0' }}>
                                <td colSpan={colSpan} style={{
                                  padding: item.isDescription ? '2px 8px 8px 8px' : '8px 8px 2px 8px',
                                  fontSize: item.isDescription ? '12px' : '14px',
                                  fontWeight: item.isDescription ? 'normal' : 'bold',
                                  color: item.isDescription ? '#64748b' : '#334155',
                                  whiteSpace: 'pre-line',
                                  fontStyle: item.isDescription ? 'italic' : 'normal',
                                  backgroundColor: item.isDescription ? 'transparent' : '#f8fafc'
                                }}>
                                  {item.description}
                                </td>
                              </tr>
                            ) : item.isHeading ? (
                              // Inline material heading
                              <tr key={`heading-${idx}`} className="bg-slate-50">
                                <td colSpan={colSpan} className="py-1 px-2">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.description}</span>
                                </td>
                              </tr>
                            ) : activeTemplate === 'spacious' ? (
                              <tr key={`item-${idx}`} className={templateConfig.showTableBorders ? 'border-b border-slate-100' : ''}>
                                {templateConfig.showLineNumbers && (
                                  <td className={`${templateConfig.rowPadding} text-slate-600 ${templateConfig.fontSize}`}>{item.lineNum}</td>
                                )}
                                <td className={templateConfig.rowPadding}>
                                  <div className={`text-slate-900 font-medium ${templateConfig.fontSize}`}>{item.name}</div>
                                  {item.subtext && <div className="text-[11px] text-slate-500 mt-0.5">{item.subtext}</div>}
                                </td>
                                {showQtyColumn && (
                                  <td className={`${templateConfig.rowPadding} text-slate-900 text-center font-medium ${templateConfig.fontSize}`}>{item.qty}</td>
                                )}
                                {showRateColumn && (
                                  <td className={`${templateConfig.rowPadding} text-slate-900 text-right ${templateConfig.fontSize}`}>{item.rate ? `${item.rate.toFixed(2)}` : '-'}</td>
                                )}
                                {showAmountColumn && (
                                  <td className={`${templateConfig.rowPadding} text-slate-900 text-right font-medium ${templateConfig.fontSize}`}>
                                    {item.amount.toFixed(2)}
                                  </td>
                                )}
                              </tr>
                            ) : (
                              <tr key={`item-${idx}`} className={templateConfig.showTableBorders ? 'border-b border-slate-100' : ''}>
                                {templateConfig.showLineNumbers && (
                                  <td className="py-2 px-2 text-slate-600 text-[10px]">{item.lineNum}</td>
                                )}
                                <td className="py-2 px-2 text-[10px]">
                                  <div className="text-slate-900 font-medium">{item.name}</div>
                                  {item.subtext && <div className="text-[9px] text-slate-500 mt-0.5">{item.subtext}</div>}
                                </td>
                                {showQtyColumn && (
                                  <td className="py-2 px-2 text-slate-900 text-[10px] text-center font-medium">{item.qty}</td>
                                )}
                                {showRateColumn && activeTemplate === 'professional' && (
                                  <td className="py-2 px-2 text-slate-900 text-[10px] text-right">{item.rate ? `${item.rate.toFixed(2)}` : '-'}</td>
                                )}
                                {showAmountColumn && (
                                  <td className="py-2 px-2 text-slate-900 text-[10px] text-right font-medium">
                                    {item.amount.toFixed(2)}
                                  </td>
                                )}
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              ) : (
                /* SEPARATE SECTIONS - For templates that split materials/labour */
                (quote.sections || []).map((section, idx) => {
                  const markupMultiplier = 1 + ((quote.markupPercent || 0) / 100);
                  // Filter out heading items from materials total
                  const rawMaterialsTotal = (section.items || []).filter(i => !i.isHeading).reduce((s, i) => s + (i.totalPrice || 0), 0);
                  // Use labourItems if present, otherwise fall back
                  const rawLabourTotal = getSectionLabour(section);
                  // Use subsectionPrice override if set
                  const sectionTotal = section.subsectionPrice !== undefined ? section.subsectionPrice : (rawMaterialsTotal + rawLabourTotal);
                  // Get total labour hours
                  const totalLabourHours = section.labourItems && section.labourItems.length > 0
                    ? section.labourItems.reduce((sum, item) => sum + item.hours, 0)
                    : section.labourHours || 0;

                  return (
                    <div key={section.id} className={`${templateStyle.sectionPadding} ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'} ${templateStyle.sectionSpacing}`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`${templateStyle.tableText} font-bold text-slate-400`}>{idx + 1}.</span>
                        <h4 className={templateStyle.sectionTitle}>{section.title}</h4>
                      </div>

                      {/* Materials Block */}
                      {displayOptions.showMaterials && (rawMaterialsTotal > 0 || (section.items || []).length > 0) && (
                        <div className="space-y-1">
                          {templateConfig.showSectionHeaders && (
                            <div className={templateStyle.materialHeader}>
                              {templateConfig.showIcons && <Package size={12} className="text-amber-500" />}
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Materials</span>
                            </div>
                          )}

                          {displayOptions.showMaterialItems && (section.items || []).length > 0 && (
                            <div className="w-full">
                              {/* Desktop Table */}
                              <table className={`hidden md:table w-full text-left ${activeTemplate === 'minimal' ? 'border border-slate-300' : ''}`} style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr className={activeTemplate === 'minimal' ? 'border-b-2 border-slate-300 bg-slate-50' : 'border-b border-slate-100'}>
                                    <th className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} text-[9px] font-bold ${activeTemplate === 'minimal' ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider ${activeTemplate === 'minimal' ? 'border-r border-slate-300' : ''}`} style={{ lineHeight: '1.6' }}>Item & Description</th>
                                    {displayOptions.showMaterialItems && displayOptions.showMaterialQty && <th className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} text-[9px] font-bold ${activeTemplate === 'minimal' ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider text-center w-20 ${activeTemplate === 'minimal' ? 'border-r border-slate-300' : ''}`} style={{ lineHeight: '1.6' }}>Qty</th>}
                                    {displayOptions.showMaterialItems && displayOptions.showMaterialUnitPrice && <th className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} text-[9px] font-bold ${activeTemplate === 'minimal' ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider text-right w-24 ${activeTemplate === 'minimal' ? 'border-r border-slate-300' : ''}`} style={{ lineHeight: '1.6' }}>Rate</th>}
                                    {displayOptions.showMaterialItems && displayOptions.showMaterialLineTotals && <th className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} text-[9px] font-bold ${activeTemplate === 'minimal' ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider text-right w-24`} style={{ lineHeight: '1.6' }}>Amount</th>}
                                  </tr>
                                </thead>
                                <tbody className={activeTemplate === 'minimal' ? '' : 'divide-y divide-slate-50'}>
                                  {(section.items || []).map(item => (
                                    item.isHeading ? (
                                      // Heading row
                                      <tr key={item.id} className={`bg-slate-50 ${activeTemplate === 'minimal' ? 'border-b border-slate-300' : ''}`}>
                                        <td colSpan={4} className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} ${activeTemplate === 'minimal' ? 'border-r border-slate-300' : ''}`}>
                                          <div className="flex items-center gap-1">
                                            <Type size={10} className="text-slate-400" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.name || 'Section'}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : (
                                      <tr key={item.id} className={activeTemplate === 'minimal' ? 'border-b border-slate-300' : ''}>
                                        <td className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} ${activeTemplate === 'minimal' ? 'border-r border-slate-300' : ''}`} style={{ lineHeight: '1.5' }}><p className={`${activeTemplate === 'minimal' ? 'text-[10px]' : 'text-[11px]'} font-medium text-slate-900`} style={{ lineHeight: '1.5' }}>{[item.name, item.description].filter(Boolean).join(' ')}</p></td>
                                        {displayOptions.showMaterialItems && displayOptions.showMaterialQty && <td className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} text-center ${activeTemplate === 'minimal' ? 'border-r border-slate-300' : ''}`} style={{ lineHeight: '1.5' }}><span className="text-[10px] font-medium text-slate-700" style={{ lineHeight: '1.5' }}>{item.quantity} {item.unit}</span></td>}
                                        {displayOptions.showMaterialItems && displayOptions.showMaterialUnitPrice && <td className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} text-right text-[10px] font-medium ${activeTemplate === 'minimal' ? 'text-slate-700 border-r border-slate-300' : 'text-slate-600'}`} style={{ lineHeight: '1.5' }}>£{(item.unitPrice * markupMultiplier).toFixed(2)}</td>}
                                        {displayOptions.showMaterialItems && displayOptions.showMaterialLineTotals && <td className={`${activeTemplate === 'minimal' ? 'py-1 px-2' : 'py-1 px-2'} text-right text-[10px] font-bold ${activeTemplate === 'minimal' ? 'text-slate-900' : 'text-slate-900'}`} style={{ lineHeight: '1.5' }}>£{(item.totalPrice * markupMultiplier).toFixed(2)}</td>}
                                      </tr>
                                    )
                                  ))}
                                </tbody>
                              </table>

                              {/* Mobile List View - Ultra Clean */}
                              <div className="md:hidden">
                                {(section.items || []).map(item => (
                                  item.isHeading ? (
                                    // Heading row for mobile
                                    <div key={item.id} className="py-1 px-2 bg-slate-50 rounded my-0.5 flex items-center gap-1">
                                      <Type size={10} className="text-slate-400" />
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.name || 'Section'}</span>
                                    </div>
                                  ) : (
                                    <div key={item.id} className="py-1 border-b border-slate-50 last:border-0 flex justify-between items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          {displayOptions.showMaterialItems && displayOptions.showMaterialQty && <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1 rounded">{item.quantity}{item.unit}</span>}
                                          <span className="font-medium text-slate-900 text-[11px]">{[item.name, item.description].filter(Boolean).join(' ')}</span>
                                        </div>
                                      </div>
                                      <div className="text-right whitespace-nowrap">
                                        {displayOptions.showMaterialItems && displayOptions.showMaterialLineTotals && <p className="text-[11px] font-bold text-slate-900">£{(item.totalPrice * markupMultiplier).toFixed(2)}</p>}
                                      </div>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* Materials Total — shown independently of showMaterials */}
                      {displayOptions.showMaterialSectionTotal && rawMaterialsTotal > 0 && (
                        <div className={`flex justify-between items-center py-1 ${templateConfig.showBackgrounds ? 'bg-slate-50 px-2 rounded-lg border border-slate-100/50' : 'border-t border-slate-100 px-1'}`}>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Materials Total</span>
                          <span className="font-bold text-[11px] text-slate-900">£{(rawMaterialsTotal * markupMultiplier).toFixed(2)}</span>
                        </div>
                      )}

                      {/* Labour Block - Now with itemized support */}
                      {displayOptions.showLabour && rawLabourTotal > 0 && (
                        <div className="space-y-1">
                          {templateConfig.showSectionHeaders && (
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1">
                              {templateConfig.showIcons && <HardHat size={12} className="text-blue-500" />}
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Labour & Site Support</span>
                            </div>
                          )}

                          {displayOptions.showLabourItems && (
                            <div className="space-y-1.5">
                              {/* Itemized Labour List */}
                              {section.labourItems && section.labourItems.length > 0 ? (
                                <>
                                  {section.labourItems.map((labourItem) => {
                                    const rate = labourItem.rate || section.labourRate || quote.labourRate || settings.defaultLabourRate;
                                    const itemTotal = labourItem.hours * rate;
                                    return (
                                      <div key={labourItem.id} className={`py-1 px-2 ${templateConfig.showBackgrounds ? 'bg-blue-50/40 rounded-lg border border-blue-100/30' : 'border-b border-slate-100'} flex justify-between items-center`}>
                                        <div className="flex-1">
                                          <p className="text-[11px] font-medium text-slate-900">{labourItem.description || 'Labour'}</p>
                                          {(displayOptions.showLabourQty || displayOptions.showLabourUnitPrice) && (
                                            <span className="text-[9px] font-medium text-slate-500">
                                              {displayOptions.showLabourQty ? `${labourItem.hours} hrs` : ''}
                                              {displayOptions.showLabourQty && displayOptions.showLabourUnitPrice ? ' @ ' : ''}
                                              {displayOptions.showLabourUnitPrice ? `£${(rate * markupMultiplier).toFixed(2)}/hr` : ''}
                                            </span>
                                          )}
                                        </div>
                                        {displayOptions.showLabourLineTotals && (
                                          <p className="text-[11px] font-bold text-blue-600">£{(itemTotal * markupMultiplier).toFixed(2)}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </>
                              ) : (
                                // Fallback to old-style single labour block
                                <div className={`py-1 px-2 ${templateConfig.showBackgrounds ? 'bg-blue-50/40 rounded-lg border border-blue-100/30' : 'border-b border-slate-100'} flex justify-between items-center`}>
                                  <div className="flex-1">
                                    <p className="text-[11px] font-medium text-slate-900">Technical Personnel & Site Resource</p>
                                    {totalLabourHours > 0 && (displayOptions.showLabourQty || displayOptions.showLabourUnitPrice) && (
                                      <p className="text-[9px] font-medium text-slate-500">
                                        {displayOptions.showLabourQty ? `${totalLabourHours} hrs` : ''}
                                        {displayOptions.showLabourQty && displayOptions.showLabourUnitPrice ? ' @ ' : ''}
                                        {displayOptions.showLabourUnitPrice ? `£${((quote.labourRate || settings.defaultLabourRate) * markupMultiplier).toFixed(2)}/hr` : ''}
                                      </p>
                                    )}
                                  </div>
                                  {displayOptions.showLabourSectionTotal && (
                                    <p className="text-[11px] font-bold text-blue-600">£{(rawLabourTotal * markupMultiplier).toFixed(2)}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      )}

                      {/* Labour Total — shown independently of showLabour */}
                      {displayOptions.showLabourSectionTotal && rawLabourTotal > 0 && (
                        <div className={`flex justify-between items-center py-1 ${templateConfig.showBackgrounds ? 'bg-blue-50/50 px-2 rounded-lg border border-blue-100/50' : 'border-t border-slate-100 px-1'}`}>
                          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">
                            Labour Total {totalLabourHours > 0 && `(${totalLabourHours} hrs)`}
                          </span>
                          <span className="font-bold text-[11px] text-blue-600">£{(rawLabourTotal * markupMultiplier).toFixed(2)}</span>
                        </div>
                      )}

                      {displayOptions.showWorkSectionTotal && (
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">Section {idx + 1}</span>
                          <p className="text-[10px] font-bold text-slate-600">Section Total: <span className="text-slate-900 ml-1">£{(sectionTotal * markupMultiplier).toFixed(2)}</span></p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* TOTALS SECTION - Statement template has special compact right-aligned layout */}
              {activeTemplate === 'professional' ? (
                /* PROFESSIONAL TEMPLATE TOTALS - Zoho-style right-aligned */
                <div className="px-2 py-1">
                  <div className="flex justify-end">
                    <div className="w-48">
                      <div className="flex justify-between py-1 border-b border-slate-100 text-[10px]">
                        <span className="text-slate-500">Sub Total</span>
                        <span className="text-slate-900">£{totals.clientSubtotal.toFixed(2)}</span>
                      </div>
                      {totals.discountAmount > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 text-[10px]">
                          <span className="text-slate-500">Discount</span>
                          <span className="text-slate-900">-£{totals.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {settings.enableVat && displayOptions.showVat && totals.taxAmount > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 text-[10px]">
                          <span className="text-slate-500">VAT ({quote.taxPercent}%)</span>
                          <span className="text-slate-900">£{totals.taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {settings.enableCis && displayOptions.showCis && totals.cisAmount > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 text-[10px]">
                          <span className="text-slate-500">CIS Deduction</span>
                          <span className="text-slate-900">-£{totals.cisAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 font-bold bg-slate-100 px-2 -mx-2 mt-1 rounded text-[11px]">
                        <span>Balance Due</span>
                        <span>£{totals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Part Payment - compact version */}
                  {quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue && (
                    <div className="flex justify-end mt-2">
                      <div className="bg-teal-50 border border-teal-200 p-2 rounded-lg w-48">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-teal-700">{quote.partPaymentLabel || 'Due Now'}</span>
                          <span className="font-bold text-teal-700">£{partPaymentAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] mt-1">
                          <span className="text-slate-500">Remaining</span>
                          <span className="text-slate-700">£{(totals.grandTotal - partPaymentAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTemplate === 'spacious' ? (
                /* SPACIOUS TEMPLATE TOTALS - Like professional but with larger text */
                <div className={`${templateConfig.containerPadding} py-1`}>
                  <div className="flex justify-end">
                    <div className="w-56">
                      <div className={`flex justify-between py-1 border-b border-slate-100 ${templateConfig.fontSize}`}>
                        <span className="text-slate-500">Sub Total</span>
                        <span className="text-slate-900">£{totals.clientSubtotal.toFixed(2)}</span>
                      </div>
                      {totals.discountAmount > 0 && (
                        <div className={`flex justify-between py-1 border-b border-slate-100 ${templateConfig.fontSize}`}>
                          <span className="text-slate-500">Discount</span>
                          <span className="text-slate-900">-£{totals.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {settings.enableVat && displayOptions.showVat && totals.taxAmount > 0 && (
                        <div className={`flex justify-between py-1 border-b border-slate-100 ${templateConfig.fontSize}`}>
                          <span className="text-slate-500">VAT ({quote.taxPercent}%)</span>
                          <span className="text-slate-900">£{totals.taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {settings.enableCis && displayOptions.showCis && totals.cisAmount > 0 && (
                        <div className={`flex justify-between py-1 border-b border-slate-100 ${templateConfig.fontSize}`}>
                          <span className="text-slate-500">CIS Deduction</span>
                          <span className="text-slate-900">-£{totals.cisAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className={`flex justify-between py-1 font-bold bg-slate-100 px-2 -mx-2 mt-1 rounded ${templateConfig.headerFontSize}`}>
                        <span>Balance Due</span>
                        <span>£{totals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Part Payment - compact version */}
                  {quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue && (
                    <div className="flex justify-end mt-2">
                      <div className="bg-teal-50 border border-teal-200 p-2 rounded-lg w-56">
                        <div className={`flex justify-between ${templateConfig.fontSize}`}>
                          <span className="text-teal-700">{quote.partPaymentLabel || 'Due Now'}</span>
                          <span className="font-bold text-teal-700">£{partPaymentAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] mt-1">
                          <span className="text-slate-500">Remaining</span>
                          <span className="text-slate-700">£{(totals.grandTotal - partPaymentAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* STANDARD TOTALS - All other templates */
                <div className={`${activeTemplate === 'minimal' ? 'bg-white border-t-2 border-slate-300 text-slate-900' : currentThemeClass} px-2 py-1 ${templateStyle.footerRounding} ${activeTemplate === 'minimal' ? '' : 'shadow-sm'}`}>
                  <div className="flex flex-col gap-2">
                    <div className="space-y-1">
                      {displayOptions.showTotalsBreakdown && (
                        <>
                          <div className={`flex justify-between text-[10px] ${activeTemplate === 'minimal' ? 'text-slate-700 font-medium' : 'opacity-70'}`}><span>Sub Total</span><span className={activeTemplate === 'minimal' ? '' : 'opacity-90'}>£{totals.clientSubtotal.toFixed(2)}</span></div>
                          {totals.discountAmount > 0 && (
                            <div className={`flex justify-between text-[10px] ${activeTemplate === 'minimal' ? 'text-slate-700 font-medium' : ''}`}>
                              <span className={`flex items-center gap-1 ${activeTemplate === 'minimal' ? '' : 'opacity-70'}`}>
                                <Tag size={9} />
                                Discount
                                {quote.discountDescription && <span className={activeTemplate === 'minimal' ? 'text-slate-500 ml-1' : 'opacity-50 ml-1'}>({quote.discountDescription})</span>}
                                {quote.discountType === 'percentage' && <span className={activeTemplate === 'minimal' ? 'text-slate-500 ml-1' : 'opacity-50 ml-1'}>({quote.discountValue}%)</span>}
                              </span>
                              <span className="font-semibold">-£{totals.discountAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {settings.enableVat && displayOptions.showVat && (
                            <div className={`flex justify-between text-[10px] ${activeTemplate === 'minimal' ? 'text-slate-700 font-medium' : 'opacity-70'}`}><span>VAT ({quote.taxPercent}%)</span><span className={activeTemplate === 'minimal' ? '' : 'opacity-90'}>£{totals.taxAmount.toFixed(2)}</span></div>
                          )}
                          {settings.enableCis && displayOptions.showCis && totals.cisAmount > 0 && (
                            <div className={`flex justify-between text-[10px] ${activeTemplate === 'minimal' ? 'text-slate-700 font-medium' : 'opacity-70'}`}><span>CIS Deduction ({quote.cisPercent}%)</span><span className={activeTemplate === 'minimal' ? '' : 'opacity-90'}>-£{totals.cisAmount.toFixed(2)}</span></div>
                          )}
                        </>
                      )}
                      <div className={`h-px ${activeTemplate === 'minimal' ? 'bg-slate-300' : 'bg-current opacity-20'} my-1`}></div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {activeTemplate !== 'minimal' && <div className="w-1 h-1 rounded-full bg-current opacity-60"></div>}
                          <span className={`font-bold ${activeTemplate === 'minimal' ? 'text-sm' : 'text-[10px] opacity-80'} uppercase tracking-wider`}>{quote.type === 'invoice' ? 'Balance Due' : 'Total Due'}</span>
                        </div>
                        <span className={`${activeTemplate === 'minimal' ? 'text-2xl' : 'text-xl'} font-black`}>£{totals.grandTotal.toFixed(2)}</span>
                      </div>

                      {/* Part Payment Highlight Box */}
                      {quote.type === 'invoice' && quote.partPaymentEnabled && quote.partPaymentValue && (
                        <div className="bg-white border border-teal-200 p-2 rounded-xl mt-2 shadow-sm">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                {quote.partPaymentLabel || 'Amount Due Now'}
                              </p>
                              <p className="text-lg font-black text-teal-600">
                                £{partPaymentAmount.toFixed(2)}
                              </p>
                              {quote.partPaymentType === 'percentage' && (
                                <p className="text-[9px] font-bold text-slate-400">
                                  ({quote.partPaymentValue}% of £{totals.grandTotal.toFixed(2)})
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</p>
                              <p className="text-base font-black text-slate-700">
                                £{(totals.grandTotal - partPaymentAmount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bank Details Section - Only for invoices */}
                    {quote.type === 'invoice' && (
                      settings.bankAccountName || settings.bankAccountNumber || settings.bankSortCode || settings.bankName
                    ) && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Landmark size={14} className="text-emerald-600" />
                              <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Payment Details</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {settings.bankAccountName && (
                                <div>
                                  <p className="text-[8px] font-bold text-emerald-700 uppercase">Account Name</p>
                                  <p className="text-[10px] font-bold text-slate-900">{settings.bankAccountName}</p>
                                </div>
                              )}
                              {settings.bankName && (
                                <div>
                                  <p className="text-[8px] font-bold text-emerald-700 uppercase">Bank</p>
                                  <p className="text-[10px] font-bold text-slate-900">{settings.bankName}</p>
                                </div>
                              )}
                              {settings.bankAccountNumber && (
                                <div>
                                  <p className="text-[8px] font-bold text-emerald-700 uppercase">Account Number</p>
                                  <p className="text-[10px] font-bold text-slate-900">{settings.bankAccountNumber}</p>
                                </div>
                              )}
                              {settings.bankSortCode && (
                                <div>
                                  <p className="text-[8px] font-bold text-emerald-700 uppercase">Sort Code</p>
                                  <p className="text-[10px] font-bold text-slate-900">{settings.bankSortCode}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    {displayOptions.showNotes && quote?.notes && (
                      <div className="text-[8px] leading-snug opacity-60 mt-2">
                        {quote.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes section for Professional Template */}
              {activeTemplate === 'professional' && (displayOptions.showNotes || (settings.bankAccountName || settings.bankAccountNumber || settings.bankSortCode || settings.bankName)) && (
                <div className="px-4 py-3 border-t border-slate-200">
                  <div className="text-[10px] font-bold text-slate-900 mb-2">Notes</div>
                  {(settings.bankAccountName || settings.bankAccountNumber || settings.bankSortCode || settings.bankName) && quote.type === 'invoice' && (
                    <div className="mb-2">
                      <div className="text-[10px] text-slate-900">Payment Details:</div>
                      <div className="text-[10px] text-slate-600 space-y-0.5 mt-1">
                        {settings.bankAccountName && <div>Mr {settings.bankAccountName}</div>}
                        {settings.bankAccountNumber && <div>{settings.bankAccountNumber}</div>}
                        {settings.bankSortCode && <div>{settings.bankSortCode}</div>}
                        {settings.bankName && <div>{settings.bankName}</div>}
                      </div>
                    </div>
                  )}
                  {displayOptions.showNotes && quote?.notes && (
                    <div className="text-[10px] text-slate-600 leading-relaxed">
                      {quote.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Notes section for Spacious Template */}
              {activeTemplate === 'spacious' && (displayOptions.showNotes || (settings.bankAccountName || settings.bankAccountNumber || settings.bankSortCode || settings.bankName)) && (
                <div className={`${templateConfig.containerPadding} py-3 border-t border-slate-200`}>
                  <div className={`${templateConfig.fontSize} font-bold text-slate-900 mb-2`}>Notes</div>
                  {(settings.bankAccountName || settings.bankAccountNumber || settings.bankSortCode || settings.bankName) && quote.type === 'invoice' && (
                    <div className="mb-2">
                      <div className={`${templateConfig.fontSize} text-slate-900`}>Payment Details:</div>
                      <div className={`${templateConfig.fontSize} text-slate-600 space-y-0.5 mt-1`}>
                        {settings.bankAccountName && <div>Mr {settings.bankAccountName}</div>}
                        {settings.bankAccountNumber && <div>{settings.bankAccountNumber}</div>}
                        {settings.bankSortCode && <div>{settings.bankSortCode}</div>}
                        {settings.bankName && <div>{settings.bankName}</div>}
                      </div>
                    </div>
                  )}
                  {displayOptions.showNotes && quote?.notes && (
                    <div className={`${templateConfig.fontSize} text-slate-600 leading-relaxed`}>
                      {quote.notes}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>{/* end responsive document preview wrapper */}
    </>
  );
};
