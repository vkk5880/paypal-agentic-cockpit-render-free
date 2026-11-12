'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Play,
  Loader2,
  RotateCcw,
  Terminal,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { FriendlyErrorTransmuter } from './common/FriendlyErrorTransmuter';

export interface ChaosAction {
  id: string;
  title: string;
  track: string;
  category: 'SECURITY' | 'VAULT' | 'DISPUTES' | 'KNAPSACK' | 'ANALYTICS';
  description: string;
  expectedOutcome: string;
}

export const CHAOS_ACTIONS: ChaosAction[] = [
  {
    id: 'TRIGGER_REDIS_LUA_ATTACK',
    title: 'Atomic Lua Budget Attack ($5,000 Overspend)',
    track: 'Custodian Security Gate',
    category: 'SECURITY',
    description: 'Simulates autonomous agent overspending $5,000 against a $500 session cap.',
    expectedOutcome: 'Sub-millisecond rejection via Redis Lua atomic enforcer with zero PayPal touch.',
  },
  {
    id: 'TRIGGER_SYNTHETIC_BID',
    title: 'Vault v3 Synthetic Intent Bid Clearing',
    track: 'PayPal Vault v3',
    category: 'VAULT',
    description: 'Autonomous counter-bid match against seller floor price with Vault setup token.',
    expectedOutcome: 'Vault v3 setup token converted to payment token, cleared & captured at $450.',
  },
  {
    id: 'INJECT_SANDBOX_DISPUTE',
    title: 'Vision Forensics & EXIF Tamper Defense',
    track: 'Disputes & Forensics',
    category: 'DISPUTES',
    description: 'Injects buyer chargeback with modified EXIF photo and cosmetic defect.',
    expectedOutcome: 'Flagged EXIF software tamper, generated PDF defense dossier, seller favor.',
  },
  {
    id: 'TRIGGER_KNAPSACK_PRICE_DROP',
    title: 'Knapsack Multi-Merchant 72h Price Drop',
    track: 'Deterministic Scoring & Knapsack',
    category: 'KNAPSACK',
    description: 'Solves multi-merchant basket, places v2 auth hold, simulates 15% price drop.',
    expectedOutcome: 'Waived shipping, captured hold at $403.75 lower price with 72h protection.',
  },
  {
    id: 'TRIGGER_CHANNEL3_KNAPSACK',
    title: 'Channel3 Multi-Modal 2PC Inventory Hold',
    track: 'Deterministic Scoring & Knapsack',
    category: 'KNAPSACK',
    description: 'Discovers 3 merchants with promo PAYPAL-HACKATHON-2026 and locks stock via 2PC hold.',
    expectedOutcome: 'Multi-vendor 2PC inventory hold confirmed, $52 rebate calculated.',
  },
  {
    id: 'TRIGGER_AUTONOMOUS_VAULT_BUY',
    title: 'Autonomous Headless Vault v3 Auto-Buy',
    track: 'PayPal Vault v3',
    category: 'VAULT',
    description: 'Off-session headless execution minting setup token to payment token with Orders v2 capture.',
    expectedOutcome: 'Multi-purchase unit captured at $450 with zero-click headless authorization.',
  },
  {
    id: 'TRIGGER_REDIS_LUA_ROLLBACK',
    title: 'INSTRUMENT_DECLINED Compensating Lua Rollback',
    track: 'Custodian Security Gate',
    category: 'SECURITY',
    description: 'Simulates card issuer decline during capture and executes atomic Lua budget rollback.',
    expectedOutcome: 'Atomic rollback script restores buyer credit limit in <1ms without leaking funds.',
  },
  {
    id: 'TRIGGER_MOCK_COMPLIANCE_VIOLATION',
    title: 'COMPLIANCE_VIOLATION Header Injection & Quarantine',
    track: 'PayPal Sandbox Fault Injection',
    category: 'SECURITY',
    description: 'Injects PayPal-Mock-Response header for COMPLIANCE_VIOLATION to quarantine transaction and alert compliance officer.',
    expectedOutcome: 'HTTP 422 intercepted, transaction quarantined in ledger, 2PC stock release dispatched.',
  },
  {
    id: 'TRIGGER_APIMATIC_VERIFY',
    title: 'APIMatic SDK Verified Server Read-Back',
    track: 'APIMatic & REST SDK',
    category: 'SECURITY',
    description: 'Validates official PayPal REST SDK endpoints and OAS 3.0 server read-backs.',
    expectedOutcome: 'Cryptographic OAS 3.0 server read-back verified across 8 core PayPal endpoints.',
  },
  {
    id: 'TRIGGER_DUCKDB_BRYNTUM_ANALYTICS',
    title: 'DuckDB-WASM OLAP & Bryntum SLA Scheduler',
    track: 'DuckDB & Bryntum SLA',
    category: 'ANALYTICS',
    description: 'In-browser Arrow OLAP dispute query alongside Bryntum SLA breach countdown watcher.',
    expectedOutcome: 'Sub-10ms in-memory aggregation of 1,000 dispute records with 0 backend CPU load.',
  },
];

