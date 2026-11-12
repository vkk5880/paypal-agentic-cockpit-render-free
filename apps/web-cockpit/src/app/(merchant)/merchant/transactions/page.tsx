import React from 'react';
import type { Metadata } from 'next';
import { TransactionsClientView } from '@/components/merchant/TransactionsClientView';
import { fetchMerchantTransactions } from '@/lib/merchantService';

export const metadata: Metadata = { title: 'Transactions | Merchant Cockpit' };
export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const initialTransactions = await fetchMerchantTransactions();
  return <TransactionsClientView initialTransactions={initialTransactions} />;
}
