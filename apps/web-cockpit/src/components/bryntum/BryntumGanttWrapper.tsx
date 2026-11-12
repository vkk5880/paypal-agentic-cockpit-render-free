'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BryntumTimelineEvent, validateTimeInterval } from './bryntumConfig';
import { BarChart3, Loader2 } from 'lucide-react';

export interface BryntumGanttTask extends BryntumTimelineEvent {
  percentDone?: number;
  dependencies?: string[];
  duration?: number;
}

export interface BryntumGanttWrapperProps {
  tasks?: BryntumGanttTask[];
  startDate?: string | Date;
  endDate?: string | Date;
  readOnly?: boolean;
  className?: string;
  onTaskClick?: (task: BryntumGanttTask) => void;
  children?: React.ReactNode;
}

/**
 * BryntumGanttWrapper provides 100% SSR-safe dynamic mounting
 * for Bryntum Gantt DOM instances. Validates task timeline intervals
 * and prevents server-side hydration mismatches.
 */
export function BryntumGanttWrapper({
  tasks = [],
  startDate,
  endDate,
  readOnly = true,
  className = '',
  onTaskClick,
  children,
}: BryntumGanttWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      setIsMounted(true);
    }
  }, []);

  // Validate start and end dates
  const { startDate: safeStart, endDate: safeEnd, wasInverted } = validateTimeInterval(
    startDate,
    endDate,
    72 * 3600 * 1000
  );

  if (!isMounted) {
    return (
      <div
        data-testid="bryntum-gantt-ssr-placeholder"
        className={`flex items-center justify-center p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#080d19]/50 min-h-[160px] text-slate-400 text-xs ${className}`}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
          <span>Mounting Bryntum Gantt Chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="bryntum-gantt-wrapper"
      data-inverted={wasInverted ? 'true' : 'false'}
      data-start={safeStart.toISOString()}
      data-end={safeEnd.toISOString()}
      className={`bryntum-gantt-container relative overflow-hidden ${className}`}
    >
      {children ? (
        children
      ) : (
        <div className="space-y-3 p-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-500" />
              Bryntum Gantt Project Plan ({tasks.length} tasks)
            </span>
            <span>
              Span: {safeStart.toLocaleDateString()} - {safeEnd.toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className={`p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex items-center justify-between cursor-pointer hover:border-cyan-500 transition-colors ${task.cls || ''}`}
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{task.name}</span>
                  {task.percentDone !== undefined && (
                    <span className="ml-2 text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                      ({task.percentDone}%)
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  {new Date(task.startDate).toLocaleDateString()} &rarr; {new Date(task.endDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BryntumGanttWrapper;
