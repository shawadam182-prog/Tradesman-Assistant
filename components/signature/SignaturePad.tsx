import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Type, Pen } from 'lucide-react';

interface SignaturePadProps {
  onComplete: (data: { signatureData: string; signerName: string; signatureType: 'draw' | 'type' }) => void;
  onCancel?: () => void;
  defaultName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onComplete, onCancel, defaultName = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [signerName, setSignerName] = useState(defaultName);
  const [typedSignature, setTypedSignature] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw signature line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 30);
    ctx.lineTo(rect.width - 20, rect.height - 30);
    ctx.stroke();

    // Set drawing style
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [mode]);

  const getCanvasPoint = useCallback((e: React.TouchEvent | React.MouseEvent) => {
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

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    setIsDrawing(true);
    lastPoint.current = point;
  }, [mode, getCanvasPoint]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || mode !== 'draw') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPoint.current) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPoint.current = point;
    setHasDrawn(true);
  }, [isDrawing, mode, getCanvasPoint]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw signature line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 30);
    ctx.lineTo(rect.width - 20, rect.height - 30);
    ctx.stroke();

    setHasDrawn(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!signerName.trim()) return;

    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const signatureData = canvas.toDataURL('image/png');
      onComplete({ signatureData, signerName: signerName.trim(), signatureType: 'draw' });
    } else {
      // Generate typed signature as canvas image
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 200);

      ctx.font = 'italic 48px "Dancing Script", "Brush Script MT", cursive, serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature || signerName, 300, 90);

      // Signature line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 150);
      ctx.lineTo(560, 150);
      ctx.stroke();

      const signatureData = canvas.toDataURL('image/png');
      onComplete({ signatureData, signerName: signerName.trim(), signatureType: 'type' });
    }
  }, [mode, signerName, typedSignature, hasDrawn, onComplete]);

  const canConfirm = signerName.trim() && (mode === 'type' ? (typedSignature.trim() || signerName.trim()) : hasDrawn);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4">
        <h3 className="text-lg font-bold">Sign to Accept</h3>
        <p className="text-sm text-slate-400 mt-1">Please sign below to confirm your acceptance</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Name Input */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="name"
          />
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('draw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === 'draw'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Pen size={16} />
            Draw
          </button>
          <button
            onClick={() => setMode('type')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === 'type'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Type size={16} />
            Type
          </button>
        </div>

        {/* Signature Area */}
        {mode === 'draw' ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full border border-slate-200 rounded-xl touch-none cursor-crosshair"
              style={{ height: '160px' }}
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
                <p className="text-slate-300 text-sm">Draw your signature here</p>
              </div>
            )}
            <button
              onClick={clearCanvas}
              className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-white transition-colors"
              title="Clear"
            >
              <Eraser size={16} />
            </button>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl p-4">
            <input
              type="text"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder={signerName || 'Type your signature'}
              className="w-full text-center text-2xl border-0 focus:outline-none focus:ring-0"
              style={{ fontFamily: '"Brush Script MT", "Dancing Script", cursive, serif', fontStyle: 'italic' }}
            />
            <div className="border-t border-slate-200 mt-3 pt-2">
              <p className="text-[10px] text-slate-400 text-center">Your typed signature</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm & Accept
          </button>
        </div>
      </div>
    </div>
  );
};
