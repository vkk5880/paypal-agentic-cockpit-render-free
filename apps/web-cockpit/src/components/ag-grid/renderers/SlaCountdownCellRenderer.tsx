'use client';

import React, { useState, useEffect } from 'react';
import type { CustomCellRendererProps } from 'ag-grid-react';
import { Clock, AlertCircle } from 'lucide-react';

export interface SlaData {
  seller_response_due_date?: string;
  dueDate?: string;
  sla_hours_remaining?: number;
  [key: string]: unknown;
}

export function SlaCountdownCellRenderer(props: CustomCellRendererProps<SlaData>) {
  const data = props.data;
  const rawDate = data?.seller_response_due_date || data?.dueDate || (props.value ? String(props.value) : null);

  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isPast: boolean }>({
    hours: 24,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  useEffect(() => {
    if (!rawDate && typeof data?.sla_hours_remaining !== 'number') {
      return;
    }

    const targetTime = rawDate
      ? new Date(rawDate).getTime()
      : Date.now() + (data?.sla_hours_remaining ?? 24) * 3600 * 1000;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isPast: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rawDate, data?.sla_hours_remaining]);

  if (!rawDate && typeof data?.sla_hours_remaining !== 'number') {
    return <span className="text-slate-400 text-xs font-mono">—</span>;
  }

  const { hours, minutes, seconds, isPast } = timeLeft;
  const pad = (n: number) => String(n).padStart(2, '0');

  // Styling thresholds
  const isUrgent = isPast || hours < 6;
  const isWarning = !isUrgent && hours < 24;

  const badgeStyle = isUrgent
    ? 'bg-red-950/60 text-red-300 border-red-500/50 animate-pulse'
    : isWarning
    ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';

  return (
    <div className="flex items-center gap-1.5 h-full py-1 font-mono text-xs">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-bold ${badgeStyle}`}>
        {isUrgent ? <AlertCircle className="w-3 h-3 text-red-400" /> : <Clock className="w-3 h-3 text-current" />}
        {isPast ? (
          <span>DEFAULTED</span>
        ) : (
          <span>
            {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
          </span>
        )}
      </span>
      {isUrgent && !isPast && (
        <span className="text-[10px] text-red-400 font-semibold hidden sm:inline">&lt;6h SLA Auto-Loss Risk</span>
      )}
    </div>
  );
}

export default SlaCountdownCellRenderer;
