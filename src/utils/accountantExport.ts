import JSZip from 'jszip';
import { supabase } from '../lib/supabase';

// ============================================
// Types
// ============================================

export interface ExportOptions {
  startDate: Date;
  endDate: Date;
  includeSales: boolean;
  includeExpenses: boolean;
  includeBankTransactions: boolean;
  includePayables: boolean;
  includeCustomers: boolean;
  includeQuotes: boolean;
  exportFormat: 'zip' | 'combined';
  companyName?: string;
}

export interface ExportProgress {
  stage: string;
  percent: number;
}

interface InvoiceData {
  id: string;
  date: string | null;
  reference_number: number | null;
  title: string | null;
  customer_id: string | null;
  sections: any;
  status: string | null;
  payment_date: string | null;
  payment_method: string | null;
  tax_percent: number | null;
  labour_rate: number | null;
  markup_percent: number | null;
  customer?: { name: string } | null;
}

interface ExpenseData {
  id: string;
  expense_date: string;
  vendor: string;
  description: string | null;
  category: string | null;
  amount: number;
  vat_amount: number | null;
  payment_method: string | null;
  is_reconciled: boolean | null;
  job_pack?: { id: string; title: string } | null;
}

interface BankTransactionData {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  balance: number | null;
  transaction_type: string | null;
  is_reconciled: boolean | null;
  reconciled_expense_id: string | null;
  reconciled_invoice_id: string | null;
}

interface PayableData {
  id: string;
  invoice_date: string | null;
  vendor_name: string;
  invoice_number: string | null;
  description: string | null;
  category: string | null;
  amount: number;
  vat_amount: number | null;
  due_date: string | null;
  status: string | null;
  amount_paid: number | null;
}

interface CustomerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  created_at: string | null;
}

interface QuoteData {
  id: string;
  date: string | null;
  reference_number: number | null;
  title: string | null;
  type: string | null;
  status: string | null;
  sections: any;
  tax_percent: number | null;
  labour_rate: number | null;
  markup_percent: number | null;
  customer?: { name: string } | null;
}

// ============================================
// Helper Functions
// ============================================

const formatDate = (date: Date | string | null): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

const formatDateTime = (date: Date): string => {
  return date.toISOString().replace('T', ' ').slice(0, 19);
};

const escapeCsvField = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsvRow = (values: any[]): string => {
  return values.map(escapeCsvField).join(',');
};

const calculateInvoiceTotal = (invoice: InvoiceData): { net: number; vat: number; gross: number } => {
  const sections = invoice.sections || [];
  const labourRate = invoice.labour_rate || 65;
  const taxPercent = invoice.tax_percent || 20;
  const markupPercent = invoice.markup_percent || 0;

  const materialsTotal = sections.reduce((sum: number, section: any) =>
    sum + (section.items || []).reduce((itemSum: number, item: any) => itemSum + (item.totalPrice || 0), 0), 0);

  const labourHoursTotal = sections.reduce((sum: number, section: any) => sum + (section.labourHours || 0), 0);
  const labourTotal = labourHoursTotal * labourRate;

  const subtotal = materialsTotal + labourTotal;
  const markup = subtotal * (markupPercent / 100);
  const net = subtotal + markup;
  const vat = net * (taxPercent / 100);
  const gross = net + vat;

  return { net, vat, gross };
};

// ============================================
// Tax Year Helpers
// ============================================

export const getTaxYearBoundaries = (
  taxYearStartMonth: number = 4,
  taxYearStartDay: number = 6
): { currentStart: Date; currentEnd: Date; lastStart: Date; lastEnd: Date } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentDay = now.getDate();

  // Determine if we're in the current tax year or past it
  const isBeforeTaxYearStart = currentMonth < taxYearStartMonth ||
    (currentMonth === taxYearStartMonth && currentDay < taxYearStartDay);

  // Current tax year
  const currentTaxYearStartYear = isBeforeTaxYearStart ? currentYear - 1 : currentYear;
  const currentStart = new Date(currentTaxYearStartYear, taxYearStartMonth - 1, taxYearStartDay);
  const currentEnd = new Date(currentTaxYearStartYear + 1, taxYearStartMonth - 1, taxYearStartDay - 1);

  // Last tax year
  const lastStart = new Date(currentTaxYearStartYear - 1, taxYearStartMonth - 1, taxYearStartDay);
  const lastEnd = new Date(currentTaxYearStartYear, taxYearStartMonth - 1, taxYearStartDay - 1);

  return { currentStart, currentEnd, lastStart, lastEnd };
};

