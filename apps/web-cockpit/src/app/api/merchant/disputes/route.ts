import { NextResponse } from 'next/server';
import { fetchMerchantDisputes } from '@/lib/merchantService';

export async function GET() {
  const disputes = await fetchMerchantDisputes();
  return NextResponse.json({ disputes });
}
