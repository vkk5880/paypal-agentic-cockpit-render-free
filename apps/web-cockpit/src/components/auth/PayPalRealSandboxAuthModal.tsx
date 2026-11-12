'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Sparkles,
  ArrowRight,
  User,
  Key,
  LogIn,
  Sliders,
  DollarSign,
  Check,
  Search,
  Store,
  Plus,
  Filter,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useUiMode } from '@/context/UiModeContext';
import { useAuth, UserProfile, DEFAULT_ALLOWED_CATEGORIES, DEFAULT_ALLOWED_MERCHANTS } from '@/context/AuthContext';
import { webLogger as logger } from '@/lib/logger';
import { getClientOrigin } from '@/lib/origin';

export interface PayPalRealSandboxAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'authorize';
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2000];

export const AVAILABLE_CATEGORIES = [
  { id: 'audio', label: 'Audio & Acoustics', icon: '🎧' },
  { id: 'workspace', label: 'Workspace & Ergonomics', icon: '🖥️' },
  { id: 'electronics', label: 'Electronics & Computing', icon: '💻' },
  { id: 'peripherals', label: 'Peripherals & Cables', icon: '⌨️' },
  { id: 'office', label: 'Office & Stationery', icon: '📎' },
  { id: 'home', label: 'Home & Living', icon: '🏠' },
  { id: 'apparel', label: 'Apparel & Footwear', icon: '👕' },
  { id: 'general', label: 'General Merchandise', icon: '📦' },
];

