import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Save, RotateCcw, Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { emailTemplateService } from '../../src/services/emailTemplateService';
import type { EmailTemplate } from '../../types';

export const EmailTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editedSubjects, setEditedSubjects] = useState<Record<string, string>>({});
  const [editedBodies, setEditedBodies] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await emailTemplateService.getAll();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSave = async (template: EmailTemplate) => {
    setSavingId(template.id);
    try {
      const updated = await emailTemplateService.update(template.id, {
        subject: editedSubjects[template.id] ?? template.subject,
        body: editedBodies[template.id] ?? template.body,
      });
      setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      // Clear edits
      setEditedSubjects(prev => { const next = { ...prev }; delete next[template.id]; return next; });
      setEditedBodies(prev => { const next = { ...prev }; delete next[template.id]; return next; });
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = (template: EmailTemplate) => {
    setEditedSubjects(prev => { const next = { ...prev }; delete next[template.id]; return next; });
    setEditedBodies(prev => { const next = { ...prev }; delete next[template.id]; return next; });
  };

  const isEdited = (template: EmailTemplate) =>
    (editedSubjects[template.id] !== undefined && editedSubjects[template.id] !== template.subject) ||
    (editedBodies[template.id] !== undefined && editedBodies[template.id] !== template.body);

  const TEMPLATE_LABELS: Record<string, string> = {
    quote_send: 'Quote / Estimate',
    invoice_send: 'Invoice',
    payment_reminder: 'Payment Reminder',
    payment_received: 'Payment Received',
  };

  const AVAILABLE_VARIABLES = [
    '{{customer_name}}', '{{company_name}}', '{{company_phone}}', '{{company_email}}',
    '{{project_title}}', '{{doc_type}}', '{{reference}}', '{{total_amount}}',
    '{{due_date}}', '{{payment_instructions}}', '{{amount}}',
  ];

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Loader2 size={20} className="animate-spin mx-auto mb-2" />
        Loading templates...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Variables help */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-blue-800">Template Variables</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {AVAILABLE_VARIABLES.map(v => (
                <code key={v} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-mono">{v}</code>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            Email open tracking is approximate due to email client privacy features.
          </p>
        </div>
      </div>

      {templates.map(template => {
        const isOpen = expandedId === template.id;
        const hasEdits = isEdited(template);
        const currentSubject = editedSubjects[template.id] ?? template.subject;
        const currentBody = editedBodies[template.id] ?? template.body;

        return (
          <div key={template.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpandedId(isOpen ? null : template.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
            >
              <Mail size={16} className="text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-bold text-slate-900">
                  {TEMPLATE_LABELS[template.templateType] || template.templateType}
                </span>
                {hasEdits && <span className="ml-2 text-[10px] text-amber-600 font-bold">Unsaved changes</span>}
              </div>
              {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {isOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                  <input
                    type="text"
                    value={currentSubject}
                    onChange={(e) => setEditedSubjects(prev => ({ ...prev, [template.id]: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Body</label>
                  <textarea
                    value={currentBody}
                    onChange={(e) => setEditedBodies(prev => ({ ...prev, [template.id]: e.target.value }))}
                    rows={6}
                    className="w-full mt-0.5 px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono text-xs"
                  />
                </div>
                {hasEdits && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReset(template)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      <RotateCcw size={12} />
                      Reset
                    </button>
                    <button
                      onClick={() => handleSave(template)}
                      disabled={savingId === template.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {savingId === template.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
