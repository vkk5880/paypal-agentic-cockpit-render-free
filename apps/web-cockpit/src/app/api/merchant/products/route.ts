import { NextRequest, NextResponse } from 'next/server';
import {
  fetchMerchantProducts,
  getPayPalAccessToken,
  getPayPalBaseUrl,
  normalizeCatalogCategory,
} from '@/lib/merchantService';
import { getApiBaseUrl } from '@/lib/utils';
import { apiLogger as logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const products = await fetchMerchantProducts(limit);
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      type = 'PHYSICAL',
      category: rawCategory,
      image_url,
      home_url,
      price_cents = 9900,
      allow_synthetic_intent = true,
      max_discount_percentage = 10,
    } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const category = normalizeCatalogCategory(rawCategory);

    // Try upstream orchestrator first
    const orchestratorUrl = getApiBaseUrl();
    if (orchestratorUrl) {
      try {
        const res = await fetch(`${orchestratorUrl}/api/merchant/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            type,
            category,
            image_url,
            home_url,
            price_cents,
            allow_synthetic_intent,
            max_discount_percentage,
          }),
        });
        if (res.ok) {
          return NextResponse.json(await res.json(), { status: 201 });
        }
      } catch (e: any) {
        logger.debug('[MerchantProductsAPI] Upstream product creation forward notice:', e?.message);
      }
    }

    // Direct live PayPal Sandbox API
    const token = await getPayPalAccessToken();
    if (token) {
      const payload: Record<string, any> = {
        name: name.slice(0, 127),
        type,
        category,
      };
      if (description) payload.description = description.slice(0, 256);
      if (image_url) payload.image_url = image_url;
      if (home_url) payload.home_url = home_url;

      const ppRes = await fetch(`${getPayPalBaseUrl()}/v1/catalogs/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (ppRes.ok) {
        const prodData = await ppRes.json();
        return NextResponse.json(
          {
            product: {
              ...prodData,
              price_cents,
              allow_synthetic_intent,
              max_discount_percentage,
              min_instant_capture_cents: Math.round(price_cents * (1 - max_discount_percentage / 100)),
            },
          },
          { status: 201 }
        );
      } else {
        const errBody = await ppRes.text();
        logger.warn('[MerchantProductsAPI] PayPal product create returned non-200', { status: ppRes.status, errBody });
      }
    }

    // Baseline fallback if offline
    const fallbackId = `PROD-${Date.now().toString(36).toUpperCase()}`;
    return NextResponse.json(
      {
        product: {
          id: fallbackId,
          name,
          description,
          type,
          category,
          image_url,
          price_cents,
          allow_synthetic_intent,
          max_discount_percentage,
          create_time: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    logger.error('[MerchantProductsAPI] Error creating product', { error: err?.message });
    return NextResponse.json({ error: err?.message || 'Failed to create product' }, { status: 500 });
  }
}
