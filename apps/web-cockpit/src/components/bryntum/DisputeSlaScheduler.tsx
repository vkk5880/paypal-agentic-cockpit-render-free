'use client';

import React, { useState, useEffect } from 'react';
import '@bryntum/scheduler-trial/scheduler.css';
import { Clock, Filter, AlertTriangle, ShieldCheck, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  getSlaCountdownTier,
  getSlaBarColorClasses,
  validateTimeInterval,
  type SlaUrgencyTier,
} from './bryntumConfig';
import { BryntumSchedulerWrapper } from './BryntumSchedulerWrapper';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';

export interface SlaDisputeItem {
  id: string;
  disputeId: string;
  amountCents: number;
  reason: string;
  remainingHours: number;
  status: 'UNALLOCATED_URGENT' | 'VISION_TRIAGE' | 'SUBMITTED' | 'RESOLVED';
  analyst?: string;
  leftPercent: number;
  widthPercent: number;
  dueDate: string;
  startDate?: string;
  endDate?: string;
}

export function DisputeSlaScheduler() {
  const [disputes, setDisputes] = useState<SlaDisputeItem[]>([]);
  const [filterImminentBreach, setFilterImminentBreach] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchDisputes() {
      setIsLoading(true);
      try {
        const orchestratorUrl = getApiBaseUrl();
        const res = await fetch(`${orchestratorUrl}/api/merchant/disputes`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.disputes)) {
            const mapped: SlaDisputeItem[] = data.disputes.map((d: any, idx: number) => {
              const disputeId = d.dispute_id || d.id || `PP-D-${idx + 1}`;
              const amountCents = Math.round(parseFloat(d.dispute_amount?.value || d.amount || '0') * 100);
              const reason = (d.reason || 'Dispute Claim').replace(/_/g, ' ');
              const dueDateStr = d.seller_response_due_date;
              let remainingHours = 72;
              if (dueDateStr) {
                const diffMs = new Date(dueDateStr).getTime() - Date.now();
                remainingHours = Math.max(0, Math.round((diffMs / 3600000) * 10) / 10);
              }
              let status: SlaDisputeItem['status'] = 'UNALLOCATED_URGENT';
              if (d.status === 'RESOLVED') status = 'RESOLVED';
              else if (d.status === 'UNDER_REVIEW') status = 'VISION_TRIAGE';
              else if (remainingHours > 24) status = 'SUBMITTED';

              return {
                id: `sla-${disputeId}`,
                disputeId,
                amountCents,
                reason,
                remainingHours,
                status,
                leftPercent: Math.min(80, Math.max(5, (72 - remainingHours) * 1.1)),
                widthPercent: Math.min(35, Math.max(15, remainingHours * 0.4)),
                dueDate: remainingHours > 0 ? `In ${remainingHours} hrs` : 'Expired',
                startDate: new Date().toISOString(),
                endDate: dueDateStr || new Date(Date.now() + remainingHours * 3600000).toISOString(),
              };
            });
            setDisputes(mapped);
          }
        }
      } catch (err: any) {
        logger.debug('[DisputeSlaScheduler] Notice fetching live disputes:', err?.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDisputes();
  }, []);

  useEffect(() => {
    logger.info('[DisputeSlaScheduler] Mounted DisputeSlaScheduler component', {
      totalDisputes: disputes.length,
      initialFilterImminentBreach: filterImminentBreach,
    });
    return () => {
      logger.info('[DisputeSlaScheduler] Unmounting DisputeSlaScheduler component');
    };
  }, []);

  // Filter disputes if "Imminent Breach (< 12h)" toggle is active
  const displayedDisputes = filterImminentBreach
    ? disputes.filter((d) => {
        const matches = d.remainingHours < 12;
        logger.debug('[DisputeSlaScheduler] Evaluating imminent breach filter on item', {
          disputeId: d.disputeId,
          remainingHours: d.remainingHours,
          matches,
        });
        return matches;
      })
    : disputes;

  const unallocatedCount = disputes.filter(
    (d) => d.status === 'UNALLOCATED_URGENT' || !d.analyst
  ).length;

  const imminentCount = disputes.filter((d) => d.remainingHours < 12).length;

  useEffect(() => {
    logger.debug('[DisputeSlaScheduler] SLA state evaluation updated', {
      totalCount: disputes.length,
      displayedCount: displayedDisputes.length,
      unallocatedCount,
      imminentCount,
      filterImminentBreach,
    });
    if (unallocatedCount > 0) {
      logger.warn('[DisputeSlaScheduler] Unallocated SLA deadlines detected needing analyst assignment', {
        unallocatedCount,
      });
    }
  }, [displayedDisputes.length, unallocatedCount, imminentCount, filterImminentBreach]);

  const handleToggleImminentFilter = () => {
    const nextState = !filterImminentBreach;
    logger.info('[DisputeSlaScheduler] Toggling Imminent Breach filter', {
      previous: filterImminentBreach,
      next: nextState,
      affectedItems: imminentCount,
    });
    setFilterImminentBreach(nextState);
  };

  return (
    <BryntumSchedulerWrapper
      startDate={new Date(Date.now())}
      endDate={new Date(Date.now() + 72 * 3600000)}
      className="w-full"
    >
      <div
        data-testid="dispute-sla-scheduler"
        className="relative flex flex-col border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20 transition-colors"
      >
        {/* Top radiant border accent line */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/90 dark:bg-[#080d19]/90">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Bryntum Analyst SLA Schedule</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold">
                Scheduler 7.3
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* 1-Click "Imminent Breach (< 12h)" Filter Toggle */}
            <button
              type="button"
              data-testid="filter-imminent-breach-btn"
              onClick={handleToggleImminentFilter}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-xs ${
                filterImminentBreach
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                  : 'bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Imminent Breach (&lt; 12h)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  filterImminentBreach
                    ? 'bg-rose-800 text-rose-100'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {imminentCount}
              </span>
            </button>

            {unallocatedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-500/30 animate-pulse font-bold text-xs shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{unallocatedCount} Unallocated</span>
              </div>
            )}
          </div>
        </div>

        {/* SLA Legend Bar */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-slate-100/60 dark:bg-[#070b14] border-b border-slate-200/80 dark:border-white/5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          <span className="font-bold text-slate-800 dark:text-slate-200">Urgency Key:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-600" />
            <span>Red: Critical (&lt; 6h) / Unallocated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-orange-600" />
            <span>Orange: Urgent (&lt; 12h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
            <span>Yellow: Vision Triage (&lt; 24h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600" />
            <span>Green: Evidence Submitted</span>
          </div>
        </div>

        {/* Bryntum Scheduler Container / Visual Timeline */}
        <div className="bg-slate-50 dark:bg-[#080d19] relative min-h-[300px] p-4 space-y-3">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Informational header banner */}
          <div className="relative z-10 flex items-center justify-between bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>
                Real-time timeline tracking <code>seller_response_due_date</code> deadlines across active disputes.
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              Showing {displayedDisputes.length} of {disputes.length}
            </span>
          </div>

          {/* Timeline Items Track */}
          <div className="relative z-10 space-y-2.5 pt-2">
            {displayedDisputes.map((item) => {
              // Validate timeline intervals against inverted dates
              const { wasInverted } = validateTimeInterval(item.startDate, item.endDate);
              if (wasInverted) {
                logger.warn('[DisputeSlaScheduler] Inverted time interval detected and corrected for item', {
                  disputeId: item.disputeId,
                  startDate: item.startDate,
                  endDate: item.endDate,
                });
              }

              // Determine urgency bar styling via centralized helper
              const tier: SlaUrgencyTier = getSlaCountdownTier(item.remainingHours, item.status);
              const colorMapping = getSlaBarColorClasses(tier);

              let statusLabel = 'In Review';
              let StatusIcon = ShieldCheck;

              if (tier === 'CRITICAL') {
                statusLabel = `CRITICAL (< ${item.remainingHours}h) - Unallocated`;
                StatusIcon = AlertTriangle;
              } else if (tier === 'URGENT') {
                statusLabel = `URGENT (< ${item.remainingHours}h)`;
                StatusIcon = ShieldAlert;
              } else if (tier === 'WARNING') {
                statusLabel = 'Under Vision Triage';
                StatusIcon = ShieldCheck;
              } else if (tier === 'RESOLVED' || item.status === 'SUBMITTED') {
                statusLabel = 'Evidence Submitted';
                StatusIcon = CheckCircle2;
              }

              logger.debug('[DisputeSlaScheduler] Rendered dispute SLA timeline item', {
                disputeId: item.disputeId,
                tier,
                remainingHours: item.remainingHours,
                analyst: item.analyst || 'UNASSIGNED',
              });

              return (
                <div
                  key={item.id}
                  data-testid={`sla-row-${item.disputeId.toLowerCase()}`}
                  data-inverted-interval={wasInverted ? 'true' : 'false'}
                  data-sla-tier={tier}
                  className="bg-white/80 dark:bg-[#0c1424]/80 border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-[200px]">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {item.disputeId}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ${(item.amountCents / 100).toFixed(2)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[130px]">
                      {item.reason}
                    </span>
                  </div>

                  {/* Timeline Bar representation */}
                  <div className="flex-1 max-w-md bg-slate-100 dark:bg-slate-900/80 rounded-md h-7 relative overflow-hidden flex items-center px-1">
                    <div
                      className={`h-5 rounded border px-2 flex items-center justify-between text-[10px] font-mono shadow-xs transition-all ${colorMapping.barColor}`}
                      style={{
                        marginLeft: `${item.leftPercent}%`,
                        width: `${item.widthPercent}%`,
                        minWidth: '120px',
                      }}
                    >
                      <span className="truncate flex items-center gap-1">
                        <StatusIcon className="w-3 h-3 shrink-0" />
                        {statusLabel}
                      </span>
                      <span className="shrink-0 font-bold ml-1">{item.dueDate}</span>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-slate-500 shrink-0">
                    {item.analyst ? item.analyst : <span className="text-rose-500 font-bold">Unassigned</span>}
                  </div>
                </div>
              );
            })}

            {displayedDisputes.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                No disputes matching the active filter criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </BryntumSchedulerWrapper>
  );
}

export default DisputeSlaScheduler;
