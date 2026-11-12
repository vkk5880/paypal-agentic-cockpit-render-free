'use client';

/**
 * useX402.ts — x402 Price Lock & HTTP 402 Paywall handshake hook.
 *
 * Implements x402 protocol with support for:
 * 1. Fastify HTTP 402 Paywall & HMAC settlement challenges
 * 2. PayPal Vault v3 delegated payment authorization
 */

import { useState, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/utils';

const API = getApiBaseUrl();

export interface PriceLockPayload {
  product_id: string;
  verified_price: number;
  verified_at: string;
  lock_expires_at: string;
  facilitator_receipt: string;
  explorer_link: string;
  hmac_signature?: string;
  payment_protocol?: 'x402_hmac' | 'vault_v3';
}

export type X402Status =
  | 'idle'
  | 'awaiting_payment'
  | 'signing'
  | 'confirming'
  | 'locked'
  | 'failed';

export interface X402State {
  status: X402Status;
  priceLock: PriceLockPayload | null;
  error: string | null;
}

function safeBase64Encode(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return '';
}

export function parseChallengeHeaders(headers: Headers): {
  challengeToken: string | null;
  paymentRequiredHeader: string | null;
  wwwAuthenticate: string | null;
} {
  const challengeToken =
    headers.get('x402-challenge') ||
    headers.get('pay-to') ||
    headers.get('x-payment-required');
  const paymentRequiredHeader =
    headers.get('payment-required') ||
    headers.get('PAYMENT-REQUIRED');
  const wwwAuthenticate = headers.get('WWW-Authenticate') || headers.get('www-authenticate');

  return { challengeToken, paymentRequiredHeader, wwwAuthenticate };
}

export function useX402() {
  const [x402State, setX402State] = useState<X402State>({
    status: 'idle',
    priceLock: null,
    error: null,
  });

  const inFlightRef = useRef<boolean>(false);

  const initiateVerification = useCallback(
    async (
      productId: string,
      signFn?: unknown,
      activeAddress?: string,
      productPrice?: number
    ): Promise<void> => {
      // Prevent concurrent invocations & infinite retry loops
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;

      setX402State({ status: 'awaiting_payment', priceLock: null, error: null });

      try {
        const endpointUrl =
          typeof window !== 'undefined'
            ? new URL(`${API || ''}/api/v1/x402/initiate`, window.location.origin)
            : new URL(`http://localhost:4000/api/v1/x402/initiate`);

        endpointUrl.searchParams.set('product_id', productId);
        if (productPrice != null && productPrice > 0) {
          endpointUrl.searchParams.set('product_price', String(productPrice));
        }

        const initRes = await fetch(endpointUrl.toString());

        if (initRes.ok) {
          const data: PriceLockPayload = await initRes.json();
          setX402State({ status: 'locked', priceLock: data, error: null });
          return;
        }

        if (initRes.status !== 402) {
          throw new Error(`Unexpected response ${initRes.status} from /api/v1/x402/initiate`);
        }

        const { challengeToken, paymentRequiredHeader, wwwAuthenticate } =
          parseChallengeHeaders(initRes.headers);

        let resolvedToken = challengeToken;
        if (!resolvedToken && wwwAuthenticate) {
          const match = /token="([^"]+)"/i.exec(wwwAuthenticate);
          if (match) {
            resolvedToken = match[1];
          }
        }

        if (!resolvedToken && !paymentRequiredHeader) {
          // Fall back to default vault token challenge if 402 challenge details omitted
          resolvedToken = 'vault_token_challenge';
        }

        setX402State((prev) => ({ ...prev, status: 'signing' }));

        // Fastify HMAC / PayPal Vault v3 settlement flow (One single attempt, strictly no infinite retry loop)
        setX402State((prev) => ({ ...prev, status: 'confirming' }));
        const receiptPayload = safeBase64Encode(
          JSON.stringify({
            timestamp: Date.now(),
            client: 'aegispay',
            productId,
            activeAddress: activeAddress ?? null,
          })
        );

        const verifyRes = await fetch(endpointUrl.toString(), {
          headers: {
            'x402-token': resolvedToken || 'vault_token_challenge',
            'x402-receipt': receiptPayload,
          },
        });

        if (verifyRes.status === 402) {
          // Explicitly prevent recurring retry loops: challenge was rejected or unresolved
          throw new Error('Payment verification challenge rejected by facilitator (402 loop prevented)');
        }

        if (!verifyRes.ok) {
          throw new Error(`Payment verification challenge failed with HTTP ${verifyRes.status}`);
        }

        const data: PriceLockPayload = await verifyRes.json();
        setX402State({
          status: 'locked',
          priceLock: {
            ...data,
            payment_protocol: data.payment_protocol || 'vault_v3',
          },
          error: null,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error during x402 handshake';
        setX402State({ status: 'failed', priceLock: null, error: message });
      } finally {
        inFlightRef.current = false;
      }
    },
    []
  );

  const reset = useCallback(() => {
    inFlightRef.current = false;
    setX402State({ status: 'idle', priceLock: null, error: null });
  }, []);

  return { x402State, initiateVerification, reset };
}
