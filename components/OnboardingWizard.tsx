import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Building2, Users, ArrowRight, Check, X } from 'lucide-react';
import { Customer } from '../types';

interface OnboardingWizardProps {
  open: boolean;
  companyName: string;
  onUpdateCompanyName: (name: string) => void;
  onAddCustomer: (customer: Customer) => Promise<Customer>;
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 'welcome' | 'company' | 'customer';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  open,
  companyName: initialCompanyName,
  onUpdateCompanyName,
  onAddCustomer,
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState<Step>('welcome');
  const [companyName, setCompanyName] = useState(initialCompanyName || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleCompanyNext = () => {
    if (companyName.trim()) {
      onUpdateCompanyName(companyName.trim());
    }
    setStep('customer');
  };

  const handleAddCustomer = async () => {
    if (!customerName.trim()) {
      onComplete();
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddCustomer({
        id: '',
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim(),
        address: '',
      });
    } catch (e) {
      console.warn('Failed to add customer during onboarding:', e);
    }
    setIsSubmitting(false);
    onComplete();
  };

  const stepIndicator = (
    <div className="flex items-center gap-2 justify-center mb-6">
      {(['welcome', 'company', 'customer'] as Step[]).map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
            s === step ? 'bg-teal-500' :
            (['welcome', 'company', 'customer'].indexOf(s) < ['welcome', 'company', 'customer'].indexOf(step))
              ? 'bg-teal-300' : 'bg-slate-200'
          }`} />
          {i < 2 && <div className="w-6 h-0.5 bg-slate-200" />}
        </div>
      ))}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl md:rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Skip button */}
        <div className="flex justify-end mb-2">
          <button onClick={onSkip} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" title="Skip onboarding">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {stepIndicator}

        {/* Step 1: Welcome */}
        {step === 'welcome' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-teal-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Welcome to TradeSync!</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Your all-in-one job management tool. Let's get you set up in 30 seconds.
            </p>
            <button
              onClick={() => setStep('company')}
              className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
            >
              Let's Go <ArrowRight size={18} />
            </button>
            <button
              onClick={onSkip}
              className="w-full mt-3 py-3 text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors"
            >
              I'll set up later
            </button>
          </div>
        )}

        {/* Step 2: Company Name */}
        {step === 'company' && (
          <div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 text-center mb-1">Your Business</h2>
            <p className="text-sm text-slate-500 text-center mb-5">
              What's your company or trading name?
            </p>
            <input
              type="text"
              placeholder="e.g. Smith Plumbing Ltd"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5 font-bold text-slate-900 outline-none focus:border-teal-400 transition-all placeholder:text-slate-300 mb-4"
              autoFocus
            />
            <button
              onClick={handleCompanyNext}
              className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
            >
              {companyName.trim() ? 'Next' : 'Skip'} <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 3: First Customer */}
        {step === 'customer' && (
          <div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 text-center mb-1">First Customer</h2>
            <p className="text-sm text-slate-500 text-center mb-5">
              Add your first customer (optional - you can always add more later)
            </p>
            <div className="space-y-3 mb-5">
              <input
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-teal-400 transition-all placeholder:text-slate-300"
                autoFocus
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-teal-400 transition-all placeholder:text-slate-300"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-teal-400 transition-all placeholder:text-slate-300"
              />
            </div>
            <button
              onClick={handleAddCustomer}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : customerName.trim() ? (
                <>Add & Get Started <Check size={18} /></>
              ) : (
                <>Skip & Get Started <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
