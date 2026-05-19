import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#0b0e14] flex items-center justify-center p-6 font-sans">
          <div className="absolute inset-0 bg-radial-gradient from-[#2979ff15] to-transparent pointer-events-none" />
          <div className="max-w-md w-full glass-card p-8 border border-red-500/20 shadow-2xl relative z-10 flex flex-col items-center text-center">
            <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 mb-6 text-red-500 animate-pulse">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Application Error</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              Voxentia Assistant encountered an unexpected error while rendering this view.
            </p>
            {this.state.error && (
              <div className="w-full bg-[#161821] border border-white/5 rounded-lg p-3 text-left mb-6 overflow-auto max-h-[120px]">
                <code className="text-xs text-red-400 font-mono block break-words">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
