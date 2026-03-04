import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Star, Plus, Edit2, Trash2,
  Upload, Download, ChevronDown, X, Check, AlertCircle, Loader2,
  ArrowLeft, CheckSquare, Square,
} from 'lucide-react';
import { useData } from '../src/contexts/DataContext';
import { useToast } from '../src/contexts/ToastContext';
import { WholesalerImportPage } from './WholesalerImportPage';
import { TRADE_MATERIALS, TRADE_OPTIONS } from '../src/data/genericMaterials';
import type { DBMaterialLibraryItem } from '../types';

interface MaterialsLibraryProps {
  onSelectMaterial?: (material: DBMaterialLibraryItem) => void;
  onSelectMultipleMaterials?: (materials: DBMaterialLibraryItem[]) => void;
  selectionMode?: boolean;
  onBack?: () => void;
}

export const MaterialsLibrary: React.FC<MaterialsLibraryProps> = ({
  onSelectMaterial,
  onSelectMultipleMaterials,
  selectionMode = false,
  onBack,
}) => {
  const { services } = useData();
  const toast = useToast();
  const [showImport, setShowImport] = useState(false);
  const [materials, setMaterials] = useState<DBMaterialLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  // Edit modal state
  const [editingMaterial, setEditingMaterial] = useState<DBMaterialLibraryItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    unit: '',
    cost_price: '',
    sell_price: '',
    category: '',
  });
  const [saving, setSaving] = useState(false);

  // Add new material state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    description: '',
    unit: 'pc',
    cost_price: '',
    sell_price: '',
    category: '',
  });

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Multi-select state (for selection mode)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete all state
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Generic list download state
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [materialsData, categoriesData] = await Promise.all([
        services.materialsLibrary.getAll(),
        services.materialsLibrary.getCategories(),
      ]);
      setMaterials(materialsData || []);
      setCategories(categoriesData || []);
    } catch (err: any) {
      console.error('Failed to load materials:', err);
      setError(err.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [services.materialsLibrary]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Filter materials
  const filteredMaterials = materials.filter(m => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        m.name.toLowerCase().includes(query) ||
        m.product_code?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    return true;
  });

  const handleToggleFavourite = async (id: string) => {
    try {
      await services.materialsLibrary.toggleFavourite(id);
      setMaterials(prev =>
        prev.map(m => m.id === id ? { ...m, is_favourite: !m.is_favourite } : m)
      );
    } catch (err) {
      console.error('Failed to toggle favourite:', err);
    }
  };

  const handleEdit = (material: DBMaterialLibraryItem) => {
    setEditingMaterial(material);
    setEditForm({
      name: material.name,
      description: material.description || '',
      unit: material.unit || 'pc',
      cost_price: material.cost_price?.toString() || '',
      sell_price: material.sell_price?.toString() || '',
      category: material.category || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMaterial) return;
    setSaving(true);
    try {
      await services.materialsLibrary.update(editingMaterial.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        unit: editForm.unit || 'pc',
        cost_price: editForm.cost_price ? parseFloat(editForm.cost_price) : undefined,
        sell_price: editForm.sell_price ? parseFloat(editForm.sell_price) : undefined,
        category: editForm.category || undefined,
      });
      setMaterials(prev =>
        prev.map(m => m.id === editingMaterial.id ? {
          ...m,
          name: editForm.name,
          description: editForm.description || undefined,
          unit: editForm.unit || 'pc',
          cost_price: editForm.cost_price ? parseFloat(editForm.cost_price) : undefined,
          sell_price: editForm.sell_price ? parseFloat(editForm.sell_price) : undefined,
          category: editForm.category || undefined,
        } : m)
      );
      setEditingMaterial(null);
      toast.success('Updated', 'Material saved');
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed', 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await services.materialsLibrary.delete(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      setDeletingId(null);
      toast.success('Deleted', 'Material removed from list');
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleAddMaterial = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const created = await services.materialsLibrary.create({
        name: addForm.name.trim(),
        description: addForm.description || undefined,
        unit: addForm.unit || 'pc',
        cost_price: addForm.cost_price ? parseFloat(addForm.cost_price) : undefined,
        sell_price: addForm.sell_price ? parseFloat(addForm.sell_price) : undefined,
        category: addForm.category || undefined,
      });
      setMaterials(prev => [...prev, created]);
      setAddForm({ name: '', description: '', unit: 'pc', cost_price: '', sell_price: '', category: '' });
      setShowAddForm(false);
      toast.success('Added', `${addForm.name} added to your list`);
    } catch (err) {
      console.error('Failed to add material:', err);
      toast.error('Failed', 'Could not add material');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectMaterial = (material: DBMaterialLibraryItem) => {
    if (onSelectMaterial) {
      onSelectMaterial(material);
    }
  };

  const toggleSelectMaterial = (materialId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    if (selectedIds.size === 0) return;
    const selected = materials.filter(m => selectedIds.has(m.id));
    if (onSelectMultipleMaterials) {
      onSelectMultipleMaterials(selected);
    } else if (onSelectMaterial) {
      selected.forEach(m => onSelectMaterial(m));
    }
    setSelectedIds(new Set());
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await services.materialsLibrary.deleteAll();
      setMaterials([]);
      setCategories([]);
      setShowDeleteAllConfirm(false);
      toast.success('Cleared', 'All materials have been deleted');
    } catch (err) {
      console.error('Failed to delete all materials:', err);
      toast.error('Failed', 'Could not delete all materials');
    } finally {
      setDeletingAll(false);
    }
  };

  // Download a generic trade list into the user's materials library
  const handleDownloadTradeList = async (tradeId: string) => {
    const trade = TRADE_MATERIALS.find(t => t.id === tradeId);
    if (!trade) return;

    setDownloading(true);
    setShowTradeDropdown(false);
    try {
      let added = 0;
      for (const mat of trade.materials) {
        try {
          await services.materialsLibrary.create({
            name: mat.name,
            unit: mat.unit,
            sell_price: mat.price,
            category: mat.category,
            supplier: `Generic (${trade.label})`,
          });
          added++;
        } catch {
          // skip duplicates / errors
        }
      }
      toast.success('List Downloaded', `${added} ${trade.label} materials added to your list`);
      await loadMaterials();
    } catch (err) {
      console.error('Failed to download trade list:', err);
      toast.error('Failed', 'Could not download trade list');
    } finally {
      setDownloading(false);
    }
  };

  if (showImport) {
    return (
      <WholesalerImportPage
        onBack={() => {
          setShowImport(false);
          loadMaterials();
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Materials</h1>
            <p className="text-slate-500 text-sm font-medium">
              {materials.length} material{materials.length !== 1 ? 's' : ''} in your list
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {!selectionMode && (
          <div className="flex items-center gap-2">
            {/* Add Material */}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-teal-500 text-white rounded-2xl font-black text-sm hover:bg-teal-400 transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add</span>
            </button>

            {/* Import Own List */}
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Import</span>
            </button>

            {/* Delete All */}
            {materials.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="flex items-center gap-2 px-3 py-2.5 border border-red-200 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete All</span>
              </button>
            )}

            {/* Download Generic List */}
            <div className="relative">
              <button
                onClick={() => setShowTradeDropdown(!showTradeDropdown)}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span className="hidden sm:inline">Generic List</span>
                <ChevronDown size={14} />
              </button>

              {/* Trade Dropdown */}
              {showTradeDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTradeDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 max-h-80 overflow-auto">
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase">Select Trade</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Adds a starter list with approximate UK prices</p>
                    </div>
                    {TRADE_OPTIONS.map(trade => (
                      <button
                        key={trade.id}
                        onClick={() => handleDownloadTradeList(trade.id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 border-b border-slate-50 last:border-0"
                      >
                        {trade.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search and Category Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search materials..."
              className="w-full px-4 sm:pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          {categories.length > 0 && (
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-sm capitalize"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-slate-500">Loading materials...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && materials.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900 mb-2">No Materials Yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Get started by downloading a generic trade list, importing your own CSV, or adding materials one by one.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative inline-block">
              <button
                onClick={() => setShowTradeDropdown(!showTradeDropdown)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-2xl font-black hover:bg-teal-400 transition-colors"
              >
                <Download size={18} />
                Download Trade List
                <ChevronDown size={14} />
              </button>
              {showTradeDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTradeDropdown(false)} />
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 max-h-80 overflow-auto">
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase">Select Trade</p>
                    </div>
                    {TRADE_OPTIONS.map(trade => (
                      <button
                        key={trade.id}
                        onClick={() => handleDownloadTradeList(trade.id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 border-b border-slate-50 last:border-0"
                      >
                        {trade.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-2xl font-black hover:bg-slate-50 transition-colors"
            >
              <Upload size={18} />
              Import CSV / PDF
            </button>
          </div>
        </div>
      )}

      {/* Materials List */}
      {!loading && filteredMaterials.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          {/* Multi-select action bar */}
          {selectionMode && selectedIds.size > 0 && (
            <div className="p-3 bg-teal-50 border-b border-teal-200 flex items-center justify-between">
              <span className="text-sm font-bold text-teal-700">
                {selectedIds.size} material{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-white rounded-lg transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleAddSelected}
                  className="px-4 py-1.5 bg-teal-500 text-white rounded-lg font-black text-sm hover:bg-teal-400 transition-colors flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Add {selectedIds.size} Item{selectedIds.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {selectionMode && (
                    <th className="w-10 p-3">
                      <button
                        onClick={() => {
                          if (selectedIds.size === filteredMaterials.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(filteredMaterials.map(m => m.id)));
                          }
                        }}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        {selectedIds.size === filteredMaterials.length && filteredMaterials.length > 0
                          ? <CheckSquare size={16} className="text-teal-500" />
                          : <Square size={16} className="text-slate-400" />
                        }
                      </button>
                    </th>
                  )}
                  {!selectionMode && <th className="w-10 p-3"></th>}
                  <th className="text-left p-3 font-black text-slate-600 text-xs uppercase">Material</th>
                  <th className="text-left p-3 font-black text-slate-600 text-xs uppercase hidden md:table-cell">Unit</th>
                  <th className="text-right p-3 font-black text-slate-600 text-xs uppercase">Price</th>
                  <th className="w-20 p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((material) => (
                  <tr
                    key={material.id}
                    className={`hover:bg-slate-50 ${selectionMode ? 'cursor-pointer' : ''} ${selectedIds.has(material.id) ? 'bg-teal-50' : ''}`}
                    onClick={() => selectionMode && toggleSelectMaterial(material.id)}
                  >
                    {selectionMode && (
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectMaterial(material.id);
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          {selectedIds.has(material.id)
                            ? <CheckSquare size={16} className="text-teal-500" />
                            : <Square size={16} className="text-slate-300" />
                          }
                        </button>
                      </td>
                    )}
                    {!selectionMode && (
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavourite(material.id);
                          }}
                          className="p-1 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Star
                            size={16}
                            className={material.is_favourite
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300 hover:text-amber-400'
                            }
                          />
                        </button>
                      </td>
                    )}
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{material.name}</p>
                      {material.category && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full capitalize">
                          {material.category}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 hidden md:table-cell">{material.unit || 'pc'}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {(material.sell_price || material.cost_price)
                        ? `£${Number(material.sell_price || material.cost_price).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="p-3">
                      {!selectionMode ? (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(material);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} className="text-slate-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(material.id);
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectMaterial(material);
                          }}
                          className="px-3 py-1 bg-teal-500 text-white rounded-lg font-bold text-xs hover:bg-teal-400 transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              Showing {filteredMaterials.length} of {materials.length} materials
              {selectionMode && ' — tap to select, then add multiple at once'}
            </p>
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && materials.length > 0 && filteredMaterials.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-900 mb-2">No Results Found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Add Material Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900">Add Material</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. 15mm Copper Pipe"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unit</label>
                  <select
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  >
                    <option value="pc">pc</option>
                    <option value="m">m</option>
                    <option value="sqm">sqm</option>
                    <option value="bag">bag</option>
                    <option value="sheet">sheet</option>
                    <option value="pack">pack</option>
                    <option value="roll">roll</option>
                    <option value="tin">tin</option>
                    <option value="tube">tube</option>
                    <option value="length">length</option>
                    <option value="pair">pair</option>
                    <option value="box">box</option>
                    <option value="set">set</option>
                    <option value="kit">kit</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={addForm.sell_price}
                      onChange={(e) => setAddForm({ ...addForm, sell_price: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</label>
                  <input
                    type="text"
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    placeholder="e.g. plumbing"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMaterial}
                disabled={saving || !addForm.name.trim()}
                className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-xl font-black hover:bg-teal-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={18} />}
                Add Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900">Edit Material</h3>
              <button
                onClick={() => setEditingMaterial(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unit</label>
                  <select
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  >
                    <option value="pc">pc</option>
                    <option value="m">m</option>
                    <option value="sqm">sqm</option>
                    <option value="bag">bag</option>
                    <option value="sheet">sheet</option>
                    <option value="pack">pack</option>
                    <option value="roll">roll</option>
                    <option value="tin">tin</option>
                    <option value="tube">tube</option>
                    <option value="length">length</option>
                    <option value="pair">pair</option>
                    <option value="box">box</option>
                    <option value="set">set</option>
                    <option value="kit">kit</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.cost_price}
                      onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sell Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.sell_price}
                      onChange={(e) => setEditForm({ ...editForm, sell_price: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  placeholder="e.g. timber, plasterboard, fixings..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setEditingMaterial(null)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name}
                className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-xl font-black hover:bg-teal-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={18} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete Material?</h3>
            <p className="text-slate-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete All Materials?</h3>
            <p className="text-slate-500 text-sm mb-6">
              This will permanently remove all {materials.length} material{materials.length !== 1 ? 's' : ''} from your library. This cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={deletingAll}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {deletingAll ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
