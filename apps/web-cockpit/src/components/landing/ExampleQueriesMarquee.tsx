'use client';

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

const EXAMPLES = [
  'Sony WH-1000XM5 under $350 with 2PC stock hold',
  'MacBook Pro M3 Max multi-vendor knapsack',
  'Bose QuietComfort 45 with Vault v3 mandate',
  '4K OLED Gaming Monitor under $800',
  'Samsung Galaxy S24 Ultra with escrow hold',
  'Autonomous price-drop watch under $200',
  'AirPods Pro Gen 2 with verified store tier',
  'Logitech MX Master 3S discount rebate',
];

export interface ExampleQueriesMarqueeProps {
  className?: string;
  onSelectQuery?: (query: string) => void;
}

export function ExampleQueriesMarquee({
  className = '',
  onSelectQuery,
}: ExampleQueriesMarqueeProps) {
  return (
    <div
      role="region"
      aria-label="Example Agentic Search Queries"
      className={`w-full overflow-hidden flex items-center relative py-4 animate-fade-in-up ${className}`}
    >
      {/* Edge gradient masks */}
      <div className="absolute left-0 w-20 sm:w-32 h-full bg-gradient-to-r from-[#060b14] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 w-20 sm:w-32 h-full bg-gradient-to-l from-[#060b14] to-transparent z-10 pointer-events-none" />

      {/* Marquee track */}
      <div className="flex w-max animate-marquee-left gap-3 sm:gap-4 pointer-events-auto hover:[animation-play-state:paused]">
        {[...EXAMPLES, ...EXAMPLES, ...EXAMPLES].map((ex, i) => (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(ex)}`}
            onClick={(e) => {
              if (onSelectQuery) {
                e.preventDefault();
                onSelectQuery(ex);
              }
            }}
            className="group relative overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-slate-300 transition-all hover:border-cyan-400/60 hover:bg-cyan-950/40 shrink-0 shadow-md hover:shadow-[0_0_20px_rgba(6,182,212,0.18)] flex items-center gap-2.5"
          >
            {/* Sweeping shimmer highlight */}
            <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[150%]" />

            <div className="w-6 h-6 rounded-full bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Search className="w-3 h-3 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            </div>

            <span className="relative z-10 whitespace-nowrap">
              Query:{' '}
              <span className="text-white font-semibold group-hover:text-cyan-200 transition-colors">
                {ex}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
