'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ColDef } from 'ag-grid-community';
import { EndpointPage } from '@/components/merchant/EndpointPage';
import { RefreshCw } from 'lucide-react';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';
import { BASELINE_PLANS } from '@/lib/merchantService';

interface PlanRow {
  id: string;
  productId: string;
  name: string;
  status: string;
  price: number;
  billedEvery: string;
  trial: string;
  setupFee: number;
  currency: string;
  created: string;
}

const DEFAULT_PLANS: PlanRow[] = BASELINE_PLANS.map((pl: any, idx: number) => {
  const cycle = pl.billing_cycles?.[0];
  const priceVal = parseFloat(cycle?.pricing_scheme?.fixed_price?.value || '49.00');
  const intervalUnit = cycle?.frequency?.interval_unit || 'MONTH';
  const intervalCount = cycle?.frequency?.interval_count || 1;
  return {
    id: pl.id || `PLAN-${idx + 1}`,
    productId: pl.product_id || '',
    name: pl.name || 'Untitled Plan',
    status: pl.status || 'ACTIVE',
    price: priceVal,
    billedEvery: `${intervalCount} ${intervalUnit}`,
    trial: 'None',
    setupFee: 0,
    currency: cycle?.pricing_scheme?.fixed_price?.currency_code || 'USD',
    created: pl.create_time || new Date().toISOString(),
  };
});

interface PlansClientViewProps {
  initialPlans?: PlanRow[];
  embedded?: boolean;
}

export function PlansClientView({ initialPlans = [], embedded = false }: PlansClientViewProps) {
  const [plans, setPlans] = useState<PlanRow[]>(
    initialPlans.length > 0 ? initialPlans : DEFAULT_PLANS
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchLivePlans = useCallback(async () => {
    setIsLoading(true);
    logger.info('[PlansClientView] Fetching live plans from PayPal Subscriptions API');
    try {
      const orchestratorUrl = getApiBaseUrl();
      const res = await fetch(`${orchestratorUrl}/api/merchant/plans`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          const mapped: PlanRow[] = data.plans.map((p: any, idx: number) => {
            const cycle = p.billing_cycles?.[0];
            const priceVal = parseFloat(cycle?.pricing_scheme?.fixed_price?.value || '0.00');
            const intervalUnit = cycle?.frequency?.interval_unit || 'MONTH';
            const intervalCount = cycle?.frequency?.interval_count || 1;
            return {
              id: p.id || `PLAN-${idx + 1}`,
              productId: p.product_id || '',
              name: p.name || 'Untitled Plan',
              status: p.status || 'ACTIVE',
              price: priceVal,
              billedEvery: `${intervalCount} ${intervalUnit}`,
              trial: 'None',
              setupFee: 0,
              currency: cycle?.pricing_scheme?.fixed_price?.currency_code || 'USD',
              created: p.create_time || new Date().toISOString(),
            };
          });
          setPlans(mapped);
          logger.info(`[PlansClientView] Updated with ${mapped.length} live billing plans`);
          return;
        }
      }
    } catch (err: any) {
      logger.warn('[PlansClientView] Failed to fetch live billing plans, keeping current state', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePlans();
  }, [fetchLivePlans]);

  const columns: ColDef<any>[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'productId', headerName: 'Product ID', width: 140 },
    { field: 'status', headerName: 'Status', width: 110 },
    { field: 'price', headerName: 'Price', type: 'money', width: 120 },
    { field: 'billedEvery', headerName: 'Billed every', width: 140 },
    { field: 'trial', headerName: 'Trial', width: 110 },
    { field: 'setupFee', headerName: 'Setup fee', type: 'money', width: 120 },
    { field: 'currency', headerName: 'Currency', width: 100 },
    { field: 'created', headerName: 'Created', type: 'dateTime', width: 200 },
    { field: 'id', headerName: 'Plan ID', width: 150 },
  ];

  return (
    <EndpointPage
      title="Billing Plans"
      calls={['GET /v1/billing/plans', 'GET /v1/billing/plans/{id}', 'POST /v1/billing/plans']}
      source="listPlans()"
      note="A plan's billing cycles hold its recurring price: an optional TRIAL cycle followed by the REGULAR cycle that bills until cancelled."
      rows={plans}
      columns={columns}
      embedded={embedded}
      tableName="plans"
      headerAction={
        <button
          onClick={fetchLivePlans}
          disabled={isLoading}
          title="Refresh from PayPal"
          className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
        </button>
      }
    />
  );
}
