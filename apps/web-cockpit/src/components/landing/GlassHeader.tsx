'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowRight, Activity } from 'lucide-react';

export function GlassHeader() {
  const isDevTools = process.env.NEXT_PUBLIC_DEV_TOOLS === 'true';

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5 mx-auto max-w-7xl mt-2 sm:mt-4 transition-all">
      {/* Glassmorphic backdrop shell */}
      <div className="absolute inset-0 bg-[#060b14]/75 backdrop-blur-2xl rounded-full border border-cyan-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-none mx-2 sm:mx-4" />

      <div className="relative flex items-center justify-between z-10 w-full px-4 sm:px-6">
        {/* Brand logo & status indicator */}
        <div
          onClick={scrollToTop}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:border-cyan-400 transition-colors">
            <Shield className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black tracking-wider text-base sm:text-lg leading-none font-mono">
              AEGIS<span className="text-cyan-400">PAY</span>
            </span>
            <span className="text-[9px] font-mono text-cyan-500/80 tracking-widest uppercase">
              Agentic Cockpit
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-mono tracking-wider uppercase">
          <Link
            href="/cockpit"
            className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-500" />
            <span>Cockpit</span>
          </Link>
          <Link
            href="/search"
            className="text-slate-400 hover:text-cyan-300 transition-colors"
          >
            Search
          </Link>
          <Link
            href="/history"
            className="text-slate-400 hover:text-cyan-300 transition-colors"
          >
            Audit Ledger
          </Link>
          {isDevTools && (
            <Link
              href="/judge"
              className="text-slate-400 hover:text-cyan-300 transition-colors"
            >
              Chaos Lab
            </Link>
          )}
        </nav>

        {/* CTA Launch Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="group relative overflow-hidden inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all hover:scale-105"
          >
            <span>Launch</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </header>
  );
}