export const formatTaxYearLabel = (startDate: Date, endDate: Date): string => {
  return `${startDate.getFullYear()}/${endDate.getFullYear().toString().slice(-2)}`;
};

// ============================================
// Data Fetching Functions
// ============================================

async function fetchInvoices(startDate: Date, endDate: Date): Promise<InvoiceData[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, customer:customers(name)')
    .eq('type', 'invoice')
    .gte('date', formatDate(startDate))
    .lte('date', formatDate(endDate))
    .order('date');

  if (error) throw error;
  return data || [];
}

async function fetchExpenses(startDate: Date, endDate: Date): Promise<ExpenseData[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, job_pack:job_packs(id, title)')
    .gte('expense_date', formatDate(startDate))
    .lte('expense_date', formatDate(endDate))
    .order('expense_date');

  if (error) throw error;
  return data || [];
}

async function fetchBankTransactions(startDate: Date, endDate: Date): Promise<BankTransactionData[]> {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select('*')
    .gte('transaction_date', formatDate(startDate))
    .lte('transaction_date', formatDate(endDate))
    .order('transaction_date');

  if (error) throw error;
  return data || [];
}

async function fetchPayables(startDate: Date, endDate: Date): Promise<PayableData[]> {
  const { data, error } = await supabase
    .from('payables')
    .select('*')
    .gte('invoice_date', formatDate(startDate))
    .lte('invoice_date', formatDate(endDate))
    .order('invoice_date');

  if (error) throw error;
  return data || [];
}

