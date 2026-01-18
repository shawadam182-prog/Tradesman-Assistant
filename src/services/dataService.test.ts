import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  customersService,
  quotesService,
  expensesService,
  jobPacksService,
} from './dataService';
import {
  createMockCustomer,
  createMockQuote,
  createMockQuoteSection,
  createMockMaterialItem,
  createMockExpense,
  createMockJobPack,
  resetIdCounter,
} from '../test/factories';
import {
  mockUser,
  resetSupabaseMocks,
} from '../test/mocks/supabase';

// Mock the supabase module
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();

// Create chainable mock
function createChainableMock() {
  const chain = {
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    update: mockUpdate.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    single: mockSingle,
    gte: mockGte.mockReturnThis(),
    lte: mockLte.mockReturnThis(),
  };
  return chain;
}

const mockFrom = vi.fn(() => createChainableMock());
const mockGetUser = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: {
      getUser: () => mockGetUser(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/signed-url' },
          error: null,
        }),
      })),
    },
    rpc: vi.fn(),
  },
}));

describe('dataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetIdCounter();
    resetSupabaseMocks();

    // Default authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // CUSTOMERS SERVICE
  // ============================================

  describe('customersService', () => {
    describe('getAll', () => {
      it('returns transformed customers ordered by name', async () => {
        const mockCustomers = [
          { id: 'c1', name: 'Alice', email: 'alice@test.com', phone: '123', address: '123 St' },
          { id: 'c2', name: 'Bob', email: 'bob@test.com', phone: '456', address: '456 Ave' },
        ];

        mockOrder.mockResolvedValueOnce({ data: mockCustomers, error: null });

        const result = await customersService.getAll();

        expect(mockFrom).toHaveBeenCalledWith('customers');
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(mockOrder).toHaveBeenCalledWith('name');
        expect(result).toEqual(mockCustomers);
        expect(result).toHaveLength(2);
      });

      it('throws error when query fails', async () => {
        const dbError = { message: 'Database connection failed', code: 'PGRST000' };
        mockOrder.mockResolvedValueOnce({ data: null, error: dbError });

        await expect(customersService.getAll()).rejects.toEqual(dbError);
      });

      it('returns empty array when no customers exist', async () => {
        mockOrder.mockResolvedValueOnce({ data: [], error: null });

        const result = await customersService.getAll();

        expect(result).toEqual([]);
      });
    });

    describe('getById', () => {
      it('returns single customer by id', async () => {
        const mockCustomer = createMockCustomer({ id: 'cust-123' });
        const dbCustomer = {
          id: mockCustomer.id,
          name: mockCustomer.name,
          email: mockCustomer.email,
          phone: mockCustomer.phone,
          address: mockCustomer.address,
          company: mockCustomer.company || null,
        };

        mockSingle.mockResolvedValueOnce({ data: dbCustomer, error: null });

        const result = await customersService.getById('cust-123');

        expect(mockFrom).toHaveBeenCalledWith('customers');
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(mockEq).toHaveBeenCalledWith('id', 'cust-123');
        expect(result).toEqual(dbCustomer);
      });

      it('throws error when customer not found', async () => {
        const notFoundError = { message: 'Row not found', code: 'PGRST116' };
        mockSingle.mockResolvedValueOnce({ data: null, error: notFoundError });

        await expect(customersService.getById('nonexistent')).rejects.toEqual(notFoundError);
      });
    });

    describe('create', () => {
      it('calls insert with customer data and returns created customer', async () => {
        const newCustomer = {
          name: 'New Customer',
          email: 'new@test.com',
          phone: '07700 900999',
          address: '789 New St',
          user_id: mockUser.id,
        };

        const createdCustomer = { id: 'new-id', ...newCustomer };
        mockSingle.mockResolvedValueOnce({ data: createdCustomer, error: null });

        const result = await customersService.create(newCustomer);

        expect(mockFrom).toHaveBeenCalledWith('customers');
        expect(mockInsert).toHaveBeenCalledWith(newCustomer);
        expect(mockSelect).toHaveBeenCalled();
        expect(result).toEqual(createdCustomer);
      });

      it('throws error on duplicate email', async () => {
        const duplicateError = { message: 'duplicate key value', code: '23505' };
        mockSingle.mockResolvedValueOnce({ data: null, error: duplicateError });

        await expect(customersService.create({
          name: 'Test',
          email: 'existing@test.com',
          phone: '123',
          address: '123 St',
          user_id: mockUser.id,
        })).rejects.toEqual(duplicateError);
      });
    });

    describe('update', () => {
      it('only updates provided fields', async () => {
        const updates = { name: 'Updated Name' };
        const updatedCustomer = {
          id: 'cust-123',
          name: 'Updated Name',
          email: 'original@test.com',
          phone: '123',
          address: '123 St',
        };

        mockSingle.mockResolvedValueOnce({ data: updatedCustomer, error: null });

        const result = await customersService.update('cust-123', updates);

        expect(mockFrom).toHaveBeenCalledWith('customers');
        expect(mockUpdate).toHaveBeenCalledWith(updates);
        expect(mockEq).toHaveBeenCalledWith('id', 'cust-123');
        expect(result.name).toBe('Updated Name');
        expect(result.email).toBe('original@test.com');
      });

      it('can update multiple fields at once', async () => {
        const updates = { name: 'New Name', email: 'new@email.com', phone: '999' };
        const updatedCustomer = {
          id: 'cust-123',
          ...updates,
          address: '123 St',
        };

        mockSingle.mockResolvedValueOnce({ data: updatedCustomer, error: null });

        const result = await customersService.update('cust-123', updates);

        expect(mockUpdate).toHaveBeenCalledWith(updates);
        expect(result).toEqual(updatedCustomer);
      });

      it('throws error when customer does not exist', async () => {
        const notFoundError = { message: 'Row not found', code: 'PGRST116' };
        mockSingle.mockResolvedValueOnce({ data: null, error: notFoundError });

        await expect(customersService.update('nonexistent', { name: 'Test' }))
          .rejects.toEqual(notFoundError);
      });
    });

    describe('delete', () => {
      it('removes customer by id', async () => {
        mockEq.mockResolvedValueOnce({ data: null, error: null });

        await customersService.delete('cust-123');

        expect(mockFrom).toHaveBeenCalledWith('customers');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'cust-123');
      });

      it('throws error when delete fails due to foreign key constraint', async () => {
        const fkError = { message: 'foreign key violation', code: '23503' };
        mockEq.mockResolvedValueOnce({ data: null, error: fkError });

        await expect(customersService.delete('cust-with-quotes')).rejects.toEqual(fkError);
      });
    });
  });

  // ============================================
  // QUOTES SERVICE
  // ============================================

  describe('quotesService', () => {
    describe('getAll', () => {
      it('returns quotes with customer join', async () => {
        const mockQuotes = [
          {
            id: 'q1',
            title: 'Quote 1',
            customer_id: 'c1',
            customer: { id: 'c1', name: 'John Smith' },
            sections: JSON.stringify([]),
            status: 'draft',
            type: 'quotation',
          },
          {
            id: 'q2',
            title: 'Quote 2',
            customer_id: 'c2',
            customer: { id: 'c2', name: 'Jane Doe' },
            sections: JSON.stringify([]),
            status: 'sent',
            type: 'quotation',
          },
        ];

        mockOrder.mockResolvedValueOnce({ data: mockQuotes, error: null });

        const result = await quotesService.getAll();

        expect(mockFrom).toHaveBeenCalledWith('quotes');
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('customer:customers'));
        expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false });
        expect(result).toHaveLength(2);
        expect(result[0].customer).toEqual({ id: 'c1', name: 'John Smith' });
      });

      it('returns empty array when no quotes exist', async () => {
        mockOrder.mockResolvedValueOnce({ data: [], error: null });

        const result = await quotesService.getAll();

        expect(result).toEqual([]);
      });
    });

    describe('create', () => {
      it('creates quote with proper section serialization', async () => {
        const sections = [
          createMockQuoteSection({
            title: 'Kitchen',
            items: [
              createMockMaterialItem({ name: 'Timber', quantity: 10, unitPrice: 5, totalPrice: 50 }),
            ],
            labourHours: 8,
          }),
        ];

        const quoteData = {
          user_id: mockUser.id,
          customer_id: 'cust-123',
          title: 'Kitchen Renovation',
          sections: JSON.stringify(sections),
          labour_rate: 50,
          markup_percent: 10,
          tax_percent: 20,
          cis_percent: 0,
          status: 'draft' as const,
          type: 'quotation' as const,
        };

        const createdQuote = { id: 'new-quote-id', ...quoteData };
        mockSingle.mockResolvedValueOnce({ data: createdQuote, error: null });

        const result = await quotesService.create(quoteData);

        expect(mockFrom).toHaveBeenCalledWith('quotes');
        expect(mockInsert).toHaveBeenCalledWith(quoteData);
        expect(result.id).toBe('new-quote-id');
        expect(result.sections).toBe(JSON.stringify(sections));
      });

      it('throws error on missing required fields', async () => {
        const validationError = { message: 'null value in column "customer_id"', code: '23502' };
        mockSingle.mockResolvedValueOnce({ data: null, error: validationError });

        await expect(quotesService.create({
          user_id: mockUser.id,
          title: 'Test',
        } as any)).rejects.toEqual(validationError);
      });
    });

    describe('update', () => {
      it('preserves existing fields when updating', async () => {
        const existingQuote = {
          id: 'q1',
          title: 'Original Title',
          customer_id: 'cust-1',
          sections: JSON.stringify([]),
          labour_rate: 50,
          markup_percent: 10,
          tax_percent: 20,
          cis_percent: 0,
          status: 'draft',
          type: 'quotation',
          notes: 'Original notes',
        };

        const updates = { status: 'sent' as const };
        const updatedQuote = { ...existingQuote, ...updates };

        mockSingle.mockResolvedValueOnce({ data: updatedQuote, error: null });

        const result = await quotesService.update('q1', updates);

        expect(mockUpdate).toHaveBeenCalledWith(updates);
        expect(result.status).toBe('sent');
        expect(result.title).toBe('Original Title');
        expect(result.notes).toBe('Original notes');
      });

      it('can update sections while preserving other fields', async () => {
        const newSections = [
          createMockQuoteSection({
            title: 'Updated Section',
            items: [createMockMaterialItem({ name: 'New Material' })],
          }),
        ];

        const updates = { sections: JSON.stringify(newSections) };
        const updatedQuote = {
          id: 'q1',
          title: 'Existing Title',
          sections: JSON.stringify(newSections),
          status: 'draft',
        };

        mockSingle.mockResolvedValueOnce({ data: updatedQuote, error: null });

        const result = await quotesService.update('q1', updates);

        expect(mockUpdate).toHaveBeenCalledWith(updates);
        expect(JSON.parse(result.sections as string)[0].title).toBe('Updated Section');
      });
    });

    describe('converting quote to invoice', () => {
      it('changes type and status when converting to invoice', async () => {
        const updates = {
          type: 'invoice' as const,
          status: 'sent' as const,
          due_date: '2024-02-15',
          reference_number: 1001,
        };

        const convertedQuote = {
          id: 'q1',
          title: 'Kitchen Renovation',
          type: 'invoice',
          status: 'sent',
          due_date: '2024-02-15',
          reference_number: 1001,
          sections: JSON.stringify([]),
        };

        mockSingle.mockResolvedValueOnce({ data: convertedQuote, error: null });

        const result = await quotesService.update('q1', updates);

        expect(mockUpdate).toHaveBeenCalledWith(updates);
        expect(result.type).toBe('invoice');
        expect(result.status).toBe('sent');
        expect(result.due_date).toBe('2024-02-15');
        expect(result.reference_number).toBe(1001);
      });

      it('sets parent_quote_id when creating invoice from quote', async () => {
        const invoiceData = {
          user_id: mockUser.id,
          customer_id: 'cust-123',
          title: 'Invoice for Kitchen Renovation',
          type: 'invoice' as const,
          status: 'sent' as const,
          parent_quote_id: 'original-quote-id',
          sections: JSON.stringify([]),
        };

        const createdInvoice = { id: 'inv-1', ...invoiceData };
        mockSingle.mockResolvedValueOnce({ data: createdInvoice, error: null });

        const result = await quotesService.create(invoiceData);

        expect(result.parent_quote_id).toBe('original-quote-id');
        expect(result.type).toBe('invoice');
      });
    });

    describe('delete', () => {
      it('removes quote by id', async () => {
        mockEq.mockResolvedValueOnce({ data: null, error: null });

        await quotesService.delete('q1');

        expect(mockFrom).toHaveBeenCalledWith('quotes');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'q1');
      });
    });
  });

  // ============================================
  // EXPENSES SERVICE
  // ============================================

  describe('expensesService', () => {
    describe('getAll', () => {
      it('returns expenses with job_pack join', async () => {
        const mockExpenses = [
          {
            id: 'e1',
            vendor: 'Builders Merchant',
            amount: 250,
            vat_amount: 50,
            category: 'materials',
            expense_date: '2024-01-15',
            job_pack: { id: 'jp1', title: 'Kitchen Project' },
          },
          {
            id: 'e2',
            vendor: 'Shell',
            amount: 80,
            vat_amount: 13.33,
            category: 'fuel',
            expense_date: '2024-01-14',
            job_pack: null,
          },
        ];

        mockOrder.mockResolvedValueOnce({ data: mockExpenses, error: null });

        const result = await expensesService.getAll();

        expect(mockFrom).toHaveBeenCalledWith('expenses');
        expect(mockSelect).toHaveBeenCalledWith('*, job_pack:job_packs(id, title)');
        expect(mockOrder).toHaveBeenCalledWith('expense_date', { ascending: false });
        expect(result).toHaveLength(2);
        expect(result[0].job_pack).toEqual({ id: 'jp1', title: 'Kitchen Project' });
        expect(result[1].job_pack).toBeNull();
      });
    });

    describe('create', () => {
      it('creates expense with user_id from authenticated user', async () => {
        const expenseData = {
          vendor: 'Test Supplier',
          description: 'Test materials',
          amount: 100,
          vat_amount: 20,
          category: 'materials',
          expense_date: '2024-01-15',
          payment_method: 'card',
        };

        const createdExpense = {
          id: 'new-expense-id',
          user_id: mockUser.id,
          ...expenseData,
        };

        mockSingle.mockResolvedValueOnce({ data: createdExpense, error: null });

        const result = await expensesService.create(expenseData);

        expect(mockGetUser).toHaveBeenCalled();
        expect(mockInsert).toHaveBeenCalledWith({
          ...expenseData,
          user_id: mockUser.id,
        });
        expect(result.user_id).toBe(mockUser.id);
      });

      it('throws error when user is not authenticated', async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

        const expenseData = {
          vendor: 'Test',
          amount: 100,
          vat_amount: 20,
          category: 'materials',
          expense_date: '2024-01-15',
          payment_method: 'card',
        };

        await expect(expensesService.create(expenseData)).rejects.toThrow('Not authenticated');
      });

      it('creates expense with VAT calculation', async () => {
        const expenseData = {
          vendor: 'Supplier Ltd',
          amount: 120, // Net amount
          vat_amount: 24, // 20% VAT
          category: 'materials',
          expense_date: '2024-01-15',
          payment_method: 'card',
        };

        const createdExpense = {
          id: 'exp-1',
          user_id: mockUser.id,
          ...expenseData,
        };

        mockSingle.mockResolvedValueOnce({ data: createdExpense, error: null });

        const result = await expensesService.create(expenseData);

        expect(result.amount).toBe(120);
        expect(result.vat_amount).toBe(24);
      });

      it('links expense to job_pack when provided', async () => {
        const expenseData = {
          vendor: 'Supplier',
          amount: 100,
          vat_amount: 20,
          category: 'materials',
          expense_date: '2024-01-15',
          payment_method: 'card',
          job_pack_id: 'jp-123',
        };

        const createdExpense = {
          id: 'exp-1',
          user_id: mockUser.id,
          ...expenseData,
        };

        mockSingle.mockResolvedValueOnce({ data: createdExpense, error: null });

        const result = await expensesService.create(expenseData);

        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
          job_pack_id: 'jp-123',
        }));
        expect(result.job_pack_id).toBe('jp-123');
      });
    });

    describe('update', () => {
      it('updates expense fields', async () => {
        const updates = { amount: 150, vat_amount: 30 };
        const updatedExpense = {
          id: 'e1',
          vendor: 'Original Vendor',
          amount: 150,
          vat_amount: 30,
          category: 'materials',
        };

        mockSingle.mockResolvedValueOnce({ data: updatedExpense, error: null });

        const result = await expensesService.update('e1', updates);

        expect(mockUpdate).toHaveBeenCalledWith(updates);
        expect(result.amount).toBe(150);
        expect(result.vat_amount).toBe(30);
      });
    });

    describe('delete', () => {
      it('removes expense by id', async () => {
        mockEq.mockResolvedValueOnce({ data: null, error: null });

        await expensesService.delete('e1');

        expect(mockFrom).toHaveBeenCalledWith('expenses');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'e1');
      });
    });
  });

  // ============================================
  // JOB PACKS SERVICE
  // ============================================

  describe('jobPacksService', () => {
    describe('getAll', () => {
      it('returns job packs with related data', async () => {
        const mockJobPacks = [
          {
            id: 'jp1',
            title: 'Kitchen Renovation',
            customer_id: 'c1',
            status: 'active',
            customer: { id: 'c1', name: 'John Smith' },
            site_notes: [{ id: 'n1', text: 'Note 1' }],
            site_photos: [{ id: 'p1', caption: 'Photo 1' }, { id: 'p2', caption: 'Photo 2' }],
            site_documents: [],
            project_materials: [{ id: 'm1', name: 'Timber' }],
          },
          {
            id: 'jp2',
            title: 'Bathroom',
            customer_id: 'c2',
            status: 'completed',
            customer: { id: 'c2', name: 'Jane Doe' },
            site_notes: [],
            site_photos: [],
            site_documents: [{ id: 'd1', name: 'Plans.pdf' }],
            project_materials: [],
          },
        ];

        mockOrder.mockResolvedValueOnce({ data: mockJobPacks, error: null });

        const result = await jobPacksService.getAll();

        expect(mockFrom).toHaveBeenCalledWith('job_packs');
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('customer:customers'));
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('site_notes(*)'));
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('site_photos(*)'));
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('site_documents(*)'));
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('project_materials(*)'));
        expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false });
        expect(result).toHaveLength(2);
        expect(result[0].site_notes).toHaveLength(1);
        expect(result[0].site_photos).toHaveLength(2);
        expect(result[1].site_documents).toHaveLength(1);
      });

      it('returns empty array when no job packs exist', async () => {
        mockOrder.mockResolvedValueOnce({ data: [], error: null });

        const result = await jobPacksService.getAll();

        expect(result).toEqual([]);
      });
    });

    describe('getById', () => {
      it('returns single job pack with all related data', async () => {
        const mockJobPack = {
          id: 'jp1',
          title: 'Kitchen Renovation',
          customer_id: 'c1',
          status: 'active',
          notepad: 'Some notes here',
          customer: { id: 'c1', name: 'John Smith' },
          site_notes: [{ id: 'n1', text: 'Note 1' }],
          site_photos: [{ id: 'p1', caption: 'Photo 1' }],
          site_documents: [{ id: 'd1', name: 'Doc.pdf' }],
          project_materials: [],
        };

        mockSingle.mockResolvedValueOnce({ data: mockJobPack, error: null });

        const result = await jobPacksService.getById('jp1');

        expect(mockFrom).toHaveBeenCalledWith('job_packs');
        expect(mockEq).toHaveBeenCalledWith('id', 'jp1');
        expect(result.customer).toEqual({ id: 'c1', name: 'John Smith' });
        expect(result.site_notes).toHaveLength(1);
      });
    });

    describe('create', () => {
      it('creates job pack linked to customer', async () => {
        const jobPackData = {
          user_id: mockUser.id,
          customer_id: 'cust-123',
          title: 'New Kitchen Project',
          status: 'active' as const,
        };

        const createdJobPack = {
          id: 'new-jp-id',
          ...jobPackData,
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        };

        mockSingle.mockResolvedValueOnce({ data: createdJobPack, error: null });

        const result = await jobPacksService.create(jobPackData);

        expect(mockFrom).toHaveBeenCalledWith('job_packs');
        expect(mockInsert).toHaveBeenCalledWith(jobPackData);
        expect(result.customer_id).toBe('cust-123');
        expect(result.status).toBe('active');
      });

      it('throws error when customer does not exist', async () => {
        const fkError = { message: 'foreign key violation', code: '23503' };
        mockSingle.mockResolvedValueOnce({ data: null, error: fkError });

        await expect(jobPacksService.create({
          user_id: mockUser.id,
          customer_id: 'nonexistent',
          title: 'Test',
          status: 'active',
        })).rejects.toEqual(fkError);
      });
    });

    describe('update', () => {
      it('updates job pack status from active to completed', async () => {
        const updates = { status: 'completed' as const };
        const updatedJobPack = {
          id: 'jp1',
          title: 'Kitchen Project',
          customer_id: 'c1',
          status: 'completed',
        };

        mockSingle.mockResolvedValueOnce({ data: updatedJobPack, error: null });

        const result = await jobPacksService.update('jp1', updates);

        expect(mockUpdate).toHaveBeenCalledWith(updates);
        expect(result.status).toBe('completed');
      });

      it('updates job pack status from completed to archived', async () => {
        const updates = { status: 'archived' as const };
        const updatedJobPack = {
          id: 'jp1',
          title: 'Old Project',
          customer_id: 'c1',
          status: 'archived',
        };

        mockSingle.mockResolvedValueOnce({ data: updatedJobPack, error: null });

        const result = await jobPacksService.update('jp1', updates);

        expect(mockUpdate).toHaveBeenCalledWith(updates);
        expect(result.status).toBe('archived');
      });

      it('can reactivate an archived job pack', async () => {
        const updates = { status: 'active' as const };
        const updatedJobPack = {
          id: 'jp1',
          title: 'Reactivated Project',
          customer_id: 'c1',
          status: 'active',
        };

        mockSingle.mockResolvedValueOnce({ data: updatedJobPack, error: null });

        const result = await jobPacksService.update('jp1', updates);

        expect(result.status).toBe('active');
      });

      it('updates notepad content', async () => {
        const updates = { notepad: 'Updated notepad content with new notes' };
        const updatedJobPack = {
          id: 'jp1',
          title: 'Project',
          notepad: 'Updated notepad content with new notes',
          status: 'active',
        };

        mockSingle.mockResolvedValueOnce({ data: updatedJobPack, error: null });

        const result = await jobPacksService.update('jp1', updates);

        expect(result.notepad).toBe('Updated notepad content with new notes');
      });
    });

    describe('delete', () => {
      it('removes job pack by id', async () => {
        mockEq.mockResolvedValueOnce({ data: null, error: null });

        await jobPacksService.delete('jp1');

        expect(mockFrom).toHaveBeenCalledWith('job_packs');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'jp1');
      });

      it('cascade deletes related site_notes, photos, and documents', async () => {
        // This test documents expected behavior - the database should handle cascading
        mockEq.mockResolvedValueOnce({ data: null, error: null });

        await jobPacksService.delete('jp-with-data');

        expect(mockFrom).toHaveBeenCalledWith('job_packs');
        expect(mockDelete).toHaveBeenCalled();
        // The cascade deletion happens at the database level
      });
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('error handling', () => {
    it('propagates database errors correctly', async () => {
      const dbError = {
        message: 'connection refused',
        code: 'PGRST000',
        details: 'Database is unavailable',
      };
      mockOrder.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(customersService.getAll()).rejects.toEqual(dbError);
    });

    it('handles network errors', async () => {
      mockOrder.mockRejectedValueOnce(new Error('Network error'));

      await expect(customersService.getAll()).rejects.toThrow('Network error');
    });

    it('handles authentication errors in services requiring auth', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(expensesService.create({
        vendor: 'Test',
        amount: 100,
        vat_amount: 20,
        category: 'materials',
        expense_date: '2024-01-15',
        payment_method: 'card',
      })).rejects.toThrow('Not authenticated');
    });
  });
});
