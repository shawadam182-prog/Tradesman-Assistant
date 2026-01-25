import React, { useState } from 'react';
import { Customer } from '../../types';
import { User, Hammer, Mail, Phone, AlertCircle, Mic, MapPin } from 'lucide-react';
import { AddressAutocomplete } from '../AddressAutocomplete';
import { LiveVoiceFill, VoiceFieldConfig } from '../LiveVoiceFill';
import { parseCustomerVoiceInput } from '../../src/services/geminiService';
import { hapticTap } from '../../src/hooks/useHaptic';

// Field configuration for customer voice fill
const customerVoiceFields: VoiceFieldConfig[] = [
  { key: 'name', label: 'Full Name', icon: <User size={14} /> },
  { key: 'company', label: 'Company', icon: <Hammer size={14} /> },
  { key: 'phone', label: 'Phone Number', icon: <Phone size={14} /> },
  { key: 'email', label: 'Email Address', icon: <Mail size={14} /> },
  { key: 'address', label: 'Address', icon: <MapPin size={14} /> },
];

interface CustomerModalProps {
  isOpen: boolean;
  newCustomer: Partial<Customer>;
  isListening?: boolean;
  isProcessing?: boolean;
  error: string | null;
  onCustomerChange: (updates: Partial<Customer>) => void;
  onSave: () => void;
  onClose: () => void;
  onToggleVoice?: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  newCustomer,
  error,
  onCustomerChange,
  onSave,
  onClose,
}) => {
  const [showLiveVoiceFill, setShowLiveVoiceFill] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-[32px] md:rounded-[40px] p-3 sm:p-5 md:p-10 max-w-xl w-full mx-2 max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="space-y-2 md:space-y-6">
          <div className="flex justify-between items-center mb-2 md:mb-4">
            <h3 className="font-black text-sm md:text-xl text-slate-900 uppercase tracking-tight">Register Client</h3>
            <button
              type="button"
              onClick={() => { hapticTap(); setShowLiveVoiceFill(true); }}
              className="flex items-center gap-1 px-3 py-1.5 md:px-6 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase transition-all border bg-white text-teal-600 border-teal-100 hover:bg-teal-50 active:scale-95"
            >
              <Mic size={10} className="md:w-3 md:h-3" />
              <span className="hidden sm:inline">Voice Fill</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
            {/* Name Field */}
            <div className="space-y-0.5">
              <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 px-0.5">
                <User size={10} className="md:w-3 md:h-3" /> Full Name *
              </label>
              <input
                type="text"
                autoComplete="name"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-1.5 md:px-4 md:py-4 text-slate-950 font-bold text-sm md:text-base outline-none focus:bg-white focus:border-teal-500 transition-all"
                value={newCustomer.name || ''}
                placeholder="e.g. John Smith"
                onChange={e => onCustomerChange({ name: e.target.value })}
              />
            </div>

            {/* Company Field */}
            <div className="space-y-0.5">
              <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 px-0.5">
                <Hammer size={10} className="md:w-3 md:h-3" /> Company Name
              </label>
              <input
                type="text"
                autoComplete="organization"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-1.5 md:px-4 md:py-4 text-slate-950 font-bold text-sm md:text-base outline-none focus:bg-white focus:border-teal-500 transition-all"
                value={newCustomer.company || ''}
                placeholder="e.g. Smith & Co Roofing"
                onChange={e => onCustomerChange({ company: e.target.value })}
              />
            </div>

            {/* Email Field */}
            <div className="space-y-0.5">
              <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 px-0.5">
                <Mail size={10} className="md:w-3 md:h-3" /> Email Address
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-1.5 md:px-4 md:py-4 text-slate-950 font-bold text-sm md:text-base outline-none focus:bg-white focus:border-teal-500 transition-all"
                value={newCustomer.email || ''}
                placeholder="john@example.com"
                onChange={e => onCustomerChange({ email: e.target.value })}
              />
            </div>

            {/* Phone Field */}
            <div className="space-y-0.5">
              <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 px-0.5">
                <Phone size={10} className="md:w-3 md:h-3" /> Phone Number
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-1.5 md:px-4 md:py-4 text-slate-950 font-bold text-sm md:text-base outline-none focus:bg-white focus:border-teal-500 transition-all"
                value={newCustomer.phone || ''}
                placeholder="07123 456789"
                onChange={e => onCustomerChange({ phone: e.target.value })}
              />
            </div>

            {/* Address Field */}
            <div className="md:col-span-2">
              <AddressAutocomplete
                value={newCustomer.address || ''}
                onChange={(address) => onCustomerChange({ address })}
                placeholder="Start typing address or postcode..."
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <AlertCircle size={18} />
              <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              onClick={onSave}
              className="flex-1 bg-teal-500 text-white font-black py-5 rounded-[24px] hover:bg-teal-600 transition-all shadow-xl shadow-teal-200 uppercase tracking-widest text-xs"
            >
              Register Contact
            </button>
            <button
              onClick={onClose}
              className="px-12 bg-slate-50 text-slate-500 font-black py-5 rounded-[24px] hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* LiveVoiceFill Modal */}
      {showLiveVoiceFill && (
        <LiveVoiceFill
          fields={customerVoiceFields}
          currentData={{
            name: newCustomer.name || '',
            company: newCustomer.company || '',
            phone: newCustomer.phone || '',
            email: newCustomer.email || '',
            address: newCustomer.address || '',
          }}
          parseAction={parseCustomerVoiceInput}
          onComplete={(data) => {
            // Merge detected data into form (only non-empty values)
            onCustomerChange(
              Object.fromEntries(
                Object.entries(data).filter(([_, v]) => v)
              ) as Partial<Customer>
            );
            setShowLiveVoiceFill(false);
          }}
          onCancel={() => setShowLiveVoiceFill(false)}
          title="Voice Fill Customer"
        />
      )}
    </div>
  );
};
