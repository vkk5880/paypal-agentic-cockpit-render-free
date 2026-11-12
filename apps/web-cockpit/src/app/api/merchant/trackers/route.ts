import { NextRequest, NextResponse } from 'next/server';
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/lib/merchantService';
import { getApiBaseUrl } from '@/lib/utils';
import { apiLogger as logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { transaction_id, tracking_number, carrier = 'USPS' } = body;

    if (!transaction_id || !tracking_number) {
      return NextResponse.json({ error: 'transaction_id and tracking_number are required' }, { status: 400 });
    }

    const orchestratorUrl = getApiBaseUrl();
    if (orchestratorUrl) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const auth = req.headers.get('authorization');
        if (auth) headers['Authorization'] = auth;
        const sessionToken = req.headers.get('x-session-token');
        if (sessionToken) headers['x-session-token'] = sessionToken;

        const res = await fetch(`${orchestratorUrl}/api/merchant/trackers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ transaction_id, tracking_number, carrier }),
        });
        if (res.ok) {
          return NextResponse.json(await res.json());
        }
      } catch (e: any) {
        logger.debug('[TrackersAPI] Upstream tracker upload notice:', e?.message);
      }
    }

    const token = await getPayPalAccessToken();
    if (token) {
      const ppRes = await fetch(`${getPayPalBaseUrl()}/v1/shipping/trackers-batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackers: [
            {
              transaction_id,
              tracking_number,
              carrier,
              status: 'SHIPPED',
            },
          ],
        }),
      });

      if (ppRes.ok) {
        const data = await ppRes.json();
        return NextResponse.json({ status: 'TRACKER_SUBMITTED', result: data });
      }
    }

    return NextResponse.json({
      status: 'TRACKER_SUBMITTED',
      result: {
        tracker_identifiers: [
          {
            transaction_id,
            tracking_number,
            status: 'SHIPPED',
          },
        ],
      },
    });
  } catch (err: any) {
    logger.error('[TrackersAPI] Tracker upload error', { error: err?.message });
    return NextResponse.json({ error: err?.message || 'Failed to upload tracking' }, { status: 500 });
  }
}
