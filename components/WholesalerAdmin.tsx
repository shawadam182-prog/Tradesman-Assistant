import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { generateQRCode, downloadQRCode, getReferralUrl } from '../src/lib/qrcode';
import { useAuth } from '../src/contexts/AuthContext';
import { isAdminUser, APP_CONFIG } from '../src/lib/constants';
import {
  QrCode, Download, Plus, Eye, EyeOff, Trash2, Copy, Check,
  Building2, Phone, Mail, User, Loader2, AlertCircle, Banknote,
  ChevronDown, ChevronUp, ExternalLink, RefreshCw, PoundSterling
} from 'lucide-react';

interface WholesalerStats {
  id: string;
  name: string;
  referral_code: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  commission_per_conversion: number;
  commission_paid: number;
  last_payment_date: string | null;
  notes: string | null;
  created_at: string;
  active: boolean;
  total_signups: number;
  total_conversions: number;
  commission_owed: number;
}

interface NewWholesaler {
  name: string;
  referral_code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  commission_per_conversion: number;
  notes: string;
}

export const WholesalerAdmin: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<WholesalerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [savingPayment, setSavingPayment] = useState<string | null>(null);

  const [newWholesaler, setNewWholesaler] = useState<NewWholesaler>({
    name: '',
    referral_code: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    commission_per_conversion: APP_CONFIG.DEFAULT_COMMISSION,
    notes: ''
  });

  // Check if current user is admin
  if (!isAdminUser(user?.id)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <p className="text-lg font-bold">Access Denied</p>
        <p className="text-sm mt-2">You don't have permission to view this page.</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold">
            Go Back
          </button>
        )}
      </div>
    );
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('wholesaler_stats')
        .select('*');

      if (error) throw error;
      setStats(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddWholesaler(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanCode = newWholesaler.referral_code
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9_-]/g, '');

    if (!newWholesaler.name || !cleanCode) {
      setError('Name and referral code are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('wholesalers')
        .insert({
          name: newWholesaler.name,
          referral_code: cleanCode,
          contact_name: newWholesaler.contact_name || null,
          contact_email: newWholesaler.contact_email || null,
          contact_phone: newWholesaler.contact_phone || null,
          commission_per_conversion: newWholesaler.commission_per_conversion,
          notes: newWholesaler.notes || null
        });

      if (error) throw error;

      setNewWholesaler({
        name: '',
        referral_code: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        commission_per_conversion: APP_CONFIG.DEFAULT_COMMISSION,
        notes: ''
      });
      setShowAddForm(false);
      loadStats();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleShowQR(referralCode: string) {
    if (qrPreviews[referralCode]) {
      setQrPreviews(prev => ({ ...prev, [referralCode]: '' }));
    } else {
      const dataUrl = await generateQRCode(referralCode);
      setQrPreviews(prev => ({ ...prev, [referralCode]: dataUrl }));
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this wholesaler? They will no longer appear in stats.')) return;

    try {
      const { error } = await supabase
        .from('wholesalers')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      loadStats();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRecordPayment(id: string, currentPaid: number, owedAmount: number) {
    const paymentAmount = prompt(`Enter payment amount (owed: £${owedAmount.toFixed(2)}):`, owedAmount.toFixed(2));
    if (!paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid payment amount');
      return;
    }

    setSavingPayment(id);
    try {
      const { error } = await supabase
        .from('wholesalers')
        .update({
          commission_paid: currentPaid + amount,
          last_payment_date: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      loadStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPayment(null);
    }
  }

  function copyToClipboard(text: string, code: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const totalSignups = stats.reduce((sum, w) => sum + (w.total_signups || 0), 0);
  const totalConversions = stats.reduce((sum, w) => sum + (w.total_conversions || 0), 0);
  const totalOwed = stats.reduce((sum, w) => sum + (parseFloat(String(w.commission_owed)) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Referral Partners</h1>
          <p className="text-sm text-slate-500 mt-1">Manage wholesaler QR code referral program</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
        >
          <Plus size={18} />
          Add Partner
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-red-700 text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partners</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signups</p>
          <p className="text-2xl font-black text-teal-600 mt-1">{totalSignups}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Owed</p>
          <p className="text-2xl font-black text-amber-600 mt-1">£{totalOwed.toFixed(0)}</p>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddWholesaler} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h3 className="font-bold text-slate-900">New Referral Partner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Business Name *</label>
              <input
                type="text"
                placeholder="ABC Electrical Supplies"
                value={newWholesaler.name}
                onChange={e => setNewWholesaler({ ...newWholesaler, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Referral Code *</label>
              <input
                type="text"
                placeholder="abc-electrical"
                value={newWholesaler.referral_code}
                onChange={e => setNewWholesaler({ ...newWholesaler, referral_code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">URL will be: {APP_CONFIG.BASE_URL}/r/{newWholesaler.referral_code.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '') || 'code'}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Contact Name</label>
              <input
                type="text"
                placeholder="John Smith"
                value={newWholesaler.contact_name}
                onChange={e => setNewWholesaler({ ...newWholesaler, contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Contact Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={newWholesaler.contact_email}
                onChange={e => setNewWholesaler({ ...newWholesaler, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Contact Phone</label>
              <input
                type="tel"
                placeholder="07123 456789"
                value={newWholesaler.contact_phone}
                onChange={e => setNewWholesaler({ ...newWholesaler, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Commission per Conversion (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newWholesaler.commission_per_conversion}
                onChange={e => setNewWholesaler({ ...newWholesaler, commission_per_conversion: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Notes</label>
              <textarea
                placeholder="Any additional notes..."
                value={newWholesaler.notes}
                onChange={e => setNewWholesaler({ ...newWholesaler, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-slate-600 font-bold rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 text-white font-bold rounded-lg shadow-lg shadow-teal-500/20 active:scale-95"
            >
              Add Partner
            </button>
          </div>
        </form>
      )}

      {/* Partners List */}
      <div className="space-y-3">
        {stats.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <QrCode size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-bold">No referral partners yet</p>
            <p className="text-sm mt-1">Add your first partner to start tracking referrals</p>
          </div>
        ) : (
          stats.map((w) => (
            <div key={w.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Main Row */}
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedRow(expandedRow === w.id ? null : w.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    <h3 className="font-bold text-slate-900 truncate">{w.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">{w.referral_code}</code>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(getReferralUrl(w.referral_code), w.referral_code);
                      }}
                      className="text-slate-400 hover:text-teal-500"
                    >
                      {copiedCode === w.referral_code ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="text-center px-3">
                  <p className="text-lg font-black text-teal-600">{w.total_signups}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Signups</p>
                </div>
                <div className="text-center px-3">
                  <p className="text-lg font-black text-slate-900">{w.total_conversions}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Converts</p>
                </div>
                <div className="text-center px-3">
                  <p className="text-lg font-black text-amber-600">£{(parseFloat(String(w.commission_owed)) || 0).toFixed(0)}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Owed</p>
                </div>
                {expandedRow === w.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </div>

              {/* Expanded Details */}
              {expandedRow === w.id && (
                <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {w.contact_name && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User size={14} className="text-slate-400" />
                        {w.contact_name}
                      </div>
                    )}
                    {w.contact_email && (
                      <a href={`mailto:${w.contact_email}`} className="flex items-center gap-2 text-sm text-teal-600 hover:underline">
                        <Mail size={14} />
                        {w.contact_email}
                      </a>
                    )}
                    {w.contact_phone && (
                      <a href={`tel:${w.contact_phone}`} className="flex items-center gap-2 text-sm text-teal-600 hover:underline">
                        <Phone size={14} />
                        {w.contact_phone}
                      </a>
                    )}
                  </div>

                  {/* Commission Details */}
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Rate</p>
                        <p className="font-bold text-slate-900">£{parseFloat(String(w.commission_per_conversion)).toFixed(2)}/conv</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Total Earned</p>
                        <p className="font-bold text-slate-900">£{(w.total_conversions * w.commission_per_conversion).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Paid</p>
                        <p className="font-bold text-green-600">£{(parseFloat(String(w.commission_paid)) || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Outstanding</p>
                        <p className="font-bold text-amber-600">£{(parseFloat(String(w.commission_owed)) || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    {w.last_payment_date && (
                      <p className="text-[10px] text-slate-400 mt-2">
                        Last payment: {new Date(w.last_payment_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {w.notes && (
                    <div className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-200">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Notes</p>
                      {w.notes}
                    </div>
                  )}

                  {/* QR Preview */}
                  {qrPreviews[w.referral_code] && (
                    <div className="flex flex-col items-center bg-white rounded-lg p-4 border border-slate-200">
                      <img src={qrPreviews[w.referral_code]} alt={`QR for ${w.name}`} className="w-48 h-48" />
                      <p className="text-xs text-slate-500 mt-2">{getReferralUrl(w.referral_code)}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleShowQR(w.referral_code)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
                    >
                      {qrPreviews[w.referral_code] ? <EyeOff size={16} /> : <Eye size={16} />}
                      {qrPreviews[w.referral_code] ? 'Hide QR' : 'Show QR'}
                    </button>
                    <button
                      onClick={() => downloadQRCode(w.referral_code, w.name)}
                      className="flex items-center gap-2 px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-teal-500/20 active:scale-95"
                    >
                      <Download size={16} />
                      Download QR
                    </button>
                    <button
                      onClick={() => copyToClipboard(getReferralUrl(w.referral_code), w.referral_code)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
                    >
                      <ExternalLink size={16} />
                      Copy Link
                    </button>
                    {(parseFloat(String(w.commission_owed)) || 0) > 0 && (
                      <button
                        onClick={() => handleRecordPayment(w.id, parseFloat(String(w.commission_paid)) || 0, parseFloat(String(w.commission_owed)) || 0)}
                        disabled={savingPayment === w.id}
                        className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50"
                      >
                        {savingPayment === w.id ? <Loader2 size={16} className="animate-spin" /> : <PoundSterling size={16} />}
                        Record Payment
                      </button>
                    )}
                    <button
                      onClick={() => handleDeactivate(w.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-bold active:scale-95"
                    >
                      <Trash2 size={16} />
                      Deactivate
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-teal-500 font-medium"
        >
          <RefreshCw size={16} />
          Refresh Stats
        </button>
      </div>
    </div>
  );
};

export default WholesalerAdmin;
