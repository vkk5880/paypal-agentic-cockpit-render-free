'use client';

import React from 'react';
import Link from 'next/link';
import type { ColDef } from 'ag-grid-community';
import { DataGrid, type Row } from '@/components/merchant/DataGrid';
import { ArrowLeft } from 'lucide-react';
import { useUiMode } from '@/context/UiModeContext';

export function EndpointPage({
  title,
  calls,
  source,
  note,
  rows,
  columns,
  headerAction,
  embedded = false,
  tableName,
}: {
  title: string;
  calls: string[];
  source: string;
  note?: string;
  rows: Row[];
  columns: ColDef<Row>[];
  headerAction?: React.ReactNode;
  embedded?: boolean;
  tableName?: string;
}) {
  const { showTechnicalDetails } = useUiMode();
  const resolvedTableName = tableName || title.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  if (embedded) {
    return (
      <div className="space-y-4">
        {/* Sleek Embedded Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                {rows.length} {rows.length === 1 ? 'Record' : 'Records'}
              </span>
            </h2>
            {note && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                {note}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {headerAction}
          </div>
        </div>

        {/* AG Grid Data Table */}
        <div className="flex min-h-[500px] flex-1 flex-col">
          <DataGrid rows={rows} columns={columns} tableName={resolvedTableName} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full transition-colors">
      {/* Header Banner Card */}
      <div className="relative p-6 rounded-2xl bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
        {/* Top subtle radiant border light */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        <div className="flex flex-col gap-3">
          <Link
            href="/merchant"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 w-fit transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {showTechnicalDetails ? 'Back to Merchant Cockpit' : 'Back to Seller Portal'}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
            <div className="flex items-center gap-3">
              {headerAction}
              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono font-bold text-xs shadow-xs">
                Live Records ({rows.length})
              </span>
            </div>
          </div>

          {showTechnicalDetails ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {calls.map((call) => (
                <code
                  key={call}
                  className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-cyan-800 dark:text-cyan-300 font-mono font-semibold"
                >
                  {call}
                </code>
              ))}
              <span>
                via <code className="text-slate-900 dark:text-slate-100 font-mono font-bold">{source}</code> · {rows.length}{' '}
                {rows.length === 1 ? 'row' : 'rows'}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Real-time records from your connected PayPal seller account</span>
            </div>
          )}
          {note && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">{note}</p>}
        </div>
      </div>

      <div className="flex min-h-[520px] flex-1 flex-col">
        <DataGrid rows={rows} columns={columns} tableName={resolvedTableName} />
      </div>
    </div>
  );
}
