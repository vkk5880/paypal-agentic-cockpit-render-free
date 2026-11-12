'use client';

import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { FlippingProductCard, MarqueeItem } from './FlippingProductCard';

const MARQUEE_PRODUCTS: MarqueeItem[] = [
  { title: 'Sony WH-1000XM5 ANC', source: 'Amazon Official', price: '$278.00', rating: '4.8', hotDeal: true, priceScore: '0.9412', trustTier: 'tier1', verdict: 'Best Value', rebate: '$39.15', twoPhaseCommit: true },
  { title: 'ASUS ROG Zephyrus G14', source: 'Best Buy', price: '$1,449.00', rating: '4.7', hotDeal: false, priceScore: '0.8200', trustTier: 'tier2', verdict: 'Fair Value', twoPhaseCommit: true },
  { title: 'LG C3 OLED 55" 4K', source: 'B&H Photo', price: '$1,096.00', rating: '4.9', hotDeal: false, priceScore: '0.8850', trustTier: 'tier1', verdict: 'Top Rated', rebate: '$85.00', twoPhaseCommit: true },
  { title: 'Apple MacBook Air M3', source: 'Apple Store', price: '$1,049.00', rating: '4.9', hotDeal: true, priceScore: '0.9100', trustTier: 'tier1', verdict: 'Steal Deal', rebate: '$52.45', twoPhaseCommit: true },
  { title: 'Samsung Galaxy S24 Ultra', source: 'Samsung Direct', price: '$1,199.99', rating: '4.7', hotDeal: false, priceScore: '0.7510', trustTier: 'tier1', verdict: 'Market Rate', twoPhaseCommit: true },
  { title: 'Bose QuietComfort Ultra', source: 'Walmart Trusted', price: '$379.00', rating: '4.6', hotDeal: true, priceScore: '0.9630', trustTier: 'tier2', verdict: 'Knapsack Pick', rebate: '$28.40', twoPhaseCommit: true },
];

const HEADLINES = [
  'Autonomous Multi-Merchant Commerce',
  'Zero-Trust Mandates with PayPal Vault v3',
  'Knapsack Optimization with 2PC Stock Holds',
  'Deterministic Scoring & Forensics Arbitration',
];

export function HeroSection() {
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [dealsAnalyzed, setDealsAnalyzed] = useState(25842);

  // Rotate headline every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Increment simulated deals telemetry counter
  useEffect(() => {
    const interval = setInterval(() => {
      setDealsAnalyzed((prev) => prev + Math.floor(Math.random() * 4) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  return (
    <div className="relative w-full z-10 flex flex-col items-center pt-28 sm:pt-36 pb-10 px-4">
      {/* Live Telemetry Counter */}
      <div className="mb-6 px-4 py-1.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-full flex items-center gap-2.5 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-fade-in-up">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
        <span className="text-slate-300 text-[11px] font-mono tracking-widest uppercase font-bold">
          {dealsAnalyzed.toLocaleString()} AUTONOMOUS ORDERS AUDITED • 0% MATH HALLUCINATION
        </span>
      </div>

      {/* Rotating Cyberpunk Headline */}
      <div className="h-24 md:h-32 mb-4 relative w-full flex justify-center text-center">
        <h1
          key={headlineIndex}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-slate-400 absolute w-full animate-fade-in-up"
        >
          {HEADLINES[headlineIndex]}
        </h1>
      </div>

      <p className="text-slate-400 text-sm sm:text-lg max-w-2xl text-center mb-10 leading-relaxed font-sans">
        Deploy autonomous AI agents that solve multi-merchant Knapsack carts, verify 2PC stock holds, enforce zero-trust budget limits, and execute tokenized PayPal Vault checkouts.
      </p>

      {/* Smart Search Bar */}
      <div className="w-full max-w-3xl relative group animate-fade-in-up z-20">
        {/* Neon Glow Behind Search */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 rounded-3xl blur-md opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 pointer-events-none" />

        <div className="relative bg-[#060b14]/90 backdrop-blur-2xl border border-cyan-500/30 p-2 sm:p-2.5 rounded-3xl flex items-center shadow-2xl">
          <Search className="w-5 h-5 text-cyan-400 ml-3 mr-2 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-base sm:text-xl text-white outline-none placeholder:text-slate-500 px-2 py-2 sm:py-3 font-sans"
            placeholder="e.g., Sony WH-1000XM5 under $350 with 2PC hold..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <button
            onClick={handleSearch}
            className="px-5 sm:px-7 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-2xl text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex shrink-0 items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-105 active:scale-95"
          >
            <span>Deploy</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic classification preview badge */}
        {query.length > 3 && (
          <div className="absolute -bottom-9 left-4 text-[11px] font-mono text-cyan-400 flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-full border border-cyan-500/30 backdrop-blur-md animate-fade-in-up">
            <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>
              Autonomous DAG: {query.toLowerCase().includes('laptop') || query.toLowerCase().includes('mac') ? 'High-Value Electronics / 2PC Multi-Vendor Hold' : 'Consumer Tech / Knapsack Cart Split'}
            </span>
          </div>
        )}
      </div>

      {/* Product Card Marquee */}
      <div className="w-full max-w-6xl mt-16 mb-12 pointer-events-auto">
        <div className="w-full overflow-hidden relative">
          {/* Edge gradient masks */}
          <div className="absolute left-0 top-0 h-full w-20 sm:w-28 bg-gradient-to-r from-[#060b14] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 h-full w-20 sm:w-28 bg-gradient-to-l from-[#060b14] to-transparent z-10 pointer-events-none" />

          <div className="flex w-max animate-marquee-left hover:[animation-play-state:paused]">
            {[...MARQUEE_PRODUCTS, ...MARQUEE_PRODUCTS, ...MARQUEE_PRODUCTS].map((p, i) => (
              <FlippingProductCard key={`hero-card-${i}`} item={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
