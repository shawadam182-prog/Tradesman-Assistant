import React, { useState, useMemo, useEffect, Suspense, lazy, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { Home } from '../../components/Home';
import { JobPackList } from '../../components/JobPackList';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { OnboardingWizard } from '../../components/OnboardingWizard';

import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hapticSuccess } from '../hooks/useHaptic';
import { useHistoryNavigation } from '../hooks/useHistoryNavigation';
import { usePageTracking } from '../hooks/usePageTracking';
import { Quote, JobPack, Customer } from '../../types';
import { AlertCircle, FileWarning, Loader2 } from 'lucide-react';

// Lazy loaded components for code splitting
const CustomerManager = lazy(() => import('../../components/CustomerManager').then(m => ({ default: m.CustomerManager })));
const QuoteCreator = lazy(() => import('../../components/QuoteCreator').then(m => ({ default: m.QuoteCreator })));
const SettingsPage = lazy(() => import('../../components/SettingsPage').then(m => ({ default: m.SettingsPage })));
const QuoteView = lazy(() => import('../../components/QuoteView').then(m => ({ default: m.QuoteView })));
const JobPackView = lazy(() => import('../../components/JobPackView').then(m => ({ default: m.JobPackView })));
const QuotesList = lazy(() => import('../../components/QuotesList').then(m => ({ default: m.QuotesList })));
const InvoicesList = lazy(() => import('../../components/InvoicesList').then(m => ({ default: m.InvoicesList })));
const ScheduleCalendar = lazy(() => import('../../components/ScheduleCalendar').then(m => ({ default: m.ScheduleCalendar })));
const ExpensesPage = lazy(() => import('../../components/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const BankImportPage = lazy(() => import('../../components/BankImportPage').then(m => ({ default: m.BankImportPage })));
const ReconciliationPage = lazy(() => import('../../components/ReconciliationPage').then(m => ({ default: m.ReconciliationPage })));
const VATSummaryPage = lazy(() => import('../../components/VATSummaryPage').then(m => ({ default: m.VATSummaryPage })));
const ProfitLossPage = lazy(() => import('../../components/ProfitLossPage').then(m => ({ default: m.ProfitLossPage })));
const AgedPayablesPage = lazy(() => import('../../components/AgedPayablesPage').then(m => ({ default: m.AgedPayablesPage })));
const FilingCabinetPage = lazy(() => import('../../components/FilingCabinetPage').then(m => ({ default: m.FilingCabinetPage })));
const MaterialsLibrary = lazy(() => import('../../components/MaterialsLibrary').then(m => ({ default: m.MaterialsLibrary })));
const WholesalerAdmin = lazy(() => import('../../components/WholesalerAdmin').then(m => ({ default: m.WholesalerAdmin })));
const SupportRequestsAdmin = lazy(() => import('../../components/SupportRequestsAdmin').then(m => ({ default: m.SupportRequestsAdmin })));
const TrialUsersAdmin = lazy(() => import('../../components/TrialUsersAdmin').then(m => ({ default: m.TrialUsersAdmin })));
const FutureJobsPage = lazy(() => import('../../components/FutureJobsPage').then(m => ({ default: m.FutureJobsPage })));
const AccountantExportPage = lazy(() => import('../../components/AccountantExportPage').then(m => ({ default: m.AccountantExportPage })));
const AgedReceivablesPage = lazy(() => import('../../components/AgedReceivablesPage').then(m => ({ default: m.AgedReceivablesPage })));
const CreditNoteCreator = lazy(() => import('../../components/CreditNoteCreator').then(m => ({ default: m.CreditNoteCreator })));
const AIQuoteBuilder = lazy(() => import('../../components/AIQuoteBuilder').then(m => ({ default: m.AIQuoteBuilder })));
const TeamDashboard = lazy(() => import('../../components/TeamDashboard').then(m => ({ default: m.TeamDashboard })));
const TeamSettings = lazy(() => import('../../components/TeamSettings').then(m => ({ default: m.TeamSettings })));
const TimesheetApproval = lazy(() => import('../../components/TimesheetApproval').then(m => ({ default: m.TimesheetApproval })));

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
  </div>
);

// Tab type definition - matches navigation structure
type TabType =
  | 'home'
  | 'ai_quote_builder'
  | 'jobpacks'
  | 'quotes'
  | 'invoices'
  | 'aged_receivables'
  | 'customers'
  | 'schedule'
  | 'expenses'
  | 'materials'
  | 'files'
  | 'bank'
  | 'reconcile'
  | 'vat'
  | 'profitloss'
  | 'payables'
  | 'accountant_export'
  | 'settings'
  | 'wholesalers'
  | 'support'
  | 'trial_analytics'
  | 'future_jobs'
  | 'view'
  | 'jobpack_detail'
  | 'quote_edit'
  | 'credit_note'
  | 'team_dashboard'
  | 'team_settings'
  | 'timesheet_approval';

// Valid main tabs that can be restored after page reload (e.g., returning from camera)
const RESTORABLE_TABS: readonly TabType[] = ['home', 'ai_quote_builder', 'jobpacks', 'jobpack_detail', 'quotes', 'invoices', 'aged_receivables', 'customers', 'settings', 'schedule', 'expenses', 'bank', 'reconcile', 'vat', 'payables', 'accountant_export', 'files', 'materials', 'wholesalers', 'support', 'trial_analytics', 'future_jobs', 'view', 'quote_edit', 'profitloss', 'team_dashboard', 'team_settings', 'timesheet_approval'];
type RestorableTab = typeof RESTORABLE_TABS[number];

const App: React.FC = () => {
  const { signOut } = useAuth();
  const toast = useToast();
  const {
    customers, quotes, projects, schedule, settings,
    setCustomers, setSettings, updateSettings,
    addCustomer, updateCustomer, deleteCustomer, saveQuote, updateQuote, updateQuoteStatus, deleteQuote,
    addProject, saveProject, deleteProject,
    addScheduleEntry, updateScheduleEntry, deleteScheduleEntry,
    refresh,
  } = useData();

  // Restore tab from sessionStorage (handles iOS PWA state loss when camera opens)
  const getInitialTab = (): TabType => {
    try {
      const saved = sessionStorage.getItem('activeTab') as TabType | null;
      if (saved && RESTORABLE_TABS.includes(saved)) {
        return saved;
      }
    } catch (e) { /* sessionStorage not available */ }
    return 'home';
  };

  // Restore project ID from sessionStorage (handles iOS PWA state loss when camera opens)
  const getInitialProjectId = (): string | null => {
    try {
      return sessionStorage.getItem('activeProjectId');
    } catch (e) { /* sessionStorage not available */ }
    return null;
  };

  const [activeTab, setActiveTabState] = useState<TabType>(getInitialTab);

  // Wrapper to persist tab changes
  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    // Clear AI draft when leaving quote_edit
    if (tab !== 'quote_edit') setAiGeneratedDraft(null);
    try {
      if (RESTORABLE_TABS.includes(tab as RestorableTab)) {
        sessionStorage.setItem('activeTab', tab);
      }
    } catch (e) { /* sessionStorage not available */ }
  };

  const [editingQuoteId, setEditingQuoteIdState] = useState<string | null>(() => {
    try { return sessionStorage.getItem('editingQuoteId'); } catch { return null; }
  });
  const [viewingQuoteId, setViewingQuoteIdState] = useState<string | null>(() => {
    try { return sessionStorage.getItem('viewingQuoteId'); } catch { return null; }
  });

  const setEditingQuoteId = (id: string | null) => {
    setEditingQuoteIdState(id);
    try {
      if (id) { sessionStorage.setItem('editingQuoteId', id); }
      else { sessionStorage.removeItem('editingQuoteId'); }
    } catch { /* sessionStorage not available */ }
  };

  const setViewingQuoteId = (id: string | null) => {
    setViewingQuoteIdState(id);
    try {
      if (id) { sessionStorage.setItem('viewingQuoteId', id); }
      else { sessionStorage.removeItem('viewingQuoteId'); }
    } catch { /* sessionStorage not available */ }
  };
  const [activeProjectIdState, setActiveProjectIdState] = useState<string | null>(getInitialProjectId);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    const completed = localStorage.getItem('bq_onboarding_completed');
    if (!completed) {
      // Delay slightly so the app loads first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Wrapper to persist project ID changes (handles iOS PWA state loss when camera opens)
  const setActiveProjectId = (projectId: string | null) => {
    setActiveProjectIdState(projectId);
    try {
      if (projectId) {
        sessionStorage.setItem('activeProjectId', projectId);
      } else {
        sessionStorage.removeItem('activeProjectId');
      }
    } catch (e) { /* sessionStorage not available */ }
  };

  // Alias for backward compatibility
  const activeProjectId = activeProjectIdState;
  const [initialQuoteType, setInitialQuoteType] = useState<'estimate' | 'quotation' | 'invoice'>('estimate');
  const [aiGeneratedDraft, setAiGeneratedDraft] = useState<Partial<Quote> | null>(null);

  // Handle browser back button navigation
  useHistoryNavigation({
    activeTab,
    activeProjectId,
    viewingQuoteId,
    setActiveTab: setActiveTab as (tab: string) => void,
    setActiveProjectId,
    setViewingQuoteId,
  });

  // Track page views for analytics
  usePageTracking(activeTab);

  const handleCreateQuote = (projectId?: string) => {
    setEditingQuoteId(null);
    setActiveProjectId(projectId || null);
    setInitialQuoteType('estimate');
    setActiveTab('quote_edit');
  };

  const handleCreateInvoice = () => {
    setEditingQuoteId(null);
    setActiveProjectId(null);
    setInitialQuoteType('invoice');
    setActiveTab('quote_edit');
  };

  const handleAIQuoteComplete = useCallback((draft: Partial<Quote>) => {
    setAiGeneratedDraft(draft);
    setEditingQuoteId(null);
    setActiveProjectId(null);
    setInitialQuoteType((draft.type as any) || 'estimate');
    setActiveTab('quote_edit');
  }, []);

  const handleTakePhoto = (jobPackId?: string) => {
    if (jobPackId) {
      // Navigate to existing job pack
      setActiveProjectId(jobPackId);
      setActiveTab('jobpack_detail');
    } else {
      // Navigate to job packs to create new one
      setActiveTab('jobpacks');
    }
  };

  const handleEditQuote = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    setEditingQuoteId(quoteId);
    setActiveProjectId(quote?.projectId || null);
    setActiveTab('quote_edit');
  };

  const handleViewQuote = (quoteId: string) => {
    setViewingQuoteId(quoteId);
    setActiveTab('view');
  };

  const handleSaveQuote = async (quote: Quote) => {
    try {
      const saved = await saveQuote(quote);
      setViewingQuoteId(saved.id);
      setActiveTab('view');
      hapticSuccess();
      toast.success('Quote Saved', quote.title);
    } catch (error) {
      console.error('Failed to save quote:', error);
      toast.error('Save Failed', 'Could not save quote');
    }
  };

  const handleUpdateQuote = async (updatedQuote: Quote) => {
    try { await updateQuote(updatedQuote); } catch (error) { console.error('Failed:', error); }
  };

  const handleSaveProject = async (project: JobPack) => {
    try { await saveProject(project); } catch (error) { console.error('Failed:', error); }
  };

  const handleAddCustomer = async (customer: Customer): Promise<Customer> => {
    try {
      return await addCustomer(customer);
    } catch (error) {
      console.error('Failed:', error);
      toast.error('Failed to Add', 'Could not create customer');
      throw error;
    }
  };

  const handleUpdateQuoteStatus = async (id: string, status: Quote['status']) => {
    try { await updateQuoteStatus(id, status); } catch (error) { console.error('Failed:', error); }
  };

  const handleConvertToInvoice = async () => {
    if (!viewingQuoteId) return;
    const quote = quotes.find(q => q.id === viewingQuoteId);
    if (!quote) return;

    try {
      // Calculate default due date (14 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const invoiceQuote: Quote = {
        ...quote,
        id: '', // Will be generated
        type: 'invoice',
        status: 'draft',
        referenceNumber: undefined, // Will be auto-assigned
        date: new Date().toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        parentQuoteId: quote.id, // Link back to original quote
        notes: settings.defaultInvoiceNotes || quote.notes, // Use invoice notes
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const saved = await saveQuote(invoiceQuote);
      // Update original quote status to invoiced
      await updateQuoteStatus(viewingQuoteId, 'invoiced');
      setViewingQuoteId(saved.id);
      toast.success('Invoice Created', 'Quote converted to invoice with 14-day payment terms');
    } catch (error) {
      console.error('Failed to convert to invoice:', error);
      toast.error('Conversion Failed', 'Could not create invoice');
    }
  };

  const handleIssueCreditNote = () => {
    if (!viewingQuoteId) return;
    setActiveTab('credit_note');
  };

  const handleSaveCreditNote = async (creditNote: Quote) => {
    try {
      const saved = await saveQuote(creditNote);
      setViewingQuoteId(saved.id);
      setActiveTab('view');
      toast.success('Credit Note Issued', 'Credit note has been created');
    } catch (error) {
      console.error('Failed to create credit note:', error);
      toast.error('Failed', 'Could not create credit note');
    }
  };

  const handleDuplicateQuote = async () => {
    if (!viewingQuoteId) return;
    const quote = quotes.find(q => q.id === viewingQuoteId);
    if (!quote) return;

    try {
      const duplicatedQuote: Quote = {
        ...quote,
        id: '', // Will be generated
        title: `${quote.title} (Copy)`,
        status: 'draft',
        referenceNumber: undefined, // Will be auto-assigned
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const saved = await saveQuote(duplicatedQuote);
      setViewingQuoteId(saved.id);
      toast.info('Quote Duplicated', 'Created as new draft');
    } catch (error) {
      console.error('Failed to duplicate quote:', error);
      toast.error('Duplicate Failed', 'Could not copy quote');
    }
  };

  const openProject = (id: string) => {
    setActiveProjectId(id);
    setActiveTab('jobpack_detail');
  };

  const handleAddProject = async (project: JobPack, navigate = true): Promise<JobPack> => {
    const created = await addProject({
      title: project.title, customerId: project.customerId, status: project.status,
      notepad: project.notepad, notes: [], photos: [], drawings: [], documents: [], materials: [],
    });
    if (navigate) openProject(created.id);
    return created;
  };

  const activeProject = useMemo(() => activeProjectId ? projects.find(p => p.id === activeProjectId) || null : null, [projects, activeProjectId]);
  const activeViewQuote = useMemo(() => viewingQuoteId ? quotes.find(q => q.id === viewingQuoteId) : null, [quotes, viewingQuoteId]);
  const activeViewCustomer = useMemo(() => activeViewQuote ? customers.find(c => c.id === activeViewQuote.customerId) : null, [customers, activeViewQuote]);

  // Reset handler for page-level error boundary - navigates to safe home state
  const handleErrorReset = useCallback(() => {
    setActiveTab('home');
  }, []);

  return (
    <Layout activeTab={activeTab === 'view' || activeTab === 'jobpack_detail' || activeTab === 'quote_edit' || activeTab === 'credit_note' || activeTab === 'ai_quote_builder' ? '' : activeTab} setActiveTab={setActiveTab} onSignOut={signOut} onCreateJob={() => setActiveTab('jobpacks')} onCreateQuote={() => handleCreateQuote()} onCreateInvoice={handleCreateInvoice}>
      {/* Page-level error boundary - keeps navigation accessible if a page crashes */}
      <ErrorBoundary key={activeTab} onReset={handleErrorReset}>
        {activeTab === 'home' && <Home
          schedule={schedule}
          customers={customers}
          projects={projects}
          quotes={quotes}
          settings={settings}
          onNavigateToSchedule={() => setActiveTab('schedule')}
          onNavigateToInvoices={() => setActiveTab('invoices')}
          onNavigateToQuotes={() => setActiveTab('quotes')}
          onNavigateToAccounting={() => setActiveTab('expenses')}
          onCreateJob={() => setActiveTab('jobpacks')}
          onCreateQuote={() => handleCreateQuote()}
          onCreateInvoice={handleCreateInvoice}
          onLogExpense={() => setActiveTab('expenses')}
          onAddCustomer={() => setActiveTab('customers')}
          onTakePhoto={handleTakePhoto}
          onViewJob={(jobId) => { setActiveProjectId(jobId); setActiveTab('jobpack_detail'); }}
          onAddProject={async (project) => {
            const created = await addProject({
              title: project.title || 'New Job',
              customerId: project.customerId,
              status: project.status || 'active',
              notepad: project.notepad || '',
              notes: [],
              photos: [],
              drawings: [],
              documents: [],
              materials: [],
            });
            return created;
          }}
          onRefresh={refresh}
          onNavigateToFutureJobs={() => setActiveTab('future_jobs')}
          onCreateAIQuote={() => setActiveTab('ai_quote_builder')}
        />}
        {activeTab === 'jobpacks' && <JobPackList projects={[...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())} customers={customers} onOpenProject={openProject} onAddProject={handleAddProject} onAddCustomer={handleAddCustomer} onDeleteProject={deleteProject} onBack={() => setActiveTab('home')} />}

        <Suspense fallback={<PageLoader />}>
          {activeTab === 'schedule' && <ScheduleCalendar entries={schedule} projects={projects} customers={customers} onAddCustomer={handleAddCustomer} onAddProject={(project) => handleAddProject(project, false)} onAddEntry={addScheduleEntry} onUpdateEntry={updateScheduleEntry} onDeleteEntry={deleteScheduleEntry} onBack={() => setActiveTab('home')} />}
          {activeTab === 'jobpack_detail' && activeProjectId && (activeProject ? <JobPackView key={activeProjectId} project={activeProject} customers={customers} quotes={quotes.filter(q => q.projectId === activeProjectId)} settings={settings} onSaveProject={handleSaveProject} onViewQuote={handleViewQuote} onCreateQuote={() => handleCreateQuote(activeProjectId)} onBack={() => setActiveTab('jobpacks')} onDeleteProject={deleteProject} onRefresh={refresh} /> : <div className="flex flex-col items-center justify-center py-20 text-slate-400"><AlertCircle size={48} className="text-teal-500 mb-4" /><p>Job Pack Not Found</p><button onClick={() => setActiveTab('jobpacks')} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded">Back</button></div>)}
          {activeTab === 'quotes' && <QuotesList quotes={[...quotes].filter(q => q.type === 'estimate' || q.type === 'quotation').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())} customers={customers} settings={settings} onViewQuote={handleViewQuote} onEditQuote={handleEditQuote} onCreateQuote={() => handleCreateQuote()} onDeleteQuote={deleteQuote} onBack={() => setActiveTab('home')} />}
          {activeTab === 'invoices' && <InvoicesList quotes={[...quotes].filter(q => q.type === 'invoice').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())} customers={customers} settings={settings} onViewQuote={handleViewQuote} onCreateInvoice={handleCreateInvoice} onDeleteInvoice={deleteQuote} onBack={() => setActiveTab('home')} />}
          {activeTab === 'aged_receivables' && <AgedReceivablesPage onBack={() => setActiveTab('home')} onViewInvoice={handleViewQuote} />}
          {activeTab === 'expenses' && <ExpensesPage projects={projects} onBack={() => setActiveTab('home')} />}
          {activeTab === 'bank' && <BankImportPage onBack={() => setActiveTab('home')} />}
          {activeTab === 'reconcile' && <ReconciliationPage onBack={() => setActiveTab('home')} />}
          {activeTab === 'vat' && <VATSummaryPage onBack={() => setActiveTab('home')} />}
          {activeTab === 'profitloss' && <ProfitLossPage onBack={() => setActiveTab('home')} />}
          {activeTab === 'payables' && <AgedPayablesPage onBack={() => setActiveTab('home')} />}
          {activeTab === 'accountant_export' && <AccountantExportPage onBack={() => setActiveTab('home')} />}
          {activeTab === 'files' && <FilingCabinetPage onBack={() => setActiveTab('home')} />}
          {activeTab === 'materials' && <MaterialsLibrary onBack={() => setActiveTab('home')} />}
          {activeTab === 'wholesalers' && <WholesalerAdmin onBack={() => setActiveTab('home')} />}
          {activeTab === 'support' && <SupportRequestsAdmin onBack={() => setActiveTab('home')} />}
          {activeTab === 'trial_analytics' && <TrialUsersAdmin onBack={() => setActiveTab('home')} />}
          {activeTab === 'future_jobs' && <FutureJobsPage onBack={() => setActiveTab('home')} onCreateJob={() => setActiveTab('jobpacks')} />}
          {activeTab === 'customers' && <CustomerManager customers={customers} addCustomer={addCustomer} updateCustomer={updateCustomer} deleteCustomer={deleteCustomer} onBack={() => setActiveTab('home')} />}
          {activeTab === 'settings' && <SettingsPage settings={settings} setSettings={setSettings} onSave={updateSettings} onBack={() => setActiveTab('home')} />}
          {activeTab === 'team_dashboard' && <TeamDashboard onBack={() => setActiveTab('home')} />}
          {activeTab === 'team_settings' && <TeamSettings onBack={() => setActiveTab('home')} />}
          {activeTab === 'timesheet_approval' && <TimesheetApproval onBack={() => setActiveTab('home')} />}
          {activeTab === 'ai_quote_builder' && <AIQuoteBuilder customers={customers} quotes={quotes} settings={settings} onComplete={handleAIQuoteComplete} onCancel={() => setActiveTab('home')} />}
          {activeTab === 'quote_edit' && <QuoteCreator existingQuote={aiGeneratedDraft as Quote || quotes.find(q => q.id === editingQuoteId)} projectId={activeProjectId || undefined} projectTitle={activeProject?.title} initialType={initialQuoteType} customers={customers} settings={settings} onSave={handleSaveQuote} onAddCustomer={handleAddCustomer} onCancel={() => activeProjectId ? setActiveTab('jobpack_detail') : (initialQuoteType === 'invoice' ? setActiveTab('invoices') : setActiveTab('quotes'))} />}
          {activeTab === 'view' && viewingQuoteId && (activeViewQuote ? <QuoteView quote={activeViewQuote} customer={activeViewCustomer || { id: 'unknown', name: 'Unassigned Client', email: '', phone: '', address: 'N/A' }} settings={settings} onEdit={() => handleEditQuote(viewingQuoteId)} onBack={() => activeProjectId ? setActiveTab('jobpack_detail') : (activeViewQuote.type === 'invoice' ? setActiveTab('invoices') : setActiveTab('quotes'))} onUpdateStatus={(status) => handleUpdateQuoteStatus(viewingQuoteId, status)} onUpdateQuote={handleUpdateQuote} onConvertToInvoice={handleConvertToInvoice} onIssueCreditNote={handleIssueCreditNote} onDuplicate={handleDuplicateQuote} onDelete={async () => { await deleteQuote(viewingQuoteId); setViewingQuoteId(null); activeProjectId ? setActiveTab('jobpack_detail') : (activeViewQuote.type === 'invoice' ? setActiveTab('invoices') : setActiveTab('quotes')); toast.success('Deleted', 'Document has been discarded'); }} /> : <div className="flex flex-col items-center justify-center py-20 text-slate-400"><FileWarning size={48} className="text-teal-500 mb-4" /><p>Document Not Found</p><button onClick={() => setActiveTab('quotes')} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded">Back</button></div>)}
          {activeTab === 'credit_note' && viewingQuoteId && (() => {
            const invoice = quotes.find(q => q.id === viewingQuoteId);
            const cust = invoice ? customers.find(c => c.id === invoice.customerId) : null;
            if (!invoice || !cust) return null;
            return <CreditNoteCreator originalInvoice={invoice} customer={cust} settings={settings} onSave={handleSaveCreditNote} onCancel={() => { setActiveTab('view'); }} />;
          })()}
        </Suspense>
      </ErrorBoundary>

      {/* Onboarding Wizard */}
      <OnboardingWizard
        open={showOnboarding}
        companyName={settings.companyName || ''}
        onUpdateCompanyName={(name) => {
          updateSettings({ companyName: name });
        }}
        onAddCustomer={handleAddCustomer}
        onComplete={() => {
          setShowOnboarding(false);
          localStorage.setItem('bq_onboarding_completed', 'true');
        }}
        onSkip={() => {
          setShowOnboarding(false);
          localStorage.setItem('bq_onboarding_completed', 'true');
        }}
      />
    </Layout>
  );
};

export default App;
