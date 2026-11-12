'use client';

import React from 'react';
import type { CustomCellRendererProps } from 'ag-grid-react';

export interface MonetarySplitData {
  gross_amount?: number;
  amount?: number;
  fee?: number;
  paypal_fee?: number;
  channel3_rebate?: number;
  rebate?: number;
  currency?: string;
  [key: string]: unknown;
}

export function MonetarySplitCellRenderer(props: CustomCellRendererProps<MonetarySplitData>) {
  const data = props.data;
  const currency = typeof data?.currency === 'string' ? data.currency : 'USD';

  const gross = typeof data?.gross_amount === 'number'
    ? data.gross_amount
    : typeof data?.amount === 'number'
    ? data.amount
    : typeof props.value === 'number'
    ? props.value
    : 0;

  const fee = typeof data?.paypal_fee === 'number'
    ? data.paypal_fee
    : typeof data?.fee === 'number'
    ? data.fee
    : Math.round((gross * 0.029 + 0.3) * 100) / 100;

  const rebate = typeof data?.channel3_rebate === 'number'
    ? data.channel3_rebate
    : typeof data?.rebate === 'number'
    ? data.rebate
    : Math.round(gross * 0.015 * 100) / 100;

  const fmt = (n: number) => {
    try {
      return n.toLocaleString('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  };

  return (
    <div className="flex flex-col justify-center h-full font-mono text-[11px] leading-tight py-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-slate-900 dark:text-slate-100">{fmt(gross)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-red-500/90 dark:text-red-400">-{fmt(fee)} (PP)</span>
        <span className="text-emerald-600 dark:text-emerald-400">+{fmt(rebate)} (C3)</span>
      </div>
    </div>
  );
}

export default MonetarySplitCellRenderer;
