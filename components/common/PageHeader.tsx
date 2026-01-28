import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onBack?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, onBack }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="flex items-center gap-2 md:gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 md:p-2 -ml-1 md:-ml-2 text-slate-500 hover:text-slate-700 bg-slate-100 md:bg-transparent hover:bg-slate-200 md:hover:bg-slate-100 rounded-xl transition-colors active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft size={22} className="md:w-5 md:h-5" />
          </button>
        )}
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs md:text-base text-slate-500 dark:text-slate-400 font-medium italic mt-0.5 md:mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};
