import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'aegispay-web-cockpit',
    timestamp: new Date().toISOString(),
  });
}
