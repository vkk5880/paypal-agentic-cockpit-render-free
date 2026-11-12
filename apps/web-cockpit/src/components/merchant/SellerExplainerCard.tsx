'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  TrendingUp,
  ShieldCheck,
  Package,
  FileText,
  Wallet,
  Bot,
  ArrowRight,
  Info,
} from 'lucide-react';

interface SellerExplainerCardProps {
  onDismiss?: () => void;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export function SellerExplainerCard({
  onDismiss,
  onNavigateTab,
  className = '',
}: SellerExplainerCardProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('aegispay_seller_guide_dismissed', 'true');
    } catch {}
    if (onDismiss) onDismiss();
  };

  if (!isVisible) return null;

  const features = [
    {
      title: 'Sales & Revenue Overview',
      desc: 'Track live transaction volume, cleared cash, and escrow reserves across currencies.',
      tab: 'overview',
      icon: TrendingUp,
      badge: 'Live Metrics',
      color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'Resolution Center & Returns',
      desc: 'Inspect customer return photos side-by-side, verify defect claims, and resolve disputes.',
      tab: 'disputes',
      icon: ShieldCheck,
      badge: 'Seller Protected',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Products & Subscription Plans',
      desc: 'Add catalog SKUs, set dynamic pricing, and manage recurring subscription tiers.',
      tab: 'products',
      icon: Package,
      badge: 'Catalog Sync',
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Invoices & Fast Payouts',
      desc: 'Generate commercial invoices and monitor available merchant reserves for fast payout.',
      tab: 'invoices',
      icon: FileText,
      badge: 'Instant Settlements',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div
      data-testid="seller-explainer-card"
      className={`relative rounded-2xl bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/20 dark:from-[#0b1324] dark:via-[#080e1c] dark:to-[#070b16] border border-cyan-500/25 dark:border-cyan-500/20 p-5 sm:p-6 shadow-xl shadow-cyan-950/5 dark:shadow-black/40 overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Top radiant border accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

      {/* Header section with title and close button */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/70 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Welcome to your Seller Hub
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                Quick Guide
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium leading-relaxed">
              Everything you need to manage your online store, fulfill orders, and resolve customer claims effortlessly.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss guide"
          title="Dismiss this guide"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              onClick={() => onNavigateTab && onNavigateTab(f.tab)}
              className="group p-3.5 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 hover:border-cyan-500/40 dark:hover:border-cyan-500/40 transition-all duration-200 flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg border ${f.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {f.badge}
                  </span>
                </div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                  {f.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                <span>Open View</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Note & Quick Action */}
      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
          <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span>
            You can reopen this guide anytime by clicking <strong className="text-slate-700 dark:text-slate-300 font-semibold">Seller Guide</strong> in the top header.
          </span>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
          >
            Got it, Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
