import { NextRequest, NextResponse } from 'next/server';
import { resolvePublicOrigin, sanitizeCallbackUrl } from '@/lib/origin';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const origin = resolvePublicOrigin(req, body.origin);

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

    // 1. Obtain Live PayPal Sandbox OAuth2 Access Token
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
          error: 'PAYPAL_OAUTH_FAILED',
          message: tokenData.error_description || 'Failed to authenticate with PayPal Sandbox API',
        },
        { status: 502 }
      );
    }

    const returnUrl = body.returnUrl ? sanitizeCallbackUrl(body.returnUrl) : `${origin}/auth/vault-callback`;
    const cancelUrl = body.cancelUrl ? sanitizeCallbackUrl(body.cancelUrl) : `${origin}/auth/vault-callback?cancelled=true`;
    const customerId = body.customerId || `cust_${Date.now().toString(36)}`;

    // 2. Create Real Vault v3 Setup Token on PayPal Sandbox
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
    if (!setupTokenRes.ok || !setupTokenData.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'VAULT_SETUP_TOKEN_FAILED',
          details: setupTokenData,
          message: setupTokenData.message || 'Failed to create PayPal Vault setup token on Sandbox',
        },
        { status: setupTokenRes.status }
      );
    }

    const approveLink = setupTokenData.links?.find((l: any) => l.rel === 'approve')?.href ||
      `https://www.sandbox.paypal.com/agreements/approve?approval_session_id=${setupTokenData.id}`;

    return NextResponse.json({
      success: true,
      setupTokenId: setupTokenData.id,
      status: setupTokenData.status,
      approveUrl: approveLink,
      customerId: customerId,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Unexpected error creating PayPal Vault setup session',
      },
      { status: 500 }
    );
  }
}
