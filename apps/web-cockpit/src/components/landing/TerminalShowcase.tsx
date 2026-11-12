'use client';

import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export function TerminalShowcase() {
  const [copied, setCopied] = useState(false);

  const jsonCode = `{
  "mandate_id": "mnd_ed25519_99182a",
  "task": "autonomous_multi_merchant_clearing",
  "pipeline_state": {
    "query": "Sony WH-1000XM5 under $350 with 2PC hold",
    "channel3_catalog_hits": [
      { "store": "Amazon Official", "price_cents": 27800, "trust_tier": "tier1" },
      { "store": "Best Buy", "price_cents": 34800, "trust_tier": "tier1" }
    ],
    "custodian_verification": {
      "redis_lua_key": "{vch_user_991}",
      "merchant_anomaly_bp": 140,
      "gate_status": "ALLOW"
    },
    "knapsack_cart_solver": {
      "selected_count": 1,
      "subtotal_cents": 27800,
      "affiliate_rebate_cents": 3915,
      "shipping_fee_cents": 0
    },
    "cryptographic_proof": {
      "ed25519_signature": "0x2cB9...442b",
      "rfc8785_audit_hash": "0x8fA2...391a",
      "paypal_vault_status": "VAULT_V3_COMMITTED"
    }
  }
}`;

  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(jsonCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-16 px-4 relative group select-text">
      {/* Background glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-15 group-hover:opacity-30 transition duration-1000 pointer-events-none" />

      <div className="relative rounded-2xl border border-cyan-500/30 bg-[#060b14]/95 p-5 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Window controls bar */}
        <div className="flex border-b border-cyan-500/20 pb-4 mb-5 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-500/40" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-500/40" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-500/40" />
            </div>
            <div className="flex items-center gap-1.5 ml-3 text-cyan-400 font-mono text-xs">
              <Terminal className="w-3.5 h-3.5" />
              <span className="text-slate-400">@aegispay/shared-types:</span>
              <span className="font-semibold text-white">CommercePipelineOutput.json</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-emerald-400 font-mono text-[10px] uppercase tracking-widest border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
              RFC 8785 VERIFIED
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded border border-slate-700/60 bg-slate-800/50"
              aria-label="Copy JSON payload"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Code body */}
        <pre className="font-mono text-xs sm:text-[13px] text-cyan-200/90 overflow-x-auto whitespace-pre-wrap leading-relaxed tracking-wide">
          {jsonCode}
        </pre>
      </div>
    </div>
  );
}
