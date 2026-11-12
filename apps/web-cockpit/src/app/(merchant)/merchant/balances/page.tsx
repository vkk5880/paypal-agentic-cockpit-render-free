import React from 'react';
import type { Metadata } from 'next';
import { BalancesClientView } from '@/components/merchant/BalancesClientView';
import { fetchMerchantBalances } from '@/lib/merchantService';

export const metadata: Metadata = { title: 'Held Balances | Merchant Cockpit' };
export const dynamic = 'force-dynamic';

export default async function BalancesPage() {
  const result = await fetchMerchantBalances();
  const initialBalances = Array.isArray(result?.balances) ? result.balances : [];
  return <BalancesClientView initialBalances={initialBalances} />;
}
