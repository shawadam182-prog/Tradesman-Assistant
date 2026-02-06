import React from 'react';
import { Check } from 'lucide-react';
import type { QuoteSignature } from '../../types';

interface SignatureDisplayProps {
  signature: QuoteSignature;
  compact?: boolean;
}

export const SignatureDisplay: React.FC<SignatureDisplayProps> = ({ signature, compact = false }) => {
  const formattedDate = new Date(signature.signedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
        <Check size={14} className="text-emerald-600 flex-shrink-0" />
        <span className="text-xs text-emerald-800">
          Signed by <strong>{signature.signerName}</strong> on {formattedDate}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2">
        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
          <Check size={14} className="text-white" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-900">Accepted & Signed</h4>
          <p className="text-xs text-emerald-700">{formattedDate}</p>
        </div>
      </div>

      <div className="p-4">
        {/* Signature Image */}
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <img
            src={signature.signatureData}
            alt={`Signature by ${signature.signerName}`}
            className="w-full h-auto max-h-32 object-contain"
          />
        </div>

        {/* Signer Info */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signed by</p>
            <p className="text-sm font-bold text-slate-900">{signature.signerName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Method</p>
            <p className="text-sm text-slate-700 capitalize">{signature.signatureType === 'draw' ? 'Hand-drawn' : 'Typed'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
