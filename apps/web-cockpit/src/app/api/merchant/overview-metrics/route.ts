import { NextResponse } from 'next/server';
import { fetchOverviewMetrics } from '@/lib/merchantService';

export async function GET() {
  const metrics = await fetchOverviewMetrics();
  return NextResponse.json(metrics);
}
