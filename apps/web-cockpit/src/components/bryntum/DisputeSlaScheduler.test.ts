import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRemainingHours,
  validateTimeInterval,
  getSlaCountdownTier,
  getSlaBarColorClasses,
  calculateTimelinePercent,
} from './bryntumConfig';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BryntumSchedulerWrapper } from './BryntumSchedulerWrapper';
import { BryntumGanttWrapper } from './BryntumGanttWrapper';

test('bryntumConfig: validateTimeInterval handles normal, missing, invalid, and inverted dates', () => {
  const baseNow = new Date('2026-04-17T12:00:00Z');

  // Normal interval
  const normal = validateTimeInterval(
    '2026-04-17T12:00:00Z',
    '2026-04-17T18:00:00Z'
  );
  assert.equal(normal.isValid, true);
  assert.equal(normal.wasInverted, false);
  assert.equal(normal.startDate.toISOString(), '2026-04-17T12:00:00.000Z');
  assert.equal(normal.endDate.toISOString(), '2026-04-17T18:00:00.000Z');

  // Inverted interval (start > end) -> normalized without crash
  const inverted = validateTimeInterval(
    '2026-04-17T20:00:00Z',
    '2026-04-17T10:00:00Z'
  );
  assert.equal(inverted.isValid, false);
  assert.equal(inverted.wasInverted, true);
  assert.ok(inverted.startDate.getTime() < inverted.endDate.getTime());
  assert.equal(inverted.startDate.toISOString(), '2026-04-17T10:00:00.000Z');
  assert.equal(inverted.endDate.toISOString(), '2026-04-17T20:00:00.000Z');

  // Equal dates -> guarantees positive duration
  const equalDates = validateTimeInterval(
    '2026-04-17T12:00:00Z',
    '2026-04-17T12:00:00Z'
  );
  assert.ok(equalDates.startDate.getTime() < equalDates.endDate.getTime());

  // Invalid date strings
  const invalid = validateTimeInterval('not-a-date', 'also-not-a-date');
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.startDate instanceof Date && !isNaN(invalid.startDate.getTime()));
  assert.ok(invalid.endDate instanceof Date && !isNaN(invalid.endDate.getTime()));
  assert.ok(invalid.startDate.getTime() < invalid.endDate.getTime());

  // Null / undefined inputs
  const empty = validateTimeInterval(null, undefined);
  assert.ok(empty.startDate.getTime() < empty.endDate.getTime());
});

test('bryntumConfig: calculateRemainingHours accurately determines response window', () => {
  const refTime = new Date('2026-04-17T00:00:00Z');

  // 12 hours ahead
  const due12h = new Date('2026-04-17T12:00:00Z');
  assert.equal(calculateRemainingHours(due12h, refTime), 12.0);

  // 4.5 hours ahead
  const due4_5h = new Date(refTime.getTime() + 4.5 * 3600000);
  assert.equal(calculateRemainingHours(due4_5h, refTime), 4.5);

  // Expired / in past
  const past = new Date(refTime.getTime() - 3600000);
  assert.equal(calculateRemainingHours(past, refTime), 0);

  // Invalid date input
  assert.equal(calculateRemainingHours('invalid-date', refTime), 0);
  assert.equal(calculateRemainingHours(null, refTime), 0);
});

