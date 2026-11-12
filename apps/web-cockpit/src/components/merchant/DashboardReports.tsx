'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Package, Repeat, FileText, Wallet, ArrowLeftRight, TrendingUp, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useUiMode } from '@/context/UiModeContext';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';

export interface DashboardReportMetrics {
  totalProducts?: number;
  activePlans?: number;
  openInvoices?: number;
  usdBalance?: string;
  recentTxCount?: number;
}

export function DashboardReports({
  metrics: initialMetrics = {},
  onSelectTab,
}: {
  metrics?: DashboardReportMetrics;
  onSelectTab?: (tab: string) => void;
}) {
  const { showTechnicalDetails } = useUiMode();
  const [metrics, setMetrics] = React.useState<DashboardReportMetrics>(initialMetrics);

  useEffect(() => {
    async function fetchLiveMetrics() {
      try {
        const orchestratorUrl = getApiBaseUrl();
        const res = await fetch(`${orchestratorUrl}/api/merchant/overview-metrics`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
          logger.info('[DashboardReports] Successfully loaded live overview metrics', data);
        }
      } catch (err: any) {
        logger.debug('[DashboardReports] Overview metrics live fetch notice:', err?.message);
      }
    }
    fetchLiveMetrics();
  }, []);

  useEffect(() => {
    logger.info('[DashboardReports] Rendered DashboardReports with metrics', {
      totalProducts: metrics.totalProducts ?? 0,
      activePlans: metrics.activePlans ?? 0,
      openInvoices: metrics.openInvoices ?? 0,
      usdBalance: metrics.usdBalance ?? '$0.00',
      recentTxCount: metrics.recentTxCount ?? 0,
      showTechnicalDetails,
    });
  }, [metrics, showTechnicalDetails]);

  const cards = [
    {
      title: 'Catalog Products',
      count: metrics.totalProducts ?? 0,
      label: 'Active SKUs in Catalog',
      trend: 'PayPal Live Catalog',
      badge: 'Channel3 Synced',
      href: '/merchant/products',
      tabKey: 'products',
      icon: Package,
      gradient: 'from-blue-600 to-cyan-600',
      glow: 'glow-blue',
    },
    {
      title: 'Subscription Plans',
      count: metrics.activePlans ?? 0,
      label: 'Recurring Billing Plans',
      trend: 'PayPal Subscriptions',
      badge: 'Auto-Renew',
      href: '/merchant/plans',
      tabKey: 'plans',
      icon: Repeat,
      gradient: 'from-indigo-600 to-purple-600',
      glow: 'glow-purple',
    },
    {
      title: 'Commercial Invoices',
      count: metrics.openInvoices ?? 0,
      label: 'Invoicing & Settlements',
      trend: 'Invoicing API v2',
      badge: 'Net 30',
      href: '/merchant/invoices',
      tabKey: 'invoices',
      icon: FileText,
      gradient: 'from-emerald-600 to-teal-600',
      glow: 'glow-emerald',
    },
    {
      title: 'Held Balances',
      count: metrics.usdBalance ?? '$0.00',
      label: 'Available Merchant Reserve',
      trend: 'Reporting API',
      badge: 'Vault Protected',
      href: '/merchant/balances',
      tabKey: 'balances',
      icon: Wallet,
      gradient: 'from-amber-500 to-orange-600',
      glow: 'glow-amber',
    },
    {
      title: 'Transaction Stream',
      count: metrics.recentTxCount ?? 0,
      label: 'Last 31-Day Ledger Entries',
      trend: 'PayPal Ledger',
      badge: 'DuckDB-WASM',
      href: '/merchant/transactions',
      tabKey: 'transactions',
      icon: ArrowLeftRight,
      gradient: 'from-rose-600 to-pink-600',
      glow: 'glow-rose',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/5">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>
              {showTechnicalDetails
                ? 'PayPal APIMatic & AG Grid Enterprise Reporting'
                : 'Merchant Business & Financial Overview'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {showTechnicalDetails
              ? 'Real-time merchant financial reconciliation, catalog synchronisation, and payment auditing.'
              : 'Real-time overview of products, recurring plans, customer invoices, and settled balances.'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs font-mono text-cyan-700 dark:text-cyan-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-semibold">{showTechnicalDetails ? 'APIMatic Verified' : 'Live Verified'}</span>
        </div>
      </div>

      {/* 5 High-Fidelity Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              onClick={(e) => {
                logger.info('[DashboardReports] Report card navigation clicked', {
                  title: card.title,
                  href: card.href,
                  currentCount: card.count,
                });
                if (onSelectTab && card.tabKey) {
                  e.preventDefault();
                  onSelectTab(card.tabKey);
                }
              }}
              className="group relative p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl hover:border-cyan-500/40 dark:hover:border-cyan-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5 dark:hover:shadow-cyan-950/20 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
            >
              {/* Subtle top card glow line */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent group-hover:via-cyan-400/50 transition-all" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${card.gradient} text-white shadow-sm shadow-black/10 group-hover:scale-105 transition-transform duration-200`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {card.count}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[120px]">
                  {card.label}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 group-hover:bg-cyan-500/10 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  <span>{card.badge}</span>
                  <ArrowUpRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
