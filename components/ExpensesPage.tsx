import React, { useState, useRef, useEffect } from 'react';
import {
  Receipt, Camera, Plus, Filter, Search, Trash2,
  Calendar, Tag, Building2, X, Check, Loader2,
  ChevronDown, Image as ImageIcon, FileText, Fuel,
  Wrench, Users, Shield, MoreHorizontal, Eye
} from 'lucide-react';
import { expensesService } from '../src/services/dataService';

interface Expense {
  id: string;
  vendor: string;
  description?: string;
  amount: number;
  vat_amount: number;
  category: string;
  expense_date: string;
  payment_method: string;
  receipt_storage_path?: string;
  is_reconciled: boolean;
  job_pack?: { id: string; title: string } | null;
}

interface ExpensesPageProps {
  projects: { id: string; title: string }[];
}

const CATEGORIES = [
  { id: 'materials', label: 'Materials', icon: FileText, color: 'bg-blue-500' },
  { id: 'tools', label: 'Tools', icon: Wrench, color: 'bg-amber-500' },
  { id: 'fuel', label: 'Fuel', icon: Fuel, color: 'bg-green-500' },
  { id: 'subcontractor', label: 'Subcontractor', icon: Users, color: 'bg-purple-500' },
  { id: 'office', label: 'Office', icon: Building2, color: 'bg-slate-500' },
  { id: 'insurance', label: 'Insurance', icon: Shield, color: 'bg-red-500' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-500' },
];

const PAYMENT_METHODS = [
  { id: 'card', label: 'Card' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'cheque', label: 'Cheque' },
];

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ projects }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scanning, setScanning] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    vendor: '',
    description: '',
    amount: '',
    vat_amount: '',
    category: 'materials',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'card',
    job_pack_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await expensesService.getAll();
      setExpenses(data || []);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReceiptPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Send to Gemini for OCR
    setScanning(true);
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'parseReceipt',
            imageBase64: base64,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setFormData(prev => ({
            ...prev,
            vendor: result.data.vendor || prev.vendor,
            description: result.data.description || prev.description,
            amount: result.data.amount?.toString() || prev.amount,
            vat_amount: result.data.vatAmount?.toString() || prev.vat_amount,
            category: result.data.category || prev.category,
            expense_date: result.data.date || prev.expense_date,
            payment_method: result.data.paymentMethod || prev.payment_method,
          }));
        }
      }
    } catch (error) {
      console.error('OCR failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    if (!formData.vendor || !formData.amount) return;

    setSaving(true);
    try {
      const expenseData = {
        vendor: formData.vendor,
        description: formData.description || null,
        amount: parseFloat(formData.amount),
        vat_amount: parseFloat(formData.vat_amount) || 0,
        category: formData.category,
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        job_pack_id: formData.job_pack_id || null,
      };

      await expensesService.create(expenseData);
      await loadExpenses();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to save expense:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expensesService.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor: '',
      description: '',
      amount: '',
      vat_amount: '',
      category: 'materials',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'card',
      job_pack_id: '',
    });
    setReceiptPreview(null);
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filterCategory && expense.category !== filterCategory) return false;
    if (searchTerm && !expense.vendor.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalVat = filteredExpenses.reduce((sum, e) => sum + (e.vat_amount || 0), 0);

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[6];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Expenses</h1>
          <p className="text-slate-500 text-sm font-medium">Track receipts and business costs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl font-black text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus size={20} />
          Add Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
          <p className="text-2xl font-black text-slate-900">{filteredExpenses.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
          <p className="text-2xl font-black text-slate-900">£{totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">VAT Reclaimable</p>
          <p className="text-2xl font-black text-emerald-600">£{totalVat.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Cost</p>
          <p className="text-2xl font-black text-slate-900">£{(totalAmount - totalVat).toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${
              !filterCategory ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${
                filterCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No expenses yet</p>
            <p className="text-slate-400 text-sm">Add your first expense to start tracking</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map(expense => {
              const category = getCategoryInfo(expense.category);
              const CategoryIcon = category.icon;
              return (
                <div key={expense.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${category.color} flex items-center justify-center text-white shrink-0`}>
                      <CategoryIcon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 truncate">{expense.vendor}</h3>
                        {expense.is_reconciled && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">
                            Reconciled
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag size={12} />
                          {category.label}
                        </span>
                        {expense.job_pack && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Building2 size={12} />
                            {expense.job_pack.title}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900">£{expense.amount.toFixed(2)}</p>
                      {expense.vat_amount > 0 && (
                        <p className="text-xs text-emerald-600 font-bold">+£{expense.vat_amount.toFixed(2)} VAT</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Add Expense</h2>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Receipt Scanner */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Scan Receipt (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {receiptPreview ? (
                  <div className="relative">
                    <img src={receiptPreview} className="w-full h-48 object-cover rounded-2xl" alt="Receipt" />
                    <button
                      onClick={() => { setReceiptPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow"
                    >
                      <X size={16} />
                    </button>
                    {scanning && (
                      <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                        <div className="text-center text-white">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm font-bold">Scanning receipt...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-amber-500 hover:bg-amber-50 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-600">Tap to scan receipt</p>
                    <p className="text-xs text-slate-400">AI will auto-fill the details</p>
                  </button>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Vendor *
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                    placeholder="e.g. Screwfix, Travis Perkins"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Amount (exc. VAT) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    VAT Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.vat_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, vat_amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {PAYMENT_METHODS.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            formData.category === cat.id
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <Icon size={18} className={`mx-auto mb-1 ${formData.category === cat.id ? 'text-amber-600' : 'text-slate-400'}`} />
                          <p className={`text-[9px] font-black uppercase ${formData.category === cat.id ? 'text-amber-600' : 'text-slate-400'}`}>
                            {cat.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Link to Job (Optional)
                  </label>
                  <select
                    value={formData.job_pack_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_pack_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">No job linked</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What was this expense for?"
                    rows={2}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.vendor || !formData.amount || saving}
                className="flex-1 px-6 py-3 bg-amber-500 text-slate-900 rounded-xl font-black hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} />}
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
