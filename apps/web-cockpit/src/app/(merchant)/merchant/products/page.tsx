import React from 'react';
import type { Metadata } from 'next';
import { ProductsClientView } from '@/components/merchant/ProductsClientView';
import { fetchMerchantProducts } from '@/lib/merchantService';

export const metadata: Metadata = { title: 'Catalog Products | Merchant Cockpit' };
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const rawProducts = await fetchMerchantProducts(50);
  const initialProducts = rawProducts.map((p: any, idx: number) => ({
    id: p.id || `PROD-${idx + 1}`,
    name: p.name || 'Unnamed Product',
    type: p.type || 'PHYSICAL',
    category: p.category || 'SOFTWARE',
    description: p.description || '',
    created: p.create_time || new Date().toISOString(),
    recent_bids_distribution: Array.isArray(p.recent_bids_distribution) ? p.recent_bids_distribution : [],
    price: p.price_cents ? p.price_cents / 100 : (p.price ? parseFloat(p.price) : 0),
    allow_synthetic_intent: p.allow_synthetic_intent ?? false,
  }));

  return <ProductsClientView initialProducts={initialProducts} />;
}