export function ChaosSimulator() {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionMs, setExecutionMs] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All Triggers' },
    { id: 'SECURITY', label: 'Security & Lua' },
    { id: 'VAULT', label: 'PayPal Vault v3' },
    { id: 'DISPUTES', label: 'Disputes & Forensics' },
    { id: 'KNAPSACK', label: 'Knapsack & 2PC' },
    { id: 'ANALYTICS', label: 'DuckDB & Bryntum' },
  ];

  const filteredActions = selectedCategory === 'ALL'
    ? CHAOS_ACTIONS
    : CHAOS_ACTIONS.filter((a) => a.category === selectedCategory);

  const handleRunChaos = async (actionId: string) => {
    setActiveAction(actionId);
    setLoadingAction(actionId);
    setError(null);
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const res = await fetch('/api/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Chaos simulation failed`);
      }
      setResult(data);
      const elapsed = typeof performance !== 'undefined' ? performance.now() - startTime : Date.now() - startTime;
      setExecutionMs(Math.round(elapsed));
    } catch (err: any) {
      setError(err.message || 'Failed to trigger chaos fault injection');
      const elapsed = typeof performance !== 'undefined' ? performance.now() - startTime : Date.now() - startTime;
      setExecutionMs(Math.round(elapsed));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetTelemetry = () => {
    setResult(null);
    setError(null);
    setExecutionMs(null);
    setActiveAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Category Filter Chips & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Chaos trigger categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                selectedCategory === cat.id
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#0c1424] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleResetTelemetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0c1424] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-95 self-start sm:self-auto shadow-2xs"
          title="Clear readback telemetry stream"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Telemetry</span>
        </button>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActions.map((action) => (
          <div
            key={action.id}
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
              activeAction === action.id
                ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 shadow-md shadow-cyan-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424]/80 hover:border-cyan-500/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 gap-2">
                <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 truncate">
                  {action.track}
                </span>
                <button
                  onClick={() => handleRunChaos(action.id)}
                  disabled={loadingAction !== null}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-xs tracking-wide flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 flex-shrink-0 ${
                    loadingAction === action.id
                      ? 'bg-amber-600 text-white shadow-amber-500/20'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs'
                  }`}
                >
                  {loadingAction === action.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>{loadingAction === action.id ? 'Simulating...' : 'Inject Fault'}</span>
                </button>
              </div>

              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{action.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{action.description}</p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="truncate">Expected: {action.expectedOutcome}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live Telemetry Output Console */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 p-5 font-mono text-xs shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">Chaos Telemetry & Readback Stream</span>
          </div>
          {loadingAction ? (
            <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating clearinghouse reaction for {loadingAction}...</span>
            </div>
          ) : executionMs !== null ? (
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Round-trip latency: {executionMs}ms</span>
            </div>
          ) : null}
        </div>

        {error && (
          <div className="mt-4">
            <FriendlyErrorTransmuter error={error} />
          </div>
        )}

        {result ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Action Resolved: {result.chaos_action} ({result.status})</span>
              </div>
              <span className="text-[10px] text-slate-500">{result.timestamp || new Date().toISOString()}</span>
            </div>
            <pre className="p-4 rounded-xl bg-[#030712] border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-600">
            Select any chaos trigger above to test live system resilience, atomic rollback, or dispute defenses.
          </div>
        )}
      </div>
    </div>
  );
}
