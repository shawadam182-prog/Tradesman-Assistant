import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wrench, Search, Plus, Edit2, Trash2, Camera, X, Check,
  Loader2, ArrowLeft, AlertTriangle, Calendar, Tag, Hash,
  DollarSign, StickyNote, Image as ImageIcon, ChevronDown,
} from 'lucide-react';
import { toolInventoryService } from '../src/services/dataService';
import { useToast } from '../src/contexts/ToastContext';
import { hapticTap, hapticSuccess } from '../src/hooks/useHaptic';

interface ToolItem {
  id: string;
  name: string;
  make_model: string | null;
  serial_number: string | null;
  category: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  notes: string | null;
  photo_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

interface ToolInventoryProps {
  onBack?: () => void;
}

const TOOL_CATEGORIES = [
  'Power Tools',
  'Hand Tools',
  'Measuring',
  'Safety Equipment',
  'Ladders & Access',
  'Electrical',
  'Plumbing',
  'Cutting',
  'Fixing & Fastening',
  'Other',
];

const emptyForm = {
  name: '',
  make_model: '',
  serial_number: '',
  category: '',
  purchase_date: '',
  purchase_price: '',
  notes: '',
};

export const ToolInventory: React.FC<ToolInventoryProps> = ({ onBack }) => {
  const toast = useToast();
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      const data = await toolInventoryService.getAll();
      setTools(data as ToolItem[]);

      // Load photo URLs
      const urls: Record<string, string> = {};
      for (const tool of data) {
        if (tool.photo_storage_path) {
          const url = await toolInventoryService.getPhotoUrl(tool.photo_storage_path);
          if (url) urls[tool.id] = url;
        }
      }
      setPhotoUrls(urls);
    } catch (err) {
      toast.error('Load Failed', 'Could not load tool inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const openAdd = () => {
    hapticTap();
    setEditingTool(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhotoUrl(null);
    setShowModal(true);
  };

  const openEdit = async (tool: ToolItem) => {
    hapticTap();
    setEditingTool(tool);
    setForm({
      name: tool.name,
      make_model: tool.make_model || '',
      serial_number: tool.serial_number || '',
      category: tool.category || '',
      purchase_date: tool.purchase_date || '',
      purchase_price: tool.purchase_price?.toString() || '',
      notes: tool.notes || '',
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    if (tool.photo_storage_path) {
      const url = await toolInventoryService.getPhotoUrl(tool.photo_storage_path);
      setExistingPhotoUrl(url || null);
    } else {
      setExistingPhotoUrl(null);
    }
    setShowModal(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Required', 'Tool name is required');
      return;
    }

    setSaving(true);
    try {
      let photoPath: string | null | undefined;

      if (editingTool) {
        // Update existing
        if (photoFile) {
          // Delete old photo if exists
          if (editingTool.photo_storage_path) {
            await toolInventoryService.deletePhoto(editingTool.photo_storage_path);
          }
          photoPath = await toolInventoryService.uploadPhoto(editingTool.id, photoFile);
        }

        await toolInventoryService.update(editingTool.id, {
          name: form.name.trim(),
          make_model: form.make_model.trim() || null,
          serial_number: form.serial_number.trim() || null,
          category: form.category || null,
          purchase_date: form.purchase_date || null,
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
          notes: form.notes.trim() || null,
          ...(photoPath !== undefined ? { photo_storage_path: photoPath } : {}),
        });
        hapticSuccess();
        toast.success('Updated', `${form.name} updated`);
      } else {
        // Create new
        const created = await toolInventoryService.create({
          name: form.name.trim(),
          make_model: form.make_model.trim() || null,
          serial_number: form.serial_number.trim() || null,
          category: form.category || null,
          purchase_date: form.purchase_date || null,
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
          notes: form.notes.trim() || null,
        });

        if (photoFile) {
          photoPath = await toolInventoryService.uploadPhoto(created.id, photoFile);
          await toolInventoryService.update(created.id, { photo_storage_path: photoPath });
        }
        hapticSuccess();
        toast.success('Added', `${form.name} added to inventory`);
      }

      setShowModal(false);
      fetchTools();
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save tool');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tool: ToolItem) => {
    if (!confirm(`Delete "${tool.name}" from your inventory?`)) return;
    setDeleting(tool.id);
    try {
      if (tool.photo_storage_path) {
        await toolInventoryService.deletePhoto(tool.photo_storage_path);
      }
      await toolInventoryService.delete(tool.id);
      setTools(prev => prev.filter(t => t.id !== tool.id));
      hapticSuccess();
      toast.success('Deleted', `${tool.name} removed`);
    } catch (err) {
      toast.error('Delete Failed', 'Could not delete tool');
    } finally {
      setDeleting(null);
    }
  };

  // Filter tools
  const filtered = tools.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.make_model && t.make_model.toLowerCase().includes(search.toLowerCase())) ||
      (t.serial_number && t.serial_number.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = !filterCategory || t.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const categories = [...new Set(tools.map(t => t.category).filter(Boolean))];
  const totalValue = tools.reduce((sum, t) => sum + (t.purchase_price || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-40">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 pb-4">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Tool Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {tools.length} tool{tools.length !== 1 ? 's' : ''} registered
            {totalValue > 0 && ` \u00B7 \u00A3${totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })} total value`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-teal-500 text-white p-3 rounded-xl hover:bg-teal-600 transition-colors shadow-lg"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 flex gap-2">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-amber-800 dark:text-amber-300 text-sm">
          Record your tools with photos and serial numbers. If stolen, you'll have everything ready for police and insurance claims.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All</option>
            {categories.map(c => (
              <option key={c} value={c!}>{c}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Tool List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Wrench size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            {tools.length === 0 ? 'No tools registered' : 'No matching tools'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            {tools.length === 0 ? 'Add your first tool to start building your inventory' : 'Try a different search'}
          </p>
          {tools.length === 0 && (
            <button onClick={openAdd} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-teal-600 transition-colors">
              Add First Tool
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(tool => (
            <div
              key={tool.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm"
            >
              <button
                onClick={() => { hapticTap(); setExpandedTool(expandedTool === tool.id ? null : tool.id); }}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                {/* Photo thumbnail */}
                {photoUrls[tool.id] ? (
                  <img
                    src={photoUrls[tool.id]}
                    alt={tool.name}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <Wrench size={22} className="text-slate-400 dark:text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate">{tool.name}</h3>
                  {tool.make_model && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{tool.make_model}</p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5">
                    {tool.category && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{tool.category}</span>
                    )}
                    {tool.serial_number && (
                      <span className="text-xs text-slate-400 font-mono">S/N: {tool.serial_number}</span>
                    )}
                  </div>
                </div>
                {tool.purchase_price && (
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    £{tool.purchase_price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </button>

              {/* Expanded details */}
              {expandedTool === tool.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-3 pb-3">
                  {/* Photo large */}
                  {photoUrls[tool.id] && (
                    <div className="mt-3">
                      <img
                        src={photoUrls[tool.id]}
                        alt={tool.name}
                        className="w-full max-h-64 object-contain rounded-lg bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    {tool.make_model && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">Make/Model</span>
                        <p className="text-slate-900 dark:text-white font-medium">{tool.make_model}</p>
                      </div>
                    )}
                    {tool.serial_number && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">Serial Number</span>
                        <p className="text-slate-900 dark:text-white font-mono font-medium">{tool.serial_number}</p>
                      </div>
                    )}
                    {tool.purchase_date && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">Purchase Date</span>
                        <p className="text-slate-900 dark:text-white font-medium">{new Date(tool.purchase_date).toLocaleDateString('en-GB')}</p>
                      </div>
                    )}
                    {tool.purchase_price != null && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">Purchase Price</span>
                        <p className="text-slate-900 dark:text-white font-medium">£{tool.purchase_price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    {tool.category && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">Category</span>
                        <p className="text-slate-900 dark:text-white font-medium">{tool.category}</p>
                      </div>
                    )}
                  </div>

                  {tool.notes && (
                    <div className="mt-3">
                      <span className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">Notes</span>
                      <p className="text-slate-700 dark:text-slate-300 text-sm mt-0.5">{tool.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(tool); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(tool); }}
                      disabled={deleting === tool.id}
                      className="flex items-center justify-center gap-2 py-2 px-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      {deleting === tool.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 z-10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingTool ? 'Edit Tool' : 'Add Tool'}
              </h2>
              <button onClick={() => !saving && setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Photo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Photo</label>
                <div className="flex items-center gap-3">
                  {(photoPreview || existingPhotoUrl) ? (
                    <div className="relative">
                      <img
                        src={photoPreview || existingPhotoUrl!}
                        alt="Tool"
                        className="w-20 h-20 rounded-xl object-cover"
                      />
                      <button
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); setExistingPhotoUrl(null); }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 hover:border-teal-400 transition-colors"
                    >
                      <Camera size={20} className="text-slate-400" />
                      <span className="text-xs text-slate-400">Photo</span>
                    </button>
                  )}
                  {(photoPreview || existingPhotoUrl) && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-teal-600 dark:text-teal-400 font-medium hover:underline"
                    >
                      Change photo
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tool Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Cordless Drill"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Make/Model */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Make / Model</label>
                <input
                  type="text"
                  value={form.make_model}
                  onChange={e => setForm(f => ({ ...f, make_model: e.target.value }))}
                  placeholder="e.g. DeWalt DCD796"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Serial Number / ID</label>
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                  placeholder="e.g. DW-2024-001234"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full appearance-none px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select category...</option>
                    {TOOL_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Purchase Date & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.purchase_price}
                      onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any extra details — condition, where purchased, warranty info..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-teal-500 text-white rounded-xl font-bold text-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><Loader2 size={20} className="animate-spin" /> Saving...</>
                ) : (
                  <><Check size={20} /> {editingTool ? 'Update Tool' : 'Add Tool'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
