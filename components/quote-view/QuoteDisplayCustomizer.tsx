import React from 'react';
import { Eye, EyeOff, Package, HardHat, Landmark } from 'lucide-react';
import { QuoteDisplayOptions } from '../../types';

interface QuoteDisplayCustomizerProps {
  displayOptions: QuoteDisplayOptions;
  onToggleOption: (optionKey: keyof QuoteDisplayOptions) => void;
}

const CustomiseToggle: React.FC<{
  label: string;
  isActive: boolean;
  activeColor: string;
  onClick: () => void;
}> = ({ label, isActive, activeColor, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between w-full px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
      isActive
        ? `${activeColor} border-transparent shadow-sm`
        : 'bg-white text-slate-300 border-slate-100 italic opacity-60'
    }`}
  >
    <span className="truncate mr-2">{label}</span>
    {isActive ? <Eye size={10} /> : <EyeOff size={10} />}
  </button>
);

export const QuoteDisplayCustomizer: React.FC<QuoteDisplayCustomizerProps> = ({
  displayOptions,
  onToggleOption,
}) => {
  return (
    <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-2xl animate-in slide-in-from-top-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Materials Column */}
        <div className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Package size={12} className="text-amber-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Materials</span>
          </div>
          <CustomiseToggle
            label="Show Section"
            isActive={displayOptions.showMaterials}
            activeColor="bg-amber-500 text-white"
            onClick={() => onToggleOption('showMaterials')}
          />
          <div className={`space-y-1 pl-2 border-l border-slate-100 transition-all ${displayOptions.showMaterials ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <CustomiseToggle
              label="Detailed List"
              isActive={displayOptions.showMaterialItems}
              activeColor="bg-slate-900 text-amber-500"
              onClick={() => onToggleOption('showMaterialItems')}
            />
            <div className={`space-y-1 transition-all ${displayOptions.showMaterialItems ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <CustomiseToggle
                label="Show Quantities"
                isActive={displayOptions.showMaterialQty}
                activeColor="bg-slate-800 text-white"
                onClick={() => onToggleOption('showMaterialQty')}
              />
              <CustomiseToggle
                label="Show Unit Prices"
                isActive={displayOptions.showMaterialUnitPrice}
                activeColor="bg-slate-800 text-white"
                onClick={() => onToggleOption('showMaterialUnitPrice')}
              />
              <CustomiseToggle
                label="Show Line Totals"
                isActive={displayOptions.showMaterialLineTotals}
                activeColor="bg-slate-800 text-white"
                onClick={() => onToggleOption('showMaterialLineTotals')}
              />
            </div>
            <CustomiseToggle
              label="Section Total"
              isActive={displayOptions.showMaterialSectionTotal}
              activeColor="bg-slate-800 text-white"
              onClick={() => onToggleOption('showMaterialSectionTotal')}
            />
          </div>
        </div>

        {/* Labour Column */}
        <div className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <HardHat size={12} className="text-blue-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Labour</span>
          </div>
          <CustomiseToggle
            label="Show Section"
            isActive={displayOptions.showLabour}
            activeColor="bg-blue-600 text-white"
            onClick={() => onToggleOption('showLabour')}
          />
          <div className={`space-y-1 pl-2 border-l border-slate-100 transition-all ${displayOptions.showLabour ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <CustomiseToggle
              label="Detailed Info"
              isActive={displayOptions.showLabourItems}
              activeColor="bg-slate-900 text-blue-500"
              onClick={() => onToggleOption('showLabourItems')}
            />
            <div className={`space-y-1 transition-all ${displayOptions.showLabourItems ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <CustomiseToggle
                label="Show Hours"
                isActive={displayOptions.showLabourQty}
                activeColor="bg-slate-800 text-white"
                onClick={() => onToggleOption('showLabourQty')}
              />
              <CustomiseToggle
                label="Show Hourly Rate"
                isActive={displayOptions.showLabourUnitPrice}
                activeColor="bg-slate-800 text-white"
                onClick={() => onToggleOption('showLabourUnitPrice')}
              />
              <CustomiseToggle
                label="Show Subtotals"
                isActive={displayOptions.showLabourLineTotals}
                activeColor="bg-slate-800 text-white"
                onClick={() => onToggleOption('showLabourLineTotals')}
              />
            </div>
            <CustomiseToggle
              label="Section Total"
              isActive={displayOptions.showLabourSectionTotal}
              activeColor="bg-slate-800 text-white"
              onClick={() => onToggleOption('showLabourSectionTotal')}
            />
          </div>
        </div>

        {/* Tax & Branding Column */}
        <div className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Landmark size={12} className="text-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Tax & Branding</span>
          </div>
          <CustomiseToggle
            label="VAT Breakdown"
            isActive={displayOptions.showVat}
            activeColor="bg-emerald-600 text-white"
            onClick={() => onToggleOption('showVat')}
          />
          <CustomiseToggle
            label="CIS Deductions"
            isActive={displayOptions.showCis}
            activeColor="bg-emerald-600 text-white"
            onClick={() => onToggleOption('showCis')}
          />
          <CustomiseToggle
            label="Totals Summary"
            isActive={displayOptions.showTotalsBreakdown}
            activeColor="bg-slate-900 text-white"
            onClick={() => onToggleOption('showTotalsBreakdown')}
          />
          <CustomiseToggle
            label="Business Logo"
            isActive={displayOptions.showLogo}
            activeColor="bg-slate-900 text-white"
            onClick={() => onToggleOption('showLogo')}
          />
          <CustomiseToggle
            label="Terms/Notes"
            isActive={displayOptions.showNotes}
            activeColor="bg-slate-900 text-white"
            onClick={() => onToggleOption('showNotes')}
          />
        </div>
      </div>
    </div>
  );
};
