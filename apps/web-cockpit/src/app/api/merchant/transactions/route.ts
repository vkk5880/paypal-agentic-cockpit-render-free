import { NextResponse } from 'next/server';
import { fetchMerchantTransactions } from '@/lib/merchantService';

export async function GET() {
  const transactions = await fetchMerchantTransactions();
  return NextResponse.json({ transactions });
}
