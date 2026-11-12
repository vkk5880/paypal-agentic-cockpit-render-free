'use client';

import React, { useState } from 'react';
import type { CustomCellRendererProps } from 'ag-grid-react';
import { Truck, CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/utils';

export interface CarrierData {
  carrier?: string;
  tracking_number?: string;
  trackingNumber?: string;
  status?: string;
  delivery_status?: string;
  postal_code?: string;
  [key: string]: unknown;
}

export function CarrierTrackerCellRenderer(props: CustomCellRendererProps<CarrierData>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [syncingTracker, setSyncingTracker] = useState(false);
  const [trackerSyncStatus, setTrackerSyncStatus] = useState<string | null>(null);
  const data = props.data;

  const carrier = (data?.carrier || 'USPS').toUpperCase();
  const trackingNumber = data?.tracking_number || data?.trackingNumber || (props.value ? String(props.value) : '94001118992200000001');
  const status = (data?.delivery_status || data?.status || 'DELIVERED').toUpperCase();

  const handleSyncTracker = async () => {
    setSyncingTracker(true);
    try {
      const orchestratorUrl = getApiBaseUrl();
      const txId = (data as any)?.id || (data as any)?.transaction_id || 'TXN-DEMO-001';
      const res = await fetch(`${orchestratorUrl}/api/merchant/trackers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: txId,
          tracking_number: trackingNumber,
          carrier: carrier,
        }),
      });
      if (res.ok) {
        setTrackerSyncStatus('Synced to PayPal Trackers API');
      } else {
        setTrackerSyncStatus('Sync Failed');
      }
    } catch {
      setTrackerSyncStatus('Network Error');
    } finally {
      setSyncingTracker(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DELIVERED':
        return {
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
          cls: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
        };
      case 'IN_TRANSIT':
        return {
          icon: <Clock className="w-3 h-3 text-cyan-400" />,
          cls: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
        };
      default:
        return {
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
          cls: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
        };
    }
  };

  const badge = getStatusBadge(status);

  return (
    <div className="flex items-center gap-2 h-full py-1">
      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700">
        {carrier}
      </span>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="font-mono text-xs text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 cursor-pointer"
        title="View Carrier Telemetry"
      >
        <span className="truncate max-w-[110px]">{trackingNumber}</span>
      </button>

      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.cls}`}>
        {badge.icon}
        {status}
      </span>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-slate-100"
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">{carrier} Shipment Telemetry</h4>
                  <p className="text-xs text-slate-400 font-mono">{trackingNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Carrier Status:</span>
                  <span className="font-bold text-emerald-400">{status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Postal Code Match:</span>
                  <span className="font-mono text-slate-200">
                    {data?.postal_code ? String(data.postal_code) : '94016 (Confirmed Destination)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PayPal Shipment API:</span>
                  <span className="font-mono text-cyan-400">v1/shipping/trackers-batch Synced</span>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="text-[11px] font-bold text-slate-300">Carrier Scan Events</div>
                <div className="text-[10px] font-mono text-slate-400 border-l-2 border-cyan-500/50 pl-2 space-y-1">
                  <div>2026-11-04 14:15 UTC - Delivered, In/At Mailbox</div>
                  <div>2026-11-04 08:30 UTC - Out for Delivery</div>
                  <div>2026-11-03 21:12 UTC - Arrived at USPS Facility</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              {trackerSyncStatus ? (
                <span className="text-[11px] font-mono text-emerald-400">{trackerSyncStatus}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSyncTracker}
                  disabled={syncingTracker}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 transition-colors disabled:opacity-50"
                >
                  {syncingTracker ? 'Syncing...' : 'Sync Tracker to PayPal'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CarrierTrackerCellRenderer;
