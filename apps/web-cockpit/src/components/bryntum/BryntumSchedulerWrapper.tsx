'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BryntumTimelineEvent, BryntumResource, validateTimeInterval } from './bryntumConfig';
import { Calendar, Loader2 } from 'lucide-react';

export interface BryntumSchedulerWrapperProps {
  events?: BryntumTimelineEvent[];
  resources?: BryntumResource[];
  startDate?: string | Date;
  endDate?: string | Date;
  readOnly?: boolean;
  className?: string;
  onEventClick?: (event: BryntumTimelineEvent) => void;
  children?: React.ReactNode;
}

/**
 * BryntumSchedulerWrapper provides 100% SSR-safe dynamic mounting
 * for Bryntum Scheduler DOM instances. Ensures no window / matchMedia
 * or document DOM crashes occur during Next.js SSR / static generation.
 */
export function BryntumSchedulerWrapper({
  events = [],
  resources = [],
  startDate,
  endDate,
  readOnly = true,
  className = '',
  onEventClick,
  children,
}: BryntumSchedulerWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // SSR guard: Ensure running strictly in browser context
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      setIsMounted(true);
    }
  }, []);

  // Validate timeline bounds
  const { startDate: safeStart, endDate: safeEnd, wasInverted } = validateTimeInterval(
    startDate,
    endDate,
    72 * 3600 * 1000 // default 72h window
  );

  if (!isMounted) {
    return (
      <div
        data-testid="bryntum-scheduler-ssr-placeholder"
        className={`flex items-center justify-center p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#080d19]/50 min-h-[160px] text-slate-400 text-xs ${className}`}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
          <span>Mounting Bryntum Scheduler Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="bryntum-scheduler-wrapper"
      data-inverted={wasInverted ? 'true' : 'false'}
      data-start={safeStart.toISOString()}
      data-end={safeEnd.toISOString()}
      className={`bryntum-scheduler-container relative overflow-hidden ${className}`}
    >
      {/* If children provided (e.g. customized dispute scheduler UI), render directly inside SSR boundary */}
      {children ? (
        children
      ) : (
        <div className="space-y-3 p-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-cyan-500" />
              Bryntum Scheduler Grid ({resources.length} resources, {events.length} events)
            </span>
            <span>
              Window: {safeStart.toLocaleDateString()} - {safeEnd.toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-2">
            {events.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onEventClick?.(evt)}
                className={`p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex items-center justify-between cursor-pointer hover:border-cyan-500 transition-colors ${evt.cls || ''}`}
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">{evt.name}</div>
                <div className="font-mono text-[11px] text-slate-500">
                  {new Date(evt.startDate).toLocaleTimeString()} - {new Date(evt.endDate).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BryntumSchedulerWrapper;
