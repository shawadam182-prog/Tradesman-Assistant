import React, { useState, useEffect, useCallback } from 'react';
import { X, Package, Star, ChevronRight, Search, Layers } from 'lucide-react';
import type { MaterialKit, MaterialItem } from '../../types';
import { useData } from '../../src/contexts/DataContext';

interface MaterialKitPickerProps {
  onApplyKit: (items: MaterialItem[]) => void;
  onClose: () => void;
}

export const MaterialKitPicker: React.FC<MaterialKitPickerProps> = ({ onApplyKit, onClose }) => {
  const { services } = useData();
  const [kits, setKits] = useState<MaterialKit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [previewKit, setPreviewKit] = useState<MaterialKit | null>(null);

  const loadKits = useCallback(async () => {
    setLoading(true);
    try {
      const [kitsData, categoriesData] = await Promise.all([
        services.materialKits.getAll(),
        services.materialKits.getCategories(),
      ]);
      setKits(kitsData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load kits');
    } finally {
      setLoading(false);
    }
  }, [services.materialKits]);

  useEffect(() => {
    loadKits();
  }, [loadKits]);

  const filteredKits = kits.filter(kit => {
    if (search && !kit.name.toLowerCase().includes(search.toLowerCase()) &&
        !kit.description?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCategory && kit.category !== selectedCategory) return false;
    return true;
  });

  const handleApply = (kit: MaterialKit) => {
    // Generate new IDs for the items so they're unique in the section
    const itemsWithNewIds = kit.items.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
    }));
    onApplyKit(itemsWithNewIds);
  };

  const kitTotal = (kit: MaterialKit) => kit.items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={20} />
          <h3 className="text-lg font-bold">
            {previewKit ? 'Kit Preview' : 'Apply Material Kit'}
          </h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      {previewKit ? (
        // Preview mode
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900">{previewKit.name}</h4>
              {previewKit.description && (
                <p className="text-xs text-slate-500 mt-0.5">{previewKit.description}</p>
              )}
            </div>
            {previewKit.category && (
              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                {previewKit.category}
              </span>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">Item</th>
                  <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase">Qty</th>
                  <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase">Unit</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-slate-500 uppercase">Price</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {previewKit.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-3 py-2 text-slate-900">{item.name}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{item.unit}</td>
                    <td className="px-3 py-2 text-right text-slate-600">£{item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">£{item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-teal-50 border-t border-teal-200">
                  <td colSpan={4} className="px-3 py-2 text-sm font-bold text-teal-800">Kit Total</td>
                  <td className="px-3 py-2 text-right font-black text-teal-900">£{kitTotal(previewKit).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setPreviewKit(null)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => handleApply(previewKit)}
              className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-bold text-sm hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/30"
            >
              Apply to Section
            </button>
          </div>
        </div>
      ) : (
        // List mode
        <div className="p-4 space-y-3">
          {/* Search + Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search kits..."
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

          {/* Kit List */}
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading kits...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500 text-sm">{error}</div>
            ) : filteredKits.length === 0 ? (
              <div className="text-center py-8">
                <Package size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  {search || selectedCategory ? 'No kits match your search' : 'No material kits yet'}
                </p>
              </div>
            ) : (
              filteredKits.map(kit => (
                <button
                  key={kit.id}
                  onClick={() => setPreviewKit(kit)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 rounded-xl transition-colors text-left group"
                >
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900 truncate">{kit.name}</span>
                      {kit.isFavourite && <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{kit.items.length} item{kit.items.length !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs font-bold text-teal-600">£{kitTotal(kit).toFixed(2)}</span>
                      {kit.category && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{kit.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
