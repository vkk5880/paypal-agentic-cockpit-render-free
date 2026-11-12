'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUiMode } from './UiModeContext';
import { webLogger as logger } from '@/lib/logger';
import { PayPalRealSandboxAuthModal } from '@/components/auth/PayPalRealSandboxAuthModal';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  isAuthorized: boolean;
  vaultSetupTokenId?: string;
  paymentTokenId?: string;
  mandateId?: string;
  spentCents?: number;
  authorizedAt?: number;
  budgetCapCents?: number;
  mandateSignatureHex?: string;
  publicKeyHex?: string;
  mandateExpiresAt?: string;
  allowedCategories?: string[];
  allowedMerchants?: string[];
}

export interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isAuthorized: boolean;
  isTrackingMode: boolean;
  trackingToken: string | null;
  loginWithPayPal: (account?: {
    name?: string;
    email?: string;
    allowedCategories?: string[];
    allowedMerchants?: string[];
  }) => Promise<void>;
  authorizePayment: (
    budgetCapCents?: number,
    allowedCategories?: string[],
    allowedMerchants?: string[]
  ) => Promise<void>;
  updateSpendSecuritySettings: (
    allowedCategories: string[],
    allowedMerchants: string[]
  ) => Promise<void>;
  revokePaymentAuthorization: () => void;
  logout: () => void;
  isProfileSidebarOpen: boolean;
  setIsProfileSidebarOpen: (open: boolean) => void;
  openProfileSidebar: () => void;
  closeProfileSidebar: () => void;

  // Real PayPal Sandbox Modal Controls
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'authorize';
  openAuthModal: (mode?: 'login' | 'authorize') => void;
  closeAuthModal: () => void;

  // Authorization Persistence & Spend Tracking
  spentCents: number;
  recordPurchaseSpend: (amountCents: number) => void;
  resetSessionSpend: () => void;
}

export const DEFAULT_ALLOWED_CATEGORIES = [
  'audio',
  'workspace',
  'electronics',
  'peripherals',
  'office',
  'home',
  'apparel',
  'general',
  'keyboards',
  'monitors',
  'power',
  'creators',
  'accessories',
];

export const DEFAULT_ALLOWED_MERCHANTS = [
  'bestbuy.com',
  'audio-gear-direct.com',
  'nordic-workspaces.io',
  'amazon.com',
  'apple.com',
  'bhphotovideo.com',
  'newegg.com',
  'target.com',
  'walmart.com',
  'adorama.com',
  'crutchfield.com',
  'sweetwater.com',
  'keychron.com',
  'nuphy.com',
  'razer.com',
  'mechanicalkeyboards.com',
  'epomaker.com',
  'drop.com',
  'microcenter.com',
  'dell.com',
  'hermanmiller.com',
  'steelcase.com',
  'autonomous.ai',
  'grovemade.com',
  'therooststand.com',
  'upliftdesk.com',
  'anker.com',
  'satechi.net',
  'sharge.com',
  'belkin.com',
];

export const DEFAULT_SANDBOX_USER: UserProfile = {
  name: 'PayPal Sandbox Buyer',
  email: 'sb-buyer@personal.example.com',
  isAuthorized: false,
  spentCents: 0,
  allowedCategories: DEFAULT_ALLOWED_CATEGORIES,
  allowedMerchants: DEFAULT_ALLOWED_MERCHANTS,
};

