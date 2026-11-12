'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function VaultCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<'verifying' | 'success' | 'cancelled' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const isCancelled = searchParams.get('cancelled') === 'true';
    const setupTokenId =
      searchParams.get('approval_session_id') ||
      searchParams.get('setup_token_id') ||
      searchParams.get('token');

    if (isCancelled) {
      setStatus('cancelled');
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const ch = new BroadcastChannel('aegispay_auth_channel');
          ch.postMessage({ type: 'PAYPAL_VAULT_CANCELLED' });
          ch.close();
        }
      } catch {}
      try {
        localStorage.setItem('aegispay_auth_sync', JSON.stringify({ type: 'PAYPAL_VAULT_CANCELLED', timestamp: Date.now() }));
      } catch {}
      if (window.opener) {
        try { window.opener.postMessage({ type: 'PAYPAL_VAULT_CANCELLED' }, '*'); } catch {}
      }
      setTimeout(() => { try { window.close(); } catch {} }, 400);
      return;
    }

    if (!setupTokenId) {
      setStatus('error');
      setErrorMessage('No PayPal approval session ID was returned in the callback URL.');
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const ch = new BroadcastChannel('aegispay_auth_channel');
          ch.postMessage({ type: 'PAYPAL_VAULT_ERROR', message: 'No PayPal approval session ID was returned.' });
          ch.close();
        }
      } catch {}
      if (window.opener) {
        try {
          window.opener.postMessage(
            { type: 'PAYPAL_VAULT_ERROR', message: 'No PayPal approval session ID was returned in the callback URL.' },
            '*'
          );
        } catch {}
      }
      setTimeout(() => { try { window.close(); } catch {} }, 800);
      return;
    }

    // Verify token with backend
    async function verify() {
      try {
        const res = await fetch('/api/auth/paypal/verify-vault-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupTokenId }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setStatus('success');
          setUserData(data.user);

          // 1. Save session to localStorage
          try {
            const existingRaw = localStorage.getItem('aegispay_user_session');
            const existing = existingRaw ? JSON.parse(existingRaw) : {};
            const merged = {
              ...existing,
              ...data.user,
              isAuthorized: true,
              vaultSetupTokenId: data.setupTokenId,
              paymentTokenId: data.paymentTokenId,
              authorizedAt: Date.now(),
            };
            localStorage.setItem('aegispay_user_session', JSON.stringify(merged));
            localStorage.setItem('aegispay_auth_sync', JSON.stringify({
              type: 'PAYPAL_VAULT_SUCCESS',
              data,
              timestamp: Date.now(),
            }));
          } catch {}

          // 2. BroadcastChannel to notify main window across tabs
          try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
              const ch = new BroadcastChannel('aegispay_auth_channel');
              ch.postMessage({ type: 'PAYPAL_VAULT_SUCCESS', data });
              ch.close();
            }
          } catch {}

          // 3. Post message to window.opener if accessible
          if (window.opener) {
            try {
              window.opener.postMessage(
                {
                  type: 'PAYPAL_VAULT_SUCCESS',
                  data,
                },
                '*'
              );
            } catch {}
          }

          // 4. Close this tab automatically
          try { window.close(); } catch {}
          setTimeout(() => { try { window.close(); } catch {} }, 300);
          setTimeout(() => { try { window.close(); } catch {} }, 1000);
        } else {
          setStatus('error');
          setErrorMessage(data.message || 'PayPal Sandbox verification failed.');
          try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
              const ch = new BroadcastChannel('aegispay_auth_channel');
              ch.postMessage({ type: 'PAYPAL_VAULT_ERROR', message: data.message });
              ch.close();
            }
          } catch {}
          if (window.opener) {
            try {
              window.opener.postMessage(
                {
                  type: 'PAYPAL_VAULT_ERROR',
                  message: data.message || 'PayPal Sandbox verification failed.',
                },
                '*'
              );
            } catch {}
          }
          setTimeout(() => { try { window.close(); } catch {} }, 800);
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Network error verifying PayPal session.');
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const ch = new BroadcastChannel('aegispay_auth_channel');
            ch.postMessage({ type: 'PAYPAL_VAULT_ERROR', message: err?.message });
            ch.close();
          }
        } catch {}
        if (window.opener) {
          try {
            window.opener.postMessage(
              {
                type: 'PAYPAL_VAULT_ERROR',
                message: err?.message || 'Network error verifying PayPal session.',
              },
              '*'
            );
          } catch {}
        }
        setTimeout(() => { try { window.close(); } catch {} }, 800);
      }
    }

    verify();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
          {status === 'verifying' && <Loader2 className="w-8 h-8 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
          {status === 'cancelled' && <AlertCircle className="w-8 h-8 text-amber-400" />}
          {status === 'error' && <AlertCircle className="w-8 h-8 text-rose-400" />}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">
            {status === 'verifying' && 'Verifying PayPal Sandbox Authorization...'}
            {status === 'success' && 'PayPal Sandbox Account Authorized!'}
            {status === 'cancelled' && 'Authorization Cancelled'}
            {status === 'error' && 'Authorization Failed'}
          </h2>
          <p className="text-sm text-slate-400">
            {status === 'verifying' && 'Communicating with PayPal Sandbox Vault API...'}
            {status === 'success' &&
              `Welcome back, ${userData?.name || 'PayPal Buyer'}! Your spend allowance is active.`}
            {status === 'cancelled' && 'You cancelled the PayPal authorization window.'}
            {status === 'error' && errorMessage}
          </p>
        </div>

        {status === 'success' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              Vault Setup Token Approved • Synchronized with AegisPay
            </div>
            <button
              type="button"
              onClick={() => {
                try { window.close(); } catch {}
                setTimeout(() => { router.push('/'); }, 300);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Authorization Complete • Close Tab</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            </button>
            <p className="text-xs text-slate-400">
              Your session is active in the main window. You can safely close this tab.
            </p>
          </div>
        )}

        {status === 'verifying' && (
          <div className="text-xs text-slate-500 font-mono">Please do not close this window...</div>
        )}

        {(status === 'cancelled' || status === 'error') && (
          <button
            type="button"
            onClick={() => {
              if (window.opener) window.close();
              else router.push('/');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors cursor-pointer"
          >
            Close & Return to AegisPay
          </button>
        )}
      </div>
    </div>
  );
}

export default function VaultCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="flex items-center gap-3 text-cyan-400 font-mono text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading PayPal Callback Handler...
          </div>
        </div>
      }
    >
      <VaultCallbackContent />
    </Suspense>
  );
}
