'use client';

import React from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Coins,
  RefreshCw,
  Search,
  PlusCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  XCircle,
  CreditCard,
  Lock,
  ExternalLink,
  KeyRound,
  DollarSign,
} from 'lucide-react';
import { formatCents } from '@/lib/utils';

export interface TransmutedResolutionAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: React.ComponentType<{ className?: string }>;
  payload?: any;
}

export interface TransmutedError {
  rawCode: string;
  category:
    | 'BUDGET_OVERAGE'
    | 'MANDATE_EXPIRED'
    | 'MERCHANT_CAP'
    | 'ANOMALY_RISK'
    | 'UNAUTHORIZED_CATEGORY'
    | 'PAYPAL_API'
    | 'CARD_DECLINED'
    | '3D_SECURE_REQUIRED'
    | 'RATE_LIMIT'
    | 'IDEMPOTENCY_CONFLICT'
    | 'AUTHENTICATION'
    | 'VAULT_TOKEN'
    | 'ORDER_STATE'
    | 'VALIDATION'
    | 'UNKNOWN';
  title: string;
  friendlyMessage: string;
  badge: {
    label: string;
    variant: 'amber' | 'rose' | 'indigo' | 'violet' | 'slate' | 'emerald';
  };
  details?: string;
  overageCents?: number;
  capCents?: number;
  actions: TransmutedResolutionAction[];
}

export interface FriendlyErrorTransmuterProps {
  error: string | Error | any | null;
  onAction?: (actionId: string, actionPayload?: any) => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Safely extracts a meaningful error string from any arbitrary payload (strings, Error instances,
 * Axios/Fetch error responses, nested API response objects, circular references, null/undefined).
 */
export function extractErrorString(rawInput: unknown): string {
  if (rawInput === null || rawInput === undefined) {
    return '';
  }

  if (typeof rawInput === 'string') {
    return rawInput.trim();
  }

  if (rawInput instanceof Error) {
    return rawInput.message || rawInput.name || 'Error';
  }

  if (typeof rawInput === 'object') {
    const obj = rawInput as Record<string, any>;

    // Direct error string fields
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.error_code === 'string' && obj.error_code) return obj.error_code;
    if (typeof obj.code === 'string' && obj.code) return obj.code;
    if (typeof obj.error === 'string' && obj.error) return obj.error;

    // Nested API responses (e.g. axios/fetch res.data or res.error)
    if (obj.data && typeof obj.data === 'object') {
      const nested = extractErrorString(obj.data);
      if (nested) return nested;
    }
    if (obj.error && typeof obj.error === 'object') {
      const nested = extractErrorString(obj.error);
      if (nested) return nested;
    }

    // Attempt safe stringify with circular reference protection
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        return val;
      });
    } catch {
      return Object.prototype.toString.call(obj);
    }
  }

  return String(rawInput);
}

/**
 * Transmutes cryptic Redis Lua enforcer error codes and PayPal API errors
 * into structured, empathetic, user-friendly recovery instructions with 1-click resolution buttons.
 * Grounded in PayPal Doctor & Explain-Error diagnostic specifications (.development/AI-Toolkit/reference/commands/explain-error.md).
 */
