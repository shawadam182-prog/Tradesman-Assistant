import React from 'react';
import { Mail, X, Check, Copy } from 'lucide-react';

interface EmailHelperState {
  show: boolean;
  subject: string;
  body: string;
  email: string;
  filename: string;
  copied: boolean;
}

interface QuoteEmailHelperProps {
  emailHelper: EmailHelperState;
  onClose: () => void;
  onUpdate: (state: EmailHelperState) => void;
}

export const QuoteEmailHelper: React.FC<QuoteEmailHelperProps> = ({
  emailHelper,
  onClose,
  onUpdate,
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(emailHelper.body);
    onUpdate({ ...emailHelper, copied: true });
    setTimeout(() => onUpdate({ ...emailHelper, copied: false }), 2000);
  };

  const handleOpenEmail = () => {
    const mailtoLink = `mailto:${emailHelper.email}?subject=${encodeURIComponent(emailHelper.subject)}&body=${encodeURIComponent(emailHelper.body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-bold">PDF Downloaded</h3>
              <p className="text-xs text-slate-400">{emailHelper.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-start gap-2">
            <Check size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              PDF saved to your downloads. Now send it via email:
            </p>
          </div>

          {/* Email preview */}
          <div className="space-y-1.5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</label>
              <p className="text-sm font-medium text-slate-700">{emailHelper.email || '(add recipient)'}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</label>
              <p className="text-sm font-medium text-slate-700">{emailHelper.subject}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</label>
              <div className="bg-slate-50 rounded-xl p-2 mt-1 border border-slate-100">
                <p className="text-sm text-slate-600 whitespace-pre-line">{emailHelper.body}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 space-y-1.5">
          <button
            onClick={handleCopy}
            className={`w-full py-1 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              emailHelper.copied
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {emailHelper.copied ? <Check size={18} /> : <Copy size={18} />}
            {emailHelper.copied ? 'Copied!' : 'Copy Message'}
          </button>

          <button
            onClick={handleOpenEmail}
            className="w-full py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
          >
            <Mail size={18} />
            Open Email App
          </button>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mt-2">
            <p className="text-xs text-amber-800 text-center">
              In your email app, tap the <strong>paperclip icon</strong> to attach the PDF from your Downloads folder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
