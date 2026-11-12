'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Swords, Trophy, Star, TrendingDown, ArrowRight, Sparkles } from 'lucide-react';

export function BattleModeCard() {
  const [hoveredSide, setHoveredSide] = useState<'A' | 'B' | null>(null);

  return (
    <div className="w-full rounded-3xl border border-cyan-500/25 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden group flex flex-col items-center p-6 sm:p-8 card-hover">
      {/* Background ambient radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Header Badge */}
      <div className="relative z-10 inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-6 border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 rounded-full shadow-inner">
        <Swords className="w-3.5 h-3.5" />
        <span>Execution Profile: Battle Mode (Min-Max ILP)</span>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="w-full flex flex-col sm:flex-row items-stretch justify-between gap-4 relative z-10">
        {/* Left Contender: Unoptimized Retail */}
        <div
          onMouseEnter={() => setHoveredSide('A')}
          onMouseLeave={() => setHoveredSide(null)}
          className={`flex-1 rounded-2xl p-5 border transition-all flex flex-col justify-between ${
            hoveredSide === 'A'
              ? 'bg-slate-950 border-slate-700 scale-[1.02]'
              : 'bg-black/60 border-slate-800/80 opacity-70 filter grayscale hover:grayscale-0 hover:opacity-100'
          }`}
        >
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Unoptimized Retail
              </span>
              <span className="text-xs font-mono text-slate-500">Side A</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-2 leading-snug">
              Standard Retail Listing (MSRP)
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Standard full price with $15.00 shipping fee and no platform commission rebate.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <span className="text-xl font-black text-slate-300 font-mono block mb-1">
              $399.99
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Score: 6.8 / 10
            </span>
          </div>
        </div>

        {/* Central VS Badge */}
        <div className="flex sm:flex-col items-center justify-center shrink-0 my-2 sm:my-0">
          <div className="w-10 h-10 rounded-full bg-cyan-950/90 border border-cyan-500/50 flex items-center justify-center font-black text-xs text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            VS
          </div>
        </div>

        {/* Right Contender: AegisPay Algorithmic Pick */}
        <div
          onMouseEnter={() => setHoveredSide('B')}
          onMouseLeave={() => setHoveredSide(null)}
          className="flex-1 rounded-2xl p-5 border-2 border-cyan-500 bg-cyan-950/30 shadow-xl shadow-cyan-950/50 flex flex-col justify-between relative scale-[1.02]"
        >
          <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
            <Trophy className="w-3 h-3 text-amber-300" />
            <span>Winner Pick</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-500/30">
                Channel3 2PC Optimized
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">Side B</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-2 leading-snug">
              AegisPay Knapsack Split Offer
            </h4>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              13% below MSRP + $39.15 affiliate rebate passed to mandate + waived express shipping.
            </p>
          </div>

          <div className="pt-3 border-t border-cyan-500/30">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-black text-white font-mono">
                $348.00
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" /> Save $51.99
              </span>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 font-bold">
              Composite Score: 9.4 / 10 ★
            </span>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-6 w-full flex items-center justify-between text-xs font-mono text-slate-400 pt-4 border-t border-slate-800 relative z-10">
        <span>Deterministic 0% LLM math hallucination guarantee</span>
        <Link
          href="/search"
          className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
        >
          <span>Run Battle Arena</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
