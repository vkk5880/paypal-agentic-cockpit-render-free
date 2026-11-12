import { NextRequest, NextResponse } from 'next/server';
import { resolvePublicOrigin, sanitizeCallbackUrl } from '@/lib/origin';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim();
    const name = (body.name || '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_EMAIL',
          message: 'A valid PayPal Sandbox account email is required.',
        },
        { status: 400 }
      );
    }

    const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId === 'your_paypal_client_id_here') {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_PAYPAL_CREDENTIALS',
          message: 'PayPal Client ID or Secret is not configured in environment variables.',
        },
        { status: 500 }
      );
    }

    // 1. Verify live PayPal Sandbox connectivity via client credentials
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData: PayPalTokenResponse = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAYPAL_API_UNAVAILABLE',
          message: 'Could not connect to PayPal Sandbox API endpoint.',
        },
        { status: 502 }
      );
    }

    // 2. Pre-create a real Vault setup session on PayPal Sandbox for this customer
    const cleanEmail = email.toLowerCase();
    const customerId = `cust_${Buffer.from(cleanEmail).toString('hex').slice(0, 16)}`;
    const origin = resolvePublicOrigin(req, body.origin);
    const returnUrl = body.returnUrl ? sanitizeCallbackUrl(body.returnUrl) : `${origin}/auth/vault-callback`;
    const cancelUrl = body.cancelUrl ? sanitizeCallbackUrl(body.cancelUrl) : `${origin}/auth/vault-callback?cancelled=true`;

    const setupTokenRes = await fetch('https://api-m.sandbox.paypal.com/v3/vault/setup-tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: { id: customerId },
        payment_source: {
          paypal: {
            usage_type: 'MERCHANT',
            experience_context: {
              return_url: returnUrl,
              cancel_url: cancelUrl,
              shipping_preference: 'NO_SHIPPING',
            },
          },
        },
      }),
    });

    const setupTokenData = await setupTokenRes.json();
    const setupTokenId = setupTokenData.id;
    const approveLink =
      setupTokenData.links?.find((l: any) => l.rel === 'approve')?.href ||
      (setupTokenId
        ? `https://www.sandbox.paypal.com/agreements/approve?approval_session_id=${setupTokenId}`
        : undefined);

    const displayName =
      name ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

    return NextResponse.json({
      success: true,
      user: {
        name: displayName,
        email: cleanEmail,
        isAuthorized: false,
        vaultSetupTokenId: setupTokenId,
        spentCents: 0,
      },
      setupTokenId,
      approveUrl: approveLink,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Failed to authenticate PayPal Sandbox account',
      },
      { status: 500 }
    );
  }
}