async function fetchCustomers(): Promise<CustomerData[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

async function fetchQuotes(startDate: Date, endDate: Date): Promise<QuoteData[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, customer:customers(name)')
    .in('type', ['estimate', 'quotation'])
    .gte('date', formatDate(startDate))
    .lte('date', formatDate(endDate))
    .order('date');

  if (error) throw error;
  return data || [];
}

// ============================================
// CSV Generation Functions
// ============================================

export async function generateSalesCSV(startDate: Date, endDate: Date): Promise<string> {
  const invoices = await fetchInvoices(startDate, endDate);

  const headers = ['Date', 'Invoice Number', 'Customer', 'Description', 'Net Amount', 'VAT', 'Gross Amount', 'Status', 'Payment Date', 'Payment Method'];
  const rows = [toCsvRow(headers)];

  for (const inv of invoices) {
    const { net, vat, gross } = calculateInvoiceTotal(inv);
    rows.push(toCsvRow([
      formatDate(inv.date),
      inv.reference_number ? `INV-${String(inv.reference_number).padStart(4, '0')}` : '',
      inv.customer?.name || '',
      inv.title || '',
      net.toFixed(2),
      vat.toFixed(2),
      gross.toFixed(2),
      inv.status || '',
      formatDate(inv.payment_date),
      inv.payment_method || ''
    ]));
  }

  return rows.join('\n');
}

export async function generateExpensesCSV(startDate: Date, endDate: Date): Promise<string> {
  const expenses = await fetchExpenses(startDate, endDate);

  const headers = ['Date', 'Vendor', 'Description', 'Category', 'Net Amount', 'VAT', 'Gross Amount', 'Payment Method', 'Job Reference', 'Reconciled'];
  const rows = [toCsvRow(headers)];

  for (const exp of expenses) {
    const netAmount = exp.amount - (exp.vat_amount || 0);
    rows.push(toCsvRow([
      formatDate(exp.expense_date),
      exp.vendor,
      exp.description || '',
      exp.category || '',
      netAmount.toFixed(2),
      (exp.vat_amount || 0).toFixed(2),
      exp.amount.toFixed(2),
      exp.payment_method || '',
      exp.job_pack?.title || '',
      exp.is_reconciled ? 'yes' : 'no'
    ]));
  }

  return rows.join('\n');
}

export async function generateBankCSV(startDate: Date, endDate: Date): Promise<string> {
  const transactions = await fetchBankTransactions(startDate, endDate);

  const headers = ['Date', 'Description', 'Amount', 'Balance', 'Type', 'Reconciled', 'Matched To'];
  const rows = [toCsvRow(headers)];

  for (const tx of transactions) {
    let matchedTo = '';
    if (tx.reconciled_expense_id) matchedTo = `EXP-${tx.reconciled_expense_id.slice(0, 8)}`;
    else if (tx.reconciled_invoice_id) matchedTo = `INV-${tx.reconciled_invoice_id.slice(0, 8)}`;

    rows.push(toCsvRow([
      formatDate(tx.transaction_date),
      tx.description,
      tx.amount.toFixed(2),
      tx.balance?.toFixed(2) || '',
      tx.amount >= 0 ? 'credit' : 'debit',
      tx.is_reconciled ? 'yes' : 'no',
      matchedTo
    ]));
  }

  return rows.join('\n');
}

export async function generatePayablesCSV(startDate: Date, endDate: Date): Promise<string> {
  const payables = await fetchPayables(startDate, endDate);

  const headers = ['Date', 'Vendor', 'Invoice Number', 'Description', 'Category', 'Amount', 'VAT', 'Due Date', 'Status', 'Amount Paid'];
  const rows = [toCsvRow(headers)];

  for (const pay of payables) {
    const netAmount = pay.amount - (pay.vat_amount || 0);
    rows.push(toCsvRow([
      formatDate(pay.invoice_date),
      pay.vendor_name,
      pay.invoice_number || '',
      pay.description || '',
      pay.category || '',
      netAmount.toFixed(2),
      (pay.vat_amount || 0).toFixed(2),
      formatDate(pay.due_date),
      pay.status || '',
      (pay.amount_paid || 0).toFixed(2)
    ]));
  }

  return rows.join('\n');
}

export async function generateCustomersCSV(): Promise<string> {
  const customers = await fetchCustomers();

  const headers = ['Name', 'Company', 'Email', 'Phone', 'Address', 'Created Date'];
  const rows = [toCsvRow(headers)];

  for (const cust of customers) {
    rows.push(toCsvRow([
      cust.name,
      cust.company || '',
      cust.email || '',
      cust.phone || '',
      cust.address || '',
      formatDate(cust.created_at)
    ]));
  }

  return rows.join('\n');
}

export async function generateQuotesCSV(startDate: Date, endDate: Date): Promise<string> {
  const quotes = await fetchQuotes(startDate, endDate);

  const headers = ['Date', 'Reference', 'Customer', 'Title', 'Type', 'Status', 'Net Amount', 'VAT', 'Gross Amount'];
  const rows = [toCsvRow(headers)];

  for (const quote of quotes) {
    const { net, vat, gross } = calculateInvoiceTotal(quote);
    rows.push(toCsvRow([
      formatDate(quote.date),
      quote.reference_number ? `${quote.type === 'quotation' ? 'QUO' : 'EST'}-${String(quote.reference_number).padStart(4, '0')}` : '',
      quote.customer?.name || '',
      quote.title || '',
      quote.type || '',
      quote.status || '',
      net.toFixed(2),
      vat.toFixed(2),
      gross.toFixed(2)
    ]));
  }

  return rows.join('\n');
}

export async function generateSummaryCSV(startDate: Date, endDate: Date): Promise<string> {
  // Fetch all data for summary
  const [invoices, expenses, bankTransactions, payables] = await Promise.all([
    fetchInvoices(startDate, endDate),
    fetchExpenses(startDate, endDate),
    fetchBankTransactions(startDate, endDate),
    fetchPayables(startDate, endDate)
  ]);

  // Calculate totals
  const salesTotals = invoices.reduce((acc, inv) => {
    const { net, vat, gross } = calculateInvoiceTotal(inv);
    return {
      gross: acc.gross + gross,
      vat: acc.vat + vat,
      net: acc.net + net
    };
  }, { gross: 0, vat: 0, net: 0 });

  const expenseTotals = expenses.reduce((acc, exp) => {
    const vat = exp.vat_amount || 0;
    return {
      gross: acc.gross + exp.amount,
      vat: acc.vat + vat,
      net: acc.net + (exp.amount - vat)
    };
  }, { gross: 0, vat: 0, net: 0 });

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const outstandingInvoices = invoices.filter(i => i.status !== 'paid');
  const outstandingTotal = outstandingInvoices.reduce((sum, inv) => {
    const { gross } = calculateInvoiceTotal(inv);
    return sum + gross;
  }, 0);

  const unpaidPayables = payables.filter(p => p.status !== 'paid');
  const unpaidPayablesTotal = unpaidPayables.reduce((sum, p) => sum + (p.amount - (p.amount_paid || 0)), 0);

  const vatLiability = salesTotals.vat - expenseTotals.vat;
  const netProfit = salesTotals.net - expenseTotals.net;

  const rows = [
    'Report Type,TradeSync Accountant Export',
    `Generated,${formatDateTime(new Date())}`,
    `Period,${formatDate(startDate)} to ${formatDate(endDate)}`,
    '',
    'Summary',
    `Total Sales (Gross),${salesTotals.gross.toFixed(2)}`,
    `Total Sales (Net),${salesTotals.net.toFixed(2)}`,
    `Total Sales VAT (Output),${salesTotals.vat.toFixed(2)}`,
    `Total Expenses (Gross),${expenseTotals.gross.toFixed(2)}`,
    `Total Expenses (Net),${expenseTotals.net.toFixed(2)}`,
    `Total Expenses VAT (Input),${expenseTotals.vat.toFixed(2)}`,
    `VAT Liability (Output - Input),${vatLiability.toFixed(2)}`,
    `Net Profit,${netProfit.toFixed(2)}`,
    '',
    'Record Counts',
    `Invoices,${invoices.length}`,
    `Paid Invoices,${paidInvoices.length}`,
    `Expenses,${expenses.length}`,
    `Bank Transactions,${bankTransactions.length}`,
    `Outstanding Receivables,${outstandingInvoices.length}`,
    `Outstanding Receivables Value,${outstandingTotal.toFixed(2)}`,
    `Outstanding Payables,${unpaidPayables.length}`,
    `Outstanding Payables Value,${unpaidPayablesTotal.toFixed(2)}`
  ];

  return rows.join('\n');
}

// ============================================
// README Generator
// ============================================

function generateReadme(options: ExportOptions): string {
  return `TradeSync Accountant Export
===========================

Generated: ${formatDateTime(new Date())}
Period: ${formatDate(options.startDate)} to ${formatDate(options.endDate)}
${options.companyName ? `Company: ${options.companyName}` : ''}

File Contents
-------------
${options.includeSales ? '- sales_invoices.csv: All invoices for the period\n' : ''}${options.includeExpenses ? '- expenses.csv: All business expenses for the period\n' : ''}${options.includeBankTransactions ? '- bank_transactions.csv: All bank transactions for the period\n' : ''}${options.includePayables ? '- payables.csv: Bills and supplier invoices\n' : ''}${options.includeCustomers ? '- customers.csv: Customer directory\n' : ''}${options.includeQuotes ? '- quotes.csv: Quotes and estimates for the period\n' : ''}- summary.csv: Financial summary and record counts

Column Definitions
------------------

SALES/INVOICES:
- Date: Invoice date (YYYY-MM-DD)
- Invoice Number: Unique reference (INV-xxxx)
- Customer: Customer name
- Description: Invoice title/description
- Net Amount: Total before VAT
- VAT: Value Added Tax amount
- Gross Amount: Total including VAT
- Status: draft/sent/accepted/paid
- Payment Date: When payment was received
- Payment Method: cash/card/bank_transfer/cheque

EXPENSES:
- Date: Expense date (YYYY-MM-DD)
- Vendor: Supplier/payee name
- Description: What was purchased
- Category: Expense category (materials, tools, fuel, etc.)
- Net Amount: Amount before VAT
- VAT: VAT amount if applicable
- Gross Amount: Total paid
- Payment Method: How it was paid
- Job Reference: Associated job pack (if any)
- Reconciled: Whether matched to bank transaction

BANK TRANSACTIONS:
- Date: Transaction date (YYYY-MM-DD)
- Description: Bank statement description
- Amount: Transaction amount (negative for debits)
- Balance: Account balance after transaction
- Type: credit/debit
- Reconciled: Whether matched to expense/invoice
- Matched To: Reference to matched record

PAYABLES (Bills):
- Date: Invoice/bill date
- Vendor: Supplier name
- Invoice Number: Supplier's invoice reference
- Description: What was purchased
- Category: Expense category
- Amount: Net amount
- VAT: VAT amount
- Due Date: Payment deadline
- Status: unpaid/partial/paid/overdue
- Amount Paid: Payments made so far

Notes
-----
- All amounts are in GBP
- Dates are in ISO format (YYYY-MM-DD) for correct Excel sorting
- Numbers do not include currency symbols for easier calculations
- VAT is calculated at 20% standard rate unless otherwise noted

For queries about this export, contact the business owner.

Generated by TradeSync (https://tradesync.app)
`;
}

// ============================================
// Combined CSV Generator
// ============================================

async function generateCombinedCSV(options: ExportOptions): Promise<string> {
  const sections: string[] = [];

  // Add summary
  sections.push('=== SUMMARY ===');
  sections.push(await generateSummaryCSV(options.startDate, options.endDate));
  sections.push('');

  if (options.includeSales) {
    sections.push('=== SALES/INVOICES ===');
    sections.push(await generateSalesCSV(options.startDate, options.endDate));
    sections.push('');
  }

  if (options.includeExpenses) {
    sections.push('=== EXPENSES ===');
    sections.push(await generateExpensesCSV(options.startDate, options.endDate));
    sections.push('');
  }

  if (options.includeBankTransactions) {
    sections.push('=== BANK TRANSACTIONS ===');
    sections.push(await generateBankCSV(options.startDate, options.endDate));
    sections.push('');
  }

  if (options.includePayables) {
    sections.push('=== PAYABLES (BILLS) ===');
    sections.push(await generatePayablesCSV(options.startDate, options.endDate));
    sections.push('');
  }

  if (options.includeCustomers) {
    sections.push('=== CUSTOMERS ===');
    sections.push(await generateCustomersCSV());
    sections.push('');
  }

  if (options.includeQuotes) {
    sections.push('=== QUOTES/ESTIMATES ===');
    sections.push(await generateQuotesCSV(options.startDate, options.endDate));
    sections.push('');
  }

  return sections.join('\n');
}

// ============================================
// Main Export Function
// ============================================

export async function generateExportBundle(
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const reportProgress = (stage: string, percent: number) => {
    onProgress?.({ stage, percent });
  };

  const companySlug = (options.companyName || 'export')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);

  const dateRange = `${formatDate(options.startDate)}_to_${formatDate(options.endDate)}`;

  if (options.exportFormat === 'combined') {
    reportProgress('Generating combined CSV...', 10);
    const combinedCsv = await generateCombinedCSV(options);
    reportProgress('Complete', 100);

    return new Blob([combinedCsv], { type: 'text/csv;charset=utf-8' });
  }

  // ZIP bundle format
  const zip = new JSZip();
  let progressStep = 0;
  const totalSteps = [
    options.includeSales,
    options.includeExpenses,
    options.includeBankTransactions,
    options.includePayables,
    options.includeCustomers,
    options.includeQuotes,
    true, // summary
    true  // readme
  ].filter(Boolean).length;

  const stepPercent = 90 / totalSteps;

  // Generate and add files
  if (options.includeSales) {
    reportProgress('Generating sales/invoices...', Math.round(progressStep * stepPercent));
    const salesCsv = await generateSalesCSV(options.startDate, options.endDate);
    zip.file('sales_invoices.csv', salesCsv);
    progressStep++;
  }

  if (options.includeExpenses) {
    reportProgress('Generating expenses...', Math.round(progressStep * stepPercent));
    const expensesCsv = await generateExpensesCSV(options.startDate, options.endDate);
    zip.file('expenses.csv', expensesCsv);
    progressStep++;
  }

  if (options.includeBankTransactions) {
    reportProgress('Generating bank transactions...', Math.round(progressStep * stepPercent));
    const bankCsv = await generateBankCSV(options.startDate, options.endDate);
    zip.file('bank_transactions.csv', bankCsv);
    progressStep++;
  }

  if (options.includePayables) {
    reportProgress('Generating payables...', Math.round(progressStep * stepPercent));
    const payablesCsv = await generatePayablesCSV(options.startDate, options.endDate);
    zip.file('payables.csv', payablesCsv);
    progressStep++;
  }

  if (options.includeCustomers) {
    reportProgress('Generating customers...', Math.round(progressStep * stepPercent));
    const customersCsv = await generateCustomersCSV();
    zip.file('customers.csv', customersCsv);
    progressStep++;
  }

  if (options.includeQuotes) {
    reportProgress('Generating quotes...', Math.round(progressStep * stepPercent));
    const quotesCsv = await generateQuotesCSV(options.startDate, options.endDate);
    zip.file('quotes.csv', quotesCsv);
    progressStep++;
  }

  // Always include summary
  reportProgress('Generating summary...', Math.round(progressStep * stepPercent));
  const summaryCsv = await generateSummaryCSV(options.startDate, options.endDate);
  zip.file('summary.csv', summaryCsv);
  progressStep++;

  // Add README
  reportProgress('Creating README...', Math.round(progressStep * stepPercent));
  const readme = generateReadme(options);
  zip.file('README.txt', readme);

  // Generate ZIP
  reportProgress('Creating ZIP archive...', 95);
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  reportProgress('Complete', 100);
  return zipBlob;
}

