import React, { useState } from 'react';
import { X, Plus, Trash2, Package, GripVertical } from 'lucide-react';
import type { MaterialKit, MaterialItem } from '../../types';

interface MaterialKitEditorProps {
  kit?: MaterialKit;
  onSave: (data: { name: string; description?: string; items: MaterialItem[]; category?: string }) => Promise<void>;
  onCancel: () => void;
}

export const MaterialKitEditor: React.FC<MaterialKitEditorProps> = ({ kit, onSave, onCancel }) => {
  const [name, setName] = useState(kit?.name || '');
  const [description, setDescription] = useState(kit?.description || '');
  const [category, setCategory] = useState(kit?.category || '');
  const [items, setItems] = useState<MaterialItem[]>(
    kit?.items?.length ? kit.items : [createBlankItem()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function createBlankItem(): MaterialItem {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      description: '',
      quantity: 1,
      unit: 'pc',
      unitPrice: 0,
      totalPrice: 0,
    };
  }

  const addItem = () => {
    setItems(prev => [...prev, createBlankItem()]);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateItem = (itemId: string, updates: Partial<MaterialItem>) => {
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      const updated = { ...i, ...updates };
      if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
        updated.totalPrice = updated.quantity * updated.unitPrice;
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Kit name is required');
      return;
    }
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      setError('At least one item with a name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        items: validItems,
        category: category.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save kit');
      setSaving(false);
    }
  };

  const kitTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={20} />
          <h3 className="text-lg font-bold">{kit ? 'Edit Kit' : 'Create Material Kit'}</h3>
        </div>
        <button onClick={onCancel} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* Kit Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kit Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. First Fix Bathroom"
              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Plumbing, Electrical"
              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this kit"
            className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kit Items</label>
            <span className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <GripVertical size={16} className="text-slate-300 mt-2 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-12 gap-2">
                  {/* Name - spans 5 cols */}
                  <div className="col-span-12 md:col-span-5">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder="Item name"
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  {/* Qty - spans 2 cols */}
                  <div className="col-span-3 md:col-span-2">
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                  {/* Unit */}
                  <div className="col-span-3 md:col-span-2">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                      placeholder="pc"
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  {/* Unit Price */}
                  <div className="col-span-4 md:col-span-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">£</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-teal-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  {/* Total (read-only) */}
                  <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                    <span className="text-xs font-bold text-slate-600">£{item.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 mt-1"
                  disabled={items.length <= 1}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addItem}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm font-bold hover:border-teal-300 hover:text-teal-600 transition-colors"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        {/* Kit Total */}
        <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-xl">
          <span className="text-sm font-bold text-teal-800">Kit Total</span>
          <span className="text-lg font-black text-teal-900">£{kitTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-bold text-sm hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/30 disabled:opacity-50"
        >
          {saving ? 'Saving...' : kit ? 'Update Kit' : 'Create Kit'}
        </button>
      </div>
    </div>
  );
};
