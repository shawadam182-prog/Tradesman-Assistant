import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Eraser, Check, RotateCcw, Pen } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import type { QuoteSignature } from '../types';

interface OnSiteSignatureProps {
  quoteId: string;
  customerName: string;
  onComplete: (signature: QuoteSignature) => void;
  onClose: () => void;
}

export const OnSiteSignature: React.FC<OnSiteSignatureProps> = ({
  quoteId,
  customerName,
  onComplete,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Try to lock to landscape for more signing space
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch {
        // Orientation lock not supported or not allowed — that's fine
      }
    };
    lockOrientation();
    return () => {
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          screen.orientation.unlock();
        }
      } catch {
        // Ignore
      }
    };
  }, []);

  // Prevent scrolling while overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Initialize canvas — fill white + draw baseline
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Signature baseline
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(24, rect.height - 36);
    ctx.lineTo(rect.width - 24, rect.height - 36);
    ctx.stroke();
    ctx.setLineDash([]);

    // "x" mark at start of line
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText('x', 12, rect.height - 32);

    // Drawing style
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Also reinit on resize (e.g. orientation change)
  useEffect(() => {
    const handleResize = () => {
      if (!hasDrawn) initCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasDrawn, initCanvas]);

  const getPoint = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;
    setIsDrawing(true);
    lastPoint.current = point;
  }, [getPoint]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPoint.current) return;
    const point = getPoint(e);
    if (!point) return;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPoint.current = point;
    setHasDrawn(true);
  }, [isDrawing, getPoint]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    setHasDrawn(false);
    initCanvas();
  }, [initCanvas]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    setSaving(true);
    setError('');

    try {
      const signatureData = canvas.toDataURL('image/png');
      const now = new Date().toISOString();

      const { data, error: dbError } = await supabase
        .from('quote_signatures' as any)
        .insert({
          quote_id: quoteId,
          signer_name: customerName,
          signature_data: signatureData,
          signature_type: 'draw',
          signed_at: now,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const row = data as any;
      setSaved(true);

      // Brief pause to show confirmation then close
      setTimeout(() => {
        onComplete({
          id: row.id,
          quoteId: row.quote_id,
          signerName: row.signer_name,
          signatureData: row.signature_data,
          signatureType: row.signature_type,
          signedAt: row.signed_at,
          createdAt: row.created_at,
        });
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save signature:', err);
      setError(err.message || 'Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  // Saved confirmation screen
  if (saved) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Check size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Signature Saved</h2>
          <p className="text-slate-400 mt-2">Thank you, {customerName}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-slate-900 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <Pen size={20} className="text-teal-400" />
          <div>
            <h2 className="text-base font-black text-white leading-tight">Sign Here</h2>
            <p className="text-xs text-slate-400">{customerName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 active:scale-95 transition-all"
        >
          <X size={22} />
        </button>
      </div>

      {/* Prompt */}
      <div className="text-center py-3 shrink-0">
        <p className="text-lg font-bold text-white">Please sign below</p>
        <p className="text-xs text-slate-500 mt-0.5">Use your finger to draw your signature</p>
      </div>

      {/* Canvas Area — takes remaining space */}
      <div className="flex-1 px-4 pb-3 min-h-0">
        <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden shadow-xl shadow-black/30">
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-300 text-lg font-bold">Draw your signature here</p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-sm text-red-300 text-center shrink-0">
          {error}
        </div>
      )}

      {/* Actions — large tap targets */}
      <div className="flex gap-3 px-4 pb-6 pt-2 shrink-0">
        <button
          onClick={clearCanvas}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-700 text-white rounded-2xl font-bold text-base hover:bg-slate-600 active:scale-95 transition-all disabled:opacity-50"
        >
          <RotateCcw size={20} /> Clear
        </button>
        <button
          onClick={handleSave}
          disabled={!hasDrawn || saving}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-teal-500 text-white rounded-2xl font-black text-lg hover:bg-teal-600 active:scale-95 transition-all shadow-lg shadow-teal-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> Saving...</>
          ) : (
            <><Check size={22} /> Done</>
          )}
        </button>
      </div>
    </div>
  );
};
