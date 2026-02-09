
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard React Error Boundary component to catch rendering errors in the tree.
 * Updated to use direct Component import and class properties to resolve TypeScript inheritance issues.
 */
class ErrorBoundary extends Component<Props, State> {
  // Fix: Explicitly declare state as a class property to ensure TypeScript recognition of 'this.state'
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("NEURAL_LINK_SEVERED:", error, errorInfo);
  }

  public render(): ReactNode {
    // Fix: Access state inherited from Component base class
    const { hasError, error } = this.state;

    if (hasError) {
      return (
        <div className="fixed inset-0 bg-[#050404] z-[1000] flex items-center justify-center p-6 text-center animate-fade-in">
          <div className="max-w-md w-full glass-tier-1 p-14 rounded-[4rem] border border-red-900/20 shadow-[0_0_100px_rgba(168,45,45,0.1)]">
            <div className="w-24 h-24 bg-red-950/20 rounded-full flex items-center justify-center mx-auto mb-10 border border-red-900/30 animate-pulse">
                <svg className="w-10 h-10 text-gemynd-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-3xl font-display font-black text-white mb-4 tracking-tighter">Neural Link Severed</h2>
            <p className="text-slate-400 font-serif italic text-lg mb-12 leading-relaxed opacity-60">The Lexington node encountered a critical synchronization failure while materialising legacy.</p>
            
            <button 
                onClick={() => window.location.reload()} 
                className="w-full py-6 bg-white text-black rounded-full font-black text-xs uppercase tracking-[0.5em] transition-all transform active:scale-95 shadow-2xl haptic-tap"
            >
                Restart Archive Node
            </button>
            
            {/* Fix: Access error from state and check for nullability before accessing stack */}
            {error && (
                <div className="mt-12 pt-8 border-t border-white/5">
                    <p className="text-[9px] font-black text-red-500/40 uppercase tracking-[0.3em] mb-4">Transmission Diagnostics</p>
                    <pre className="p-5 bg-black/40 rounded-2xl text-left text-[10px] font-mono text-slate-600 overflow-auto max-h-32 scrollbar-hide border border-white/5">
                        {error.stack}
                    </pre>
                </div>
            )}
          </div>
        </div>
      );
    }
    // Fix: Access children from props inherited from Component base class
    return this.props.children;
  }
}

export default ErrorBoundary;