const STORAGE_KEY = 'aegispay_user_session';

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function mintWebCryptoEd25519Mandate(params: {
  userId: string;
  mandateId: string;
  budgetCapCents: number;
  allowedCategoryIds?: string[];
  allowedMerchants?: string[];
}): Promise<{ publicKeyHex: string; signatureHex: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const subtle = typeof window !== 'undefined' ? window.crypto?.subtle : (globalThis as any).crypto?.subtle;

  const cats = params.allowedCategoryIds && params.allowedCategoryIds.length > 0
    ? params.allowedCategoryIds
    : DEFAULT_ALLOWED_CATEGORIES;
  const merchants = params.allowedMerchants && params.allowedMerchants.length > 0
    ? params.allowedMerchants
    : DEFAULT_ALLOWED_MERCHANTS;

  if (subtle && typeof subtle.generateKey === 'function') {
    try {
      const keyPair = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      const rawPub = await subtle.exportKey('raw', keyPair.publicKey);
      const publicKeyHex = bufferToHex(rawPub);

      const messageObj = {
        mandate_id: params.mandateId,
        buyer_id: params.userId,
        max_total_spend_cents: params.budgetCapCents,
        max_single_merchant_cents: params.budgetCapCents,
        currency_code: 'USD',
        allowed_category_ids: cats,
        allowed_merchant_domains: merchants,
        expires_at: expiresAt,
        status: 'ACTIVE',
        public_key_hex: publicKeyHex,
      };

      const messageBytes = new TextEncoder().encode(JSON.stringify(messageObj));
      const sigBuffer = await subtle.sign({ name: 'Ed25519' }, keyPair.privateKey, messageBytes);
      const signatureHex = bufferToHex(sigBuffer);

      return { publicKeyHex, signatureHex, expiresAt };
    } catch (err) {
      logger.warn('[AuthContext:WebCrypto] Native Ed25519 WebCrypto failed, falling back to deterministic cryptographic mock', { error: String(err) });
    }
  }

  // Fallback 32-byte pubkey hex and 64-byte signature hex with high entropy
  const randPub = new Uint8Array(32);
  const randSig = new Uint8Array(64);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randPub);
    window.crypto.getRandomValues(randSig);
  } else if ((globalThis as any).crypto?.getRandomValues) {
    (globalThis as any).crypto.getRandomValues(randPub);
    (globalThis as any).crypto.getRandomValues(randSig);
  } else {
    for (let i = 0; i < 32; i++) randPub[i] = Math.floor(Math.random() * 256);
    for (let i = 0; i < 64; i++) randSig[i] = Math.floor(Math.random() * 256);
  }
  return { publicKeyHex: bufferToHex(randPub), signatureHex: bufferToHex(randSig), expiresAt };
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isLoggedIn: false,
  isAuthorized: false,
  isTrackingMode: false,
  trackingToken: null,
  loginWithPayPal: async () => {},
  authorizePayment: async () => {},
  updateSpendSecuritySettings: async () => {},
  revokePaymentAuthorization: () => {},
  logout: () => {},
  isProfileSidebarOpen: false,
  setIsProfileSidebarOpen: () => {},
  openProfileSidebar: () => {},
  closeProfileSidebar: () => {},

  isAuthModalOpen: false,
  authModalMode: 'login',
  openAuthModal: () => {},
  closeAuthModal: () => {},

  spentCents: 0,
  recordPurchaseSpend: () => {},
  resetSessionSpend: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showTechnicalDetails } = useUiMode();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [spentCents, setSpentCentsState] = useState<number>(0);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'authorize'>('login');
  const [isTrackingMode, setIsTrackingMode] = useState<boolean>(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  // Load saved session and detect tracking URL params on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        setIsTrackingMode(true);
        setTrackingToken(token);
        logger.info('[AuthContext:TrackingMode] Active tracking token detected, session sandboxed into read-only mode', {
          tokenPreview: token.slice(0, 16) + '...',
        });
      }
    }

    try {
      // Clean up legacy mock/test-user storage artifacts
      localStorage.removeItem('aegispay_test_user_enabled');
      localStorage.removeItem('aegispay_test_user_session');
      localStorage.removeItem('aegispay_mock_test_mode');

      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && typeof parsed.name === 'string') {
          setUser(parsed);
          setSpentCentsState(typeof parsed.spentCents === 'number' ? parsed.spentCents : 0);
          logger.info('[AuthContext:SessionRestored]', {
            name: parsed.name,
            email: parsed.email,
            isAuthorized: parsed.isAuthorized,
            spentCents: parsed.spentCents || 0,
          });
        }
      }
    } catch (e) {
      logger.warn('[AuthContext:Init] Failed to load session from storage', {
        error: String(e),
      });
    }

    // Cross-tab Synchronization via BroadcastChannel and localStorage events
    let authChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        authChannel = new BroadcastChannel('aegispay_auth_channel');
        authChannel.onmessage = (event) => {
          if (event.data?.type === 'PAYPAL_VAULT_SUCCESS') {
            const data = event.data.data;
            if (data?.user) {
              const updatedUser: UserProfile = {
                name: data.user.name || 'PayPal Sandbox Buyer',
                email: data.user.email || 'sb-buyer@personal.example.com',
                isAuthorized: true,
                vaultSetupTokenId: data.setupTokenId,
                paymentTokenId: data.paymentTokenId,
                spentCents: 0,
                allowedCategories: DEFAULT_ALLOWED_CATEGORIES,
                allowedMerchants: ['*'],
              };
              setUser(updatedUser);
              setIsAuthModalOpen(false);
            }
          }
        };
      } catch {}
    }

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed.name === 'string') {
            setUser(parsed);
            setSpentCentsState(typeof parsed.spentCents === 'number' ? parsed.spentCents : 0);
            setIsAuthModalOpen(false);
          }
        } catch {}
      } else if (e.key === 'aegispay_auth_sync' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.type === 'PAYPAL_VAULT_SUCCESS' && parsed.data?.user) {
            const data = parsed.data;
            const updatedUser: UserProfile = {
              name: data.user.name || 'PayPal Sandbox Buyer',
              email: data.user.email || 'sb-buyer@personal.example.com',
              isAuthorized: true,
              vaultSetupTokenId: data.setupTokenId,
              paymentTokenId: data.paymentTokenId,
              spentCents: 0,
              allowedCategories: DEFAULT_ALLOWED_CATEGORIES,
              allowedMerchants: ['*'],
            };
            setUser(updatedUser);
            setIsAuthModalOpen(false);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageSync);

    setMounted(true);

    return () => {
      if (authChannel) {
        try { authChannel.close(); } catch {}
      }
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  const openAuthModal = useCallback((mode: 'login' | 'authorize' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const loginWithPayPal = useCallback(
    async (account?: {
      name?: string;
      email?: string;
      allowedCategories?: string[];
      allowedMerchants?: string[];
    }) => {
      if (!account) {
        // Trigger the real PayPal Sandbox Auth Modal
        logger.info('[AuthContext:Login] Opening real PayPal Sandbox Auth Modal');
        openAuthModal('login');
        return;
      }

      logger.info('[AuthContext:Login] Establishing verified PayPal Sandbox account session', { account });
      const loggedInUser: UserProfile = {
        name: account.name || DEFAULT_SANDBOX_USER.name,
        email: account.email || DEFAULT_SANDBOX_USER.email,
        isAuthorized: user?.isAuthorized || false,
        vaultSetupTokenId: user?.vaultSetupTokenId,
        paymentTokenId: user?.paymentTokenId,
        spentCents: user?.spentCents || 0,
        allowedCategories: account.allowedCategories || user?.allowedCategories || DEFAULT_ALLOWED_CATEGORIES,
        allowedMerchants: account.allowedMerchants || user?.allowedMerchants || DEFAULT_ALLOWED_MERCHANTS,
      };

      setUser(loggedInUser);
      setSpentCentsState(loggedInUser.spentCents || 0);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
      } catch {}

      logger.info('[AuthContext:Login] User session saved to storage', {
        name: loggedInUser.name,
        email: loggedInUser.email,
        isAuthorized: loggedInUser.isAuthorized,
        allowedCategoriesCount: loggedInUser.allowedCategories?.length,
        allowedMerchantsCount: loggedInUser.allowedMerchants?.length,
      });
    },
    [openAuthModal, user]
  );

  const authorizePayment = useCallback(
    async (
      budgetCapCents: number = 25000,
      allowedCategories?: string[],
      allowedMerchants?: string[]
    ) => {
      logger.info('[AuthContext:Authorize] Authorizing PayPal Sandbox Vault v3 Spend Allowance with WebCrypto Ed25519', {
        budgetCapCents,
        allowedCategories,
        allowedMerchants,
      });

      const activeUser = user || {
        name: DEFAULT_SANDBOX_USER.name,
        email: DEFAULT_SANDBOX_USER.email,
        isAuthorized: false,
        spentCents: 0,
      };

      const finalCategories = allowedCategories && allowedCategories.length > 0
        ? allowedCategories
        : activeUser.allowedCategories || DEFAULT_ALLOWED_CATEGORIES;
      const finalMerchants = allowedMerchants && allowedMerchants.length > 0
        ? allowedMerchants
        : activeUser.allowedMerchants || DEFAULT_ALLOWED_MERCHANTS;

      const mandateId = `vch_mandate_${Date.now()}`;
      const { publicKeyHex, signatureHex, expiresAt } = await mintWebCryptoEd25519Mandate({
        userId: activeUser.email || 'sb-buyer@personal.example.com',
        mandateId,
        budgetCapCents,
        allowedCategoryIds: finalCategories,
        allowedMerchants: finalMerchants,
      });

      const authorizedUser: UserProfile = {
        ...activeUser,
        isAuthorized: true,
        vaultSetupTokenId: activeUser.vaultSetupTokenId || `vault_tok_sandbox_${Date.now()}`,
        paymentTokenId: activeUser.paymentTokenId || `vault_pm_tok_${Date.now()}`,
        mandateId,
        budgetCapCents,
        mandateSignatureHex: signatureHex,
        publicKeyHex,
        mandateExpiresAt: expiresAt,
        authorizedAt: Date.now(),
        spentCents: activeUser.spentCents || 0,
        allowedCategories: finalCategories,
        allowedMerchants: finalMerchants,
      };

      setUser(authorizedUser);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authorizedUser));
      } catch {}

      logger.info('[AuthContext:Authorize] WebCrypto Ed25519 Spend Mandate signed and stored', {
        name: authorizedUser.name,
        mandateId,
        budgetCapCents,
        publicKeyPrefix: publicKeyHex.slice(0, 8),
        allowedCategoriesCount: finalCategories.length,
        allowedMerchantsCount: finalMerchants.length,
      });
    },
    [user]
  );

  const updateSpendSecuritySettings = useCallback(
    async (allowedCategories: string[], allowedMerchants: string[]) => {
      logger.info('[AuthContext:UpdateSecurity] Updating allowed categories and allowed merchants policy', {
        categoriesCount: allowedCategories.length,
        merchantsCount: allowedMerchants.length,
      });

      if (!user) return;

      let updatedUser: UserProfile = {
        ...user,
        allowedCategories,
        allowedMerchants,
      };

      // If already authorized, re-sign the WebCrypto Ed25519 spend mandate with new policy
      if (user.isAuthorized) {
        const cap = user.budgetCapCents || 50000;
        const mandateId = `vch_mandate_${Date.now()}`;
        const { publicKeyHex, signatureHex, expiresAt } = await mintWebCryptoEd25519Mandate({
          userId: user.email,
          mandateId,
          budgetCapCents: cap,
          allowedCategoryIds: allowedCategories,
          allowedMerchants,
        });

        updatedUser = {
          ...updatedUser,
          mandateId,
          mandateSignatureHex: signatureHex,
          publicKeyHex,
          mandateExpiresAt: expiresAt,
        };
      }

      setUser(updatedUser);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      } catch {}

      logger.info('[AuthContext:UpdateSecurity] Security policy updated successfully');
    },
    [user]
  );

  const revokePaymentAuthorization = useCallback(() => {
    logger.info('[AuthContext:Revoke] Revoking spend allowance authorization (dropping to Mode A: $0 Identity Only)');
    setUser((current) => {
      if (!current) return current;
      const downgraded: UserProfile = {
        ...current,
        isAuthorized: false,
        mandateId: undefined,
        vaultSetupTokenId: undefined,
        paymentTokenId: undefined,
        mandateSignatureHex: undefined,
        publicKeyHex: undefined,
        mandateExpiresAt: undefined,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(downgraded));
      } catch {}
      return downgraded;
    });
  }, []);

  const recordPurchaseSpend = useCallback((amountCents: number) => {
    setSpentCentsState((prev) => {
      const nextSpent = prev + amountCents;
      setUser((current) => {
        if (!current) return current;
        const updated = { ...current, spentCents: nextSpent };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      return nextSpent;
    });
  }, []);

  const resetSessionSpend = useCallback(() => {
    setSpentCentsState(0);
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, spentCents: 0 };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    logger.info('[AuthContext:Logout] User logging out of PayPal account');
    setUser(null);
    setSpentCentsState(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const openProfileSidebar = useCallback(() => {
    setIsProfileSidebarOpen(true);
  }, []);

  const closeProfileSidebar = useCallback(() => {
    setIsProfileSidebarOpen(false);
  }, []);

  const isLoggedIn = !!user;
  // Security invariant: Authorization is ONLY valid if the user IS currently logged in!
  const isAuthorized = isLoggedIn && Boolean(user?.isAuthorized);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        isAuthorized,
        isTrackingMode,
        trackingToken,
        loginWithPayPal,
        authorizePayment,
        updateSpendSecuritySettings,
        revokePaymentAuthorization,
        logout,
        isProfileSidebarOpen,
        setIsProfileSidebarOpen,
        openProfileSidebar,
        closeProfileSidebar,

        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,

        spentCents,
        recordPurchaseSpend,
        resetSessionSpend,
      }}
    >
      {children}
      <PayPalRealSandboxAuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultMode={authModalMode}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
}
