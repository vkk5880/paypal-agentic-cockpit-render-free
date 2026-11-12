'use client';

import React, { useState, useEffect } from 'react';
import { Activity, X } from 'lucide-react';

const NOTIFICATIONS = [
  'Render Redis Lua: {vch_user_991} atomic budget reservation confirmed',
  'PayPal Vault v3: Headless auto-buy setup token minted (/v3/vault)',
  'Channel3 2PC: Stock hold verified across 3 verified retail vendors',
  'Knapsack Solver: Identified $39.15 affiliate rebate passed to mandate',
  'RFC 8785 Audit Chain: SHA-256 block #4,892 canonical hash appended',
  'Dispute Forensics: Vision diff & EXIF inspection passed without tampering',
  'Fastify x402: Pay-To settlement challenge issued and settled via HMAC',
];

export function LiveToast() {
  const [activeToast, setActiveToast] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const triggerToast = () => {
      const msg = NOTIFICATIONS[Math.floor(Math.random() * NOTIFICATIONS.length)];
      setActiveToast(msg);

      timeoutId = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
    };

    // First trigger after 3s, then every 9-15s
    const initialTimer = setTimeout(triggerToast, 3000);
    const intervalId = setInterval(triggerToast, 12000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  if (!activeToast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 pointer-events-auto animate-fade-in-up"
    >
      <div className="bg-[#060b14]/95 backdrop-blur-2xl border border-cyan-500/30 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(6,182,212,0.18)] flex items-start gap-3.5 max-w-sm sm:max-w-md">
        <div className="mt-1 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-cyan-200 animate-pulse shadow-[0_0_10px_#22d3ee]" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 3 text-cyan-400" />
            <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
              Network Telemetry
            </p>
          </div>
          <p className="text-xs text-slate-200 leading-snug font-mono break-words">
            {activeToast}
          </p>
        </div>
        <button
          onClick={() => setActiveToast(null)}
          className="text-slate-500 hover:text-slate-300 p-1 -mt-1 -mr-1 rounded-lg transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
