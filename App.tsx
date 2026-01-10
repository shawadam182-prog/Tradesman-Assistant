
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { CustomerManager } from './components/CustomerManager';
import { QuoteCreator } from './components/QuoteCreator';
import { SettingsPage } from './components/SettingsPage';
import { QuoteView } from './components/QuoteView';
import { JobPackList } from './components/JobPackList';
import { JobPackView } from './components/JobPackView';
import { QuotesList } from './components/QuotesList';
import { InvoicesList } from './components/InvoicesList';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { Home } from './components/Home';
import { Customer, Quote, AppSettings, JobPack, ScheduleEntry } from './types';
import { AlertCircle, ArrowLeft, FileWarning } from 'lucide-react';

const STORAGE_KEYS = {
  CUSTOMERS: 'bq_customers',
  QUOTES: 'bq_quotes',
  SETTINGS: 'bq_settings',
  PROJECTS: 'bq_projects',
  SCHEDULE: 'bq_schedule',
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'jobpacks' | 'quotes' | 'invoices' | 'customers' | 'settings' | 'view' | 'jobpack_detail' | 'quote_edit' | 'schedule'>('home');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<JobPack[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    defaultLabourRate: 65,
    defaultTaxRate: 20,
    defaultCisRate: 20,
    companyName: 'JobPacks Pro Services',
    companyAddress: '10 High Street, London, EC1A 1BB',
    companyLogo: undefined,
    footerLogos: [],
    enableVat: true,
    enableCis: true,
    quotePrefix: 'EST-',
    invoicePrefix: 'INV-',
    defaultQuoteNotes: 'This estimate is based on the initial survey. Prices for materials are subject to market volatility. Final invoicing will be based on actual quantities used on site.',
    defaultInvoiceNotes: 'Please settle this invoice within 14 days. Bank details: Acct 12345678 / Sort 00-00-00. Thank you for your business!',
    costBoxColor: 'slate',
    showBreakdown: true,
    defaultDisplayOptions: {
      showMaterials: true,
      showMaterialItems: true,
      showMaterialQty: true,
      showMaterialUnitPrice: true,
      showMaterialLineTotals: true,
      showMaterialSectionTotal: true,
      showLabour: true,
      showLabourItems: true,
      showLabourQty: true,
      showLabourUnitPrice: true,
      showLabourLineTotals: true,
      showLabourSectionTotal: true,
      showVat: true,
      showCis: true,
      showNotes: true,
      showLogo: true,
      showTotalsBreakdown: true
    }
  });
  
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [viewingQuoteId, setViewingQuoteId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const savedQuotes = localStorage.getItem(STORAGE_KEYS.QUOTES);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const savedSchedule = localStorage.getItem(STORAGE_KEYS.SCHEDULE);

    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
    if (savedQuotes) setQuotes(JSON.parse(savedQuotes));
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({
        ...settings,
        ...parsed,
        enableVat: parsed.enableVat !== undefined ? parsed.enableVat : true,
        enableCis: parsed.enableCis !== undefined ? parsed.enableCis : true,
        quotePrefix: parsed.quotePrefix || 'EST-',
        invoicePrefix: parsed.invoicePrefix || 'INV-',
        defaultQuoteNotes: parsed.defaultQuoteNotes || settings.defaultQuoteNotes,
        defaultInvoiceNotes: parsed.defaultInvoiceNotes || settings.defaultInvoiceNotes,
        costBoxColor: parsed.costBoxColor || 'slate',
        showBreakdown: parsed.showBreakdown !== undefined ? parsed.showBreakdown : true,
        footerLogos: parsed.footerLogos || [],
        defaultDisplayOptions: {
          ...settings.defaultDisplayOptions,
          ...(parsed.defaultDisplayOptions || {})
        }
      });
    }
    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedSchedule) setSchedule(JSON.parse(savedSchedule));
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes)), [quotes]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule)), [schedule]);

  const handleCreateQuote = (projectId?: string) => {
    setEditingQuoteId(null);
    setActiveProjectId(projectId || null);
    setActiveTab('quote_edit');
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

  const saveQuote = (quote: Quote) => {
    const now = new Date().toISOString();
    let quoteToSave = { ...quote, updatedAt: now };
    
    if (!quoteToSave.referenceNumber) {
      const isInvoice = quote.type === 'invoice';
      const existingInCategory = quotes.filter(q => 
        isInvoice ? q.type === 'invoice' : (q.type === 'estimate' || q.type === 'quotation')
      );
      
      const maxNum = existingInCategory.reduce((max, q) => 
        Math.max(max, q.referenceNumber || 0), 0
      );
      
      quoteToSave.referenceNumber = maxNum + 1;
    }

    setQuotes(prev => {
      const existingIndex = prev.findIndex(q => q.id === quote.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = quoteToSave;
        return updated;
      }
      return [...prev, quoteToSave];
    });
    
    if (quote.projectId) {
      setProjects(prev => prev.map(p => p.id === quote.projectId ? { ...p, updatedAt: now } : p));
    }

    setViewingQuoteId(quote.id);
    setActiveTab('view');
  };

  const updateQuote = (updatedQuote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
  };

  const saveProject = (project: JobPack) => {
    const now = new Date().toISOString();
    const projectWithTime = { ...project, updatedAt: now };
    
    setProjects(prev => {
      const existingIndex = prev.findIndex(p => p.id === project.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = projectWithTime;
        return updated;
      }
      return [...prev, projectWithTime];
    });
  };

  const addCustomer = (customer: Customer) => setCustomers(prev => [...prev, customer]);

  const updateQuoteStatus = (id: string, status: Quote['status']) => {
    const now = new Date().toISOString();
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status, updatedAt: now } : q));
  };

  const openProject = (id: string) => {
    setActiveProjectId(id);
    setActiveTab('jobpack_detail');
  };

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find(p => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  const activeViewQuote = useMemo(() => viewingQuoteId ? quotes.find(q => q.id === viewingQuoteId) : null, [quotes, viewingQuoteId]);
  const activeViewCustomer = useMemo(() => activeViewQuote ? customers.find(c => c.id === activeViewQuote.customerId) : null, [customers, activeViewQuote]);

  return (
    <Layout activeTab={activeTab === 'view' || activeTab === 'jobpack_detail' || activeTab === 'quote_edit' ? '' : activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'home' && (
        <Home 
          schedule={schedule}
          customers={customers}
          projects={projects}
          onNavigateToSchedule={() => setActiveTab('schedule')}
        />
      )}
      {activeTab === 'jobpacks' && (
        <JobPackList 
          projects={[...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())}
          customers={customers}
          onOpenProject={openProject}
          onAddProject={(p) => { 
            setProjects(prev => [...prev, p]); 
            openProject(p.id); 
          }}
          onAddCustomer={addCustomer}
        />
      )}
      {activeTab === 'schedule' && (
        <ScheduleCalendar 
          entries={schedule}
          setEntries={setSchedule}
          projects={projects}
          customers={customers}
          onAddCustomer={addCustomer}
        />
      )}
      {activeTab === 'jobpack_detail' && activeProjectId && (
        activeProject ? (
          <JobPackView 
            project={activeProject}
            customers={customers}
            quotes={quotes.filter(q => q.projectId === activeProjectId)}
            onSaveProject={saveProject}
            onViewQuote={handleViewQuote}
            onCreateQuote={() => handleCreateQuote(activeProjectId)}
            onBack={() => setActiveTab('jobpacks')}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-in fade-in">
             <div className="mb-4 text-amber-500">
               <AlertCircle size={48} />
             </div>
            <p className="font-black text-sm uppercase tracking-widest italic mb-6">Job Pack Not Found</p>
            <button 
              onClick={() => setActiveTab('jobpacks')}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
            >
              <ArrowLeft size={16} /> Back to Job Packs
            </button>
          </div>
        )
      )}
      {activeTab === 'quotes' && (
        <QuotesList 
          quotes={[...quotes].filter(q => (q.type === 'estimate' || q.type === 'quotation')).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())}
          customers={customers}
          settings={settings}
          onViewQuote={handleViewQuote}
          onEditQuote={handleEditQuote}
          onCreateQuote={() => handleCreateQuote()}
        />
      )}
      {activeTab === 'invoices' && (
        <InvoicesList 
          quotes={[...quotes].filter(q => q.type === 'invoice').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())}
          customers={customers}
          settings={settings}
          onViewQuote={handleViewQuote}
          onCreateInvoice={() => handleCreateQuote()}
        />
      )}
      {activeTab === 'customers' && (
        <CustomerManager 
          customers={customers} 
          setCustomers={setCustomers} 
        />
      )}
      {activeTab === 'settings' && (
        <SettingsPage 
          settings={settings} 
          setSettings={setSettings} 
        />
      )}
      {activeTab === 'quote_edit' && (
        <QuoteCreator 
          existingQuote={quotes.find(q => q.id === editingQuoteId)}
          projectId={activeProjectId || undefined}
          customers={customers}
          settings={settings}
          onSave={saveQuote}
          onAddCustomer={addCustomer}
          onCancel={() => activeProjectId ? setActiveTab('jobpack_detail') : setActiveTab('quotes')}
        />
      )}
      {activeTab === 'view' && viewingQuoteId && (
        activeViewQuote ? (
          <QuoteView 
            quote={activeViewQuote}
            customer={activeViewCustomer || { id: 'unknown', name: 'Unassigned Client', email: '', phone: '', address: 'N/A' }}
            settings={settings}
            onEdit={() => handleEditQuote(viewingQuoteId)}
            onBack={() => activeProjectId ? setActiveTab('jobpack_detail') : setActiveTab('quotes')}
            onUpdateStatus={(status) => updateQuoteStatus(viewingQuoteId, status)}
            onUpdateQuote={updateQuote}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-in fade-in">
             <div className="mb-4 text-amber-500">
               <FileWarning size={48} />
             </div>
            <p className="font-black text-sm uppercase tracking-widest italic mb-6">Document Not Found</p>
            <button 
              onClick={() => setActiveTab('quotes')}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
            >
              <ArrowLeft size={16} /> Back to Quotes
            </button>
          </div>
        )
      )}
    </Layout>
  );
};

export default App;
