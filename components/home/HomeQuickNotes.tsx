import React from 'react';
import { StickyNote, Mic, MicOff, Eraser } from 'lucide-react';
import { hapticTap } from '../../src/hooks/useHaptic';

interface HomeQuickNotesProps {
  quickNotes: string;
  isListeningNote: boolean;
  onSetQuickNotes: (notes: string) => void;
  onStartVoiceNote: () => void;
}

export const HomeQuickNotes: React.FC<HomeQuickNotesProps> = ({
  quickNotes,
  isListeningNote,
  onSetQuickNotes,
  onStartVoiceNote,
}) => {
  return (
    <div className="bg-white rounded-2xl md:rounded-[32px] border border-slate-200 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 md:p-3 bg-amber-500 rounded-xl md:rounded-2xl text-white">
            <StickyNote size={18} className="md:w-6 md:h-6" />
          </div>
          <h3 className="font-black text-slate-900 text-sm md:text-lg">Quick Notes</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { hapticTap(); onStartVoiceNote(); }}
            className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all ${
              isListeningNote
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-600'
            }`}
          >
            {isListeningNote ? (
              <MicOff size={18} className="md:w-5 md:h-5" />
            ) : (
              <Mic size={18} className="md:w-5 md:h-5" />
            )}
          </button>
          {quickNotes && (
            <button
              onClick={() => { hapticTap(); onSetQuickNotes(''); }}
              className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <Eraser size={18} className="md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </div>
      <textarea
        value={quickNotes}
        onChange={(e) => onSetQuickNotes(e.target.value)}
        placeholder="Jot down quick notes..."
        className="w-full h-24 md:h-32 p-3 text-sm md:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
      />
    </div>
  );
};