test('bryntumConfig: getSlaCountdownTier assigns correct urgency tiers', () => {
  // Critical (< 6h or UNALLOCATED_URGENT)
  assert.equal(getSlaCountdownTier(4.5, 'UNALLOCATED_URGENT'), 'CRITICAL');
  assert.equal(getSlaCountdownTier(5.9, 'IN_REVIEW'), 'CRITICAL');
  assert.equal(getSlaCountdownTier(10.0, 'UNALLOCATED_URGENT'), 'CRITICAL');

  // Urgent (< 12h)
  assert.equal(getSlaCountdownTier(9.0, 'IN_REVIEW'), 'URGENT');
  assert.equal(getSlaCountdownTier(11.9, 'ASSIGNED'), 'URGENT');

  // Warning (< 24h or VISION_TRIAGE)
  assert.equal(getSlaCountdownTier(18.0, 'VISION_TRIAGE'), 'WARNING');
  assert.equal(getSlaCountdownTier(23.0, 'IN_REVIEW'), 'WARNING');

  // Standard (< 48h)
  assert.equal(getSlaCountdownTier(32.5, 'ASSIGNED'), 'STANDARD');
  assert.equal(getSlaCountdownTier(47.9, 'IN_REVIEW'), 'STANDARD');

  // Resolved / Safe (>= 48h or SUBMITTED/RESOLVED)
  assert.equal(getSlaCountdownTier(54.0, 'SUBMITTED'), 'RESOLVED');
  assert.equal(getSlaCountdownTier(1.0, 'RESOLVED'), 'RESOLVED');
  assert.equal(getSlaCountdownTier(50.0, 'IN_REVIEW'), 'RESOLVED');
});

test('bryntumConfig: getSlaBarColorClasses provides color tokens for each tier', () => {
  const critical = getSlaBarColorClasses('CRITICAL');
  assert.ok(critical.barColor.includes('bg-rose-600'));
  assert.ok(critical.dotColor.includes('bg-rose-500'));

  const urgent = getSlaBarColorClasses('URGENT');
  assert.ok(urgent.barColor.includes('bg-orange-600'));
  assert.ok(urgent.dotColor.includes('bg-orange-500'));

  const warning = getSlaBarColorClasses('WARNING');
  assert.ok(warning.barColor.includes('bg-amber-500'));
  assert.ok(warning.dotColor.includes('bg-amber-500'));

  const standard = getSlaBarColorClasses('STANDARD');
  assert.ok(standard.barColor.includes('bg-blue-600'));
  assert.ok(standard.dotColor.includes('bg-blue-500'));

  const resolved = getSlaBarColorClasses('RESOLVED');
  assert.ok(resolved.barColor.includes('bg-emerald-600'));
  assert.ok(resolved.dotColor.includes('bg-emerald-500'));
});

test('bryntumConfig: calculateTimelinePercent returns clamped horizontal geometry', () => {
  const atZero = calculateTimelinePercent(0, 72, 18);
  assert.equal(atZero.leftPercent, 0);
  assert.ok(atZero.widthPercent >= 18);

  const atMax = calculateTimelinePercent(100, 72, 18);
  assert.ok(atMax.leftPercent <= 82);
  assert.ok(atMax.leftPercent + atMax.widthPercent <= 100);

  const mid = calculateTimelinePercent(36, 72, 18);
  assert.ok(mid.leftPercent > 0 && mid.leftPercent < 82);
});

test('Bryntum wrappers render SSR placeholders safely without DOM/window crash', () => {
  // Test BryntumSchedulerWrapper in Node SSR static markup
  const schedulerHtml = renderToStaticMarkup(
    React.createElement(BryntumSchedulerWrapper, {
      startDate: '2026-04-17T12:00:00Z',
      endDate: '2026-04-17T18:00:00Z',
      events: [{ id: '1', name: 'Task 1', startDate: '2026-04-17T12:00:00Z', endDate: '2026-04-17T18:00:00Z' }],
    })
  );
  assert.ok(schedulerHtml.includes('data-testid="bryntum-scheduler-ssr-placeholder"'));
  assert.ok(schedulerHtml.includes('Mounting Bryntum Scheduler Engine...'));

  // Test BryntumGanttWrapper in Node SSR static markup
  const ganttHtml = renderToStaticMarkup(
    React.createElement(BryntumGanttWrapper, {
      startDate: '2026-04-17T12:00:00Z',
      endDate: '2026-04-17T18:00:00Z',
      tasks: [{ id: '1', name: 'Gantt Task 1', startDate: '2026-04-17T12:00:00Z', endDate: '2026-04-17T18:00:00Z', percentDone: 50 }],
    })
  );
  assert.ok(ganttHtml.includes('data-testid="bryntum-gantt-ssr-placeholder"'));
  assert.ok(ganttHtml.includes('Mounting Bryntum Gantt Chart...'));
});
