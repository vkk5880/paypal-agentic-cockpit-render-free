'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { AutonomyDialWidget } from '@/components/ag-studio/AutonomyDialWidget';
import { EvidenceComparatorWidget } from '@/components/ag-studio/EvidenceComparatorWidget';
import { HateoasDisputeActionRenderer } from '@/components/ag-studio/HateoasDisputeActionRenderer';
import { LiveStudioCanvas } from '@/components/ag-studio/LiveStudioCanvas';
import { DashboardReports } from '@/components/merchant/DashboardReports';
import { SellerExplainerCard } from '@/components/merchant/SellerExplainerCard';
import { ProductsClientView } from '@/components/merchant/ProductsClientView';
import { InvoicesClientView } from '@/components/merchant/InvoicesClientView';
import { BalancesClientView } from '@/components/merchant/BalancesClientView';
import { PlansClientView } from '@/components/merchant/PlansClientView';
import { TransactionsClientView } from '@/components/merchant/TransactionsClientView';
import { AddProductModal } from '@/components/merchant/AddProductModal';
import {
  Store,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  LogIn,
  AlertCircle,
  Sparkles,
  RefreshCw,
  LayoutDashboard,
  Package,
  FileText,
  Wallet,
  Repeat,
  Receipt,
  Bot,
  HelpCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  Check,
  ShieldAlert,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';

const DisputeSlaScheduler = dynamic(
  () =>
    import('@/components/bryntum/DisputeSlaScheduler')
      .then((mod) => {
        logger.info('[MerchantCockpitPage] Dynamic DisputeSlaScheduler chunk loaded successfully');
        return mod.DisputeSlaScheduler;
      })
      .catch((err) => {
        logger.error('[MerchantCockpitPage] Failed to dynamically load DisputeSlaScheduler chunk', {
          error: err?.message,
          stack: err?.stack,
        });
        throw err;
      }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#080d19]/50 min-h-[220px] text-slate-400 text-xs">
        <span className="font-mono">Loading Response Deadline Schedule...</span>
      </div>
    ),
  }
);

type TabType =
  | 'overview'
  | 'disputes'
  | 'products'
  | 'invoices'
  | 'balances'
  | 'plans'
  | 'transactions'
  | 'assistant';

function MerchantCockpitInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, openAuthModal } = useAuth();

  // Tab navigation state
  const tabParam = (searchParams.get('tab') as TabType) || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(tabParam);

  // Guide card state
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Disputes & Claims state
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isLoadingDisputes, setIsLoadingDisputes] = useState(true);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  // Collapsible view toggles
  const [isPolicyExpanded, setIsPolicyExpanded] = useState<boolean>(false);
  const [isSlaExpanded, setIsSlaExpanded] = useState<boolean>(true);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState<boolean>(true);

  // Add Product Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);

  // Store Sync state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  // Sync tab with URL
  useEffect(() => {
    const requestedTab = searchParams.get('tab') as TabType | null;
    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  // Handle tab switch
  const handleSelectTab = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      const url = new URL(window.location.href);
      if (tab === 'overview') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
      logger.info('[MerchantCockpitPage] Switched active tab', { tab });
    },
    []
  );

  // Check localStorage for guide card preference
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('aegispay_seller_guide_dismissed');
      setShowGuide(dismissed !== 'true');
    } catch {
      setShowGuide(true);
    }
  }, []);

  const fetchDisputes = useCallback(async () => {
    setIsLoadingDisputes(true);
    try {
      const orchestratorUrl = getApiBaseUrl();
      const res = await fetch(`${orchestratorUrl}/api/merchant/disputes`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.disputes) ? data.disputes : [];
        setDisputes(items);
        if (items.length > 0 && !selectedDisputeId) {
          setSelectedDisputeId(items[0].dispute_id || items[0].id || 'PP-D-1');
        }
        logger.info(`[MerchantCockpitPage] Loaded ${items.length} live merchant disputes`);
      }
    } catch (err: any) {
      logger.debug('[MerchantCockpitPage] Live disputes fetch notice:', err?.message);
    } finally {
      setIsLoadingDisputes(false);
    }
  }, [selectedDisputeId]);

  const handleSeedSandbox = async () => {
    setIsSeeding(true);
    setSeedNotice(null);
    try {
      const orchestratorUrl = getApiBaseUrl();
      const res = await fetch(`${orchestratorUrl}/api/merchant/seed-sandbox`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSeedNotice('✅ Demo store data synchronized with products, plans, and invoices.');
        await fetchDisputes();
      } else {
        setSeedNotice(`Notice: ${data.message || 'Store refresh initiated'}`);
      }
    } catch {
      setSeedNotice('Failed to connect to store data sync service.');
    } finally {
      setIsSeeding(false);
      setTimeout(() => setSeedNotice(null), 5000);
    }
  };

  useEffect(() => {
    logger.info('[MerchantCockpitPage] Mounted Merchant Cockpit page', {
      isLoggedIn,
      userEmail: user?.email,
      timestamp: new Date().toISOString(),
    });

    fetchDisputes();
  }, [isLoggedIn, user?.email, fetchDisputes]);

  const activeDisputeWithEvidence = disputes.find(
    (d) =>
      d.dispute_id === selectedDisputeId ||
      d.id === selectedDisputeId ||
      d.buyer_image_url ||
      d.evidence_image_url ||
      (Array.isArray(d.images) && d.images.length > 0)
  ) || disputes[0];

  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'disputes',
      label: 'Claims & Disputes',
      icon: ShieldCheck,
      badge: disputes.length > 0 ? disputes.length : undefined,
    },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'balances', label: 'Balances', icon: Wallet },
    { id: 'plans', label: 'Subscriptions', icon: Repeat },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'assistant', label: 'Store Assistant', icon: Bot },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full transition-colors">
      {/* 1. Header Bar */}
      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl p-5 sm:p-6 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/80 dark:border-white/10 overflow-hidden">
        {/* Top subtle radiant border light */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        <div className="flex items-center gap-3.5">
          <div className="p-2.5 sm:p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl text-white shadow-md shadow-cyan-600/20">
            <Store className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Seller Hub
              </h1>
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Store Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Store operations, customer return resolutions, product catalog & instant payouts
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* Toggle Explainer Guide */}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
              showGuide
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title="Toggle user guide and overview tips"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-500" />
            <span>Seller Guide</span>
          </button>

          {/* Sync / Refresh Store Demo Data */}
          <button
            type="button"
            onClick={handleSeedSandbox}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-bold transition-all disabled:opacity-50"
            title="Refresh sample products, plans, and invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-500 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Syncing...' : 'Sync Demo Store'}</span>
          </button>

          {/* Buyer Storefront Link */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Buyer Storefront</span>
          </Link>
        </div>
      </div>

      {/* Linked Profile Banner */}
      <div className="p-3.5 px-4 rounded-xl bg-white/80 dark:bg-[#0b1324]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {user?.name || 'PayPal Verified Merchant Store'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold">
                {user?.email || 'sb-merchant@business.example.com'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Escrow Protection Active · Automated Return Verification Enabled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connect PayPal Account</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Account Linked</span>
            </span>
          )}
        </div>
      </div>

      {seedNotice && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{seedNotice}</span>
          <button
            type="button"
            onClick={() => setSeedNotice(null)}
            className="text-cyan-600 dark:text-cyan-400 hover:underline ml-4 text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Closable Explainer Card (Quick Guide) */}
      {showGuide && (
        <SellerExplainerCard
          onDismiss={() => setShowGuide(false)}
          onNavigateTab={handleSelectTab}
        />
      )}

      {/* 3. Multiple Menu Navigation Bar (Tabs) */}
      <div className="bg-white/80 dark:bg-[#091120]/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-md shadow-black/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20 scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {typeof tab.badge !== 'undefined' && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Views Content */}

      {/* Tab: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top 5 Metrics Cards */}
          <DashboardReports onSelectTab={handleSelectTab} />

          {/* Quick Actions Row */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Actions:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-sm hover:from-cyan-500 hover:to-blue-500 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Product</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('disputes')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Review Claims ({disputes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('invoices')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-500" />
                <span>Invoices & Billing</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('assistant')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all"
              >
                <Bot className="w-3.5 h-3.5 text-cyan-500" />
                <span>Ask Store Assistant</span>
              </button>
            </div>
          </div>

          {/* Two-Column Overview Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2/3): Store Health & Claims Snapshot */}
            <div className="lg:col-span-2 space-y-6">
              {/* Store Protection & Health Card */}
              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Store Health & Payment Protection
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    All Systems Operational
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold">
                      PayPal Vault
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      1-Click Vaulted Checkout
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Buyers purchase seamlessly with pre-authorized allowances.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold">
                      Seller Escrow
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Multi-Currency Escrow
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Funds held safely until carrier delivery confirmation.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold">
                      Dispute Shield
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Photo Forensics Active
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Return photos analyzed against original catalog specs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Open Claims Summary Card */}
              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Customer Claims & Returns
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('disputes')}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open Resolution Center</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {isLoadingDisputes ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-mono">
                    Checking live dispute status from PayPal...
                  </div>
                ) : disputes.length > 0 ? (
                  <div className="space-y-2.5">
                    {disputes.slice(0, 3).map((d, idx) => {
                      const disputeId = d.dispute_id || d.id || `PP-D-${idx + 1}`;
                      const amountStr = d.dispute_amount?.value
                        ? `${d.dispute_amount.value} ${d.dispute_amount.currency_code || 'USD'}`
                        : '';
                      return (
                        <div
                          key={disputeId}
                          onClick={() => {
                            setSelectedDisputeId(disputeId);
                            handleSelectTab('disputes');
                          }}
                          className="group p-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 hover:border-cyan-500/40 dark:hover:border-cyan-500/40 transition-all flex items-center justify-between cursor-pointer"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                Case: {disputeId}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold">
                                Action Needed
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {(d.reason || 'Customer Return Claim').replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="text-right">
                            {amountStr && (
                              <div className="text-xs font-black text-slate-900 dark:text-white">
                                {amountStr}
                              </div>
                            )}
                            <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                              Resolve
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Zero Active Claims
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
                      All orders are fulfilled and in good standing. No customer returns or disputes require your attention right now.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (1/3): Store Assistant Teaser & Policy Glance */}
            <div className="space-y-6">
              {/* AI Assistant Quick Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-cyan-50/20 to-blue-50/20 dark:from-[#0c1424] dark:via-[#091120] dark:to-[#070b16] border border-cyan-500/30 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Store Assistant
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ask plain-English store questions
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Query your sales ledger, find high-value orders, check return rates, or calculate gross margins instantly.
                </p>

                <button
                  type="button"
                  onClick={() => handleSelectTab('assistant')}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Assistant</span>
                </button>
              </div>

              {/* Dispute Policy Glance */}
              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    Auto-Refund Policy
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/25">
                    Supervised
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Micro-claims below $50 are auto-settled to avoid dispute arbitration fees. Claims above $50 require your explicit review.
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectTab('disputes')}
                  className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  <span>Customize Policy in Claims Tab</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: CLAIMS & DISPUTES */}
      {activeTab === 'disputes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Sub-header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Customer Claims & Return Verification</span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                  {disputes.length} Active {disputes.length === 1 ? 'Case' : 'Cases'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect buyer return photos, verify product defects, and resolve claims with PayPal Seller Protection.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchDisputes}
              disabled={isLoadingDisputes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10 transition-all self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDisputes ? 'animate-spin text-cyan-500' : ''}`} />
              <span>Refresh Claims</span>
            </button>
          </div>

          {/* Collapsible Auto-Resolution Policy (Autonomy Dial) */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
            <button
              type="button"
              onClick={() => setIsPolicyExpanded(!isPolicyExpanded)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Auto-Resolution & Approval Policy
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure whether claims are auto-settled or require manual seller review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                  {isPolicyExpanded ? 'Collapse' : 'Configure'}
                </span>
                {isPolicyExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {isPolicyExpanded && (
              <div className="pt-3 border-t border-slate-100 dark:border-white/5 animate-in fade-in duration-200">
                <AutonomyDialWidget initialMode="SUPERVISED" />
              </div>
            )}
          </div>

          {/* Main Resolution Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Customer Dispute List (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Active Cases
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {disputes.length} total
                  </span>
                </div>

                {isLoadingDisputes ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-mono">
                    Loading live dispute cases from PayPal...
                  </div>
                ) : disputes.length > 0 ? (
                  <div className="space-y-3">
                    {disputes.map((d, idx) => {
                      const disputeId = d.dispute_id || d.id || `PP-D-${idx + 1}`;
                      const isSelected = (selectedDisputeId || disputes[0]?.dispute_id) === disputeId;
                      const allowedActions = Array.isArray(d.links)
                        ? d.links.map((l: any) => l.rel).filter(Boolean)
                        : ['provide-evidence', 'make-offer'];
                      const amountStr = d.dispute_amount?.value
                        ? `${d.dispute_amount.value} ${d.dispute_amount.currency_code || 'USD'}`
                        : '';

                      return (
                        <div
                          key={disputeId}
                          onClick={() => setSelectedDisputeId(disputeId)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                            isSelected
                              ? 'bg-cyan-50/60 dark:bg-cyan-950/20 border-cyan-500/50 shadow-md shadow-cyan-500/5'
                              : 'bg-slate-50/80 dark:bg-white/5 border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              Case {disputeId}
                            </span>
                            {amountStr && (
                              <span className="font-black text-slate-900 dark:text-white">
                                {amountStr}
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-xs text-amber-600 dark:text-amber-400">
                            {(d.reason || 'Customer Return Claim').replace(/_/g, ' ')}
                          </div>

                          {/* 1-Click Action Resolution Buttons */}
                          <div className="pt-2 border-t border-slate-200/50 dark:border-white/5">
                            <HateoasDisputeActionRenderer
                              disputeId={disputeId}
                              hateoasAllowedActions={allowedActions.length > 0 ? allowedActions : ['provide-evidence']}
                              links={d.links}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center space-y-2 min-h-[200px]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Zero Active Customer Disputes
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                      All PayPal transactions are settled in good standing. No customer claims pending seller action.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Photo Proof Inspection & Response Deadline (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Photo Return Verification (Evidence Comparator) */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl shadow-xl shadow-black/5 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Return Photo & Evidence Inspection
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {isInspectorExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>

                {isInspectorExpanded && (
                  <div>
                    {activeDisputeWithEvidence ? (
                      <EvidenceComparatorWidget
                        channel3CleanedUrl={
                          activeDisputeWithEvidence.catalog_cleaned_image_url ||
                          activeDisputeWithEvidence.channel3_cleaned_url ||
                          ''
                        }
                        buyerReturnPhotoUrl={
                          activeDisputeWithEvidence.buyer_image_url ||
                          activeDisputeWithEvidence.buyer_return_photo_url ||
                          ''
                        }
                        defectBoundingBox={activeDisputeWithEvidence.defect_bounding_box}
                        exifTamperFlag={Boolean(activeDisputeWithEvidence.exif_tamper_flag)}
                        liabilityScoreL={activeDisputeWithEvidence.liability_score_l ?? 0.5}
                        abuseRiskScoreR={activeDisputeWithEvidence.abuse_risk_score_r ?? 0.5}
                      />
                    ) : (
                      <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
                        <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            Photo Evidence Inspector Ready
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
                            No return photo disputes pending visual verification. When a buyer submits a photo claim, side-by-side defect inspection will automatically appear here.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Response Deadlines & SLA Scheduler */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl shadow-xl shadow-black/5 p-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setIsSlaExpanded(!isSlaExpanded)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Response Deadline Schedule
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Track upcoming PayPal resolution deadlines to maintain seller protection
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">
                      {isSlaExpanded ? 'Hide' : 'Show'}
                    </span>
                    {isSlaExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isSlaExpanded && (
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 animate-in fade-in duration-200">
                    <DisputeSlaScheduler />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: PRODUCTS & CATALOG */}
      {activeTab === 'products' && (
        <div className="animate-in fade-in duration-200">
          <ProductsClientView embedded />
        </div>
      )}

      {/* Tab: INVOICES & BILLING */}
      {activeTab === 'invoices' && (
        <div className="animate-in fade-in duration-200">
          <InvoicesClientView embedded />
        </div>
      )}

      {/* Tab: PAYOUTS & BALANCES */}
      {activeTab === 'balances' && (
        <div className="animate-in fade-in duration-200">
          <BalancesClientView embedded />
        </div>
      )}

      {/* Tab: SUBSCRIPTIONS & PLANS */}
      {activeTab === 'plans' && (
        <div className="animate-in fade-in duration-200">
          <PlansClientView embedded />
        </div>
      )}

      {/* Tab: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="animate-in fade-in duration-200">
          <TransactionsClientView embedded />
        </div>
      )}

      {/* Tab: AI STORE ASSISTANT */}
      {activeTab === 'assistant' && (
        <div className="animate-in fade-in duration-200 space-y-4">
          <div className="pb-2 border-b border-slate-200/70 dark:border-white/5">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>AI Store Assistant & Analysis</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ask natural-language questions to query sales trends, isolate return issues, calculate profit margins, or draft customer responses.
            </p>
          </div>

          <LiveStudioCanvas />
        </div>
      )}

      {/* Global Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onProductCreated={() => {
          setIsAddProductOpen(false);
          handleSelectTab('products');
        }}
      />
    </div>
  );
}

export default function MerchantCockpitPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-center text-xs text-slate-400 font-mono">
          Loading Seller Hub...
        </div>
      }
    >
      <MerchantCockpitInner />
    </Suspense>
  );
}
