'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ColDef } from 'ag-grid-community';
import { EndpointPage } from '@/components/merchant/EndpointPage';
import { RefreshCw } from 'lucide-react';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';
import { BASELINE_TRANSACTIONS } from '@/lib/merchantService';

interface TransactionsClientViewProps {
  initialTransactions?: any[];
  embedded?: boolean;
}

const FX_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.28,
  CAD: 0.74,
  JPY: 0.0066,
};

export function TransactionsClientView({ initialTransactions = [], embedded = false }: TransactionsClientViewProps) {
  const [transactions, setTransactions] = useState<any[]>(
    initialTransactions.length > 0 ? initialTransactions : BASELINE_TRANSACTIONS
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchLiveTransactions = useCallback(async () => {
    setIsLoading(true);
    logger.info('[TransactionsClientView] Fetching live transactions from PayPal Reporting API');
    try {
      const orchestratorUrl = getApiBaseUrl();
      const res = await fetch(`${orchestratorUrl}/api/merchant/transactions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.transactions) && data.transactions.length > 0) {
          const mapped = data.transactions.map((t: any, idx: number) => {
            const info = t.transaction_info || {};
            const payer = t.payer_info || {};
            const amountVal = info.transaction_amount?.value ?? t.transaction_amount?.value ?? t.amount ?? '0.00';
            const feeVal = info.fee_amount?.value ?? t.fee_amount?.value ?? t.fee ?? '0.00';
            const endingBalVal = info.ending_balance?.value ?? t.ending_balance?.value ?? t.endingBalance ?? '0.00';
            const currencyVal = info.transaction_amount?.currency_code ?? t.currency ?? 'USD';

            return {
              id: info.transaction_id || t.transaction_id || t.id || `TXN-${idx + 1}`,
              date: info.transaction_initiation_date || t.transaction_initiation_date || t.date || new Date().toISOString(),
              status: info.transaction_status || t.transaction_status || t.status || 'S',
              amount: parseFloat(String(amountVal)),
              gross_amount: parseFloat(String(amountVal)),
              fee: parseFloat(String(feeVal)),
              paypal_fee: parseFloat(String(feeVal)),
              channel3_rebate: t.channel3_rebate || 0,
              endingBalance: parseFloat(String(endingBalVal)),
              currency: currencyVal,
              counterparty: payer.email_address || t.payer_email || t.counterparty || 'sb-buyer@personal.example.com',
              subject: info.transaction_subject || t.transaction_subject || t.subject || 'PayPal Transaction',
              carrier: t.carrier || (t.trackers?.[0]?.carrier || 'USPS'),
              tracking_number: t.tracking_number || (t.trackers?.[0]?.tracking_number || ''),
              delivery_status: t.delivery_status || (t.trackers?.[0]?.delivery_status || 'DELIVERED'),
              postal_code: t.postal_code || (t.trackers?.[0]?.postal_code || ''),
              liability_score_l: t.liability_score_l ?? null,
              abuse_risk_score_r: t.abuse_risk_score_r ?? null,
              hateoasAllowedActions: t.hateoasAllowedActions || ['track'],
              purchase_units: Array.isArray(t.purchase_units) ? t.purchase_units : [],
              vault_token: t.vault_token || null,
              trackers: Array.isArray(t.trackers) ? t.trackers : [],
            };
          });
          setTransactions(mapped);
          logger.info(`[TransactionsClientView] Updated with ${mapped.length} live transactions`);
          return;
        }
      }
    } catch (err: any) {
      logger.warn('[TransactionsClientView] Failed to fetch live transactions, keeping current state', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveTransactions();
  }, [fetchLiveTransactions]);

  const columns: ColDef<any>[] = [
    {
      field: 'date',
      headerName: 'Date (UTC)',
      type: 'dateTime',
      width: 175,
      cellRenderer: 'agGroupCellRenderer',
    },
    { field: 'id', headerName: 'Transaction ID', width: 140 },
    { field: 'currency', headerName: 'Currency', width: 100, enableRowGroup: true },
    { field: 'status', headerName: 'Status', width: 85, enableRowGroup: true },
    {
      field: 'amount',
      headerName: 'Financial Split (Gross / Fee / Rebate)',
      width: 230,
      cellRenderer: 'MonetarySplitCellRenderer',
      aggFunc: 'sum',
    },
    {
      headerName: 'Est. Net Clearing (USD)',
      width: 175,
      type: 'money',
      aggFunc: 'sum',
      valueGetter: (params) => {
        const amt = params.data?.amount || 0;
        const fee = params.data?.paypal_fee || 0;
        const curr = params.data?.currency || 'USD';
        const net = amt - fee;
        const rate = FX_RATES[curr] || 1.0;
        return net * rate;
      },
    },
    {
      field: 'tracking_number',
      headerName: 'Carrier Tracker',
      width: 240,
      cellRenderer: 'CarrierTrackerCellRenderer',
    },
    {
      field: 'liability_score_l',
      headerName: 'Forensic Risk (L, R)',
      width: 140,
      cellRenderer: 'RiskScoreRadialCellRenderer',
    },
    {
      field: 'hateoasAllowedActions',
      headerName: 'One-Click Actions',
      minWidth: 220,
      cellRenderer: 'HateoasActionCellRenderer',
    },
    { field: 'counterparty', headerName: 'Counterparty', minWidth: 170, flex: 1 },
  ];

  return (
    <EndpointPage
      title="Transaction Search (Last 31 Days)"
      calls={['GET /v1/reporting/transactions']}
      source="searchTransactions(start, end)"
      note="The reporting endpoint returns 31-day activity across all currencies, enriched with real-time multi-currency FX margin calculations, carrier delivery scans, and Master/Detail purchase unit breakdowns."
      rows={transactions}
      columns={columns}
      embedded={embedded}
      tableName="transactions"
      headerAction={
        <button
          onClick={fetchLiveTransactions}
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
