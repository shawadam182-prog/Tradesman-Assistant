import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteActions } from '../../components/quote-view/QuoteActions';
import { createMockQuote, createMockCustomer, createMockInvoice } from '../test/factories';

// Mock the haptic hooks
vi.mock('../../src/hooks/useHaptic', () => ({
  hapticSuccess: vi.fn(),
}));

describe('QuoteActions', () => {
  const defaultProps = {
    quote: createMockQuote(),
    customer: createMockCustomer(),
    isDownloading: false,
    showCustomiser: false,
    onBack: vi.fn(),
    onEdit: vi.fn(),
    onUpdateStatus: vi.fn(),
    onToggleCustomiser: vi.fn(),
    onDuplicate: vi.fn(),
    onConvertToInvoice: vi.fn(),
    onRecordPayment: vi.fn(),
    onEmailShare: vi.fn(),
    onWhatsAppShare: vi.fn(),
    onDownloadPDF: vi.fn(),
    onOpenMaps: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the quote header', () => {
    render(<QuoteActions {...defaultProps} />);
    expect(screen.getByText('Quote Details')).toBeInTheDocument();
  });

  it('renders invoice header for invoice type', () => {
    const invoice = createMockInvoice();
    render(<QuoteActions {...defaultProps} quote={invoice} />);
    expect(screen.getByText('Invoice Details')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<QuoteActions {...defaultProps} onBack={onBack} />);

    // Find and click back button
    const backButton = screen.getAllByRole('button')[0];
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalled();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<QuoteActions {...defaultProps} onEdit={onEdit} />);

    // Find edit button (second button in header)
    const buttons = screen.getAllByRole('button');
    const editButton = buttons[1];
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalled();
  });

  it('shows "Mark as Sent" for draft quotes', () => {
    const quote = createMockQuote({ status: 'draft' });
    render(<QuoteActions {...defaultProps} quote={quote} />);

    expect(screen.getByText('Mark as Sent')).toBeInTheDocument();
  });

  it('calls onUpdateStatus with "sent" when Mark as Sent is clicked', () => {
    const onUpdateStatus = vi.fn();
    const quote = createMockQuote({ status: 'draft' });
    render(<QuoteActions {...defaultProps} quote={quote} onUpdateStatus={onUpdateStatus} />);

    fireEvent.click(screen.getByText('Mark as Sent'));

    expect(onUpdateStatus).toHaveBeenCalledWith('sent');
  });

  it('shows accept/decline buttons for sent quotes', () => {
    const quote = createMockQuote({ status: 'sent' });
    render(<QuoteActions {...defaultProps} quote={quote} />);

    expect(screen.getByText('Customer Accepted')).toBeInTheDocument();
    expect(screen.getByText('Customer Declined')).toBeInTheDocument();
  });

  it('shows "Accepted - Ready to Invoice" status for accepted quotes', () => {
    const quote = createMockQuote({ status: 'accepted' });
    render(<QuoteActions {...defaultProps} quote={quote} />);

    expect(screen.getByText('Accepted - Ready to Invoice')).toBeInTheDocument();
  });

  it('shows "Quote Declined" status for declined quotes', () => {
    const quote = createMockQuote({ status: 'declined' });
    render(<QuoteActions {...defaultProps} quote={quote} />);

    expect(screen.getByText('Quote Declined')).toBeInTheDocument();
  });

  it('shows Layout button', () => {
    render(<QuoteActions {...defaultProps} />);
    expect(screen.getByText('Layout')).toBeInTheDocument();
  });

  it('calls onToggleCustomiser when Layout is clicked', () => {
    const onToggleCustomiser = vi.fn();
    render(<QuoteActions {...defaultProps} onToggleCustomiser={onToggleCustomiser} />);

    fireEvent.click(screen.getByText('Layout'));

    expect(onToggleCustomiser).toHaveBeenCalled();
  });

  it('shows Duplicate button when onDuplicate is provided', () => {
    render(<QuoteActions {...defaultProps} />);
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  it('shows "To Invoice" button for quotes that can be converted', () => {
    const quote = createMockQuote({ status: 'accepted' });
    render(<QuoteActions {...defaultProps} quote={quote} />);

    expect(screen.getByText('To Invoice')).toBeInTheDocument();
  });

  it('shows "Record Payment" button for unpaid invoices', () => {
    const invoice = createMockInvoice({ status: 'sent' });
    render(<QuoteActions {...defaultProps} quote={invoice} />);

    expect(screen.getByText('Record Payment')).toBeInTheDocument();
  });

  it('hides "Record Payment" for paid invoices', () => {
    const invoice = createMockInvoice({ status: 'paid' });
    render(<QuoteActions {...defaultProps} quote={invoice} />);

    expect(screen.queryByText('Record Payment')).not.toBeInTheDocument();
  });

  it('shows Map button when customer has address', () => {
    const customer = createMockCustomer({ address: '123 Test Street' });
    render(<QuoteActions {...defaultProps} customer={customer} />);

    expect(screen.getByText('Map')).toBeInTheDocument();
  });

  it('hides Map button when customer has no address', () => {
    const customer = createMockCustomer({ address: undefined });
    render(<QuoteActions {...defaultProps} customer={customer} />);

    expect(screen.queryByText('Map')).not.toBeInTheDocument();
  });

  it('disables download button when isDownloading is true', () => {
    render(<QuoteActions {...defaultProps} isDownloading={true} />);

    // Find buttons that should be disabled
    const buttons = screen.getAllByRole('button');
    const downloadButtons = buttons.filter(btn => btn.title === 'Download PDF' || btn.title === 'Email with PDF');

    downloadButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('does not show status actions for invoices', () => {
    const invoice = createMockInvoice();
    render(<QuoteActions {...defaultProps} quote={invoice} />);

    // Invoice type should not have quote status actions
    expect(screen.queryByText('Mark as Sent')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer Accepted')).not.toBeInTheDocument();
  });
});
