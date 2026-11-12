import { NextResponse } from 'next/server';
import { fetchMerchantBalances } from '@/lib/merchantService';

export async function GET() {
  const balances = await fetchMerchantBalances();
  return NextResponse.json(balances);
}
