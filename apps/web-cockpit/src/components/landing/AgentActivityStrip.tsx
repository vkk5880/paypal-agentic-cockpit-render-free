'use client';

import React from 'react';
import { Activity } from 'lucide-react';

const ACTIVITIES = [
  'Zero-Trust Spend Enforcer armed (Render Redis Lua {vch_<id>})',
  "Channel3 2PC inventory verified across 100M+ retail offers (Promo: 'PAYPAL-HACKATHON-2026')",
  'PayPal Vault v3 Setup Token minted (/v3/vault/setup-tokens)',
  'Solving multi-merchant Knapsack cart (α = 0.75 commission rebate)',
  'RFC 8785 canonical JSON SHA-256 hash chain verified',
  '72-Hour price-drop escrow watcher polling authorizations (/v2/payments/authorizations)',
  'Multi-modal dispute forensics vision diff & EXIF tamper analysis ready',
  'AG Studio 3 custom paypal_arbiter agent streaming telemetry',
  'Ed25519 WebCrypto Session Mandate cryptographic signature confirmed',
  'Fastify HTTP 402 paywall issuing Pay-To settlement challenges',
];

export function AgentActivityStrip() {
  return (
    <div className="w-full bg-[#060b14]/90 backdrop-blur-md border-t border-b border-cyan-500/20 py-2.5 overflow-hidden flex items-center relative z-20">
      {/* Edge gradient masks */}
      <div className="absolute left-0 w-24 sm:w-36 h-full bg-gradient-to-r from-[#060b14] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 w-24 sm:w-36 h-full bg-gradient-to-l from-[#060b14] to-transparent z-10 pointer-events-none" />

      {/* Marquee track */}
      <div className="flex w-max animate-marquee-left items-center gap-10 sm:gap-14 pr-10 sm:pr-14">
        {[...ACTIVITIES, ...ACTIVITIES].map((text, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs font-mono text-slate-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
