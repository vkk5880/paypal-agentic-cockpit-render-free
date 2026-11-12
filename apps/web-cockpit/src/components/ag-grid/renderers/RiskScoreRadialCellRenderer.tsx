'use client';

import React, { useState } from 'react';
import type { CustomCellRendererProps } from 'ag-grid-react';

export interface RiskData {
  liability_score_l?: number;
  abuse_risk_score_r?: number;
  exif_tamper_flag?: boolean;
  vision_confidence?: number;
  carrier_gps_match?: boolean;
  [key: string]: unknown;
}

export function RiskScoreRadialCellRenderer(props: CustomCellRendererProps<RiskData>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const data = props.data;

  const L = typeof data?.liability_score_l === 'number'
    ? Math.max(0, Math.min(1, data.liability_score_l))
    : typeof props.value === 'number'
    ? Math.max(0, Math.min(1, props.value))
    : 0;

  const R = typeof data?.abuse_risk_score_r === 'number'
    ? Math.max(0, Math.min(1, data.abuse_risk_score_r))
    : 0;

  const getLColor = (val: number) => {
    if (val < 0.25) return '#10b981'; // Emerald
    if (val < 0.60) return '#f59e0b'; // Amber
    return '#ef4444'; // Crimson
  };

  const getRColor = (val: number) => {
    if (val < 0.25) return '#06b6d4'; // Cyan
    if (val < 0.60) return '#8b5cf6'; // Purple
    return '#ec4899'; // Rose Pink
  };

  const lColor = getLColor(L);
  const rColor = getRColor(R);

  // SVG parameters
  const size = 36;
  const strokeWidth = 3;
  const radiusOuter = 14;
  const radiusInner = 9;
  const circOuter = 2 * Math.PI * radiusOuter;
  const circInner = 2 * Math.PI * radiusInner;

  const offsetOuter = circOuter * (1 - L);
  const offsetInner = circInner * (1 - R);

  return (
    <div
      className="relative flex items-center gap-2 h-full cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg width={size} height={size} className="transform -rotate-90 shrink-0">
        {/* Background track outer */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radiusOuter}
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Outer arc: Liability L */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radiusOuter}
          stroke={lColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circOuter}
          strokeDashoffset={offsetOuter}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300"
        />

        {/* Background track inner */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radiusInner}
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Inner arc: Abuse Risk R */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radiusInner}
          stroke={rColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circInner}
          strokeDashoffset={offsetInner}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300"
        />
      </svg>

      <div className="flex flex-col text-[11px] font-mono leading-tight">
        <span style={{ color: lColor }} className="font-bold">
          L: {(L * 100).toFixed(0)}%
        </span>
        <span style={{ color: rColor }} className="text-[10px]">
          R: {(R * 100).toFixed(0)}%
        </span>
      </div>

      {showTooltip && (
        <div className="absolute left-12 top-0 z-50 w-52 p-2.5 rounded-lg bg-slate-900 border border-slate-700 shadow-xl text-white text-xs space-y-1.5 animate-in fade-in">
          <div className="font-bold border-b border-slate-800 pb-1 flex justify-between">
            <span>Forensic Rationale</span>
            <span className="font-mono text-[10px] text-cyan-400">Gemini 3.8</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Liability (L):</span>
            <span className="font-mono font-bold" style={{ color: lColor }}>
              {L.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Abuse Risk (R):</span>
            <span className="font-mono font-bold" style={{ color: rColor }}>
              {R.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">EXIF Integrity:</span>
            <span className={`font-mono text-[10px] ${data?.exif_tamper_flag ? 'text-red-400' : 'text-emerald-400'}`}>
              {data?.exif_tamper_flag ? 'TAMPER DETECTED' : 'GENUINE'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Carrier GPS Match:</span>
            <span className="font-mono text-[10px] text-emerald-400">
              {data?.carrier_gps_match === false ? 'MISMATCH' : 'CONFIRMED'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RiskScoreRadialCellRenderer;
