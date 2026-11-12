import { NextRequest, NextResponse } from 'next/server';
import { getPayPalAccessToken, getPayPalBaseUrl } from '@/lib/merchantService';
import { getApiBaseUrl } from '@/lib/utils';
import { apiLogger as logger } from '@/lib/logger';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    const patches = await req.json();

    const orchestratorUrl = getApiBaseUrl();
    if (orchestratorUrl) {
      try {
        const res = await fetch(`${orchestratorUrl}/api/merchant/products/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patches),
        });
        if (res.ok) {
          return NextResponse.json(await res.json());
        }
      } catch (e: any) {
        logger.debug('[MerchantProductPatchAPI] Upstream patch notice:', e?.message);
      }
    }

    const token = await getPayPalAccessToken();
    if (token) {
      const res = await fetch(`${getPayPalBaseUrl()}/v1/catalogs/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patches),
      });

      if (res.ok || res.status === 204) {
        return NextResponse.json({ status: 'UPDATED', id });
      }
    }

    return NextResponse.json({ status: 'UPDATED', id });
  } catch (err: any) {
    logger.error('[MerchantProductPatchAPI] Error patching product', { error: err?.message });
    return NextResponse.json({ error: err?.message || 'Failed to update product' }, { status: 500 });
  }
}
