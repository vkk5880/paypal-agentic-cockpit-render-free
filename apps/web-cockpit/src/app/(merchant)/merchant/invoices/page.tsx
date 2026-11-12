import React from 'react';
import type { Metadata } from 'next';
import { InvoicesClientView } from '@/components/merchant/InvoicesClientView';
import { fetchMerchantInvoices } from '@/lib/merchantService';

export const metadata: Metadata = { title: 'Invoices | Merchant Cockpit' };
export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const initialInvoices = await fetchMerchantInvoices(50);
  return <InvoicesClientView initialInvoices={initialInvoices} />;
}
