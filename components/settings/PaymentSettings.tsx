import React, { useState, useEffect } from 'react';
import {
  CreditCard, ExternalLink, CheckCircle2, AlertCircle,
  Loader2, Zap, PoundSterling, Shield, Clock
} from 'lucide-react';
import { AppSettings } from '../../types';
import { useToast } from '../../src/contexts/ToastContext';

interface PaymentSettingsProps {
  settings: AppSettings;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({ settings }) => {
  const toast = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<{ status: 'not_started' | 'incomplete' | 'complete'; message: string }>({
    status: 'not_started',
    message: 'Loading...'
  });

  useEffect(() => {
    (async () => {
      const { getConnectStatus } = await import('../../src/lib/stripe');
      setConnectStatus(getConnectStatus(settings));
    })();
  }, [settings]);

  const handleSetupPayments = async () => {
    setIsConnecting(true);
    try {
      const { startConnectOnboarding } = await import('../../src/lib/stripe');
      await startConnectOnboarding();
      // User will be redirected to Stripe
    } catch (error) {
      console.error('Connect setup error:', error);
      toast.error('Setup Failed', error instanceof Error ? error.message : 'Failed to start payment setup');
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-500 rounded-2xl text-white">
          <CreditCard size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Accept Card Payments</h2>
          <p className="text-sm text-slate-500">Let customers pay invoices instantly with a card</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-900 mb-3">Why accept card payments?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <Zap className="text-emerald-600 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Get paid faster</p>
              <p className="text-xs text-slate-600">Average payment time drops from 30 days to 1 day</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <PoundSterling className="text-emerald-600 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Direct to your bank</p>
              <p className="text-xs text-slate-600">Money goes straight to your account in 2-3 days</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="text-emerald-600 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Secure & trusted</p>
              <p className="text-xs text-slate-600">Powered by Stripe, used by millions of businesses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connectStatus.status === 'complete' ? (
              <div className="p-2 bg-emerald-100 rounded-xl">
                <CheckCircle2 className="text-emerald-600" size={20} />
              </div>
            ) : connectStatus.status === 'incomplete' ? (
              <div className="p-2 bg-amber-100 rounded-xl">
                <Clock className="text-amber-600" size={20} />
              </div>
            ) : (
              <div className="p-2 bg-slate-100 rounded-xl">
                <CreditCard className="text-slate-400" size={20} />
              </div>
            )}
            <div>
              <p className="font-bold text-slate-900">
                {connectStatus.status === 'complete'
                  ? 'Card Payments Active'
                  : connectStatus.status === 'incomplete'
                  ? 'Setup Incomplete'
                  : 'Card Payments Not Set Up'}
              </p>
              <p className="text-sm text-slate-500">{connectStatus.message}</p>
            </div>
          </div>

          {connectStatus.status !== 'complete' && (
            <button
              onClick={handleSetupPayments}
              disabled={isConnecting}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700
                       text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  {connectStatus.status === 'incomplete' ? 'Complete Setup' : 'Set Up Now'}
                  <ExternalLink size={16} />
                </>
              )}
            </button>
          )}
        </div>

        {connectStatus.status === 'complete' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Connected since</span>
              <span className="font-medium text-slate-900">
                {settings.stripeConnectOnboardedAt
                  ? new Date(settings.stripeConnectOnboardedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'Recently'}
              </span>
            </div>
            <button
              onClick={handleSetupPayments}
              className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              Manage payment account
              <ExternalLink size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Fee Info */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm">
            <p className="font-medium text-slate-700">Transaction Fees</p>
            <p className="text-slate-500 mt-1">
              Card payments have a fee of <strong>1.5% + 20p</strong> per transaction (Stripe's UK rate).
              For example, on a £1,000 invoice the fee would be £15.20.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
