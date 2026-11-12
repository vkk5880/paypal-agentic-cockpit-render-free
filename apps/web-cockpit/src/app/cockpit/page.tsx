'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LayoutShell } from '@/components/common/LayoutShell';
import { DisputeMatrixViewer } from '@/components/dispute-matrix';
import { AutonomyDialWidget } from '@/components/ag-studio/AutonomyDialWidget';
import { EvidenceComparatorWidget } from '@/components/ag-studio/EvidenceComparatorWidget';
import { HateoasDisputeActionRenderer } from '@/components/ag-studio/HateoasDisputeActionRenderer';
import {
  Activity,
  Cpu,
  ShieldAlert,
  Sliders,
  Store,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useUiMode } from '@/context/UiModeContext';

export default function CockpitTelemetryPage() {
  const [activeTab, setActiveTab] = useState<'DISPUTES' | 'STUDIO' | 'TELEMETRY'>('DISPUTES');
  const { showTechnicalDetails } = useUiMode();

  return (
    <LayoutShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Cockpit Header Card */}
        <div className="relative p-6 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl text-white shadow-lg shadow-cyan-500/25">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                AegisPay Autonomous Clearinghouse Cockpit
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Deterministic liability scoring, AG Studio 3 autonomous controls, and real-time PayPal telemetry.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-[#060b14] border border-slate-200/80 dark:border-white/10 shadow-inner" role="tablist" aria-label="Cockpit telemetry views">
            <button
              role="tab"
              aria-selected={activeTab === 'DISPUTES'}
              onClick={() => setActiveTab('DISPUTES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'DISPUTES'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              Dispute Forensics
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'STUDIO'}
              onClick={() => setActiveTab('STUDIO')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'STUDIO'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              AG Studio 3 Controls
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'TELEMETRY'}
              onClick={() => setActiveTab('TELEMETRY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'TELEMETRY'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              Clearinghouse Status
            </button>
          </div>
        </div>

        {/* Tab Content: DISPUTES */}
        {activeTab === 'DISPUTES' && (
          <div className="space-y-6">
            <DisputeMatrixViewer />
          </div>
        )}

        {/* Tab Content: STUDIO */}
        {activeTab === 'STUDIO' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <AutonomyDialWidget />
              </div>
              <div className="lg:col-span-2">
                <HateoasDisputeActionRenderer
                  disputeId="PP-D-89421"
                  disputeAmountCents={42999}
                  liabilityScoreL={0.88}
                  abuseRiskScoreR={0.12}
                  tierAction="TIER1_REFUND"
                />
              </div>
            </div>
            <div>
              <EvidenceComparatorWidget
                disputeId="PP-D-89421"
                channel3StudioPhotoUrl="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80"
                buyerReturnPhotoUrl="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80"
                boundingDefectBox={{ ymin: 120, xmin: 80, ymax: 340, xmax: 290 }}
                exifTamperFlag={false}
                exifSoftware="Sony Alpha ILCE-7RM4"
              />
            </div>
          </div>
        )}

        {/* Tab Content: TELEMETRY */}
        {activeTab === 'TELEMETRY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="relative p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold pb-2 border-b border-slate-100 dark:border-white/5">
                <Activity className="w-4 h-4" />
                <span>Security & Spend Enforcer</span>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#070c18]">
                  <span>REDIS LUA ENFORCER:</span>
                  <span className="text-emerald-500 font-bold">&lt; 1ms PASS</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#070c18]">
                  <span>PAYPAL VAULT v3:</span>
                  <span className="text-emerald-500 font-bold">CONNECTED</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#070c18]">
                  <span>3DS LIABILITY SHIFT:</span>
                  <span className="text-emerald-500 font-bold">VERIFIED</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#070c18]">
                  <span>AUDIT HASH CHAIN:</span>
                  <span className="text-cyan-400 font-bold">RFC 8785 SYNCED</span>
                </div>
              </div>
            </div>

            <div className="relative p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold pb-2 border-b border-slate-100 dark:border-white/5">
                <Store className="w-4 h-4" />
                <span>Merchant Console Hub</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Access the full AG Grid Enterprise clearinghouse with master/detail grids, live products, invoices, and settlement ledgers.
              </p>
              <Link
                href="/merchant"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold hover:opacity-95 transition-all shadow-md"
              >
                <span>Open Merchant Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="relative p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-rose-500 font-bold pb-2 border-b border-slate-100 dark:border-white/5">
                <Zap className="w-4 h-4" />
                <span>Chaos & Resilience Lab</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inject authentic PayPal Mock Responses (INSTRUMENT_DECLINED, COMPLIANCE_VIOLATION) and test instant rollbacks.
              </p>
              <Link
                href="/simulator"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
              >
                <span>Launch Chaos Simulator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