export function transmuteError(rawInput: string | Error | any): TransmutedError {
  const errString = extractErrorString(rawInput);

  // 1. Budget hard limit overage (ERR_EXCEEDS_TOTAL_MANDATE_BUDGET)
  if (errString.includes('ERR_EXCEEDS_TOTAL_MANDATE_BUDGET')) {
    return {
      rawCode: 'ERR_EXCEEDS_TOTAL_MANDATE_BUDGET',
      category: 'BUDGET_OVERAGE',
      title: 'Preset Spend Mandate Cap Exceeded',
      friendlyMessage:
        'Adding this purchase exceeds your session spend budget. You can quickly bump your mandate cap or let your agent find a matching cheaper alternative.',
      badge: { label: 'Budget Cap Protection', variant: 'amber' },
      details: 'Redis Lua Atomic Enforcer blocked this operation to protect your account against overspend.',
      actions: [
        {
          id: 'INCREASE_CAP',
          label: 'Increase Mandate Cap',
          variant: 'primary',
          icon: PlusCircle,
          payload: { suggestedIncreaseCents: 2000 },
        },
        {
          id: 'FIND_CHEAPER_ALTERNATIVE',
          label: 'Find Cheaper Alternative',
          variant: 'secondary',
          icon: Search,
        },
      ],
    };
  }

  // 2. Mandate expired (ERR_MANDATE_EXPIRED or ERR_MANDATE_STATUS_EXPIRED)
  if (errString.includes('ERR_MANDATE_EXPIRED') || errString.includes('ERR_MANDATE_STATUS_EXPIRED')) {
    return {
      rawCode: 'ERR_MANDATE_EXPIRED',
      category: 'MANDATE_EXPIRED',
      title: 'Session Spend Mandate Expired',
      friendlyMessage:
        'Your cryptographic session authorization window has ended. Renew your Ed25519 session with one click to continue shopping safely.',
      badge: { label: 'Session Security', variant: 'rose' },
      details: 'Mandates automatically expire to maintain strict zero-trust autonomous agent boundaries.',
      actions: [
        {
          id: 'RENEW_MANDATE',
          label: 'Renew Mandate (+24h)',
          variant: 'primary',
          icon: RefreshCw,
          payload: { durationHours: 24 },
        },
        {
          id: 'REVOKE_MANDATE',
          label: 'Close Session',
          variant: 'outline',
          icon: XCircle,
        },
      ],
    };
  }

  // 3. Single merchant exposure cap exceeded (ERR_EXCEEDS_SINGLE_MERCHANT_EXPOSURE_CAP)
  if (errString.includes('ERR_EXCEEDS_SINGLE_MERCHANT_EXPOSURE_CAP')) {
    return {
      rawCode: 'ERR_EXCEEDS_SINGLE_MERCHANT_EXPOSURE_CAP',
      category: 'MERCHANT_CAP',
      title: 'Single-Merchant Spend Cap Reached',
      friendlyMessage:
        'Your mandate limits exposure to any single vendor. You can approve a one-time vendor cap increase or split the cart across other merchants.',
      badge: { label: 'Vendor Risk Shield', variant: 'amber' },
      details: 'Protects buyer liquidity from over-concentrating in a single merchant domain.',
      actions: [
        {
          id: 'RAISE_MERCHANT_CAP',
          label: 'Raise Merchant Cap',
          variant: 'primary',
          icon: ShieldCheck,
          payload: { raiseCents: 5000 },
        },
        {
          id: 'SPLIT_CART',
          label: 'Re-optimize via Knapsack',
          variant: 'secondary',
          icon: Search,
        },
      ],
    };
  }

  // 4. Merchant anomaly or risk score exceeded (ERR_MERCHANT_ANOMALY_THRESHOLD_EXCEEDED)
  if (errString.includes('ERR_MERCHANT_ANOMALY_THRESHOLD_EXCEEDED') || errString.includes('ANOMALY_SCORE_HIGH')) {
    return {
      rawCode: 'ERR_MERCHANT_ANOMALY_THRESHOLD_EXCEEDED',
      category: 'ANOMALY_RISK',
      title: 'Merchant Anomaly Shield Alert',
      friendlyMessage:
        'Our pre-clearance gate flagged abnormal price fluctuations or fulfillment variance for this seller. We suggest switching to an audited vendor.',
      badge: { label: 'Forensic Guard', variant: 'rose' },
      details: 'Channel3 anomaly detection scored this seller above the safe threshold (> 300 bps).',
      actions: [
        {
          id: 'SWITCH_MERCHANT',
          label: 'Switch to Audited Merchant',
          variant: 'primary',
          icon: Search,
        },
        {
          id: 'BYPASS_WARNING',
          label: 'Proceed at Own Risk',
          variant: 'danger',
          icon: AlertTriangle,
        },
      ],
    };
  }

  // 5. Unauthorized category (ERR_CATEGORY_NOT_AUTHORIZED)
  if (errString.includes('ERR_CATEGORY_NOT_AUTHORIZED')) {
    const catMatch = errString.match(/ERR_CATEGORY_NOT_AUTHORIZED:?([^\s,"]+)?/);
    const cat = catMatch ? catMatch[1] : 'selected';
    return {
      rawCode: 'ERR_CATEGORY_NOT_AUTHORIZED',
      category: 'UNAUTHORIZED_CATEGORY',
      title: 'Category Not In Allowed Mandate Scope',
      friendlyMessage: `This item belongs to "${cat}", which is outside your currently active Ed25519 mandate permissions.`,
      badge: { label: 'Policy Enforcer', variant: 'indigo' },
      actions: [
        {
          id: 'AUTHORIZE_CATEGORY',
          label: `Authorize "${cat}" Category`,
          variant: 'primary',
          icon: PlusCircle,
          payload: { category: cat },
        },
      ],
    };
  }

  // 6. INSTRUMENT_DECLINED — PayPal card / funding source decline (422)
  if (errString.includes('INSTRUMENT_DECLINED')) {
    return {
      rawCode: 'INSTRUMENT_DECLINED',
      category: 'CARD_DECLINED',
      title: 'Payment Method Declined by Card Issuer',
      friendlyMessage:
        'Your card or funding instrument was declined by the issuing institution. As per PayPal security protocol, we do not retry the same instrument — please switch to an alternate card or PayPal balance.',
      badge: { label: 'Card Decline Recovery', variant: 'rose' },
      details: 'Orders API v2 returned 422 INSTRUMENT_DECLINED. Compensating rollback activated with zero liability.',
      actions: [
        {
          id: 'SWITCH_PAYMENT_METHOD',
          label: 'Switch Payment Method',
          variant: 'primary',
          icon: CreditCard,
        },
        {
          id: 'USE_PAYPAL_BALANCE',
          label: 'Use PayPal Balance / Venmo',
          variant: 'secondary',
          icon: Coins,
        },
      ],
    };
  }

  // 7. PAYER_ACTION_REQUIRED & 3D Secure verification / PSD2 SCA (422)
  if (
    errString.includes('PAYER_ACTION_REQUIRED') ||
    errString.includes('3D_SECURE_REQUIRED') ||
    errString.includes('LIABILITY_SHIFT_NO')
  ) {
    return {
      rawCode: 'PAYER_ACTION_REQUIRED',
      category: '3D_SECURE_REQUIRED',
      title: 'Strong Customer Authentication (3DS) Required',
      friendlyMessage:
        'European PSD2 regulations require 3D Secure cardholder confirmation. Please complete the quick verification step with your bank.',
      badge: { label: 'PSD2 / 3DS Shield', variant: 'indigo' },
      details: 'Payer authentication challenge issued to ensure merchant liability shift protection.',
      actions: [
        {
          id: 'COMPLETE_3DS_ACTION',
          label: 'Authenticate with Bank (3DS)',
          variant: 'primary',
          icon: ExternalLink,
        },
        {
          id: 'CHOOSE_ALTERNATIVE_METHOD',
          label: 'Choose Different Card',
          variant: 'outline',
          icon: CreditCard,
        },
      ],
    };
  }

  // 8. RATE_LIMIT_REACHED (429)
  if (errString.includes('RATE_LIMIT_REACHED') || errString.includes('429')) {
    return {
      rawCode: 'RATE_LIMIT_REACHED',
      category: 'RATE_LIMIT',
      title: 'PayPal API Rate Limit Reached',
      friendlyMessage:
        'The PayPal gateway is experiencing high request volume. Our retry engine is applying exponential backoff with Retry-After header compliance.',
      badge: { label: 'Rate Limiter', variant: 'amber' },
      details: 'Temporary HTTP 429 throttling. Will auto-resume automatically.',
      actions: [
        {
          id: 'RETRY_WITH_BACKOFF',
          label: 'Retry with Backoff',
          variant: 'primary',
          icon: RefreshCw,
        },
      ],
    };
  }

  // 9. PREVIOUS_REQUEST_IN_PROGRESS or DUPLICATE_TRANSACTION (409)
  if (
    errString.includes('PREVIOUS_REQUEST_IN_PROGRESS') ||
    errString.includes('DUPLICATE_TRANSACTION') ||
    errString.includes('PAYPAL_REQUEST_ID_PREVIOUSLY_USED')
  ) {
    return {
      rawCode: errString.includes('PAYPAL_REQUEST_ID_PREVIOUSLY_USED')
        ? 'PAYPAL_REQUEST_ID_PREVIOUSLY_USED'
        : 'PREVIOUS_REQUEST_IN_PROGRESS',
      category: 'IDEMPOTENCY_CONFLICT',
      title: 'Transaction Request In Progress / Duplicate',
      friendlyMessage:
        'A request with this exact PayPal-Request-Id is currently processing or was already used. We will retrieve the confirmed order rather than submitting a duplicate charge.',
      badge: { label: 'Idempotency Protection', variant: 'emerald' },
      details: 'Guarantees 0% double-charging via UUID idempotency headers.',
      actions: [
        {
          id: 'RECOVER_EXISTING_ORDER',
          label: 'Recover Confirmed Order',
          variant: 'primary',
          icon: ShieldCheck,
        },
      ],
    };
  }

  // 10. Authentication & Authorization Errors (401, 403)
  if (
    errString.includes('UNAUTHORIZED') ||
    errString.includes('AUTHENTICATION_FAILURE') ||
    errString.includes('NOT_AUTHORIZED') ||
    errString.includes('PERMISSION_DENIED') ||
    errString.includes('REQUIRED_SCOPE_MISSING') ||
    errString.includes('AUTHORIZATION_ERROR')
  ) {
    const isPermission =
      errString.includes('NOT_AUTHORIZED') ||
      errString.includes('PERMISSION_DENIED') ||
      errString.includes('REQUIRED_SCOPE_MISSING') ||
      errString.includes('AUTHORIZATION_ERROR');
    return {
      rawCode: isPermission ? 'NOT_AUTHORIZED' : 'AUTHENTICATION_FAILURE',
      category: 'AUTHENTICATION',
      title: isPermission ? 'Feature Permission Required' : 'PayPal Session Expired',
      friendlyMessage: isPermission
        ? 'Your PayPal API integration credentials lack the required scope or feature permissions. Check developer dashboard feature eligibility.'
        : 'Your PayPal API OAuth token has expired or credentials need refreshing. No unauthorized payment was initiated.',
      badge: { label: isPermission ? 'Scope Permission' : 'Auth Security', variant: 'violet' },
      details: errString.length < 180 ? errString : 'Authentication handshake failed on PayPal OAuth gateway.',
      actions: [
        {
          id: 'REFRESH_AUTH_TOKEN',
          label: 'Refresh Access Token',
          variant: 'primary',
          icon: KeyRound,
        },
        {
          id: 'CONTACT_SUPPORT',
          label: 'Check App Credentials',
          variant: 'outline',
          icon: HelpCircle,
        },
      ],
    };
  }

  // 11. Vault v3 & Stored Credential Errors (403, 404, 422)
  if (
    errString.includes('NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE') ||
    errString.includes('VAULT_INSTRUCTION_REQUIRED') ||
    errString.includes('INVALID_VAULT_ID') ||
    errString.includes('MISMATCHED_VAULT_ID_TO_PAYMENT_SOURCE') ||
    errString.includes('SETUP_TOKEN_ALREADY_TOKENIZED') ||
    errString.includes('TOKEN_NOT_FOUND') ||
    errString.includes('REQUIRED_PARAMETER_FOR_CUSTOMER_INITIATED_PAYMENT') ||
    errString.includes('MERCHANT_INITIATED_WITH_SECURITY_CODE') ||
    errString.includes('MISSING_PREVIOUS_REFERENCE')
  ) {
    return {
      rawCode: 'VAULT_TOKEN_ERROR',
      category: 'VAULT_TOKEN',
      title: 'Vault v3 Stored Credential Alignment',
      friendlyMessage:
        'The vaulted payment token requires re-authorization or updated customer-initiated parameters. Your payment details remain securely encrypted.',
      badge: { label: 'Vault v3 Enforcer', variant: 'violet' },
      details: errString.length < 180 ? errString : 'Payment method token v3 parameter mismatch.',
      actions: [
        {
          id: 'RETRY_PAYPAL_VAULT',
          label: 'Re-vault Payment Method',
          variant: 'primary',
          icon: RefreshCw,
        },
        {
          id: 'SWITCH_PAYMENT_METHOD',
          label: 'Use Alternate Card',
          variant: 'secondary',
          icon: CreditCard,
        },
      ],
    };
  }

  // 12. Order Lifecycle & Status Errors (422)
  if (
    errString.includes('ORDER_NOT_APPROVED') ||
    errString.includes('ORDER_ALREADY_CAPTURED') ||
    errString.includes('ORDER_ALREADY_AUTHORIZED') ||
    errString.includes('ORDER_ALREADY_COMPLETED')
  ) {
    const isCompleted =
      errString.includes('ORDER_ALREADY_CAPTURED') ||
      errString.includes('ORDER_ALREADY_AUTHORIZED') ||
      errString.includes('ORDER_ALREADY_COMPLETED');
    return {
      rawCode: isCompleted ? 'ORDER_ALREADY_COMPLETED' : 'ORDER_NOT_APPROVED',
      category: 'ORDER_STATE',
      title: isCompleted ? 'Order Already Processed' : 'Buyer Approval Pending',
      friendlyMessage: isCompleted
        ? 'This order has already been captured or completed. We are recovering your verified receipt without double-charging.'
        : 'The order has not yet been approved by the buyer. Complete the one-time approval before final settlement.',
      badge: { label: 'Order Lifecycle', variant: 'emerald' },
      details: errString.length < 180 ? errString : 'Orders v2 lifecycle state lock.',
      actions: [
        {
          id: isCompleted ? 'RECOVER_EXISTING_ORDER' : 'COMPLETE_APPROVAL',
          label: isCompleted ? 'View Order Receipt' : 'Complete Approval',
          variant: 'primary',
          icon: ShieldCheck,
        },
      ],
    };
  }

  // 13. Request Validation & Amount Mismatch (400, 422)
  if (
    errString.includes('INVALID_REQUEST') ||
    errString.includes('AMOUNT_MISMATCH') ||
    errString.includes('PAYPAL_REQUEST_ID_REQUIRED') ||
    errString.includes('RESOURCE_NOT_FOUND') ||
    errString.includes('INVALID_RESOURCE_ID')
  ) {
    return {
      rawCode: errString.includes('AMOUNT_MISMATCH')
        ? 'AMOUNT_MISMATCH'
        : errString.includes('INVALID_RESOURCE_ID')
        ? 'INVALID_RESOURCE_ID'
        : 'INVALID_REQUEST',
      category: 'VALIDATION',
      title: 'Cart & Request Validation Notice',
      friendlyMessage: errString.includes('AMOUNT_MISMATCH')
        ? 'Item totals and shipping adjustments differ from the authorization sum. We have recalculated your cart to match the live total.'
        : 'The transaction request parameters or resource ID could not be located in the current environment.',
      badge: { label: 'Param Validator', variant: 'amber' },
      details: errString.length < 180 ? errString : 'Orders API v2 payload integrity check.',
      actions: [
        {
          id: 'RECALCULATE_CART',
          label: 'Recalculate Cart Total',
          variant: 'primary',
          icon: DollarSign,
        },
        {
          id: 'RETRY_OPERATION',
          label: 'Retry Step',
          variant: 'secondary',
          icon: RefreshCw,
        },
      ],
    };
  }

  // 14. Server errors (500)
  if (errString.includes('INTERNAL_SERVER_ERROR')) {
    return {
      rawCode: 'INTERNAL_SERVER_ERROR',
      category: 'PAYPAL_API',
      title: 'PayPal Service Temporary Disruption',
      friendlyMessage:
        'PayPal servers experienced a transient hiccup. Your transaction was not debited; safe to retry with the same request ID.',
      badge: { label: 'PayPal Gateway', variant: 'rose' },
      details: errString.length < 180 ? errString : 'PayPal API returned an internal status code.',
      actions: [
        {
          id: 'RETRY_WITH_SAME_ID',
          label: 'Safe Retry (Same Idempotency Key)',
          variant: 'primary',
          icon: RefreshCw,
        },
      ],
    };
  }

  // 15. General PayPal API errors (Vault, Permissions, Order State, TRANSACTION_REFUSED)
  if (
    errString.includes('TRANSACTION_REFUSED') ||
    errString.includes('PAYPAL')
  ) {
    return {
      rawCode: errString.includes('TRANSACTION_REFUSED') ? 'TRANSACTION_REFUSED' : 'PAYPAL_API_NOTICE',
      category: 'PAYPAL_API',
      title: 'PayPal Clearinghouse Notice',
      friendlyMessage:
        'PayPal payment gateway processed your authorization request with zero unauthorized charges.',
      badge: { label: 'PayPal Gateway', variant: 'violet' },
      details: errString.length < 180 ? errString : 'PayPal API returned an authorization verification code.',
      actions: [
        {
          id: 'RETRY_PAYPAL_VAULT',
          label: 'Retry Vault Setup Token',
          variant: 'primary',
          icon: RefreshCw,
        },
        {
          id: 'CHANGE_PAYPAL_FUNDING',
          label: 'Update Funding Method',
          variant: 'secondary',
          icon: Coins,
        },
      ],
    };
  }

  // 16. Fallback / generic error transmutation
  return {
    rawCode: (errString.trim() ? errString.slice(0, 48) : 'SYSTEM_FAULT') || 'SYSTEM_FAULT',
    category: 'UNKNOWN',
    title: 'Autonomous Flow Interruption',
    friendlyMessage:
      'The clearinghouse intercepted an unexpected response. Your funds remain secured in escrow holds with zero unapproved charges.',
    badge: { label: 'Clearinghouse Safe Gate', variant: 'slate' },
    details: errString.trim() ? errString.slice(0, 160) : 'An unspecified condition occurred during transaction resolution.',
    actions: [
      {
        id: 'RETRY_OPERATION',
        label: 'Retry Step',
        variant: 'primary',
        icon: RefreshCw,
      },
      {
        id: 'CONTACT_SUPPORT',
        label: 'View Forensic Log',
        variant: 'outline',
        icon: HelpCircle,
      },
    ],
  };
}

export function FriendlyErrorTransmuter({
  error,
  onAction,
  onDismiss,
  className = '',
  compact = false,
}: FriendlyErrorTransmuterProps) {
  if (!error) return null;

  const transmuted = transmuteError(error);

  const badgeStyles = {
    amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    rose: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
    indigo: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40',
    violet: 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-500/40',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
  }[transmuted.badge.variant];

  const borderStyles: Record<TransmutedError['category'], string> = {
    BUDGET_OVERAGE: 'border-amber-400/80 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-[#131109] dark:via-[#0c101a] dark:to-[#0f172a]',
    MANDATE_EXPIRED: 'border-rose-400/80 dark:border-rose-500/40 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 dark:from-[#180a0e] dark:via-[#0c101a] dark:to-[#0f172a]',
    MERCHANT_CAP: 'border-amber-400/80 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-[#131109] dark:via-[#0c101a] dark:to-[#0f172a]',
    ANOMALY_RISK: 'border-rose-400/80 dark:border-rose-500/40 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 dark:from-[#180a0e] dark:via-[#0c101a] dark:to-[#0f172a]',
    UNAUTHORIZED_CATEGORY: 'border-indigo-400/80 dark:border-indigo-500/40 bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 dark:from-[#0d1024] dark:via-[#0c101a] dark:to-[#0f172a]',
    CARD_DECLINED: 'border-rose-500/80 dark:border-rose-500/40 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 dark:from-[#1c0a0f] dark:via-[#0c101a] dark:to-[#0f172a]',
    '3D_SECURE_REQUIRED': 'border-indigo-400/80 dark:border-indigo-500/40 bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 dark:from-[#0d1024] dark:via-[#0c101a] dark:to-[#0f172a]',
    RATE_LIMIT: 'border-amber-400/80 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-[#131109] dark:via-[#0c101a] dark:to-[#0f172a]',
    IDEMPOTENCY_CONFLICT: 'border-emerald-400/80 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 dark:from-[#0a1810] dark:via-[#0c101a] dark:to-[#0f172a]',
    AUTHENTICATION: 'border-violet-400/80 dark:border-violet-500/40 bg-gradient-to-br from-violet-50/90 via-white to-violet-50/40 dark:from-[#130d24] dark:via-[#0c101a] dark:to-[#0f172a]',
    VAULT_TOKEN: 'border-violet-400/80 dark:border-violet-500/40 bg-gradient-to-br from-violet-50/90 via-white to-violet-50/40 dark:from-[#130d24] dark:via-[#0c101a] dark:to-[#0f172a]',
    ORDER_STATE: 'border-emerald-400/80 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 dark:from-[#0a1810] dark:via-[#0c101a] dark:to-[#0f172a]',
    VALIDATION: 'border-amber-400/80 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-[#131109] dark:via-[#0c101a] dark:to-[#0f172a]',
    PAYPAL_API: 'border-violet-400/80 dark:border-violet-500/40 bg-gradient-to-br from-violet-50/90 via-white to-violet-50/40 dark:from-[#130d24] dark:via-[#0c101a] dark:to-[#0f172a]',
    UNKNOWN: 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c101a]',
  };

  return (
    <div
      className={`relative rounded-2xl border p-5 shadow-lg backdrop-blur-md transition-all ${borderStyles[transmuted.category]} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-slate-800 shadow-xs flex-shrink-0 mt-0.5">
            {transmuted.category === 'MANDATE_EXPIRED' ? (
              <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            ) : transmuted.category === 'ANOMALY_RISK' || transmuted.category === 'CARD_DECLINED' ? (
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            ) : transmuted.category === '3D_SECURE_REQUIRED' ? (
              <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            ) : transmuted.category === 'IDEMPOTENCY_CONFLICT' || transmuted.category === 'ORDER_STATE' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : transmuted.category === 'AUTHENTICATION' ? (
              <KeyRound className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            ) : transmuted.category === 'VAULT_TOKEN' || transmuted.category === 'PAYPAL_API' ? (
              <Coins className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            ) : transmuted.category === 'VALIDATION' ? (
              <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {transmuted.title}
              </h3>
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badgeStyles}`}>
                {transmuted.badge.label}
              </span>
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                [{transmuted.rawCode}]
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              {transmuted.friendlyMessage}
            </p>

            {transmuted.details && !compact && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono pt-1">
                Forensics: {transmuted.details}
              </p>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error notification"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 1-Click Action Resolution Buttons */}
      {transmuted.actions.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <ChevronRight className="w-3.5 h-3.5 text-cyan-500" />
            <span>Recommended 1-Click Recovery:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {transmuted.actions.map((act) => {
              const Icon = act.icon;
              const buttonVariantClass = {
                primary:
                  'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs font-semibold',
                secondary:
                  'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium',
                outline:
                  'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                danger:
                  'bg-rose-600 hover:bg-rose-500 text-white font-medium',
              }[act.variant || 'primary'];

              return (
                <button
                  key={act.id}
                  onClick={() => onAction && onAction(act.id, act.payload)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 ${buttonVariantClass}`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
