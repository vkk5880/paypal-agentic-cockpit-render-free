'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

const AUDIT_BLOCKS = [
  { type: 'RFC 8785 SHA-256', hash: 'TX: 0x8fA2...391a', label: 'CANONICAL CHAIN VALID' },
  { type: 'SESSION MANDATE', hash: 'Ed25519: 0x2cB9...442b', label: 'KEY SIGNED' },
  { type: 'ESCROW 2PC HOLD', hash: 'AUTH: auth_9xV1...001c', label: 'PAYPAL CAPTURED' },
  { type: 'REDIS LUA ENFORCER', hash: 'TAG: {vch_11Pq}', label: 'ATOMIC BUDGET LOCK' },
  { type: 'X402 PAYWALL', hash: 'HMAC: 0x5aF4...112x', label: 'SETTLEMENT VERIFIED' },
  { type: 'CHANNEL3 INVENTORY', hash: 'HOLD: ch3_7oM2...556y', label: 'STOCK VERIFIED' },
  { type: 'DISPUTE FORENSICS', hash: 'SEAL: 0x3bN8...991k', label: 'EXIF TAMPER SECURED' },
];

export function BlockchainStrip() {
  return (
    <div
      role="region"
      aria-label="Cryptographic Audit and Settlement Ledger"
      className="w-full bg-[#060b14]/95 border-t border-b border-cyan-500/15 py-3.5 overflow-hidden flex items-center relative z-20 shadow-md backdrop-blur-md"
    >
      {/* Edge gradient masks */}
      <div className="absolute left-0 w-24 sm:w-36 h-full bg-gradient-to-r from-[#060b14] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 w-24 sm:w-36 h-full bg-gradient-to-l from-[#060b14] to-transparent z-10 pointer-events-none" />

      {/* Marquee track */}
      <div className="flex w-max animate-marquee-left items-center gap-10 sm:gap-14 pr-10 sm:pr-14 hover:[animation-play-state:paused] cursor-default">
        {[...AUDIT_BLOCKS, ...AUDIT_BLOCKS, ...AUDIT_BLOCKS].map((block, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 text-xs font-mono shrink-0 select-none"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{block.label}</span>
            </span>
            <span className="text-slate-400 font-semibold">{block.type}:</span>
            <span className="text-cyan-400 font-mono">{block.hash}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
