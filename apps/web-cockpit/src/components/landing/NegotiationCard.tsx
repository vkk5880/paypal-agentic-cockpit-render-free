'use client';

import React from 'react';
import { Terminal } from 'lucide-react';

export function NegotiationCard() {
  const codeLines = [
    { line: '> Initializing synthetic intent voucher negotiation across verified vendors...', color: 'text-slate-400' },
    { line: '> Fetching multi-merchant offers via Channel3 JSON-RPC client (100M+ catalog)...', color: 'text-cyan-400' },
    { line: '> SUCCESS: Extracted $39.15 affiliate rebate passed directly to session mandate.', color: 'text-emerald-400' },
    { line: '> Cross-referencing Unoptimized Retail ($399.99) vs Knapsack Split Offer ($348.00)...', color: 'text-cyan-300' },
    { line: '> VERDICT: AegisPay Knapsack wins by $51.99 spread + waived express shipping.', color: 'text-emerald-300 font-bold' },
    { line: '> Ed25519 mandate verified. 2PC stock hold committed on PayPal Vault v3.', color: 'text-white font-bold' },
  ];

  return (
    <div className="h-[430px] w-full rounded-2xl border border-cyan-500/25 bg-[#060b14]/95 backdrop-blur-xl shadow-2xl relative overflow-hidden group flex flex-col p-5 sm:p-6 select-text card-hover">
      {/* Background radial ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Terminal window header */}
      <div className="flex justify-between items-center mb-5 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/30">
            Execution Profile: Synthetic Intent Negotiation
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_#22d3ee] animate-pulse" />
        </div>
      </div>

      {/* Terminal log output */}
      <div className="flex-1 font-mono text-xs sm:text-[13px] flex flex-col gap-3.5 overflow-y-auto">
        {codeLines.map((item, i) => (
          <div
            key={i}
            className={`${item.color} tracking-tight leading-relaxed animate-fade-in-up`}
            style={{ animationDelay: `${i * 120}ms` }}
          >
            {item.line}
          </div>
        ))}
        <div className="flex items-center gap-1 mt-1">
          <span className="w-2 h-4 bg-cyan-400 inline-block shadow-[0_0_8px_#22d3ee] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
