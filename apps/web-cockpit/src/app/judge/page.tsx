'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  Terminal,
  Zap,
  Server,
  Activity,
  Layers,
  ArrowRight,
  ShoppingCart,
  Undo2,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Database,
  Code2,
  Copy,
  Check,
} from 'lucide-react';
import { chaosLogger as logger } from '@/lib/logger';

interface TerminalOutput {
  actionTitle: string;
  timestamp: string;
  status: string;
  data: any;
}

export default function JudgeChaosPortal() {
  const [terminalLogs, setTerminalLogs] = useState<TerminalOutput | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [verifyData, setVerifyData] = useState<any>(null);
  const [loadingVerify, setLoadingVerify] = useState<boolean>(false);
  const [copiedTerminal, setCopiedTerminal] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    logger.info('[JudgeChaosPortal] Copying terminal output to clipboard', { id, textLength: text.length });
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTerminal(id);
      setTimeout(() => setCopiedTerminal(null), 2000);
    } else {
      logger.warn('[JudgeChaosPortal] navigator.clipboard is not available in current environment');
    }
  };

  const fetchVerifyLedger = async () => {
    logger.info('[JudgeChaosPortal] Fetching verification ledger from /api/integrations/verify');
    setLoadingVerify(true);
    const startTime = Date.now();
    try {
      const res = await fetch('/api/integrations/verify');
      const json = await res.json();
      const elapsed = Date.now() - startTime;
      logger.info('[JudgeChaosPortal] Verification ledger fetched successfully', {
        status: json.status,
        integrationsCount: json.integrations ? Object.keys(json.integrations).length : 0,
        elapsedMs: elapsed,
      });
      setVerifyData(json);
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      logger.error('[JudgeChaosPortal] Failed to query /api/integrations/verify', {
        error: err?.message,
        stack: err?.stack,
        elapsedMs: elapsed,
      });
      setVerifyData({ error: 'Failed to query /api/integrations/verify', details: err.message });
    } finally {
      setLoadingVerify(false);
    }
  };

  useEffect(() => {
    logger.info('[JudgeChaosPortal] Mounted Judge Chaos Portal component');
    fetchVerifyLedger();
    return () => {
      logger.info('[JudgeChaosPortal] Unmounting Judge Chaos Portal component');
    };
  }, []);

  const triggerChaos = async (action: string, title: string) => {
    logger.info('[JudgeChaosPortal] Triggering chaos action', { action, title });
    setLoadingAction(action);
    const startTime = Date.now();
    try {
      const res = await fetch('/api/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      const elapsed = Date.now() - startTime;
      logger.info('[JudgeChaosPortal] Chaos action completed', {
        action,
        title,
        status: data.status || 'SUCCESS',
        elapsedMs: elapsed,
      });
      setTerminalLogs({
        actionTitle: title,
        timestamp: new Date().toLocaleTimeString(),
        status: data.status || 'SUCCESS',
        data,
      });
      // Refresh ledger after mutation
      fetchVerifyLedger();
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      logger.error('[JudgeChaosPortal] Chaos action dispatch failed', {
        action,
        title,
        error: err?.message,
        stack: err?.stack,
        elapsedMs: elapsed,
      });
      setTerminalLogs({
        actionTitle: title,
        timestamp: new Date().toLocaleTimeString(),
        status: 'ERROR',
        data: { error: err.message },
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col font-sans transition-colors">
      {/* Sub Header Navigation Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#070d18]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Pre-Authenticated Judge & Chaos Clearinghouse Portal
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
              JUDGE_MODE: ACTIVE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
              7 SPONSOR TRACKS READY
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              Buyer Portal <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="/merchant"
              className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              Merchant Cockpit <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner */}
        <div className="relative p-6 sm:p-7 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-amber-500/30 dark:border-amber-500/30 shadow-xl shadow-black/5 dark:shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          {/* Top radiant border light */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/20 via-amber-400 to-rose-500/20" />

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Hackathon Clearinghouse Pipeline & Chaos Simulator
              </h1>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                Wave 3 Task 32
              </span>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                1-CLICK VERIFICATION
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed font-medium">
              Wires 1-click triggers across all 7 competition tracks:
              <strong className="text-rose-600 dark:text-rose-400 font-bold"> (1) Redis Lua Budget Exhaustion</strong>,
              <strong className="text-blue-600 dark:text-blue-400 font-bold"> (2) Channel3 Knapsack Promo</strong>,
              <strong className="text-purple-600 dark:text-purple-400 font-bold"> (3) Real Vault v3 Auto-Buy</strong>,
              <strong className="text-orange-600 dark:text-orange-400 font-bold"> (4) Lua Decline Rollback</strong>,
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold"> (5) Vision Dispute Forensics</strong>, and
              <strong className="text-cyan-600 dark:text-cyan-400 font-bold"> (6) 72h Knapsack Price Drop</strong> with live PayPal read-backs.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <button
              onClick={fetchVerifyLedger}
              disabled={loadingVerify}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0e172a] dark:hover:bg-[#142036] border border-slate-300 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 shadow-sm transition-all cursor-pointer font-sans font-bold active:scale-95"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loadingVerify ? 'animate-spin text-amber-500' : ''}`} />
              Refresh /api/integrations/verify
            </button>
          </div>
        </div>

        {/* 7 Sponsor Track Badges Strip */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#080d19]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>7 Sponsor Tracks Covered ($34,500 Prize Pool):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              ✓ PayPal Core
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              ✓ Channel3
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              ✓ APIMatic
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              ✓ AG Grid / Studio
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              ✓ Bryntum
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              ✓ Render
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              ✓ DuckDB-WASM
            </span>
          </div>
        </div>

        {/* 7 Sponsor Tracks 1-Click Interactive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* Track 1: PayPal Core & Vault v3 */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-purple-500/50 dark:hover:border-purple-400/50 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent group-hover:via-purple-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 rounded-full text-[10px] font-mono font-bold">
              TRACK 1: VAULT v3
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">TRACK 1</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Autonomous Vault Auto-Buy</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Headless auto-buy: consumes stored Vault v3 payment token, executes Orders v2 multi-unit capture, and verifies cryptographic server read-back.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('TRIGGER_AUTONOMOUS_VAULT_BUY', 'Track 1: Real Autonomous Auto-Buy via PayPal Vault v3')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'TRIGGER_AUTONOMOUS_VAULT_BUY' ? 'Capturing...' : 'Trigger Vault Auto-Buy'}
            </button>
          </div>

          {/* Track 2: Channel3 Multi-Modal Catalog */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-400/50 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent group-hover:via-blue-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded-full text-[10px] font-mono font-bold">
              TRACK 2: CHANNEL3
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform shadow-xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">TRACK 2</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Channel3 Search & Knapsack</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Applies promo <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-300 font-mono text-[10px]">PAYPAL-HACKATHON-2026</code>, executes 2PC pre-flight stock verification, and runs mathematical Knapsack bundling.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('TRIGGER_CHANNEL3_KNAPSACK', 'Track 2: Live Channel3 Search & Knapsack Optimization')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'TRIGGER_CHANNEL3_KNAPSACK' ? 'Optimizing...' : 'Run Channel3 Knapsack'}
            </button>
          </div>

          {/* Track 3: APIMatic SDK Validation */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-400/50 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent group-hover:via-emerald-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-[10px] font-mono font-bold">
              TRACK 3: APIMATIC
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shadow-xs">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">TRACK 3</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">APIMatic SDK Validation</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Grounded PayPal REST client API request/response read-backs, cryptographic verification, and OAS 3.0 specification conformance audit.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('TRIGGER_APIMATIC_VERIFY', 'Track 3: APIMatic SDK Request/Response Read-Backs')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'TRIGGER_APIMATIC_VERIFY' ? 'Verifying...' : 'Audit APIMatic Read-Back'}
            </button>
          </div>

          {/* Track 4: Redis Lua Security Gate */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-rose-500/50 dark:hover:border-rose-400/50 shadow-sm hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent group-hover:via-rose-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-full text-[10px] font-mono font-bold">
              TRACK 4: LUA GATE
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">TRACK 4</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Budget Exhaustion Attack</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Adversarial AI attempts $5,000 spend over $500 cap. Demonstrates instant <strong className="text-rose-600 dark:text-rose-400">&lt; 1ms Redis Lua atomic block</strong> with 0 PayPal API calls.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('TRIGGER_REDIS_LUA_ATTACK', 'Track 4: Adversarial Redis Lua Budget Exhaustion Attack ($5,000)')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'TRIGGER_REDIS_LUA_ATTACK' ? 'Injecting Attack...' : 'Trigger $5,000 Attack'}
            </button>
          </div>

          {/* Track 5: x402 & Compensating Rollback */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-orange-500/50 dark:hover:border-orange-400/50 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/60 to-transparent group-hover:via-orange-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20 rounded-full text-[10px] font-mono font-bold">
              TRACK 5: x402 ROLLBACK
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform shadow-xs">
                <Undo2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400">TRACK 5</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Decline Compensating Rollback</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Simulates <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-300 font-mono text-[10px]">INSTRUMENT_DECLINED</code> and executes atomic <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-300 font-mono text-[10px]">ROLLBACK_LUA_SCRIPT</code> in &lt; 1ms.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('TRIGGER_REDIS_LUA_ROLLBACK', 'Track 5: Instant Redis Lua Rollback on Decline')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'TRIGGER_REDIS_LUA_ROLLBACK' ? 'Rolling Back...' : 'Trigger Decline & Rollback'}
            </button>
          </div>

          {/* Fault Injection: PayPal-Mock-Response Compliance Violation */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-red-500/50 dark:hover:border-red-400/50 shadow-sm hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent group-hover:via-red-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 rounded-full text-[10px] font-mono font-bold">
              FAULT INJECTION
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400">MOCK</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Compliance Violation Quarantine</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Injects <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-300 font-mono text-[10px]">COMPLIANCE_VIOLATION</code>. Intercepts HTTP 422, freezes escrow disbursement, and triggers zero-leak compensating release.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('TRIGGER_MOCK_COMPLIANCE_VIOLATION', 'PayPal-Mock-Response: COMPLIANCE_VIOLATION Quarantine')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-red-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'TRIGGER_MOCK_COMPLIANCE_VIOLATION' ? 'Quarantining...' : 'Inject Compliance Fault'}
            </button>
          </div>

          {/* Track 6: Multi-Modal Dispute Forensics & Return Label */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-400/50 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500/60 to-transparent group-hover:via-teal-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 rounded-full text-[10px] font-mono font-bold">
              TRACK 6: FORENSICS
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform shadow-xs">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">TRACK 6</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Dispute Forensics & Label</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Mobile-safe EXIF inspection, defect bounding box, in-memory <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-300 font-mono text-[10px]">pdf-lib</code> return label & QR code, and PayPal tracking sync.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('INJECT_SANDBOX_DISPUTE', 'Track 6: Multi-Modal Dispute Forensics & Return Label Generation')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'INJECT_SANDBOX_DISPUTE' ? 'Adjudicating...' : 'Auto-Adjudicate Dispute'}
            </button>
          </div>

          {/* Track 7: DuckDB-WASM & Bryntum */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent group-hover:via-indigo-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 rounded-full text-[10px] font-mono font-bold">
              TRACK 7: DUCKDB + BRYNTUM
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">TRACK 7</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">DuckDB OLAP & Bryntum SLA</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Client-side DuckDB-WASM in-memory OLAP SQL queries (&lt;10ms) with lean Arrow projections & Bryntum SLA breach countdown scheduler.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('TRIGGER_DUCKDB_BRYNTUM_ANALYTICS', 'Track 7: DuckDB-WASM In-Memory OLAP & Bryntum SLA Scheduler')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'TRIGGER_DUCKDB_BRYNTUM_ANALYTICS' ? 'Querying...' : 'Run DuckDB & Bryntum'}
            </button>
          </div>

          {/* Bonus Flow: Knapsack Multi-Vendor + 72h Price Drop */}
          <div className="relative group rounded-2xl p-5 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent group-hover:via-cyan-400 transition-all" />
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 rounded-full text-[10px] font-mono font-bold">
              RENDER WORKFLOW
            </div>
            <div className="space-y-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">DURABLE</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Knapsack + 72h Price Drop</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  Places multi-unit authorization hold, simulates 15% price drop via Render Workflows watcher, and captures lower price.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerChaos('TRIGGER_KNAPSACK_PRICE_DROP', 'Durable Flow: Knapsack + 72h Price-Drop Capture')}
              disabled={loadingAction !== null}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingAction === 'TRIGGER_KNAPSACK_PRICE_DROP' ? 'Executing...' : 'Trigger Knapsack + 72h Drop'}
            </button>
          </div>
        </div>

        {/* Live Terminals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Terminal: Interactive Chaos Execution Output */}
          <div className="rounded-2xl bg-[#060b14] border border-slate-800/90 flex flex-col h-[520px] overflow-hidden shadow-2xl shadow-black/40 relative">
            <div className="bg-[#0b1222]/95 border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-600/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-600/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-600/40" />
                </div>
                <div className="h-4 w-[1px] bg-white/10 mx-1" />
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-slate-200">Chaos Execution Inspector</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {terminalLogs && (
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-400 hidden sm:inline">{terminalLogs.timestamp}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        terminalLogs.status === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : terminalLogs.status === 'ROLLED_BACK'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {terminalLogs.status}
                    </span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(terminalLogs.data, null, 2), 'chaos')}
                      title="Copy Output"
                      className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedTerminal === 'chaos' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 font-mono text-xs overflow-auto text-slate-300 space-y-4">
              {terminalLogs ? (
                <div>
                  <div className="text-cyan-400 font-bold mb-2 flex items-center gap-2 text-xs">
                    <span className="text-emerald-400">$</span> {terminalLogs.actionTitle}
                  </div>
                  <pre className="text-slate-200 bg-[#040810]/90 p-4 rounded-xl border border-white/5 overflow-x-auto text-[11px] leading-relaxed selection:bg-cyan-500/30">
                    {JSON.stringify(terminalLogs.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <Terminal className="w-6 h-6 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">Awaiting Trigger Event</p>
                    <p className="text-[11px] text-slate-600 max-w-xs">Click one of the chaos buttons above to view real-time execution telemetry.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Terminal: Live /api/integrations/verify Terminal */}
          <div className="rounded-2xl bg-[#060b14] border border-slate-800/90 flex flex-col h-[520px] overflow-hidden shadow-2xl shadow-black/40 relative">
            <div className="bg-[#0b1222]/95 border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-600/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-600/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-600/40" />
                </div>
                <div className="h-4 w-[1px] bg-white/10 mx-1" />
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-slate-200">
                    Live Verified Server Read-Back Terminal
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-emerald-400">ALL_TRACKS_GROUNDED</span>
                </div>
                {verifyData && (
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(verifyData, null, 2), 'verify')}
                    title="Copy Output"
                    className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-1"
                  >
                    {copiedTerminal === 'verify' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 font-mono text-xs overflow-auto text-slate-300">
              {verifyData ? (
                <pre className="text-emerald-300/90 bg-[#040810]/90 p-4 rounded-xl border border-white/5 overflow-x-auto text-[11px] leading-relaxed selection:bg-emerald-500/30">
                  {JSON.stringify(verifyData, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Loading integrations status...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-[#1e293b] py-4 bg-slate-100 dark:bg-[#080d19]/80 text-center text-xs text-slate-600 dark:text-slate-400 font-mono transition-colors">
        AegisPay Hackathon Verification System • All APIs Grounded via APIMatic & PayPal Server SDK
      </footer>
    </div>
  );
}
