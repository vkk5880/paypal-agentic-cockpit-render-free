'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ColDef } from 'ag-grid-community';
import { EndpointPage } from '@/components/merchant/EndpointPage';
import { RefreshCw } from 'lucide-react';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';
import { BASELINE_INVOICES } from '@/lib/merchantService';

interface InvoicesClientViewProps {
  initialInvoices?: any[];
  embedded?: boolean;
}

export function InvoicesClientView({ initialInvoices = [], embedded = false }: InvoicesClientViewProps) {
  const [invoices, setInvoices] = useState<any[]>(
    initialInvoices.length > 0 ? initialInvoices : BASELINE_INVOICES
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchLiveInvoices = useCallback(async () => {
    setIsLoading(true);
    logger.info('[InvoicesClientView] Fetching live commercial invoices from PayPal Invoicing API v2');
    try {
      const orchestratorUrl = getApiBaseUrl();
      const res = await fetch(`${orchestratorUrl}/api/merchant/invoices`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.invoices) && data.invoices.length > 0) {
          setInvoices(data.invoices);
          logger.info(`[InvoicesClientView] Successfully loaded ${data.invoices.length} invoices`);
          return;
        }
      }
    } catch (err: any) {
      logger.warn('[InvoicesClientView] Live invoice fetch failed, retaining initial state', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveInvoices();
  }, [fetchLiveInvoices]);

  const columns: ColDef<any>[] = [
    { field: 'number', headerName: 'Invoice #', width: 120 },
    { field: 'status', headerName: 'Status', width: 110 },
    { field: 'recipient', headerName: 'Recipient', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'invoiceDate', headerName: 'Invoice Date', type: 'timestamp', width: 130 },
    { field: 'dueDate', headerName: 'Due Date', type: 'timestamp', width: 130 },
    { field: 'total', headerName: 'Total', type: 'money', width: 120 },
    { field: 'paid', headerName: 'Paid', type: 'money', width: 120 },
    { field: 'due', headerName: 'Due', type: 'money', width: 120 },
    { field: 'lineItems', headerName: 'Items', width: 90 },
    { field: 'currency', headerName: 'Currency', width: 100 },
    { field: 'id', headerName: 'Invoice ID', width: 140 },
  ];

  return (
    <EndpointPage
      title="Commercial Invoices"
      calls={['GET /v2/invoicing/invoices', 'GET /v2/invoicing/invoices/{id}']}
      source="listInvoices()"
      note="Commercial invoices issued to clients with payment terms, due dates, and settlement status."
      rows={invoices}
      columns={columns}
      embedded={embedded}
      tableName="invoices"
      headerAction={
        <button
          onClick={fetchLiveInvoices}
          disabled={isLoading}
          title="Refresh Invoices"
          className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
        </button>
      }
    />
  );
}
