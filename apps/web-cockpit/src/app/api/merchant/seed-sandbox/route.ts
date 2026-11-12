import { NextResponse } from 'next/server';
import { seedLivePayPalSandbox } from '@/lib/merchantService';
import { apiLogger as logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const auth = req.headers.get('authorization') || req.headers.get('x-session-token');

    if (isProduction && !isDemo && !auth) {
      logger.warn('[SeedSandboxAPI] Blocked unauthenticated sandbox seed request in production');
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required to seed sandbox data in production.',
        },
        { status: 401 }
      );
    }

    logger.info('[SeedSandboxAPI] Triggered 1-click live PayPal Sandbox seeding');
    const result = await seedLivePayPalSandbox();
    return NextResponse.json({
      success: true,
      message: 'Successfully seeded live products, billing plans, and invoices to PayPal Sandbox!',
      result,
    });
  } catch (err: any) {
    logger.error('[SeedSandboxAPI] Seeding failed', { error: err?.message });
    return NextResponse.json(
      {
        success: false,
        error: 'SEED_FAILED',
        message: err?.message || 'Failed to seed PayPal Sandbox data',
      },
      { status: 500 }
    );
  }
}