export function PayPalRealSandboxAuthModal({
  isOpen,
  onClose,
  defaultMode = 'login',
}: PayPalRealSandboxAuthModalProps) {
  const { showTechnicalDetails } = useUiMode();
  const { user, isLoggedIn, isAuthorized, loginWithPayPal, authorizePayment } = useAuth();

  const [activeTab, setActiveTab] = useState<'live_window' | 'direct_credentials'>('live_window');
  const [emailInput, setEmailInput] = useState<string>('sb-buyer@personal.example.com');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSetupTokenId, setActiveSetupTokenId] = useState<string | null>(null);
  const [popupWindowRef, setPopupWindowRef] = useState<Window | null>(null);

  // Pre-authorization amount controls: by default disabled ($0) unless in authorize mode or already logged in
  const [enablePreauth, setEnablePreauth] = useState<boolean>(
    defaultMode === 'authorize' || Boolean(isLoggedIn && !isAuthorized)
  );
  const [preauthAmount, setPreauthAmount] = useState<number>(500);
  const [preauthAmountInput, setPreauthAmountInput] = useState<string>('500');

  // Security controls: Allowed Categories and Allowed Merchant Whitelist
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_ALLOWED_CATEGORIES);
  const [whitelistMode, setWhitelistMode] = useState<boolean>(true);
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>(DEFAULT_ALLOWED_MERCHANTS);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState<string>('');
  const [availableMerchants, setAvailableMerchants] = useState<any[]>([]);
  const [isSearchingMerchants, setIsSearchingMerchants] = useState<boolean>(false);

  // Accordion Expand/Collapse states for Category and Store selection
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState<boolean>(false);
  const [isStoresExpanded, setIsStoresExpanded] = useState<boolean>(false);

  // Dynamic button label according to authentication and budget authorization selection
  const getButtonLabel = () => {
    if (isLoggedIn) {
      return `Authorize $${preauthAmount}`;
    }
    if (enablePreauth) {
      return `Login & Authorize $${preauthAmount}`;
    }
    return 'Login';
  };

  // Reset inputs when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setStatusMessage(null);
      setIsLoading(false);
      // When opened, only enable preauth if defaultMode is 'authorize' or user is already logged in
      setEnablePreauth(defaultMode === 'authorize' || isLoggedIn);
      setPreauthAmount(500);
      setPreauthAmountInput('500');
      setIsCategoriesExpanded(false);
      setIsStoresExpanded(false);
      if (user?.email) {
        setEmailInput(user.email);
        setNameInput(user.name);
      }
      if (user?.allowedCategories && user.allowedCategories.length > 0) {
        setSelectedCategories(user.allowedCategories);
      } else {
        setSelectedCategories(DEFAULT_ALLOWED_CATEGORIES);
      }
      if (user?.allowedMerchants && user.allowedMerchants.length > 0) {
        const isAll = user.allowedMerchants.includes('*');
        setWhitelistMode(!isAll);
        setSelectedMerchants(isAll ? DEFAULT_ALLOWED_MERCHANTS : user.allowedMerchants);
      } else {
        setWhitelistMode(true);
        setSelectedMerchants(DEFAULT_ALLOWED_MERCHANTS);
      }
    }
  }, [isOpen, user, defaultMode, isLoggedIn]);

  // Load / Search available merchants from API
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    const fetchMerchants = async () => {
      setIsSearchingMerchants(true);
      try {
        const q = merchantSearchQuery.trim();
        const res = await fetch(`/api/buyer/merchants?query=${encodeURIComponent(q)}&limit=15`);
        if (!res.ok) throw new Error('Failed to query merchants');
        const data = await res.json();
        if (!isCancelled && Array.isArray(data.merchants)) {
          setAvailableMerchants(data.merchants);
        }
      } catch (err) {
        logger.warn('[PayPalAuthModal:Merchants] Failed to fetch merchants', { error: String(err) });
      } finally {
        if (!isCancelled) setIsSearchingMerchants(false);
      }
    };

    const timer = setTimeout(fetchMerchants, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, merchantSearchQuery]);

  // Handle toggling pre-authorization switch
  const handleTogglePreauth = () => {
    setEnablePreauth((prev) => {
      const nextState = !prev;
      if (nextState && (!preauthAmount || preauthAmount <= 0)) {
        setPreauthAmount(500);
        setPreauthAmountInput('500');
      }
      return nextState;
    });
  };

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPreauthAmount(val);
    setPreauthAmountInput(String(val));
  };

  // Handle manual amount input change
  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPreauthAmountInput(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
      setPreauthAmount(Math.round(parsed));
    }
  };

  // Handle preset pill click
  const handleSelectPreset = (amount: number) => {
    setPreauthAmount(amount);
    setPreauthAmountInput(String(amount));
  };

  // Handle successful PayPal Sandbox vault authorization
  const handleVaultSuccess = useCallback(async (payload: any) => {
    logger.info('[PayPalAuthModal:Success] Received verified vault session', payload);
    setStatusMessage('PayPal Sandbox Authorization confirmed!');
    setIsLoading(false);

    // Close popup window if still open
    if (popupWindowRef && !popupWindowRef.closed) {
      try {
        popupWindowRef.close();
      } catch {}
    }

    // Update local session via login callback with configured categories & merchants
    const effectiveCats = selectedCategories.length > 0 ? selectedCategories : DEFAULT_ALLOWED_CATEGORIES;
    const effectiveMerchants = whitelistMode ? selectedMerchants : ['*'];

    await loginWithPayPal({
      name: payload?.user?.name || user?.name || 'PayPal Sandbox Buyer',
      email: payload?.user?.email || user?.email || emailInput,
      allowedCategories: effectiveCats,
      allowedMerchants: effectiveMerchants,
    });

    // If pre-authorization was selected, authorize with chosen amount and security policy
    if (enablePreauth && preauthAmount > 0) {
      await authorizePayment(
        Math.round(preauthAmount * 100),
        effectiveCats,
        effectiveMerchants
      );
    }

    // Close login prompt and refresh UI
    onClose();
  }, [popupWindowRef, selectedCategories, whitelistMode, selectedMerchants, loginWithPayPal, user, emailInput, enablePreauth, preauthAmount, authorizePayment, onClose]);

  // Listen for popup window message events, BroadcastChannel, and storage events
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'PAYPAL_VAULT_SUCCESS') {
        const payload = event.data.data;
        logger.info('[PayPalAuthModal:Message] Received vault success from postMessage', payload);
        await handleVaultSuccess(payload);
      } else if (
        event.data?.type === 'PAYPAL_VAULT_CANCELLED' ||
        event.data?.type === 'PAYPAL_VAULT_ERROR' ||
        event.data?.type === 'PAYPAL_VAULT_FAILED'
      ) {
        logger.warn('[PayPalAuthModal:Message] User cancelled or failed PayPal sandbox login');
        setIsLoading(false);
        if (popupWindowRef && !popupWindowRef.closed) {
          try { popupWindowRef.close(); } catch {}
        }
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);

    // BroadcastChannel cross-tab listener (works even when window.opener is severed by cross-origin redirects)
    let authChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        authChannel = new BroadcastChannel('aegispay_auth_channel');
        authChannel.onmessage = async (event) => {
          if (event.data?.type === 'PAYPAL_VAULT_SUCCESS') {
            logger.info('[PayPalAuthModal:BroadcastChannel] Received vault success', event.data.data);
            await handleVaultSuccess(event.data.data);
          } else if (event.data?.type === 'PAYPAL_VAULT_CANCELLED' || event.data?.type === 'PAYPAL_VAULT_ERROR') {
            setIsLoading(false);
            if (popupWindowRef && !popupWindowRef.closed) {
              try { popupWindowRef.close(); } catch {}
            }
            onClose();
          }
        };
      } catch {}
    }

    // localStorage storage event listener
    const handleStorage = async (event: StorageEvent) => {
      if (event.key === 'aegispay_auth_sync' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed.type === 'PAYPAL_VAULT_SUCCESS' && parsed.data) {
            logger.info('[PayPalAuthModal:StorageSync] Received vault success via storage', parsed.data);
            await handleVaultSuccess(parsed.data);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (authChannel) {
        try { authChannel.close(); } catch {}
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [handleVaultSuccess, popupWindowRef, onClose]);

  if (!isOpen) return null;

  // 1. Launch Live PayPal Sandbox Window
  const handleLaunchLiveSandboxWindow = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Connecting to PayPal Sandbox API & Minting Setup Token...');

    try {
      const clientOrigin = getClientOrigin();
      const res = await fetch('/api/auth/paypal/create-vault-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user?.email ? `cust_${user.email.split('@')[0]}` : undefined,
          origin: clientOrigin,
          returnUrl: `${clientOrigin}/auth/vault-callback`,
          cancelUrl: `${clientOrigin}/auth/vault-callback?cancelled=true`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to initiate PayPal Sandbox session');
      }

      setActiveSetupTokenId(data.setupTokenId);
      setStatusMessage('PayPal Sandbox token generated! Opening login window...');

      // Open centered popup
      const width = 520;
      const height = 680;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.approveUrl,
        'PayPalSandboxAuth',
        `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes,resizable=yes`
      );

      setPopupWindowRef(popup);

      // Active Polling & Window-close check
      let pollCount = 0;
      const checkInterval = setInterval(async () => {
        pollCount++;

        // Case 1: Popup was closed by user or window.close()
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          setIsLoading(false);

          // Verify status on close
          if (data.setupTokenId) {
            try {
              const verifyRes = await fetch('/api/auth/paypal/verify-vault-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setupTokenId: data.setupTokenId }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.isAuthorized) {
                await handleVaultSuccess(verifyData);
                return;
              }
            } catch {}
          }
          onClose();
          return;
        }

        // Case 2: Active background check every 2 seconds WHILE POPUP IS STILL OPEN
        if (data.setupTokenId && pollCount % 2 === 0) {
          try {
            const verifyRes = await fetch('/api/auth/paypal/verify-vault-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ setupTokenId: data.setupTokenId }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success && verifyData.isAuthorized) {
              clearInterval(checkInterval);
              if (popup && !popup.closed) {
                try { popup.close(); } catch {}
              }
              await handleVaultSuccess(verifyData);
              return;
            }
          } catch {}
        }

        // Stop polling after 120 seconds
        if (pollCount > 80) {
          clearInterval(checkInterval);
          setIsLoading(false);
        }
      }, 1500);
    } catch (err: any) {
      setIsLoading(false);
      logger.error('[PayPalAuthModal:Error] Failed to launch live sandbox window', {
        error: String(err),
      });
      // Close prompt even if failed
      onClose();
    }
  };

  // 2. Direct Sandbox Credentials Login / Direct Spend Authorization
  const handleDirectSandboxLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveCats = selectedCategories.length > 0 ? selectedCategories : DEFAULT_ALLOWED_CATEGORIES;
    const effectiveMerchants = whitelistMode ? selectedMerchants : ['*'];

    // If already logged in, authorize spend directly without needing re-login roundtrip
    if (isLoggedIn) {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(`Authorizing $${preauthAmount} spend allowance with PayPal Sandbox...`);
      try {
        await authorizePayment(
          Math.round(preauthAmount * 100),
          effectiveCats,
          effectiveMerchants
        );
        setStatusMessage('Spend allowance authorized successfully!');
        setIsLoading(false);
        onClose();
        setTimeout(() => {
          if (typeof window !== 'undefined') window.location.reload();
        }, 200);
        return;
      } catch (err: any) {
        setIsLoading(false);
        logger.error('[PayPalAuthModal:Error] Direct authorize failed', { error: String(err) });
        onClose();
        return;
      }
    }

    if (!emailInput || !emailInput.includes('@')) {
      setErrorMessage('Please enter a valid PayPal Sandbox email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Authenticating Sandbox Buyer Account...');

    try {
      const clientOrigin = getClientOrigin();
      const res = await fetch('/api/auth/paypal/sandbox-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          name: nameInput || undefined,
          origin: clientOrigin,
          returnUrl: `${clientOrigin}/auth/vault-callback`,
          cancelUrl: `${clientOrigin}/auth/vault-callback?cancelled=true`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to authenticate PayPal Sandbox account');
      }

      const effectiveCats = selectedCategories.length > 0 ? selectedCategories : DEFAULT_ALLOWED_CATEGORIES;
      const effectiveMerchants = whitelistMode ? selectedMerchants : ['*'];

      logger.info('[PayPalAuthModal:DirectLogin] Direct login successful', data.user);
      await loginWithPayPal({
        ...data.user,
        allowedCategories: effectiveCats,
        allowedMerchants: effectiveMerchants,
      });

      if (enablePreauth && preauthAmount > 0) {
        setStatusMessage(`Account logged in! Authorizing $${preauthAmount} spend allowance...`);
        await authorizePayment(
          Math.round(preauthAmount * 100),
          effectiveCats,
          effectiveMerchants
        );
        setStatusMessage('Payment & spend allowance authorized successfully!');
      } else {
        setStatusMessage('Logged in with PayPal Sandbox Account!');
      }

      setIsLoading(false);
      onClose();
      // Refresh page or UI if login success
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 200);
    } catch (err: any) {
      setIsLoading(false);
      logger.error('[PayPalAuthModal:Error] Direct login failed', { error: String(err) });
      // Close login prompt even if failed
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 lg:p-12 bg-slate-950/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
      {/* Container covering full window with beautiful margin */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#070e1d] border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all my-auto">
        {/* Top vibrant gradient accent line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#081022]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white flex items-center justify-center font-black shadow-lg shadow-cyan-500/25">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isLoggedIn ? 'Authorize Payment' : 'Login'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  PAYPAL SANDBOX
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isLoggedIn
                  ? 'Configure your pre-authorized budget cap and store whitelist with PayPal Sandbox'
                  : 'Sign in with PayPal Sandbox credentials & configure optional spend allowance'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {/* Status Message Banner */}
          {statusMessage && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs flex items-center gap-2.5 animate-fade-in font-mono">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-cyan-500" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* =========================================================================
              PRE-AUTHORIZE AMOUNT SECTION (SHOWN ABOVE LOGIN ACTIONS)
              Default: Disabled or $0. If enabled, defaults to $500 with slider and input.
             ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-cyan-50/60 via-white to-blue-50/40 dark:from-[#09152e]/60 dark:via-[#070e1c]/80 dark:to-[#050b16] border border-cyan-200/80 dark:border-cyan-500/20 shadow-xs space-y-4">
            {/* Section Header & Toggle Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Allow Budget &amp; Spend Allowance</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                      {enablePreauth ? 'Allowed' : 'Disabled ($0)'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Authorize an upfront spend cap with PayPal Vault v3 so your shopping assistant can buy instantly without repetitive approval modals.
                  </p>
                </div>
              </div>

              {/* Toggle Switch Button */}
              <button
                type="button"
                onClick={handleTogglePreauth}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50 self-start sm:self-center ${
                  enablePreauth ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={enablePreauth}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enablePreauth ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Inactive State: Disabled ($0) */}
            {!enablePreauth ? (
              <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>
                    Budget Allowance is <strong>Unchecked ($0 Allowance)</strong>. Categories and store whitelist are hidden until budget is allowed.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePreauth}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Allow Budget ($500 Cap)
                </button>
              </div>
            ) : (
              /* Active State: Slider & Amount Input Controls */
              <div className="space-y-4 pt-1 animate-fade-in">
                {/* Active Amount Display & Quick Presets */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Selected Pre-authorized Cap
                    </span>
                    <div className="text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400 flex items-baseline gap-1">
                      <span>${preauthAmount.toLocaleString()}</span>
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">USD</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = preauthAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleSelectPreset(amt)}
                          className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50'
                          }`}
                        >
                          ${amt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slider Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>$50 Min</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">$500 (Default)</span>
                    <span>$2,500 Max</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="2500"
                    step="25"
                    value={preauthAmount}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* Custom Amount Input Box */}
                <div className="flex items-center gap-3 pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Or Enter Exact Amount:
                  </label>
                  <div className="relative flex-1 max-w-[200px]">
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      step="1"
                      placeholder="500"
                      value={preauthAmountInput}
                      onChange={handleAmountInputChange}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070d18] text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    ({preauthAmount * 100} cents)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              SECURITY & SPEND MANDATE CONTROLS: CATEGORIES & MERCHANT WHITELIST
              Only displayed when Allow Budget (enablePreauth) is checked!
             ========================================================================= */}
          {enablePreauth && (
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 dark:from-[#0c142c]/60 dark:via-[#090f20]/80 dark:to-[#060a16] border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs space-y-4 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Security &amp; Hardware Spend Mandate</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        WebCrypto Ed25519
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure cryptographic purchase limits, authorized categories, and store whitelisting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cryptographic Browser-Signed Token Badge */}
              <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center gap-3 text-xs">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">Browser-Signed Token Active:</strong> Purchases are locked by in-browser WebCrypto Ed25519 keys, preventing prompt injection attacks or rogue agent actions from exceeding your policy.
                </div>
              </div>

              {/* Section A: Authorized Categories (Collapsible / Expandable) */}
              <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-500/20 bg-white/70 dark:bg-slate-900/40 overflow-hidden transition-all shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsCategoriesExpanded((prev) => !prev)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                  aria-expanded={isCategoriesExpanded}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Filter className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Authorized Product Categories
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          {selectedCategories.length} Allowed
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isCategoriesExpanded
                          ? 'Select categories this session is authorized to purchase'
                          : selectedCategories.length === AVAILABLE_CATEGORIES.length
                          ? 'All categories allowed (Click to customize)'
                          : `${selectedCategories.length} of ${AVAILABLE_CATEGORIES.length} categories enabled (Click to edit)`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <span className="text-xs font-semibold">
                      {isCategoriesExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isCategoriesExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isCategoriesExpanded && (
                  <div className="p-4 pt-2 border-t border-indigo-100 dark:border-slate-800/80 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">Toggle allowed categories:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(AVAILABLE_CATEGORIES.map((c) => c.id))}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-medium text-[11px]"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer font-medium text-[11px]"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {AVAILABLE_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategories((prev) =>
                                isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                              );
                            }}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/50 text-indigo-900 dark:text-indigo-200 shadow-xs'
                                : 'bg-white/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-sm shrink-0">{cat.icon}</span>
                            <span className="truncate">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section B: Allowed Stores Whitelist (Collapsible / Expandable) */}
              <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-500/20 bg-white/70 dark:bg-slate-900/40 overflow-hidden transition-all shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsStoresExpanded((prev) => !prev)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                  aria-expanded={isStoresExpanded}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Allowed Stores Whitelist
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                          {whitelistMode ? `${selectedMerchants.length} Stores Whitelisted` : 'All Stores Allowed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isStoresExpanded
                          ? 'Configure merchant whitelist to restrict agent spending'
                          : whitelistMode
                          ? `${selectedMerchants.length} partner stores authorized (Click to edit)`
                          : 'Unrestricted partner purchases (Click to configure whitelist)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <span className="text-xs font-semibold">
                      {isStoresExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isStoresExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isStoresExpanded && (
                  <div className="p-4 pt-2 border-t border-indigo-100 dark:border-slate-800/80 space-y-3 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Whitelist Policy:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {whitelistMode ? 'Restricted to Selected Stores' : 'Allow All Stores'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWhitelistMode((prev) => !prev)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            whitelistMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          role="switch"
                          aria-checked={whitelistMode}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              whitelistMode ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {whitelistMode && (
                      <div className="space-y-3 pt-1">
                        {/* Selected Store Badges */}
                        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#070e1a] border border-slate-200 dark:border-slate-800 min-h-[42px] items-center">
                          {selectedMerchants.length === 0 ? (
                            <span className="text-xs text-rose-500 italic flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              No stores selected! Add at least one merchant to allow purchases.
                            </span>
                          ) : (
                            selectedMerchants.map((domain) => (
                              <span
                                key={domain}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80"
                              >
                                <span>{domain}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedMerchants((prev) => prev.filter((d) => d !== domain))}
                                  className="hover:text-rose-500 cursor-pointer"
                                  title="Remove from allowed list"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        {/* Search & Suggestions */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={merchantSearchQuery}
                            onChange={(e) => setMerchantSearchQuery(e.target.value)}
                            placeholder="Search stores from Channel3 catalog (e.g. Best Buy, Amazon, Apple...)"
                            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070d18] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {isSearchingMerchants && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-3 top-2.5" />
                          )}
                        </div>

                        {/* Presets and available stores */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Available Partner Stores:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const tech = ['bestbuy.com', 'amazon.com', 'apple.com', 'newegg.com'];
                                  setSelectedMerchants((prev) => Array.from(new Set([...prev, ...tech])));
                                }}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                              >
                                + Top Tech
                              </button>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const audioWorkspace = ['audio-gear-direct.com', 'nordic-workspaces.io', 'bhphotovideo.com'];
                                  setSelectedMerchants((prev) => Array.from(new Set([...prev, ...audioWorkspace])));
                                }}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                              >
                                + Audio &amp; Workspace
                              </button>
                            </div>
                          </div>

                          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                            {availableMerchants.map((m) => {
                              const isAllowed = selectedMerchants.includes(m.domain);
                              return (
                                <div
                                  key={m.domain}
                                  className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs hover:border-indigo-400 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={m.logo_url}
                                      alt={m.name}
                                      className="w-6 h-6 rounded-md object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                                        {m.name}
                                      </div>
                                      <div className="text-[10px] font-mono text-slate-500 truncate">
                                        {m.domain}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMerchants((prev) =>
                                        isAllowed ? prev.filter((d) => d !== m.domain) : [...prev, m.domain]
                                      );
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                                      isAllowed
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-600 hover:border-rose-500/30'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                    }`}
                                  >
                                    {isAllowed ? '✓ Allowed' : '+ Allow'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              AUTHENTICATION TABS & LOGIN ACTIONS
             ========================================================================= */}
          <div className="space-y-4">
            {/* Method Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070d1a]/70 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('live_window')}
                className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'live_window'
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Live PayPal Window</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('direct_credentials')}
                className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'direct_credentials'
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Direct Sandbox Account</span>
              </button>
            </div>

            {/* Tab 1: Live PayPal Sandbox Sign-In Window */}
            {activeTab === 'live_window' && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Live PayPal Sandbox Window Experience</span>
                  </div>
                  <p>
                    Clicking below initiates a verified PayPal Sandbox session and opens the official sign-in window on{' '}
                    <strong className="font-mono text-cyan-600 dark:text-cyan-400">
                      sandbox.paypal.com
                    </strong>
                    . The login window will close automatically once completed or if cancelled, and AegisPay will immediately synchronize.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleLaunchLiveSandboxWindow}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-cyan-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Opening PayPal Sandbox Window...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-5 h-5" />
                      <span>{getButtonLabel()}</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 font-mono">
                  Endpoint: https://www.sandbox.paypal.com/agreements/approve
                </p>
              </div>
            )}

            {/* Tab 2: Direct Sandbox Credentials Login */}
            {activeTab === 'direct_credentials' && (
              <form onSubmit={handleDirectSandboxLogin} className="space-y-4 pt-1">
                {isLoggedIn ? (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
                      <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Active Sandbox Session: {user?.name || 'PayPal Sandbox Buyer'}</span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      Account: {user?.email || emailInput}
                    </p>
                    <p>
                      Clicking below will authorize a <strong className="text-indigo-600 dark:text-indigo-400">${preauthAmount}</strong> spend allowance locked to your configured categories and stores.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        PayPal Sandbox Buyer Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="sb-buyer@personal.example.com"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070d18] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
                        />
                        <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                        Use any personal sandbox buyer account from your PayPal Developer Dashboard.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Buyer Display Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070d18] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-cyan-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isLoggedIn ? 'Authorizing Spend Allowance...' : 'Verifying with PayPal Sandbox...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>{getButtonLabel()}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Dev Mode Technical Diagnostics */}
          {showTechnicalDetails && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-[#060b14]/70 border border-slate-200/80 dark:border-white/5 space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between text-slate-500">
                  <span>Target API:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    api-m.sandbox.paypal.com
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Pre-authorization State:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {enablePreauth ? `Active ($${preauthAmount} / ${preauthAmount * 100} cents)` : 'Disabled ($0)'}
                  </span>
                </div>
                {activeSetupTokenId && (
                  <div className="flex justify-between text-slate-500">
                    <span>Active Setup Token:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {activeSetupTokenId}
                    </span>
                  </div>
                )}
                {user?.isAuthorized && (
                  <div className="flex justify-between text-slate-500">
                    <span>Vault Payment Token:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {user.vaultSetupTokenId || 'Active'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
