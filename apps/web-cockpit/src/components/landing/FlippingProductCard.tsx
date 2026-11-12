'use client';

import React, { useState } from 'react';
import { Star, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export interface MarqueeItem {
  title: string;
  source: string;
  price: string | number;
  rating: string | number;
  hotDeal?: boolean;
  priceScore?: string | number;
  trustTier?: 'tier1' | 'tier2' | 'tier3' | string;
  verdict?: string;
  rebate?: string;
  twoPhaseCommit?: boolean;
}

export interface FlippingProductCardProps {
  item: MarqueeItem;
  className?: string;
}

export function FlippingProductCard({ item, className = '' }: FlippingProductCardProps) {
  const [flipped, setFlipped] = useState(false);

  const toggleFlip = () => setFlipped((prev) => !prev);

  const getTierDisplay = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'tier1':
        return 'Tier 1 Official';
      case 'tier2':
        return 'Tier 2 Trusted';
      case 'tier3':
        return 'Tier 3 Unverified';
      default:
        return tier || 'Tier 2 Trusted';
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${item.title} - Click or press Space to inspect AI reasoning layer`}
      aria-expanded={flipped}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFlip();
        }
      }}
      onClick={toggleFlip}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      className={`relative w-[320px] sm:w-[350px] h-[190px] shrink-0 group perspective-[1200px] mx-3 my-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-2xl ${className}`}
    >
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: flipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
        }}
      >
        {/* FRONT FACE */}
        <div
          className="absolute inset-0 bg-slate-900/90 border border-cyan-500/25 rounded-2xl p-5 flex flex-col justify-between overflow-hidden backdrop-blur-xl shadow-lg transition-all duration-300 group-hover:border-cyan-400/50"
          style={{
            backfaceVisibility: 'hidden',
            willChange: 'transform',
            boxShadow: item.hotDeal
              ? '0 0 25px rgba(6, 182, 212, 0.18), inset 0 0 15px rgba(168, 85, 247, 0.12)'
              : 'none',
          }}
        >
          {item.hotDeal && (
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-400/20 blur-2xl rounded-full pointer-events-none" />
          )}

          <div className="flex justify-between items-start gap-2 relative z-10">
            <div className="flex flex-col gap-1 min-w-0">
              <h3 className="text-white font-bold text-sm sm:text-base truncate leading-snug">
                {item.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-cyan-400/90 font-mono font-semibold uppercase tracking-wider">
                <span>{item.source}</span>
                {item.twoPhaseCommit !== false && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                    <ShieldCheck className="w-2.5 h-2.5" /> 2PC Hold
                  </span>
                )}
              </div>
            </div>

            {item.hotDeal && (
              <span className="px-2 py-0.5 bg-emerald-950/70 text-emerald-400 text-[10px] font-mono font-bold rounded-full flex items-center gap-1 uppercase tracking-wider border border-emerald-500/40 shrink-0 shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                <Sparkles className="w-3 h-3" />
                <span>HOT DEAL</span>
              </span>
            )}
          </div>

          <div className="flex justify-between items-end relative z-10 pt-2 border-t border-slate-800">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                {typeof item.price === 'number'
                  ? `$${(item.price / 100).toFixed(2)}`
                  : item.price}
              </p>
              {item.rebate && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold block mt-0.5">
                  Save {item.rebate} (Knapsack α = 0.75)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 font-mono">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-slate-200 text-xs font-bold">{item.rating}</span>
            </div>
          </div>
        </div>

        {/* BACK FACE (AI REASONING LAYER) */}
        <div
          className="absolute inset-0 bg-slate-950/95 border border-cyan-400/40 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl shadow-2xl"
          style={{
            backfaceVisibility: 'hidden',
            willChange: 'transform',
            transform: 'rotateX(180deg)',
          }}
        >
          <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <h4 className="text-[11px] font-mono text-cyan-300 uppercase tracking-widest font-bold">
                AI Reasoning Layer
              </h4>
            </div>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
          </div>

          <div className="flex flex-col gap-2 font-mono text-xs my-auto">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Price_Norm:</span>
              <span className="font-semibold text-cyan-200">
                {item.priceScore || '0.920'}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Trust_Tier:</span>
              <span className="font-semibold text-cyan-200">
                {getTierDisplay(item.trustTier)}
              </span>
            </div>

            <div className="flex justify-between items-center bg-cyan-950/50 p-2 rounded-lg border border-cyan-500/20 mt-1">
              <span className="text-slate-300 text-[11px]">Final_Vector:</span>
              <span
                className={`font-black text-[11px] tracking-wide uppercase ${
                  item.hotDeal ? 'text-emerald-400' : 'text-cyan-300'
                }`}
              >
                {item.verdict || 'RECOMMENDED'}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400 text-center tracking-tight pt-1 border-t border-slate-800">
            Click to flip back
          </div>
        </div>
      </div>
    </div>
  );
}
