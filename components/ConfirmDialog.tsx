import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20',
    },
    info: {
      icon: 'bg-teal-100 text-teal-600',
      confirmBtn: 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20',
    },
  };

  const styles = variantStyles[variant];

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4 md:mb-6">
          <div className={`p-3 rounded-xl ${styles.icon} shrink-0`}>
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-black text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0 -mt-1 -mr-1"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${styles.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
