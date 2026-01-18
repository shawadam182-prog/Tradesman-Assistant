import React, { useState, useEffect, useMemo } from 'react';
import {
  Download, FileSpreadsheet, Calendar, ChevronDown, Loader2,
  ArrowLeft, CheckSquare, Square, FileArchive, FileText, AlertCircle,
  Receipt, Banknote, Users, FileQuestion, Building2, Clock, Info, Check
} from 'lucide-react';
import { useData } from '../src/contexts/DataContext';
import { useToast } from '../src/contexts/ToastContext';
import { handleApiError } from '../src/utils/errorHandler';
import {
  ExportOptions,
  ExportProgress,
  ExportPreview,
  generateExportBundle,
  generateExportFilename,
  getExportPreview,
  getTaxYearBoundaries,
  formatTaxYearLabel
} from '../src/utils/accountantExport';

interface AccountantExportPageProps {
  onBack?: () => void;
}

type DateRangePreset = 'this_tax_year' | 'last_tax_year' | 'this_quarter' | 'last_quarter' | 'all_time' | 'custom';

export const AccountantExportPage: React.FC<AccountantExportPageProps> = ({ onBack }) => {
  const { settings } = useData();
  const toast = useToast();

  // Date range state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_tax_year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Export options state
  const [includeSales, setIncludeSales] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeBankTransactions, setIncludeBankTransactions] = useState(true);
  const [includePayables, setIncludePayables] = useState(true);
  const [includeCustomers, setIncludeCustomers] = useState(false);
  const [includeQuotes, setIncludeQuotes] = useState(false);
  const [exportFormat, setExportFormat] = useState<'zip' | 'combined'>('zip');

  // Progress and preview state
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [lastExportSize, setLastExportSize] = useState<number | null>(null);

  // Get tax year settings from user settings
  const taxYearStartMonth = settings.taxYearStartMonth || 4;
  const taxYearStartDay = settings.taxYearStartDay || 6;

  // Calculate date range boundaries
  const taxYearBoundaries = useMemo(() => {
    return getTaxYearBoundaries(taxYearStartMonth, taxYearStartDay);
  }, [taxYearStartMonth, taxYearStartDay]);

  // Get current quarter boundaries
  const quarterBoundaries = useMemo(() => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const thisQuarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const thisQuarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);

    const lastQuarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
    if (currentQuarter === 0) {
      lastQuarterStart.setFullYear(now.getFullYear() - 1);
      lastQuarterStart.setMonth(9); // October
    }
    const lastQuarterEnd = new Date(lastQuarterStart);
    lastQuarterEnd.setMonth(lastQuarterEnd.getMonth() + 3);
    lastQuarterEnd.setDate(0);

    return {
      thisQuarterStart,
      thisQuarterEnd,
      lastQuarterStart,
      lastQuarterEnd
    };
  }, []);

  // Calculate actual date range based on preset
  const dateRange = useMemo((): { start: Date; end: Date } => {
    switch (dateRangePreset) {
      case 'this_tax_year':
        return { start: taxYearBoundaries.currentStart, end: new Date() };
      case 'last_tax_year':
        return { start: taxYearBoundaries.lastStart, end: taxYearBoundaries.lastEnd };
      case 'this_quarter':
        return { start: quarterBoundaries.thisQuarterStart, end: new Date() };
      case 'last_quarter':
        return { start: quarterBoundaries.lastQuarterStart, end: quarterBoundaries.lastQuarterEnd };
      case 'all_time':
        return { start: new Date(2020, 0, 1), end: new Date() };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : new Date(),
          end: customEndDate ? new Date(customEndDate) : new Date()
        };
      default:
        return { start: taxYearBoundaries.currentStart, end: new Date() };
    }
  }, [dateRangePreset, taxYearBoundaries, quarterBoundaries, customStartDate, customEndDate]);

  // Load preview when date range changes
  useEffect(() => {
    const loadPreview = async () => {
      setLoadingPreview(true);
      try {
        const previewData = await getExportPreview(dateRange.start, dateRange.end);
        setPreview(previewData);
      } catch (error) {
        console.error('Failed to load preview:', error);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadPreview();
  }, [dateRange.start.getTime(), dateRange.end.getTime()]);

  // Format date for display
  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle export
  const handleExport = async () => {
    setExporting(true);
    setProgress({ stage: 'Starting export...', percent: 0 });
    setLastExportSize(null);

    try {
      const options: ExportOptions = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        includeSales,
        includeExpenses,
        includeBankTransactions,
        includePayables,
        includeCustomers,
        includeQuotes,
        exportFormat,
        companyName: settings.companyName || undefined
      };

      const blob = await generateExportBundle(options, setProgress);
      setLastExportSize(blob.size);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateExportFilename(options);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        'Export Complete',
        `Your ${exportFormat === 'zip' ? 'ZIP bundle' : 'CSV file'} has been downloaded`
      );
    } catch (error) {
      console.error('Export failed:', error);
      const { message } = handleApiError(error);
      toast.error('Export Failed', message);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if any export option is selected
  const hasSelection = includeSales || includeExpenses || includeBankTransactions || includePayables || includeCustomers || includeQuotes;

  // Checkbox component
  const ExportOption: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    icon: React.ReactNode;
    count?: number;
    total?: number;
    recommended?: boolean;
  }> = ({ checked, onChange, label, icon, count, total, recommended }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
        checked
          ? 'border-teal-400 bg-teal-50/50'
          : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${checked ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
          {icon}
        </div>
        <div className="text-left">
          <p className={`text-sm font-bold ${checked ? 'text-slate-900' : 'text-slate-600'}`}>
            {label}
            {recommended && (
              <span className="ml-2 text-[9px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase">
                Recommended
              </span>
            )}
          </p>
          {count !== undefined && (
            <p className="text-[10px] text-slate-400">
              {count} records{total !== undefined && ` · ${total >= 0 ? '£' : '-£'}${Math.abs(total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}
            </p>
          )}
        </div>
      </div>
      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
        checked ? 'bg-teal-500 border-teal-500' : 'border-slate-200'
      }`}>
        {checked && <Check size={14} className="text-white" />}
      </div>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 mb-8">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 md:p-2 -ml-1 md:-ml-2 text-slate-500 hover:text-slate-700 bg-slate-100 md:bg-transparent hover:bg-slate-200 md:hover:bg-slate-100 rounded-xl transition-colors active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft size={22} className="md:w-5 md:h-5" />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Accountant Export</h1>
          <p className="text-slate-500 text-sm font-medium italic">Export your data for your accountant or backup</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Range Selection */}
          <div className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                <Calendar size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Date Range</h2>
                <p className="text-[10px] text-slate-500 italic">Select the period for your export</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {[
                {
                  id: 'this_tax_year' as DateRangePreset,
                  label: 'This Tax Year',
                  sublabel: formatTaxYearLabel(taxYearBoundaries.currentStart, taxYearBoundaries.currentEnd)
                },
                {
                  id: 'last_tax_year' as DateRangePreset,
                  label: 'Last Tax Year',
                  sublabel: formatTaxYearLabel(taxYearBoundaries.lastStart, taxYearBoundaries.lastEnd)
                },
                { id: 'this_quarter' as DateRangePreset, label: 'This Quarter', sublabel: 'Current Q' },
                { id: 'last_quarter' as DateRangePreset, label: 'Last Quarter', sublabel: 'Previous Q' },
                { id: 'all_time' as DateRangePreset, label: 'All Time', sublabel: 'Everything' },
                { id: 'custom' as DateRangePreset, label: 'Custom', sublabel: 'Pick dates' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setDateRangePreset(option.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    dateRangePreset === option.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <p className={`text-xs font-bold ${dateRangePreset === option.id ? 'text-teal-700' : 'text-slate-700'}`}>
                    {option.label}
                  </p>
                  <p className={`text-[10px] ${dateRangePreset === option.id ? 'text-teal-500' : 'text-slate-400'}`}>
                    {option.sublabel}
                  </p>
                </button>
              ))}
            </div>

            {dateRangePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-slate-50 rounded-2xl">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center gap-2">
              <Clock size={14} className="text-slate-400" />
              <span className="text-xs text-slate-600">
                <span className="font-bold">{formatDisplayDate(dateRange.start)}</span>
                {' '}&rarr;{' '}
                <span className="font-bold">{formatDisplayDate(dateRange.end)}</span>
              </span>
            </div>
          </div>

          {/* Data Selection */}
          <div className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Data to Export</h2>
                <p className="text-[10px] text-slate-500 italic">Select which data types to include</p>
              </div>
            </div>

            <div className="space-y-3">
              <ExportOption
                checked={includeSales}
                onChange={setIncludeSales}
                label="Sales (Invoices)"
                icon={<Receipt size={18} />}
                count={preview?.invoiceCount}
                total={preview?.totalSales}
                recommended
              />
              <ExportOption
                checked={includeExpenses}
                onChange={setIncludeExpenses}
                label="Expenses"
                icon={<Banknote size={18} />}
                count={preview?.expenseCount}
                total={preview?.totalExpenses ? -preview.totalExpenses : undefined}
                recommended
              />
              <ExportOption
                checked={includeBankTransactions}
                onChange={setIncludeBankTransactions}
                label="Bank Transactions"
                icon={<Building2 size={18} />}
                count={preview?.bankTransactionCount}
                recommended
              />
              <ExportOption
                checked={includePayables}
                onChange={setIncludePayables}
                label="Payables (Bills)"
                icon={<FileText size={18} />}
                count={preview?.payableCount}
                recommended
              />
              <ExportOption
                checked={includeCustomers}
                onChange={setIncludeCustomers}
                label="Customers"
                icon={<Users size={18} />}
                count={preview?.customerCount}
              />
              <ExportOption
                checked={includeQuotes}
                onChange={setIncludeQuotes}
                label="Quotes & Estimates"
                icon={<FileQuestion size={18} />}
                count={preview?.quoteCount}
              />
            </div>
          </div>

          {/* Export Format */}
          <div className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                <FileArchive size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Export Format</h2>
                <p className="text-[10px] text-slate-500 italic">Choose how to receive your data</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setExportFormat('zip')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  exportFormat === 'zip'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <FileArchive size={24} className={exportFormat === 'zip' ? 'text-teal-600' : 'text-slate-400'} />
                <p className={`text-sm font-bold mt-2 ${exportFormat === 'zip' ? 'text-teal-700' : 'text-slate-700'}`}>
                  ZIP Bundle
                </p>
                <p className={`text-[10px] mt-1 ${exportFormat === 'zip' ? 'text-teal-500' : 'text-slate-400'}`}>
                  Separate CSV per data type with README
                </p>
                <span className={`inline-block mt-2 text-[9px] font-black px-2 py-1 rounded ${
                  exportFormat === 'zip' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  RECOMMENDED
                </span>
              </button>

              <button
                onClick={() => setExportFormat('combined')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  exportFormat === 'combined'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <FileText size={24} className={exportFormat === 'combined' ? 'text-teal-600' : 'text-slate-400'} />
                <p className={`text-sm font-bold mt-2 ${exportFormat === 'combined' ? 'text-teal-700' : 'text-slate-700'}`}>
                  Single CSV
                </p>
                <p className={`text-[10px] mt-1 ${exportFormat === 'combined' ? 'text-teal-500' : 'text-slate-400'}`}>
                  All data combined in one file
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Preview & Export Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[32px] border border-slate-200 p-6 sticky top-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Export Preview</h3>

            {loadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {/* Record counts */}
                <div className="space-y-2 text-sm">
                  {includeSales && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoices</span>
                      <span className="font-bold text-slate-900">{preview.invoiceCount}</span>
                    </div>
                  )}
                  {includeExpenses && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expenses</span>
                      <span className="font-bold text-slate-900">{preview.expenseCount}</span>
                    </div>
                  )}
                  {includeBankTransactions && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Transactions</span>
                      <span className="font-bold text-slate-900">{preview.bankTransactionCount}</span>
                    </div>
                  )}
                  {includePayables && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payables</span>
                      <span className="font-bold text-slate-900">{preview.payableCount}</span>
                    </div>
                  )}
                  {includeCustomers && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customers</span>
                      <span className="font-bold text-slate-900">{preview.customerCount}</span>
                    </div>
                  )}
                  {includeQuotes && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quotes</span>
                      <span className="font-bold text-slate-900">{preview.quoteCount}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-500">Total Sales</span>
                    <span className="text-sm font-bold text-emerald-600">
                      £{preview.totalSales.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total Expenses</span>
                    <span className="text-sm font-bold text-red-500">
                      £{preview.totalExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Format</span>
                    <span className="text-xs text-slate-500">
                      {exportFormat === 'zip' ? 'ZIP Bundle (.zip)' : 'Combined CSV (.csv)'}
                    </span>
                  </div>
                </div>

                {lastExportSize && (
                  <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-xs text-emerald-700">
                      Last export: {formatFileSize(lastExportSize)}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={exporting || !hasSelection}
              className={`w-full mt-6 flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                exporting || !hasSelection
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-700 hover:to-teal-600 shadow-lg shadow-teal-500/25 active:translate-y-0.5'
              }`}
            >
              {exporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {progress?.stage || 'Exporting...'}
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download Export
                </>
              )}
            </button>

            {exporting && progress && (
              <div className="mt-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-2">{progress.stage}</p>
              </div>
            )}

            {!hasSelection && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700">
                  Please select at least one data type to export
                </p>
              </div>
            )}

            {/* Info note */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="text-[10px] text-slate-500 space-y-2">
                  <p>
                    <strong>ZIP Bundle</strong> includes a README explaining each file and column definitions - perfect for sharing with your accountant.
                  </p>
                  <p>
                    All dates are in YYYY-MM-DD format for correct Excel sorting. Numbers don't include currency symbols for easier calculations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
