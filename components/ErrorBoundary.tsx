
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches errors in its subtree and displays a fallback UI.
 */
class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Explicitly declaring state and props properties to ensure they are correctly recognized 
  // by the TypeScript compiler as members of the class, avoiding 'Property does not exist' errors.
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    // Initialize state within the constructor.
    this.state = {
      hasError: false,
      error: null
    };
  }

  // Update state so the next render will show the fallback UI.
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Log error information to the console.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("NEURAL_LINK_SEVERED:", error, errorInfo);
  }

  // Use inherited members this.props and this.state.
  public render(): ReactNode {
    // FIX: Accessing state and props from the class instance using 'this'.
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-8 rounded-3xl shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Neural Link Severed</h2>
            <p className="text-slate-400 text-sm mb-6">The UI encountered an unrecoverable state. Diagnostic reports sent to Lexington Node.</p>
            <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all transform active:scale-95">Restart Engine</button>
            {error && <pre className="mt-6 p-4 bg-black/50 rounded-lg text-left text-[10px] font-mono text-red-400 overflow-auto max-h-32">{error.toString()}</pre>}
          </div>
        </div>
      );
    }
    return children;
  }
}

export default ErrorBoundary;
