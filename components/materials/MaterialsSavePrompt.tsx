import React, { useState } from 'react';
import { X, Save, Package } from 'lucide-react';
import type { MaterialItem } from '../../types';

interface MaterialsSavePromptProps {
  unsavedItems: MaterialItem[];
  onSaveAll: (items: MaterialItem[]) => Promise<void>;
  onDismiss: () => void;
}

export const MaterialsSavePrompt: React.FC<MaterialsSavePromptProps> = ({
  unsavedItems,
  onSaveAll,
  onDismiss,
}) => {
  const [saving, setSaving] = useState(false);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSaveAll(unsavedItems);
    } catch {
      // Error handling is done by the parent
    } finally {
      setSaving(false);
    }
  };

  if (unsavedItems.length === 0) return null;

  return (
    <div className="fixed bottom-24 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package size={20} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900">Save to Materials Library?</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {unsavedItems.length} new material{unsavedItems.length !== 1 ? 's' : ''} not yet in your library
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {unsavedItems.slice(0, 3).map(item => (
                  <span key={item.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold truncate max-w-[120px]">
                    {item.name}
                  </span>
                ))}
                {unsavedItems.length > 3 && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-bold">
                    +{unsavedItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-teal-500 text-white rounded-xl font-bold text-xs hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/30 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>
    </div>
  );
};
