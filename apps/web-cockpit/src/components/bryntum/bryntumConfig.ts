/**
 * Bryntum SLA Gantt & Dispute Scheduling Configuration & Utilities
 *
 * Provides date validation, timeline calculations, inverted interval protection,
 * and SLA countdown window color coding.
 */

export type SlaUrgencyTier = 'CRITICAL' | 'URGENT' | 'WARNING' | 'STANDARD' | 'RESOLVED';

export interface SlaColorMapping {
  tier: SlaUrgencyTier;
  barColor: string;
  badgeColor: string;
  dotColor: string;
  label: string;
}

export interface BryntumTimelineEvent {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  resourceId?: string;
  disputeId?: string;
  amountCents?: number;
  remainingHours?: number;
  status?: string;
  cls?: string;
}

export interface BryntumResource {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
}

/**
 * Validates a start and end date pair to ensure:
 * 1. Both dates are parseable and non-NaN
 * 2. Start date does not exceed end date (inverted time interval protection)
 * 3. Guarantees positive interval duration (endDate > startDate)
 *
 * Returns normalized Date objects.
 */
export function validateTimeInterval(
  startInput: string | number | Date | null | undefined,
  endInput: string | number | Date | null | undefined,
  fallbackDurationMs: number = 3600000 // 1 hour
): { startDate: Date; endDate: Date; isValid: boolean; wasInverted: boolean } {
  const defaultNow = new Date();
  let start = startInput ? new Date(startInput) : new Date(defaultNow);
  let end = endInput ? new Date(endInput) : new Date(defaultNow.getTime() + fallbackDurationMs);

  let isValid = true;
  let wasInverted = false;

  // Validate start date
  if (isNaN(start.getTime())) {
    start = new Date(defaultNow);
    isValid = false;
  }

  // Validate end date
  if (isNaN(end.getTime())) {
    end = new Date(start.getTime() + fallbackDurationMs);
    isValid = false;
  }

  // Check for inverted time interval (start > end)
  if (start.getTime() > end.getTime()) {
    wasInverted = true;
    isValid = false;
    const temp = start;
    start = end;
    end = temp;
  }

  // Ensure end is strictly after start
  if (start.getTime() >= end.getTime()) {
    end = new Date(start.getTime() + Math.max(fallbackDurationMs, 60000));
  }

  return { startDate: start, endDate: end, isValid, wasInverted };
}

/**
 * Calculates remaining hours until seller_response_due_date.
 * Returns 0 if due date is in the past or invalid.
 */
export function calculateRemainingHours(
  dueDateInput: string | number | Date | null | undefined,
  referenceDateInput?: string | number | Date
): number {
  if (!dueDateInput) return 0;
  const dueDate = new Date(dueDateInput);
  if (isNaN(dueDate.getTime())) return 0;

  const refDate = referenceDateInput ? new Date(referenceDateInput) : new Date();
  const refTime = isNaN(refDate.getTime()) ? Date.now() : refDate.getTime();

  const diffMs = dueDate.getTime() - refTime;
  if (diffMs <= 0) return 0;

  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
}

/**
 * Determines SLA urgency tier based on remaining hours and dispute status:
 * - CRITICAL: remainingHours < 6 or status === 'UNALLOCATED_URGENT'
 * - URGENT: remainingHours < 12
 * - WARNING: remainingHours < 24 or status === 'VISION_TRIAGE'
 * - STANDARD: remainingHours < 48
 * - RESOLVED / SAFE: remainingHours >= 48 or status in ('SUBMITTED', 'RESOLVED')
 */
export function getSlaCountdownTier(
  remainingHours: number,
  status?: string
): SlaUrgencyTier {
  if (status === 'RESOLVED') return 'RESOLVED';
  if (status === 'SUBMITTED' && remainingHours >= 24) return 'RESOLVED';
  if (remainingHours < 6 || status === 'UNALLOCATED_URGENT') return 'CRITICAL';
  if (remainingHours < 12) return 'URGENT';
  if (remainingHours < 24 || status === 'VISION_TRIAGE') return 'WARNING';
  if (remainingHours < 48) return 'STANDARD';
  return 'RESOLVED';
}

/**
 * Returns Tailwind CSS class mappings for dispute SLA countdown bars and badges.
 */
export function getSlaBarColorClasses(tier: SlaUrgencyTier): SlaColorMapping {
  switch (tier) {
    case 'CRITICAL':
      return {
        tier: 'CRITICAL',
        barColor: 'bg-rose-600 border-rose-400 text-white shadow-rose-900/40 animate-pulse',
        badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
        dotColor: 'bg-rose-500 border-rose-600',
        label: 'Critical (< 6h / Unallocated)',
      };
    case 'URGENT':
      return {
        tier: 'URGENT',
        barColor: 'bg-orange-600 border-orange-400 text-white shadow-orange-900/30',
        badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-500/40',
        dotColor: 'bg-orange-500 border-orange-600',
        label: 'Urgent (< 12h)',
      };
    case 'WARNING':
      return {
        tier: 'WARNING',
        barColor: 'bg-amber-500 border-amber-300 text-slate-900 font-semibold shadow-amber-900/30',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
        dotColor: 'bg-amber-500 border-amber-600',
        label: 'Vision Triage (< 24h)',
      };
    case 'STANDARD':
      return {
        tier: 'STANDARD',
        barColor: 'bg-blue-600 border-blue-400 text-white shadow-blue-900/30',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
        dotColor: 'bg-blue-500 border-blue-600',
        label: 'Standard (< 48h)',
      };
    case 'RESOLVED':
    default:
      return {
        tier: 'RESOLVED',
        barColor: 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/30',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40',
        dotColor: 'bg-emerald-500 border-emerald-600',
        label: 'Submitted / Safe (>= 48h)',
      };
  }
}

/**
 * Calculates percentage position and width for horizontal timeline rendering
 * given total timeline window (in hours). Clamps output between 0% and 100%.
 */
export function calculateTimelinePercent(
  remainingHours: number,
  totalWindowHours: number = 72,
  minWidthPercent: number = 18
): { leftPercent: number; widthPercent: number } {
  if (totalWindowHours <= 0) totalWindowHours = 72;
  const safeHours = Math.max(0, Math.min(remainingHours, totalWindowHours));

  const leftRatio = safeHours / totalWindowHours;
  const leftPercent = Math.max(0, Math.min(100 - minWidthPercent, Math.round(leftRatio * (100 - minWidthPercent))));
  const widthPercent = Math.max(minWidthPercent, Math.min(100 - leftPercent, 25));

  return { leftPercent, widthPercent };
}
