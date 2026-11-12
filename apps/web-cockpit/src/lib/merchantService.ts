import { apiLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';

export interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

export function getPayPalBaseUrl(): string {
  const env = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
  return env === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

export function getPayPalCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  };
}

/**
 * Normalizes input category to valid PayPal Catalogs API v1 category values.
 * PayPal strictly enforces category enums (e.g. SOFTWARE, SERVICES, CLOTHING, ACCESSORIES,
 * BOOKS_PERIODICALS_AND_NEWSPAPERS) and rejects invalid values like ELECTRONICS with INVALID_PARAMETER_VALUE.
 */
export function normalizeCatalogCategory(categoryInput?: string): string {
  if (!categoryInput) return 'SOFTWARE';
  const clean = categoryInput.trim().toUpperCase().replace(/[-_\s]+/g, '_');
  if (clean.includes('ACCESSOR')) return 'ACCESSORIES';
  if (clean.includes('CLOTH') || clean.includes('APPAREL') || clean.includes('SHOE')) return 'CLOTHING';
  if (clean.includes('BOOK') || clean.includes('MEDIA')) return 'BOOKS_PERIODICALS_AND_NEWSPAPERS';
  if (clean.includes('SERV')) return 'SERVICES';
  if (
    clean.includes('SOFT') ||
    clean.includes('APP') ||
    clean.includes('DIGIT') ||
    clean.includes('ELECTR') ||
    clean.includes('HARDWARE') ||
    clean.includes('COMP') ||
    clean.includes('TECH')
  ) {
    return 'SOFTWARE';
  }
  return 'SOFTWARE';
}

/**
 * Obtains or reuses a cached PayPal OAuth2 Access Token
 */
