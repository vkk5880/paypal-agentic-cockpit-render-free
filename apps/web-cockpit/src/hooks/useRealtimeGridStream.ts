'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GridApi } from 'ag-grid-community';

export interface GridStreamEvent {
  type:
    | 'ORDER_AUTHORIZED'
    | 'DISPUTE_CREATED'
    | 'CUSTOMER.DISPUTE.UPDATED'
    | 'DISPUTE_RESOLVED'
    | 'BID_MATCHED'
    | 'CAPTURE_COMPLETED'
    | 'REFUND_ISSUED';
  payload: Record<string, any>;
  timestamp: string;
}

export interface UseRealtimeGridStreamOptions {
  gridApi: GridApi | null;
  sseEndpoint?: string;
  autoSimulateIntervalMs?: number; // Optional simulated ticker interval for live demo
}

export function useRealtimeGridStream({
  gridApi,
  sseEndpoint = '/api/events/stream',
  autoSimulateIntervalMs,
}: UseRealtimeGridStreamOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<GridStreamEvent | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const applyStreamEvent = useCallback(
    (event: GridStreamEvent) => {
      if (!gridApi) return;

      const isUpdate = Boolean(event.payload.id || event.payload.transaction_id);

      if (event.type === 'DISPUTE_CREATED' || event.type === 'ORDER_AUTHORIZED') {
        gridApi.applyTransactionAsync({ add: [event.payload], addIndex: 0 });
      } else if (isUpdate) {
        gridApi.applyTransactionAsync({ update: [event.payload] });
      }

      setLastEvent(event);
      setEventCount((prev) => prev + 1);

      // Flash changed cells if getRowNode is available
      const rowId = event.payload.id || event.payload.transaction_id;
      if (rowId) {
        const rowNode = gridApi.getRowNode(String(rowId));
        if (rowNode) {
          gridApi.flashCells({
            rowNodes: [rowNode],
            flashDuration: 800,
            fadeDuration: 1200,
          });
        }
      }
    },
    [gridApi]
  );

  // Real-Time Pulse Generator tool for streaming updates & cell flash testing
  const triggerSimulatedEvent = useCallback(() => {
    if (!gridApi) return;

    const currencies = ['USD', 'EUR', 'GBP'];
    const cur = currencies[Math.floor(Math.random() * currencies.length)];
    const id = `TXN-PULSE-${Date.now().toString(36).toUpperCase()}`;
    const amount = Math.round((25 + Math.random() * 250) * 100) / 100;
    const fee = Math.round((amount * 0.029 + 0.3) * 100) / 100;

    const simEvent: GridStreamEvent = {
      type: 'ORDER_AUTHORIZED',
      timestamp: new Date().toISOString(),
      payload: {
        id,
        date: new Date().toISOString(),
        eventCode: 'T0001',
        status: 'S',
        amount,
        gross_amount: amount,
        fee,
        paypal_fee: fee,
        currency: cur,
        counterparty: `stream_buyer_${Math.floor(Math.random() * 900 + 100)}@sandbox.paypal.com`,
        subject: 'Live Realtime Stream Settlement',
        note: 'Streaming Event Pulse Trigger',
      },
    };

    applyStreamEvent(simEvent);
  }, [gridApi, applyStreamEvent]);

  useEffect(() => {
    if (typeof window === 'undefined' || !gridApi) return;

    // Real-time EventSource connection for live stream events
    let es: EventSource | null = null;
    try {
      es = new EventSource(sseEndpoint);
      es.onopen = () => setIsConnected(true);
      es.onerror = () => setIsConnected(false);
      es.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          applyStreamEvent(parsed);
        } catch {
          // Ignore invalid parse
        }
      };
    } catch {
      // EventSource may not exist or endpoint inactive
    }

    if (autoSimulateIntervalMs && autoSimulateIntervalMs > 0) {
      intervalRef.current = setInterval(triggerSimulatedEvent, autoSimulateIntervalMs);
    }

    return () => {
      if (es) es.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gridApi, sseEndpoint, autoSimulateIntervalMs, applyStreamEvent, triggerSimulatedEvent]);

  return {
    isConnected,
    eventCount,
    lastEvent,
    triggerSimulatedEvent,
  };
}

export default useRealtimeGridStream;
