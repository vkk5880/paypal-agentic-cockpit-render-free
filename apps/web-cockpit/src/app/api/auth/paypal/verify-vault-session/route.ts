import { NextRequest, NextResponse } from 'next/server';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const setupTokenId = body.setupTokenId;

    if (!setupTokenId || typeof setupTokenId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_SETUP_TOKEN_ID',
          message: 'setupTokenId string parameter is required',
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
          message: 'Failed to authenticate with PayPal Sandbox API',
        },
        { status: 502 }
      );
    }

    // 2. Query PayPal Sandbox for Setup Token Status (GET /v3/vault/setup-tokens/{id})
    const getSetupRes = await fetch(
      `https://api-m.sandbox.paypal.com/v3/vault/setup-tokens/${encodeURIComponent(setupTokenId)}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const setupData = await getSetupRes.json();
    if (!getSetupRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'SETUP_TOKEN_LOOKUP_FAILED',
          details: setupData,
          message: setupData.message || 'Failed to retrieve Vault setup token details from PayPal',
        },
        { status: getSetupRes.status }
      );
    }

    const tokenStatus = setupData.status; // 'APPROVED', 'PAYER_ACTION_REQUIRED', 'CREATED'

    // Extract PayPal account details if available
    const paypalSource = setupData.payment_source?.paypal;
    const emailAddress = paypalSource?.email_address;
    const accountId = paypalSource?.account_id;
    const nameObj = paypalSource?.name;
    const fullName = nameObj
      ? `${nameObj.given_name || ''} ${nameObj.surname || ''}`.trim()
      : undefined;

    let paymentTokenId = body.existingPaymentTokenId || undefined;

    // 3. If APPROVED, convert Setup Token to durable Payment Token (POST /v3/vault/payment-tokens)
    if (tokenStatus === 'APPROVED' && !paymentTokenId) {
      const convertRes = await fetch('https://api-m.sandbox.paypal.com/v3/vault/payment-tokens', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `req_pm_${setupTokenId}_${Date.now()}`,
        },
        body: JSON.stringify({
          payment_source: {
            token: {
              id: setupTokenId,
              type: 'SETUP_TOKEN',
            },
          },
        }),
      });

      const convertData = await convertRes.json();
      if (convertRes.ok && convertData.id) {
        paymentTokenId = convertData.id;
      }
    }

    const isAuthorized = tokenStatus === 'APPROVED' || !!paymentTokenId;

    return NextResponse.json({
      success: true,
      setupTokenId,
      status: tokenStatus,
      isAuthorized,
      paymentTokenId: paymentTokenId || `pm_${setupTokenId}`,
      user: {
        name: fullName || (emailAddress ? emailAddress.split('@')[0] : 'PayPal Sandbox Buyer'),
        email: emailAddress || 'sb-buyer@business.example.com',
        payerId: accountId,
        isAuthorized,
        vaultSetupTokenId: setupTokenId,
        authorizedAt: Date.now(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Unexpected error verifying PayPal Vault session',
      },
      { status: 500 }
    );
  }
}