export async function getPayPalAccessToken(forceRefresh = false): Promise<string | null> {
  const now = Date.now();
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = getPayPalCredentials();
  if (!clientId || !clientSecret || clientId === 'your_paypal_client_id_here') {
    logger.warn('[MerchantService] PayPal credentials not configured or set to placeholder');
    return null;
  }

  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    try {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!res.ok) {
        const text = await res.text();
        logger.error('[MerchantService] Failed to fetch PayPal OAuth2 token', { status: res.status, text });
        return null;
      }

      const data = await res.json();
      if (!data?.access_token) return null;

      const ttl = (data.expires_in || 900) * 1000;
      tokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + ttl,
      };
      return data.access_token;
    } catch (err: any) {
      logger.error('[MerchantService] Exception during PayPal OAuth2 exchange', { error: err?.message });
      return null;
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

/**
 * Baseline products to ensure merchant catalog is never empty
 */
export const BASELINE_PRODUCTS = [
  {
    id: 'PROD-1RK951698G724400Y',
    name: 'Channel3 Edge-AI Vision Coprocessor Kit',
    type: 'PHYSICAL',
    category: 'SOFTWARE',
    description: 'Industrial vision inspection sensor with cryptographic ground-truth verification.',
    create_time: new Date().toISOString(),
    price_cents: 11900,
    allow_synthetic_intent: true,
    max_discount_percentage: 10,
    recent_bids_distribution: [12, 18, 25, 42, 38, 55, 60],
  },
  {
    id: 'PROD-AEGIS-ESCROW-HUB',
    name: 'Hardware Secure Enclave Dongle',
    type: 'PHYSICAL',
    category: 'ACCESSORIES',
    description: 'Ed25519 cryptographic spend mandate hardware security key for agentic escrow.',
    create_time: new Date(Date.now() - 86400000).toISOString(),
    price_cents: 8900,
    allow_synthetic_intent: true,
    max_discount_percentage: 15,
    recent_bids_distribution: [8, 14, 19, 22, 28, 30, 35],
  },
  {
    id: 'PROD-AEGIS-ARBITER-LICENSE',
    name: 'Dual-Sided Merchant Dispute Arbiter Enterprise',
    type: 'DIGITAL',
    category: 'SOFTWARE',
    description: 'Automated 12-action multimodal return inspection and HATEOAS dispute defense system.',
    create_time: new Date(Date.now() - 2 * 86400000).toISOString(),
    price_cents: 29900,
    allow_synthetic_intent: false,
    max_discount_percentage: 0,
    recent_bids_distribution: [5, 7, 10, 15, 12, 18, 20],
  },
  {
    id: 'PROD-AEGIS-SLA-SUBSCRIPTION',
    name: 'Continuous Telemetry & SLA Protection Subscription',
    type: 'SERVICE',
    category: 'SERVICES',
    description: 'Real-time PayPal webhook monitoring, carrier tracking, and SLA countdown alerts.',
    create_time: new Date(Date.now() - 3 * 86400000).toISOString(),
    price_cents: 4900,
    allow_synthetic_intent: true,
    max_discount_percentage: 5,
    recent_bids_distribution: [20, 25, 30, 45, 50, 65, 80],
  },
];

/**
 * Baseline billing plans to ensure subscription view is rich
 */
export const BASELINE_PLANS = [
  {
    id: 'P-0BY9096604087731GNL2TQZA',
    product_id: 'PROD-1RK951698G724400Y',
    name: 'Channel3 Edge-AI Monthly Telemetry',
    status: 'ACTIVE',
    create_time: new Date().toISOString(),
    billing_cycles: [
      {
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 12,
        pricing_scheme: { fixed_price: { value: '49.00', currency_code: 'USD' } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: '0.00', currency_code: 'USD' },
      payment_failure_threshold: 3,
    },
  },
  {
    id: 'P-AEGIS-ANNUAL-ENTERPRISE',
    product_id: 'PROD-AEGIS-ARBITER-LICENSE',
    name: 'AegisPay Enterprise Dispute Shield (Annual)',
    status: 'ACTIVE',
    create_time: new Date(Date.now() - 7 * 86400000).toISOString(),
    billing_cycles: [
      {
        frequency: { interval_unit: 'YEAR', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 5,
        pricing_scheme: { fixed_price: { value: '499.00', currency_code: 'USD' } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: '0.00', currency_code: 'USD' },
      payment_failure_threshold: 3,
    },
  },
];

/**
 * Baseline commercial invoices
 */
export const BASELINE_INVOICES = [
  {
    id: 'INV2-J86V-TY8H-GYV5-N6TK',
    number: 'INV-AEGIS-MWD0L1Q8',
    status: 'SENT',
    recipient: 'Enterprise Client Inc.',
    email: 'client@enterprise.example.com',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    total: 238.0,
    paid: 0.0,
    due: 238.0,
    lineItems: 2,
    currency: 'USD',
  },
  {
    id: 'INV2-K92X-LQ4P-MN89-A1B2',
    number: 'INV-AEGIS-782199',
    status: 'PAID',
    recipient: 'Nordic Workspaces Ltd',
    email: 'billing@nordic-workspaces.io',
    invoiceDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 16 * 86400000).toISOString().split('T')[0],
    total: 890.0,
    paid: 890.0,
    due: 0.0,
    lineItems: 4,
    currency: 'USD',
  },
  {
    id: 'INV2-R44Z-TY78-BC12-OP99',
    number: 'INV-AEGIS-554210',
    status: 'SENT',
    recipient: 'Audio Gear Direct Co',
    email: 'procurement@audio-gear-direct.com',
    invoiceDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
    total: 1250.0,
    paid: 500.0,
    due: 750.0,
    lineItems: 3,
    currency: 'USD',
  },
];

/**
 * Baseline balances for PayPal Sandbox
 */
export const BASELINE_BALANCES = {
  as_of_time: new Date().toISOString(),
  balances: [
    {
      currency: 'USD',
      total: 15000.0,
      available: 12500.0,
      withheld: 2500.0,
      history_30d: [11000, 11400, 11800, 12100, 12500],
    },
    {
      currency: 'EUR',
      total: 5000.0,
      available: 4250.0,
      withheld: 750.0,
      history_30d: [3800, 3950, 4100, 4200, 4250],
    },
    {
      currency: 'GBP',
      total: 3200.0,
      available: 2800.0,
      withheld: 400.0,
      history_30d: [2400, 2550, 2650, 2750, 2800],
    },
  ],
};

/**
 * Baseline transactions with real PayPal structures, fees, and tracking
 */
export const BASELINE_TRANSACTIONS = [
  {
    id: 'TXN-984421001-PP',
    date: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'S',
    gross_amount: 119.0,
    amount: 119.0,
    paypal_fee: 3.75,
    fee: 3.75,
    channel3_rebate: 14.28,
    endingBalance: 12500.0,
    currency: 'USD',
    counterparty: 'sb-buyer@personal.example.com',
    subject: 'Channel3 Edge-AI Coprocessor Kit (Instant Capture)',
    carrier: 'USPS',
    tracking_number: '9400111899220011223344',
    delivery_status: 'IN_TRANSIT',
    postal_code: '94016',
    liability_score_l: 0.12,
    abuse_risk_score_r: 0.08,
    hateoasAllowedActions: ['track', 'refund'],
  },
  {
    id: 'TXN-984419822-PP',
    date: new Date(Date.now() - 24 * 3600000).toISOString(),
    status: 'S',
    gross_amount: 238.0,
    amount: 238.0,
    paypal_fee: 7.2,
    fee: 7.2,
    channel3_rebate: 28.56,
    endingBalance: 12384.75,
    currency: 'USD',
    counterparty: 'client@enterprise.example.com',
    subject: 'Commercial Invoice INV-AEGIS-MWD0L1Q8 Settlement',
    carrier: 'UPS',
    tracking_number: '1Z9999999999999999',
    delivery_status: 'DELIVERED',
    postal_code: '10001',
    liability_score_l: 0.05,
    abuse_risk_score_r: 0.04,
    hateoasAllowedActions: ['view-receipt'],
  },
  {
    id: 'TXN-984390118-PP',
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: 'S',
    gross_amount: 49.0,
    amount: 49.0,
    paypal_fee: 1.72,
    fee: 1.72,
    channel3_rebate: 0.0,
    endingBalance: 12153.95,
    currency: 'USD',
    counterparty: 'subscriber@techcorp.example.com',
    subject: 'PayPal Subscriptions: Telemetry Plan P-0BY9096604087731GNL2TQZA',
    carrier: 'DIGITAL',
    tracking_number: 'DIGITAL-DELIVERY',
    delivery_status: 'DELIVERED',
    postal_code: '00000',
    liability_score_l: 0.0,
    abuse_risk_score_r: 0.02,
    hateoasAllowedActions: ['view-subscription'],
  },
  {
    id: 'TXN-984322441-PP',
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    status: 'S',
    gross_amount: 149.0,
    amount: 149.0,
    paypal_fee: 4.62,
    fee: 4.62,
    channel3_rebate: 17.88,
    endingBalance: 12106.67,
    currency: 'USD',
    counterparty: 'buyer-claimant@personal.example.com',
    subject: 'Vault Pre-Authorized Knapsack Split Capture',
    carrier: 'FEDEX',
    tracking_number: '789056685766',
    delivery_status: 'DELIVERED',
    postal_code: '90210',
    liability_score_l: 0.18,
    abuse_risk_score_r: 0.82,
    hateoasAllowedActions: ['provide-evidence', 'make-offer', 'refund'],
  },
];

/**
 * Baseline active disputes with Channel3 image evidence and SLA deadlines
 */
export const BASELINE_DISPUTES = [
  {
    id: 'PP-D-998124',
    dispute_id: 'PP-D-998124',
    status: 'REQUIRED_ACTION',
    reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
    dispute_amount: { value: '149.00', currency_code: 'USD' },
    seller_response_due_date: new Date(Date.now() + 48 * 3600000).toISOString(),
    catalog_cleaned_image_url: 'https://cdn.trychannel3.com/491235d7-6600-42a5-bc6f-0eea016d327e',
    buyer_image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80',
    defect_bounding_box: [0.35, 0.4, 0.75, 0.8],
    exif_tamper_flag: false,
    liability_score_l: 0.18,
    abuse_risk_score_r: 0.82,
    links: [
      { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-998124/provide-evidence' },
      { rel: 'make-offer', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-998124/make-offer' },
      { rel: 'acknowledge-return-item', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-998124/acknowledge-return-item' },
    ],
  },
  {
    id: 'PP-D-882419',
    dispute_id: 'PP-D-882419',
    status: 'UNDER_REVIEW',
    reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
    dispute_amount: { value: '89.00', currency_code: 'USD' },
    seller_response_due_date: new Date(Date.now() + 18 * 3600000).toISOString(),
    catalog_cleaned_image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80',
    buyer_image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80',
    defect_bounding_box: [0.2, 0.2, 0.8, 0.8],
    exif_tamper_flag: true,
    liability_score_l: 0.08,
    abuse_risk_score_r: 0.92,
    links: [
      { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-882419/provide-evidence' },
      { rel: 'accept-claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-882419/accept-claim' },
    ],
  },
];

/**
 * Fetch products: calls upstream orchestrator if available, then live PayPal API, then baseline fallback
 */
export async function fetchMerchantProducts(limit = 50) {
  const orchestratorUrl = getApiBaseUrl();
  if (orchestratorUrl) {
    try {
      const res = await fetch(`${orchestratorUrl}/api/merchant/products?limit=${limit}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          return data.products.map((p: any, idx: number) => ({
            id: p.id || `PROD-${idx + 1}`,
            name: p.name || p.id,
            description: p.description || '',
            type: p.type || 'PHYSICAL',
            category: p.category || 'SOFTWARE',
            create_time: p.create_time || new Date().toISOString(),
            created: p.create_time || new Date().toISOString(),
            price_cents: p.price_cents ?? (p.price ? Math.round(parseFloat(p.price) * 100) : 11900),
            price: p.price ? parseFloat(p.price) : (p.price_cents ? p.price_cents / 100 : 119.0),
            allow_synthetic_intent: p.allow_synthetic_intent ?? true,
            max_discount_percentage: p.max_discount_percentage ?? 10,
            recent_bids_distribution: Array.isArray(p.recent_bids_distribution) && p.recent_bids_distribution.length > 0
              ? p.recent_bids_distribution
              : [15, 22, 35, 48, 52, 60, 75],
          }));
        }
      }
    } catch (e: any) {
      logger.debug('[MerchantService] Upstream products fetch notice:', e?.message);
    }
  }

  // Live PayPal Sandbox Catalog API
  try {
    const token = await getPayPalAccessToken();
    if (token) {
      const res = await fetch(`${getPayPalBaseUrl()}/v1/catalogs/products?page_size=${encodeURIComponent(limit)}&total_required=true`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.products) ? data.products : [];
        if (items.length > 0) {
          return items.map((p: any, idx: number) => ({
            id: p.id || `PROD-${idx + 1}`,
            name: p.name || p.id,
            description: p.description || '',
            type: p.type || 'PHYSICAL',
            category: p.category || 'SOFTWARE',
            create_time: p.create_time || new Date().toISOString(),
            created: p.create_time || new Date().toISOString(),
            price_cents: p.price_cents ?? (p.price ? Math.round(parseFloat(p.price) * 100) : 11900),
            price: p.price ? parseFloat(p.price) : (p.price_cents ? p.price_cents / 100 : 119.0),
            allow_synthetic_intent: p.allow_synthetic_intent ?? true,
            max_discount_percentage: p.max_discount_percentage ?? 10,
            recent_bids_distribution: Array.isArray(p.recent_bids_distribution) && p.recent_bids_distribution.length > 0
              ? p.recent_bids_distribution
              : [15, 22, 35, 48, 52, 60, 75],
          }));
        }
      }
    }
  } catch (err: any) {
    logger.warn('[MerchantService] Live PayPal products query notice:', err?.message);
  }

  return BASELINE_PRODUCTS;
}

/**
 * Fetch recurring billing plans
 */
export async function fetchMerchantPlans(limit = 50) {
  const orchestratorUrl = getApiBaseUrl();
  if (orchestratorUrl) {
    try {
      const res = await fetch(`${orchestratorUrl}/api/merchant/plans?limit=${limit}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          return data.plans.map((pl: any, idx: number) => {
            const cycle = pl.billing_cycles?.[0];
            const priceVal = parseFloat(cycle?.pricing_scheme?.fixed_price?.value || (typeof pl.price === 'number' ? String(pl.price) : '49.00'));
            const intervalUnit = cycle?.frequency?.interval_unit || 'MONTH';
            const intervalCount = cycle?.frequency?.interval_count || 1;
            const currency = cycle?.pricing_scheme?.fixed_price?.currency_code || pl.currency || 'USD';
            return {
              id: pl.id || `PLAN-${idx + 1}`,
              product_id: pl.product_id || pl.productId || '',
              productId: pl.product_id || pl.productId || '',
              name: pl.name || 'Untitled Plan',
              status: pl.status || 'ACTIVE',
              description: pl.description || 'PayPal Subscription Plan',
              create_time: pl.create_time || new Date().toISOString(),
              created: pl.create_time || new Date().toISOString(),
              price: priceVal,
              billedEvery: pl.billedEvery || `${intervalCount} ${intervalUnit}`,
              trial: pl.trial || 'None',
              setupFee: pl.setupFee || 0,
              currency,
              billing_cycles: pl.billing_cycles || [
                {
                  frequency: { interval_unit: intervalUnit, interval_count: intervalCount },
                  tenure_type: 'REGULAR',
                  sequence: 1,
                  total_cycles: 12,
                  pricing_scheme: { fixed_price: { value: priceVal.toFixed(2), currency_code: currency } },
                },
              ],
            };
          });
        }
      }
    } catch (e: any) {
      logger.debug('[MerchantService] Upstream plans fetch notice:', e?.message);
    }
  }

  try {
    const token = await getPayPalAccessToken();
    if (token) {
      const res = await fetch(`${getPayPalBaseUrl()}/v1/billing/plans?page_size=${encodeURIComponent(limit)}&total_required=true`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.plans) ? data.plans : [];
        if (items.length > 0) {
          return items.map((pl: any, idx: number) => {
            const cycle = pl.billing_cycles?.[0];
            const priceVal = parseFloat(cycle?.pricing_scheme?.fixed_price?.value || (typeof pl.price === 'number' ? String(pl.price) : '49.00'));
            const intervalUnit = cycle?.frequency?.interval_unit || 'MONTH';
            const intervalCount = cycle?.frequency?.interval_count || 1;
            const currency = cycle?.pricing_scheme?.fixed_price?.currency_code || pl.currency || 'USD';
            return {
              id: pl.id || `PLAN-${idx + 1}`,
              product_id: pl.product_id || pl.productId || '',
              productId: pl.product_id || pl.productId || '',
              name: pl.name || 'Untitled Plan',
              status: pl.status || 'ACTIVE',
              description: pl.description || 'PayPal Subscription Plan',
              create_time: pl.create_time || new Date().toISOString(),
              created: pl.create_time || new Date().toISOString(),
              price: priceVal,
              billedEvery: pl.billedEvery || `${intervalCount} ${intervalUnit}`,
              trial: pl.trial || 'None',
              setupFee: pl.setupFee || 0,
              currency,
              billing_cycles: pl.billing_cycles || [
                {
                  frequency: { interval_unit: intervalUnit, interval_count: intervalCount },
                  tenure_type: 'REGULAR',
                  sequence: 1,
                  total_cycles: 12,
                  pricing_scheme: { fixed_price: { value: priceVal.toFixed(2), currency_code: currency } },
                },
              ],
            };
          });
        }
      }
    }
  } catch (err: any) {
    logger.warn('[MerchantService] Live PayPal plans query notice:', err?.message);
  }

  return BASELINE_PLANS;
}

/**
 * Fetch commercial invoices
 */
export async function fetchMerchantInvoices(limit = 50) {
  const orchestratorUrl = getApiBaseUrl();
  if (orchestratorUrl) {
    try {
      const res = await fetch(`${orchestratorUrl}/api/merchant/invoices?limit=${limit}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.invoices) && data.invoices.length > 0) {
          return data.invoices.map((inv: any, idx: number) => ({
            id: inv.id || `INV-${idx + 1}`,
            number: inv.detail?.invoice_number || inv.number || inv.id,
            status: inv.status || 'SENT',
            recipient:
              inv.primary_recipients?.[0]?.billing_info?.business_name ||
              inv.primary_recipients?.[0]?.billing_info?.name?.full_name ||
              inv.recipient ||
              'Enterprise Client',
            email: inv.primary_recipients?.[0]?.billing_info?.email_address || inv.email || 'client@enterprise.com',
            invoiceDate: inv.detail?.invoice_date || inv.invoiceDate || new Date().toISOString().split('T')[0],
            dueDate: inv.detail?.payment_term?.due_date || inv.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            total: parseFloat(inv.amount?.value || (typeof inv.total === 'number' ? String(inv.total) : '0.00')),
            paid: parseFloat(inv.payments?.paid_amount?.value || (inv.status === 'PAID' ? inv.amount?.value || '0' : (typeof inv.paid === 'number' ? String(inv.paid) : '0'))),
            due: parseFloat(inv.due_amount?.value || (inv.status === 'PAID' ? '0' : (typeof inv.due === 'number' ? String(inv.due) : inv.amount?.value || '0'))),
            lineItems: Array.isArray(inv.items) ? inv.items.length : (inv.lineItems || 1),
            currency: inv.amount?.currency_code || inv.detail?.currency_code || inv.currency || 'USD',
          }));
        }
      }
    } catch (e: any) {
      logger.debug('[MerchantService] Upstream invoices fetch notice:', e?.message);
    }
  }

  try {
    const token = await getPayPalAccessToken();
    if (token) {
      const res = await fetch(`${getPayPalBaseUrl()}/v2/invoicing/invoices?page_size=${encodeURIComponent(limit)}&total_required=true`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        if (items.length > 0) {
          return items.map((inv: any, idx: number) => ({
            id: inv.id || `INV-${idx + 1}`,
            number: inv.detail?.invoice_number || inv.number || inv.id,
            status: inv.status || 'SENT',
            recipient:
              inv.primary_recipients?.[0]?.billing_info?.business_name ||
              inv.primary_recipients?.[0]?.billing_info?.name?.full_name ||
              inv.recipient ||
              'Enterprise Client',
            email: inv.primary_recipients?.[0]?.billing_info?.email_address || inv.email || 'client@enterprise.com',
            invoiceDate: inv.detail?.invoice_date || inv.invoiceDate || new Date().toISOString().split('T')[0],
            dueDate: inv.detail?.payment_term?.due_date || inv.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            total: parseFloat(inv.amount?.value || (typeof inv.total === 'number' ? String(inv.total) : '0.00')),
            paid: parseFloat(inv.payments?.paid_amount?.value || (inv.status === 'PAID' ? inv.amount?.value || '0' : (typeof inv.paid === 'number' ? String(inv.paid) : '0'))),
            due: parseFloat(inv.due_amount?.value || (inv.status === 'PAID' ? '0' : (typeof inv.due === 'number' ? String(inv.due) : inv.amount?.value || '0'))),
            lineItems: Array.isArray(inv.items) ? inv.items.length : (inv.lineItems || 1),
            currency: inv.amount?.currency_code || inv.detail?.currency_code || inv.currency || 'USD',
          }));
        }
      }
    }
  } catch (err: any) {
    logger.warn('[MerchantService] Live PayPal invoices query notice:', err?.message);
  }

  return BASELINE_INVOICES;
}

/**
 * Fetch merchant held balances
 */
export async function fetchMerchantBalances() {
  const orchestratorUrl = getApiBaseUrl();
  if (orchestratorUrl) {
    try {
      const res = await fetch(`${orchestratorUrl}/api/merchant/balances`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.balances) && data.balances.length > 0) {
          const mapped = data.balances.map((b: any) => {
            const currency = b.currency || 'USD';
            const total = typeof b.total === 'number'
              ? b.total
              : parseFloat(b.total_balance?.value || b.total?.value || b.total || '0.00');
            const available = typeof b.available === 'number'
              ? b.available
              : parseFloat(b.available_balance?.value || b.available?.value || b.available || '0.00');
            const withheld = typeof b.withheld === 'number'
              ? b.withheld
              : parseFloat(b.withheld_balance?.value || b.withheld?.value || b.withheld || '0.00');
            const history_30d = Array.isArray(b.history_30d) && b.history_30d.length > 0
              ? b.history_30d
              : [
                  Math.round(available * 0.88),
                  Math.round(available * 0.92),
                  Math.round(available * 0.95),
                  Math.round(available * 0.98),
                  Math.round(available),
                ];
            return {
              currency,
              total,
              available,
              withheld,
              history_30d,
              total_balance: { currency_code: currency, value: total.toFixed(2) },
              available_balance: { currency_code: currency, value: available.toFixed(2) },
              withheld_balance: { currency_code: currency, value: withheld.toFixed(2) },
            };
          });
          return { as_of_time: data.as_of_time || new Date().toISOString(), balances: mapped };
        }
      }
    } catch (e: any) {
      logger.debug('[MerchantService] Upstream balances fetch notice:', e?.message);
    }
  }

  try {
    const token = await getPayPalAccessToken();
    if (token) {
      const res = await fetch(`${getPayPalBaseUrl()}/v1/reporting/balances`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.balances) && data.balances.length > 0) {
          const mapped = data.balances.map((b: any) => {
            const currency = b.currency || 'USD';
            const total = typeof b.total === 'number'
              ? b.total
              : parseFloat(b.total_balance?.value || b.total?.value || b.total || '0.00');
            const available = typeof b.available === 'number'
              ? b.available
              : parseFloat(b.available_balance?.value || b.available?.value || b.available || '0.00');
            const withheld = typeof b.withheld === 'number'
              ? b.withheld
              : parseFloat(b.withheld_balance?.value || b.withheld?.value || b.withheld || '0.00');
            const history_30d = Array.isArray(b.history_30d) && b.history_30d.length > 0
              ? b.history_30d
              : [
                  Math.round(available * 0.88),
                  Math.round(available * 0.92),
                  Math.round(available * 0.95),
                  Math.round(available * 0.98),
                  Math.round(available),
                ];
            return {
              currency,
              total,
              available,
              withheld,
              history_30d,
              total_balance: { currency_code: currency, value: total.toFixed(2) },
              available_balance: { currency_code: currency, value: available.toFixed(2) },
              withheld_balance: { currency_code: currency, value: withheld.toFixed(2) },
            };
          });
          return { as_of_time: data.as_of_time || new Date().toISOString(), balances: mapped };
        }
      }
    }
  } catch (err: any) {
    logger.warn('[MerchantService] Live PayPal balances query notice:', err?.message);
  }

  return BASELINE_BALANCES;
}

/**
 * Fetch merchant transactions
 */
export async function fetchMerchantTransactions() {
  const orchestratorUrl = getApiBaseUrl();
  if (orchestratorUrl) {
    try {
      const res = await fetch(`${orchestratorUrl}/api/merchant/transactions`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.transactions) && data.transactions.length > 0) {
          return data.transactions.map((t: any, idx: number) => {
            const info = t.transaction_info || {};
            const payer = t.payer_info || {};
            const amountVal = info.transaction_amount?.value ?? t.transaction_amount?.value ?? t.amount ?? '0.00';
            const feeVal = info.fee_amount?.value ?? t.fee_amount?.value ?? t.fee ?? '0.00';
            const endVal = info.ending_balance?.value ?? t.ending_balance?.value ?? t.endingBalance ?? '0.00';
            const currency = info.transaction_amount?.currency_code ?? t.currency ?? 'USD';

            return {
              id: info.transaction_id || t.transaction_id || t.id || `TXN-${idx + 1}`,
              date: info.transaction_initiation_date || t.transaction_initiation_date || t.date || new Date().toISOString(),
              status: info.transaction_status || t.transaction_status || t.status || 'S',
              amount: parseFloat(String(amountVal)),
              gross_amount: parseFloat(String(amountVal)),
              fee: parseFloat(String(feeVal)),
              paypal_fee: parseFloat(String(feeVal)),
              channel3_rebate: 0,
              endingBalance: parseFloat(String(endVal)),
              currency,
              counterparty: payer.email_address || t.payer_email || t.counterparty || 'sb-buyer@personal.example.com',
              subject: info.transaction_subject || t.transaction_subject || t.subject || 'PayPal Transaction',
              carrier: t.carrier || (t.trackers?.[0]?.carrier || 'USPS'),
              tracking_number: t.tracking_number || (t.trackers?.[0]?.tracking_number || '9400111899220011223344'),
              delivery_status: t.delivery_status || (t.trackers?.[0]?.delivery_status || 'DELIVERED'),
              postal_code: t.postal_code || (t.trackers?.[0]?.postal_code || '94016'),
              liability_score_l: t.liability_score_l ?? 0.1,
              abuse_risk_score_r: t.abuse_risk_score_r ?? 0.05,
              hateoasAllowedActions: ['track'],
            };
          });
        }
      }
    } catch (e: any) {
      logger.debug('[MerchantService] Upstream transactions fetch notice:', e?.message);
    }
  }

  try {
    const token = await getPayPalAccessToken();
    if (token) {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 86400000).toISOString();
      const res = await fetch(
        `${getPayPalBaseUrl()}/v1/reporting/transactions?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&fields=all`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.transaction_details) && data.transaction_details.length > 0) {
          return data.transaction_details.map((t: any, idx: number) => {
            const info = t.transaction_info || {};
            const payer = t.payer_info || {};
            const amountVal = info.transaction_amount?.value ?? t.transaction_amount?.value ?? t.amount ?? '0.00';
            const feeVal = info.fee_amount?.value ?? t.fee_amount?.value ?? t.fee ?? '0.00';
            const endVal = info.ending_balance?.value ?? t.ending_balance?.value ?? t.endingBalance ?? '0.00';
            const currency = info.transaction_amount?.currency_code ?? t.currency ?? 'USD';

            return {
              id: info.transaction_id || t.transaction_id || t.id || `TXN-${idx + 1}`,
              date: info.transaction_initiation_date || t.transaction_initiation_date || t.date || new Date().toISOString(),
              status: info.transaction_status || t.transaction_status || t.status || 'S',
              amount: parseFloat(String(amountVal)),
              gross_amount: parseFloat(String(amountVal)),
              fee: parseFloat(String(feeVal)),
              paypal_fee: parseFloat(String(feeVal)),
              channel3_rebate: 0,
              endingBalance: parseFloat(String(endVal)),
              currency,
              counterparty: payer.email_address || t.payer_email || t.counterparty || 'sb-buyer@personal.example.com',
              subject: info.transaction_subject || t.transaction_subject || t.subject || 'PayPal Transaction',
              carrier: t.carrier || (t.trackers?.[0]?.carrier || 'USPS'),
              tracking_number: t.tracking_number || (t.trackers?.[0]?.tracking_number || '9400111899220011223344'),
              delivery_status: t.delivery_status || (t.trackers?.[0]?.delivery_status || 'DELIVERED'),
              postal_code: t.postal_code || (t.trackers?.[0]?.postal_code || '94016'),
              liability_score_l: t.liability_score_l ?? 0.1,
              abuse_risk_score_r: t.abuse_risk_score_r ?? 0.05,
              hateoasAllowedActions: ['track'],
            };
          });
        }
      }
    }
  } catch (err: any) {
    logger.warn('[MerchantService] Live PayPal transactions query notice:', err?.message);
  }

  return BASELINE_TRANSACTIONS;
}

/**
 * Fetch disputes
 */
export async function fetchMerchantDisputes() {
  const orchestratorUrl = getApiBaseUrl();
  if (orchestratorUrl) {
    try {
      const res = await fetch(`${orchestratorUrl}/api/merchant/disputes`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.disputes) && data.disputes.length > 0) {
          return data.disputes;
        }
      }
    } catch (e: any) {
      logger.debug('[MerchantService] Upstream disputes fetch notice:', e?.message);
    }
  }

  try {
    const token = await getPayPalAccessToken();
    if (token) {
      const res = await fetch(`${getPayPalBaseUrl()}/v1/customer/disputes?page_size=50`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        if (items.length > 0) {
          return items.map((d: any, idx: number) => ({
            ...d,
            catalog_cleaned_image_url:
              d.catalog_cleaned_image_url || 'https://cdn.trychannel3.com/491235d7-6600-42a5-bc6f-0eea016d327e',
            buyer_image_url:
              d.buyer_image_url || 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80',
            defect_bounding_box: d.defect_bounding_box || [0.35, 0.4, 0.75, 0.8],
            exif_tamper_flag: Boolean(d.exif_tamper_flag),
            liability_score_l: d.liability_score_l ?? 0.18,
            abuse_risk_score_r: d.abuse_risk_score_r ?? 0.82,
          }));
        }
      }
    }
  } catch (err: any) {
    logger.warn('[MerchantService] Live PayPal disputes query notice:', err?.message);
  }

  return BASELINE_DISPUTES;
}

/**
 * Aggregates overview metrics
 */
export async function fetchOverviewMetrics() {
  const orchestratorUrl = getApiBaseUrl();
  if (orchestratorUrl) {
    try {
      const res = await fetch(`${orchestratorUrl}/api/merchant/overview-metrics`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e: any) {
      logger.debug('[MerchantService] Upstream overview-metrics fetch notice:', e?.message);
    }
  }

  const [products, plans, balances, disputes, invoices, transactions] = await Promise.all([
    fetchMerchantProducts(50).catch(() => BASELINE_PRODUCTS),
    fetchMerchantPlans(50).catch(() => BASELINE_PLANS),
    fetchMerchantBalances().catch(() => BASELINE_BALANCES),
    fetchMerchantDisputes().catch(() => BASELINE_DISPUTES),
    fetchMerchantInvoices(50).catch(() => BASELINE_INVOICES),
    fetchMerchantTransactions().catch(() => BASELINE_TRANSACTIONS),
  ]);

  const usdBal = (balances as any)?.balances?.find((b: any) => b.currency === 'USD') || (balances as any)?.balances?.[0];
  const rawAvail = usdBal?.available ?? usdBal?.available_balance?.value ?? 10200.49;
  const usdAvailable = typeof rawAvail === 'number' ? rawAvail : parseFloat(rawAvail);

  return {
    totalProducts: Array.isArray(products) ? products.length : BASELINE_PRODUCTS.length,
    activePlans: Array.isArray(plans) ? plans.length : BASELINE_PLANS.length,
    openInvoices: Array.isArray(invoices) ? invoices.length : BASELINE_INVOICES.length,
    usdBalance: `$${Number(usdAvailable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    recentTxCount: Array.isArray(transactions) ? transactions.length : BASELINE_TRANSACTIONS.length,
    openDisputes: Array.isArray(disputes) ? disputes.length : BASELINE_DISPUTES.length,
  };
}

/**
 * 1-Click Seeder to populate the connected live PayPal Sandbox account
 */
export async function seedLivePayPalSandbox() {
  const token = await getPayPalAccessToken();
  if (!token) {
    throw new Error('PayPal credentials are missing or could not authenticate with PayPal Sandbox.');
  }

  const results = {
    productsCreated: [] as any[],
    plansCreated: [] as any[],
    invoicesCreated: [] as any[],
  };

  // 1. Seed Product on live PayPal Sandbox
  try {
    const prodRes = await fetch(`${getPayPalBaseUrl()}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Channel3 Edge-AI Vision Coprocessor Kit',
        description: 'Industrial vision inspection sensor with cryptographic ground-truth verification.',
        type: 'PHYSICAL',
        category: 'SOFTWARE',
        image_url: 'https://cdn.trychannel3.com/491235d7-6600-42a5-bc6f-0eea016d327e',
      }),
    });
    if (prodRes.ok) {
      const prodData = await prodRes.json();
      results.productsCreated.push(prodData);
      logger.info('[MerchantService] Seeded product to PayPal Sandbox', prodData);

      // 2. Seed Billing Plan attached to this product
      if (prodData.id) {
        try {
          const planRes = await fetch(`${getPayPalBaseUrl()}/v1/billing/plans`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product_id: prodData.id,
              name: 'Channel3 Edge-AI Monthly Telemetry',
              description: 'Continuous optical verification & dispute telemetry',
              status: 'ACTIVE',
              billing_cycles: [
                {
                  frequency: { interval_unit: 'MONTH', interval_count: 1 },
                  tenure_type: 'REGULAR',
                  sequence: 1,
                  total_cycles: 12,
                  pricing_scheme: { fixed_price: { value: '49.00', currency_code: 'USD' } },
                },
              ],
              payment_preferences: {
                auto_bill_outstanding: true,
                setup_fee: { value: '0.00', currency_code: 'USD' },
                payment_failure_threshold: 3,
              },
            }),
          });
          if (planRes.ok) {
            const planData = await planRes.json();
            results.plansCreated.push(planData);
            logger.info('[MerchantService] Seeded billing plan to PayPal Sandbox', planData);
          }
        } catch (planErr: any) {
          logger.warn('[MerchantService] Failed to seed billing plan', planErr?.message);
        }
      }
    }
  } catch (prodErr: any) {
    logger.warn('[MerchantService] Failed to seed product', prodErr?.message);
  }

  // 3. Seed Commercial Invoice on live PayPal Sandbox
  try {
    const invRes = await fetch(`${getPayPalBaseUrl()}/v2/invoicing/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        detail: {
          invoice_number: `INV-AEGIS-${Date.now().toString(36).toUpperCase()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          currency_code: 'USD',
          note: 'Thank you for your business. AegisPay Agentic Clearinghouse.',
          payment_term: { term_type: 'NET_30' },
        },
        invoicer: {
          name: { given_name: 'AegisPay', surname: 'Merchant Services' },
          email_address: 'sb-merchant@business.example.com',
        },
        primary_recipients: [
          {
            billing_info: {
              name: { full_name: 'Enterprise Client Inc.' },
              email_address: 'client@enterprise.example.com',
            },
          },
        ],
        items: [
          {
            name: 'Channel3 Edge-AI Vision Coprocessor Kit',
            description: 'Industrial vision sensor with cryptographic ground truth',
            quantity: 2,
            unit_amount: { currency_code: 'USD', value: '119.00' },
            unit_of_measure: 'QUANTITY',
          },
        ],
        amount: {
          currency_code: 'USD',
          value: '238.00',
          breakdown: {
            item_total: { currency_code: 'USD', value: '238.00' },
          },
        },
      }),
    });
    if (invRes.ok) {
      const invData = await invRes.json();
      results.invoicesCreated.push(invData);
      logger.info('[MerchantService] Seeded invoice to PayPal Sandbox', invData);
    }
  } catch (invErr: any) {
    logger.warn('[MerchantService] Failed to seed invoice', invErr?.message);
  }

  return results;
}
