'use client';

import React, { useState } from 'react';
import { Sliders, ShieldCheck, ShieldAlert, Zap, Info } from 'lucide-react';
import { AutonomyDialMode } from '@aegispay/shared-types';

export interface AutonomyDialWidgetProps {
  initialMode?: AutonomyDialMode;
  onChange?: (mode: AutonomyDialMode) => void;
  className?: string;
}

interface DialOption {
  mode: AutonomyDialMode;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  policySummary: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: DialOption[] = [
  {
    mode: 'COPILOT',
    title: 'Co-Pilot',
    badge: '100% Supervised',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Human approval required for all actions.',
    policySummary: 'Full human-in-the-loop: Every refund, offer, and defense submission requires explicit analyst sign-off.',
    icon: ShieldAlert,
  },
  {
    mode: 'SUPERVISED',
    title: 'Supervised',
    badge: '< $50 Micro-Refunds',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Auto-executes micro-refunds < $50; analyst confirmation for > $50.',
    policySummary: 'Balanced guardrail: Micro-claims below $50 are auto-settled to avoid arbitration fees; higher claims require review.',
    icon: ShieldCheck,
  },
  {
    mode: 'AUTONOMOUS',
    title: 'Full Autonomous',
    badge: 'Zero-Click Execution',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Executes all verified forensic verdicts within policy.',
    policySummary: 'Unattended clearing: System automatically executes Tier 1–4 actions according to mathematical (L, R) liability matrix.',
    icon: Zap,
  },
];

export function AutonomyDialWidget({
  initialMode = 'SUPERVISED',
  onChange,
  className = '',
}: AutonomyDialWidgetProps) {
  const [selectedMode, setSelectedMode] = useState<AutonomyDialMode>(initialMode);

  // Restore persistent mode on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aegispay_merchant_autonomy_mode') as AutonomyDialMode | null;
      if (saved && (saved === 'COPILOT' || saved === 'SUPERVISED' || saved === 'AUTONOMOUS')) {
        setSelectedMode(saved);
        if (onChange) onChange(saved);
      }
    }
  }, [onChange]);

  const handleModeChange = (mode: AutonomyDialMode) => {
    setSelectedMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegispay_merchant_autonomy_mode', mode);
    }
    if (onChange) {
      onChange(mode);
    }
  };

  const currentOption = MODES.find((m) => m.mode === selectedMode) || MODES[1];

  return (
    <div
      data-testid="autonomy-dial-widget"
      className={`relative border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden ${className}`}
    >
      {/* Top subtle radiant border light */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              Merchant Autonomy Dial
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Control automated arbitration execution vs. human analyst approval
            </p>
          </div>
        </div>

        <span
          className={`self-start sm:self-auto text-[11px] font-mono font-bold px-3 py-1 rounded-full border shadow-xs transition-all ${currentOption.badgeColor}`}
        >
          {currentOption.badge}
        </span>
      </div>

      {/* 3-Mode Slider / Switch Buttons inspired by Linear & Raycast */}
      <div className="grid grid-cols-3 gap-2 mt-4 p-1.5 bg-slate-100/80 dark:bg-[#060b14]/80 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-inner">
        {MODES.map((option) => {
          const isSelected = option.mode === selectedMode;
          const Icon = option.icon;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => handleModeChange(option.mode)}
              data-testid={`autonomy-mode-${option.mode.toLowerCase()}`}
              className={`relative flex flex-col items-center justify-center py-2.5 px-3 rounded-xl text-center transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-[#0e172a] text-slate-900 dark:text-white shadow-md shadow-black/5 dark:shadow-cyan-950/30 border border-slate-200/90 dark:border-cyan-500/40 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-4 h-4 mb-1.5 transition-transform duration-200 ${
                  isSelected
                    ? option.mode === 'AUTONOMOUS'
                      ? 'text-emerald-500 scale-110'
                      : option.mode === 'SUPERVISED'
                      ? 'text-amber-500 scale-110'
                      : 'text-blue-500 scale-110'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span className="text-xs font-bold leading-tight tracking-tight">{option.title}</span>
              {isSelected && (
                <span
                  className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full ${
                    option.mode === 'AUTONOMOUS'
                      ? 'bg-emerald-500'
                      : option.mode === 'SUPERVISED'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Description & Policy Insight */}
      <div className="mt-4 bg-slate-50/80 dark:bg-[#080e1c]/80 p-3.5 rounded-xl border border-slate-200/70 dark:border-white/5 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 mt-0.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <div className="space-y-1">
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {currentOption.description}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {currentOption.policySummary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
