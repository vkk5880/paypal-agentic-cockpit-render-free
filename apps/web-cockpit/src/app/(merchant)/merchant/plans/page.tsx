import React from 'react';
import type { Metadata } from 'next';
import { PlansClientView } from '@/components/merchant/PlansClientView';
import { fetchMerchantPlans } from '@/lib/merchantService';

export const metadata: Metadata = { title: 'Billing Plans | Merchant Cockpit' };
export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const rawPlans = await fetchMerchantPlans(50);
  const initialPlans = rawPlans.map((p: any, idx: number) => {
    const cycle = p.billing_cycles?.[0];
    const priceVal = parseFloat(cycle?.pricing_scheme?.fixed_price?.value || '0.00');
    const intervalUnit = cycle?.frequency?.interval_unit || 'MONTH';
    const intervalCount = cycle?.frequency?.interval_count || 1;
    return {
      id: p.id || `PLAN-${idx + 1}`,
      productId: p.product_id || '',
      name: p.name || 'Untitled Plan',
      status: p.status || 'ACTIVE',
      price: priceVal,
      billedEvery: `${intervalCount} ${intervalUnit}`,
      trial: 'None',
      setupFee: 0,
      currency: cycle?.pricing_scheme?.fixed_price?.currency_code || 'USD',
      created: p.create_time || new Date().toISOString(),
    };
  });

  return <PlansClientView initialPlans={initialPlans} />;
}
