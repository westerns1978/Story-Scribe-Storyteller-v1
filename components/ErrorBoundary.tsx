
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BRAND, isWissums } from '../utils/brandUtils';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard React Error Boundary component to catch rendering errors in the tree.
 * Warm, on-brand error state — no terminal diagnostics, no sci-fi jargon.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep a console trace for debugging without surfacing it to the user.
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  public render(): ReactNode {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      const agent = BRAND.agentName;
      const heading = isWissums
        ? `${agent} wandered off for a second 🐾`
        : `${agent} stepped away for a moment…`;
      const subtext = isWissums
        ? 'Give her a moment to find her way back.'
        : "She'll be right back. Some stories need a breath.";

      return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 text-center animate-fade-in bg-gradient-to-b from-[#fdf8f1] via-[#f7ede0] to-[#f1e4d1]">
          <div className="max-w-md w-full bg-white/70 backdrop-blur-xl p-12 rounded-[3rem] border border-amber-200/60 shadow-[0_20px_80px_rgba(180,120,60,0.15)]">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-200/70">
              <svg className="w-9 h-9 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-3xl font-serif text-stone-800 mb-4 leading-tight">
              {heading}
            </h2>
            <p className="text-stone-600 font-serif text-base md:text-lg mb-10 leading-relaxed">
              {subtext}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-5 bg-stone-800 hover:bg-stone-900 text-white rounded-full font-medium text-sm tracking-wide transition-all transform active:scale-95 shadow-lg"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