// ============================================
// Export Filename Generator
// ============================================

export function generateExportFilename(options: ExportOptions): string {
  const companySlug = (options.companyName || 'TradeSync')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);

  const dateRange = `${formatDate(options.startDate)}_to_${formatDate(options.endDate)}`;
  const extension = options.exportFormat === 'zip' ? 'zip' : 'csv';

  return `TradeSync_Export_${companySlug}_${dateRange}.${extension}`;
}

// ============================================
// Preview Function (for showing record counts)
// ============================================

export interface ExportPreview {
  invoiceCount: number;
  expenseCount: number;
  bankTransactionCount: number;
  payableCount: number;
  customerCount: number;
  quoteCount: number;
  totalSales: number;
  totalExpenses: number;
}

export async function getExportPreview(startDate: Date, endDate: Date): Promise<ExportPreview> {
  const [invoices, expenses, bankTransactions, payables, customers, quotes] = await Promise.all([
    fetchInvoices(startDate, endDate),
    fetchExpenses(startDate, endDate),
    fetchBankTransactions(startDate, endDate),
    fetchPayables(startDate, endDate),
    fetchCustomers(),
    fetchQuotes(startDate, endDate)
  ]);

  const totalSales = invoices.reduce((sum, inv) => {
    const { gross } = calculateInvoiceTotal(inv);
    return sum + gross;
  }, 0);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return {
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
    bankTransactionCount: bankTransactions.length,
    payableCount: payables.length,
    customerCount: customers.length,
    quoteCount: quotes.length,
    totalSales,
    totalExpenses
  };
}
