'use client';

import React from 'react';
import { Star, ShieldCheck } from 'lucide-react';

export interface StaticProductItem {
  id?: number | string;
  title: string;
  source: string;
  price: string | number;
  rating: string | number;
  hotDeal?: boolean;
  trustTier?: string;
  verdict?: string;
}

export function StaticProductCard({ item }: { item: StaticProductItem }) {
  const formattedPrice =
    typeof item.price === 'number'
      ? `$${(item.price / 100).toFixed(2)}`
      : item.price;

  return (
    <div className="w-[320px] sm:w-[340px] h-[175px] shrink-0 mx-3 my-2 relative bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-lg backdrop-blur-md">
      {/* Ambient glow highlight for hot deals */}
      {item.hotDeal && (
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/15 blur-2xl rounded-full pointer-events-none" />
      )}

      {/* Header section */}
      <div className="flex justify-between items-start gap-2 relative z-10 w-full">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h3 className="text-white font-bold text-sm truncate leading-snug">
            {item.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-medium uppercase tracking-wider">
            <span>{item.source}</span>
            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
              <ShieldCheck className="w-2.5 h-2.5" /> 2PC Hold
            </span>
          </div>
        </div>

        {item.hotDeal && (
          <span className="px-2 py-0.5 bg-emerald-950/70 text-emerald-400 text-[9px] font-mono font-bold rounded-full uppercase tracking-wider border border-emerald-500/30 shrink-0">
            HOT DEAL
          </span>
        )}
      </div>

      {/* Footer price & score */}
      <div className="flex justify-between items-end relative z-10 w-full pt-2 border-t border-slate-800">
        <div>
          <p className="text-2xl font-black text-white tracking-tight font-mono">
            {formattedPrice}
          </p>
          <span className="text-[10px] font-mono text-cyan-400/80 font-bold block">
            {item.verdict || 'Channel3 Verified'}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 font-mono">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-slate-200 text-xs font-semibold">{item.rating}</span>
        </div>
      </div>
    </div>
  );
}
