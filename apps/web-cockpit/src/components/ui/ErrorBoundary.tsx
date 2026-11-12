'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught client error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="p-5 rounded-2xl border border-rose-500/30 bg-rose-950/30 backdrop-blur-md text-xs font-mono text-rose-300 shadow-lg flex flex-col gap-3 my-2"
        >
          <div className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Component Execution Fault</span>
          </div>

          <p className="text-slate-300 font-sans leading-relaxed">
            {this.state.error?.message || 'An unexpected runtime error occurred while rendering this module.'}
          </p>

          <div className="flex items-center gap-3 pt-2 border-t border-rose-500/20">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-white font-mono text-xs font-semibold border border-rose-500/40 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Render</span>
            </button>
            <span className="text-[10px] text-slate-500">AegisPay Fault Isolation Active</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
