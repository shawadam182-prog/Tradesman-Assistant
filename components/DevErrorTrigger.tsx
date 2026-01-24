import React, { useState } from 'react';
import { Bug, AlertTriangle, Zap } from 'lucide-react';

/**
 * Development-only component to test error boundaries.
 * This component provides buttons to trigger different types of errors
 * to verify that error boundaries are working correctly.
 *
 * ONLY renders in development mode (import.meta.env.DEV)
 */

// Component that throws on render
const RenderErrorComponent: React.FC = () => {
  throw new Error('TEST ERROR: Render phase error triggered by DevErrorTrigger');
};

// Component that throws in useEffect
const EffectErrorComponent: React.FC = () => {
  React.useEffect(() => {
    throw new Error('TEST ERROR: Effect phase error triggered by DevErrorTrigger');
  }, []);
  return <div>Loading...</div>;
};

// Component that throws on click (event handler - NOT caught by error boundary)
const EventErrorComponent: React.FC = () => {
  const handleClick = () => {
    throw new Error('TEST ERROR: Event handler error (not caught by boundary)');
  };
  return (
    <button
      onClick={handleClick}
      className="bg-orange-500 text-white px-3 py-1.5 rounded text-xs font-medium"
    >
      Event Error (uncaught)
    </button>
  );
};

export const DevErrorTrigger: React.FC = () => {
  const [errorType, setErrorType] = useState<'none' | 'render' | 'effect'>('none');

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  // Trigger render error
  if (errorType === 'render') {
    return <RenderErrorComponent />;
  }

  // Trigger effect error
  if (errorType === 'effect') {
    return <EffectErrorComponent />;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className="bg-slate-800 rounded-xl p-3 shadow-xl border border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Bug className="text-red-400" size={14} />
          <span className="text-xs font-bold text-slate-300">Error Test</span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setErrorType('render')}
            className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-600 transition-colors"
          >
            <AlertTriangle size={12} />
            Render Error
          </button>
          <button
            onClick={() => setErrorType('effect')}
            className="flex items-center gap-1.5 bg-purple-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-600 transition-colors"
          >
            <Zap size={12} />
            Effect Error
          </button>
          <EventErrorComponent />
        </div>
        <p className="text-[10px] text-slate-500 mt-2 max-w-[140px]">
          Test error boundaries. Nav should stay accessible.
        </p>
      </div>
    </div>
  );
};
