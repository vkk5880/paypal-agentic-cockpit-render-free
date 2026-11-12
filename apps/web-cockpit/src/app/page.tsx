'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Cpu,
  Store,
  ShieldAlert,
  Zap,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Lock,
  Clock,
  Sliders,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { LayoutShell } from '@/components/common/LayoutShell';
import { useAuth } from '@/context/AuthContext';
import { useUiMode } from '@/context/UiModeContext';

export default function CockpitLandingPage() {
  const { user, isLoggedIn, isAuthorized, loginWithPayPal } = useAuth();
  const { showTechnicalDetails } = useUiMode();

  return (
    <LayoutShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Hero Banner */}
        <div className="relative p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-[#070e1c] to-[#040812] border border-cyan-500/20 shadow-2xl shadow-cyan-950/20 overflow-hidden text-white">
          {/* Subtle radiant background effects */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PayPal AI Hackathon 2026 • Autonomous Clearinghouse Cockpit</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                AegisPay <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Cockpit</span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Zero-trust agentic commerce clearinghouse backstopped by AG Grid Enterprise v36, AG Studio 3 autonomy dials, multi-modal dispute forensics, and official PayPal APIs.
              </p>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Render Free Tier Optimized</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-cyan-300">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>AG Grid Enterprise v36</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-blue-300">
                  <Lock className="w-3.5 h-3.5" />
                  <span>PayPal Vault v3</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button Box */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[240px]">
              <Link
                href="/merchant"
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Launch Merchant Console</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <Link
                href="/judge"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Dispute Arbiter & Judge</span>
              </Link>

              <Link
                href="/cockpit"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Telemetry & AG Studio</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Core Operational Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Merchant Clearinghouse */}
          <Link
            href="/merchant"
            className="group relative p-6 rounded-3xl bg-white/80 dark:bg-[#0c1424]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                Merchant Clearinghouse
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Full-featured AG Grid Enterprise console with master/detail purchase units, live products, automated invoicing, and balance ledgers.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
              <span>Access Grids</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Dispute Arbiter & Judge */}
          <Link
            href="/judge"
            className="group relative p-6 rounded-3xl bg-white/80 dark:bg-[#0c1424]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Dispute Arbiter & Judge
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Multi-modal AI vision damage comparison, EXIF tamper detection, HATEOAS automated actions, and PDF forensic evidence synthesis.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Open Judge Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Cockpit Telemetry & AG Studio 3 */}
          <Link
            href="/cockpit"
            className="group relative p-6 rounded-3xl bg-white/80 dark:bg-[#0c1424]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Telemetry & AG Studio 3
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Autonomous clearing dials, interactive dispute matrices, bounding box defect inspections, and real-time SLA countdown trackers.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>View Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Chaos Simulator */}
          <Link
            href="/simulator"
            className="group relative p-6 rounded-3xl bg-white/80 dark:bg-[#0c1424]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-rose-500/50 dark:hover:border-rose-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                Chaos Simulator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Live fault injection portal simulating PayPal mock headers, prompt injection exploits, overspend locks, and sub-millisecond rollbacks.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              <span>Run Chaos Tests</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* System Capabilities & Moats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#0c1424]/90 border border-slate-200/80 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Zero-Trust Spend Enforcer</h3>
                <span className="text-[11px] text-slate-500 font-mono">Hardware Ed25519 Mandates</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Cryptographically bounds AI agent actions to budget limits and authorized merchants before PayPal APIs are called, blocking prompt injection spend attacks.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#0c1424]/90 border border-slate-200/80 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">AG Grid Enterprise v36</h3>
                <span className="text-[11px] text-slate-500 font-mono">SSRM + Custom Quartz Styling</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Master/Detail sub-grids for multi-payee purchase units, SVG radial liability meters, USPS live trackers, and 2-second hold-to-confirm HATEOAS renderers.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#0c1424]/90 border border-slate-200/80 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Bryntum SLA Scheduler</h3>
                <span className="text-[11px] text-slate-500 font-mono">Dispute Resolution Gantt</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Visualizes PayPal Dispute 10-day evidence deadlines, carrier return milestones, and automated escalation phases on an interactive timeline.
            </p>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
