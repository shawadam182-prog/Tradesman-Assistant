import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-6">
              We hit an unexpected error. This has been logged and we'll look into it.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                <Home size={16} />
                Reload App
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left bg-slate-100 rounded-xl p-4">
                <summary className="text-xs font-bold text-slate-500 cursor-pointer">Error Details (Tap to expand)</summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto whitespace-pre-wrap">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline error component for partial failures
export const InlineError: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
    <AlertTriangle className="text-red-500 shrink-0" size={20} />
    <p className="text-sm text-red-700 flex-1">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1"
      >
        <RefreshCw size={12} />
        Retry
      </button>
    )}
  </div>
);

// Empty state component
export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, title, description, action }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
      {icon}
    </div>
    <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="bg-amber-500 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);
