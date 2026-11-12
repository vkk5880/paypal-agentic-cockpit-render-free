'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileCheck,
  Clock,
  Layers,
  Camera,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  DollarSign,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { formatCents } from '@/lib/utils';
import { FriendlyErrorTransmuter } from './common/FriendlyErrorTransmuter';

export interface DisputeEvidenceData {
  // camelCase properties
  disputeId?: string;
  amountCents?: number;
  reason?: string;
  stage?: 'INQUIRY' | 'CLAIM' | 'CHARGEBACK' | 'PRE_ARBITRATION' | 'ARBITRATION';
  defectBoundingBox?: [number, number, number, number] | { ymin: number; xmin: number; ymax: number; xmax: number };
  exifSoftware?: string;
  exifTamperFlag?: boolean;
  liabilityScoreL?: number;
  abuseRiskScoreR?: number;
  tierAction?: 'TIER1_REFUND' | 'TIER2_PARTIAL_OFFER' | 'TIER3_RETURN_OFFER' | 'TIER4_CONTEST_PDF' | 'TIER5_SLA_ESCALATE' | string;
  partialOfferCents?: number;
  trackingNumber?: string;
  carrierStatus?: string;
  slaHoursRemaining?: number;
  buyerStatement?: string;
  buyerImageUrl?: string;

  // snake_case interoperability properties
  dispute_id?: string;
  dispute_amount_cents?: number;
  defect_bounding_box?: [number, number, number, number] | { ymin: number; xmin: number; ymax: number; xmax: number };
  exif_software?: string;
  exif_tampered?: boolean;
  exif_tamper_flag?: boolean;
  liability_score_l?: number;
  abuse_risk_score_r?: number;
  selected_tier_action?: string;
  tier_action?: string;
  partial_offer_cents?: number;
  tracking_number?: string;
  carrier_status?: string;
  sla_hours_remaining?: number;
  buyer_statement?: string;
  buyer_image_url?: string;
  tamper_reasons?: string[];
}

export function DisputeMatrixViewer({
  evidence,
  onTriggerAction,
  submitting = false,
}: {
  evidence?: DisputeEvidenceData;
  onTriggerAction?: (actionRel: string) => void | Promise<void>;
  submitting?: boolean;
}) {
  const [internalSubmittingAction, setInternalSubmittingAction] = useState<string | null>(null);
  const [lastExecutedAction, setLastExecutedAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isSubmitting = submitting || internalSubmittingAction !== null;

  // Dual casing normalization
  const disputeId = evidence?.disputeId || evidence?.dispute_id || 'PP-D-849201';
  const amountCents = Math.max(0, Number(evidence?.amountCents ?? evidence?.dispute_amount_cents ?? 14900) || 0);
  const reason = evidence?.reason || 'ITEM_NOT_AS_DESCRIBED';
  const stage = (evidence?.stage || 'INQUIRY') as string;
  const buyerStatement = evidence?.buyerStatement || evidence?.buyer_statement || 'Item arrived with cracked display screen and broken hinge.';
  const buyerImageUrl = evidence?.buyerImageUrl || evidence?.buyer_image_url || '';

  const exifTamperFlag = Boolean(
    evidence?.exifTamperFlag ??
    evidence?.exif_tamper_flag ??
    evidence?.exif_tampered ??
    true
  );

  const exifSoftware = evidence?.exifSoftware || evidence?.exif_software || (exifTamperFlag ? 'Adobe Photoshop 2026' : 'Camera Raw (Untampered)');
  const trackingNumber = evidence?.trackingNumber || evidence?.tracking_number || '1Z9999999999999999';
  const carrierStatus = evidence?.carrierStatus || evidence?.carrier_status || 'DELIVERED_FRONT_DOOR';

  const tierActionKey = (
    evidence?.tierAction ||
    evidence?.tier_action ||
    evidence?.selected_tier_action ||
    'TIER4_CONTEST_PDF'
  ) as string;

  const partialOfferCents = evidence?.partialOfferCents ?? evidence?.partial_offer_cents ?? Math.round(amountCents * 0.5);
  const slaRemaining = Math.max(0, Number(evidence?.slaHoursRemaining ?? evidence?.sla_hours_remaining ?? 18) || 0);

  const rawLiability = evidence?.liabilityScoreL ?? evidence?.liability_score_l ?? 0.15;
  const liabilityScoreL = Math.max(0, Math.min(1, Number(rawLiability) || 0));

  const rawAbuse = evidence?.abuseRiskScoreR ?? evidence?.abuse_risk_score_r ?? 0.72;
  const abuseRiskScoreR = Math.max(0, Math.min(1, Number(rawAbuse) || 0));

  // Safeguard coordinates [ymin, xmin, ymax, xmax] clamped within [0, 1]
  const rawBox = evidence?.defectBoundingBox ?? evidence?.defect_bounding_box ?? [0.35, 0.4, 0.55, 0.65];
  let normalizedBox: [number, number, number, number] | null = null;

  if (Array.isArray(rawBox) && rawBox.length === 4) {
    normalizedBox = [
      Math.max(0, Math.min(1, Number(rawBox[0]) || 0)),
      Math.max(0, Math.min(1, Number(rawBox[1]) || 0)),
      Math.max(0, Math.min(1, Number(rawBox[2]) || 0)),
      Math.max(0, Math.min(1, Number(rawBox[3]) || 0)),
    ];
  } else if (rawBox && typeof rawBox === 'object') {
    const objBox = rawBox as { ymin?: number; xmin?: number; ymax?: number; xmax?: number };
    normalizedBox = [
      Math.max(0, Math.min(1, Number(objBox.ymin) || 0)),
      Math.max(0, Math.min(1, Number(objBox.xmin) || 0)),
      Math.max(0, Math.min(1, Number(objBox.ymax) || 0)),
      Math.max(0, Math.min(1, Number(objBox.xmax) || 0)),
    ];
  }

  const ymin = normalizedBox ? Math.min(normalizedBox[0], normalizedBox[2]) : 0;
  const xmin = normalizedBox ? Math.min(normalizedBox[1], normalizedBox[3]) : 0;
  const ymax = normalizedBox ? Math.max(normalizedBox[0], normalizedBox[2]) : 0;
  const xmax = normalizedBox ? Math.max(normalizedBox[1], normalizedBox[3]) : 0;
  const boxHeight = (ymax - ymin) * 100;
  const boxWidth = (xmax - xmin) * 100;
  const defectPercent = Math.round((ymax - ymin) * (xmax - xmin) * 100);

  const tierColors: Record<string, string> = {
    TIER1_REFUND: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40',
    TIER2_PARTIAL_OFFER: 'bg-indigo-950/60 text-indigo-400 border-indigo-500/40',
    TIER3_RETURN_OFFER: 'bg-blue-950/60 text-blue-400 border-blue-500/40',
    TIER4_CONTEST_PDF: 'bg-rose-950/60 text-rose-400 border-rose-500/40',
    TIER5_SLA_ESCALATE: 'bg-amber-950/60 text-amber-400 border-amber-500/40',
  };
  const activeBadgeColor = tierColors[tierActionKey] || 'bg-slate-800 text-slate-300 border-slate-700';

  const handleAction = async (actionRel: string) => {
    if (isSubmitting) return;
    setInternalSubmittingAction(actionRel);
    setActionError(null);
    try {
      if (onTriggerAction) {
        await onTriggerAction(actionRel);
      }
      setLastExecutedAction(actionRel);
    } catch (err: any) {
      setActionError(err.message || `Failed to execute action ${actionRel}`);
    } finally {
      setInternalSubmittingAction(null);
    }
  };

  return (
    <div className="relative group rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl p-6 sm:p-7 shadow-xl shadow-black/5 dark:shadow-black/20 space-y-6 overflow-hidden">
      {/* Top radiant light */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-500/20 via-cyan-400 to-indigo-500/20" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              Dispute Forensics Matrix
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${activeBadgeColor}`}>
                {tierActionKey}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dispute ID: <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{disputeId}</span> • Stage: <span className="text-slate-900 dark:text-white font-mono font-semibold">{stage}</span> • Amount: <strong className="text-slate-900 dark:text-white">{formatCents(amountCents)}</strong>
            </p>
          </div>
        </div>

        {/* SLA Countdown Timer */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#060b14]/80 border border-slate-200/80 dark:border-white/10 text-xs font-mono self-start sm:self-auto shadow-xs">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-slate-500 dark:text-slate-400">SLA Due Date:</span>
          <span className={`font-bold ${slaRemaining <= 20 ? 'text-rose-500 dark:text-rose-400 animate-pulse' : 'text-amber-600 dark:text-amber-400'}`}>
            {slaRemaining}h remaining
          </span>
        </div>
      </div>

      {actionError && (
        <FriendlyErrorTransmuter error={actionError} onDismiss={() => setActionError(null)} />
      )}

      {/* Grid View: Vision Forensics + (L, R) Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Defect Bounding Box Viewer */}
        <div className="relative rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#060b14]/80 p-5 space-y-3.5">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/80 dark:border-white/10">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-cyan-500" />
              Evidence Visual Analysis
            </span>
            {exifTamperFlag ? (
              <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">
                EXIF TAMPER DETECTED
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                EXIF AUTHENTICATED
              </span>
            )}
          </div>

          <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden border border-slate-200/80 dark:border-white/10 flex items-center justify-center shadow-inner">
            {buyerImageUrl ? (
              <img
                src={buyerImageUrl}
                alt={`Disputed evidence for ${disputeId}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-[#060b14] flex items-center justify-center text-slate-500 text-xs font-mono">
                [Buyer Uploaded Evidence]
              </div>
            )}

            {normalizedBox && boxHeight > 0 && boxWidth > 0 && (
              <div
                className="absolute border-2 border-rose-500 bg-rose-500/20 rounded-md shadow-lg shadow-rose-500/30 flex items-start justify-end p-1 pointer-events-none"
                style={{
                  top: `${ymin * 100}%`,
                  left: `${xmin * 100}%`,
                  height: `${boxHeight}%`,
                  width: `${boxWidth}%`,
                }}
              >
                <span className="text-[9px] font-mono bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold shadow-xs">
                  DEFECT {defectPercent}%
                </span>
              </div>
            )}
          </div>

          {buyerStatement && (
            <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/80 dark:bg-[#0c1424] p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              Statement: "{buyerStatement}"
            </p>
          )}

          <div className="text-[11px] font-mono space-y-1.5 text-slate-600 dark:text-slate-400 pt-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500">SOFTWARE EXIF:</span>
              <span className={exifTamperFlag ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                {exifSoftware}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500">CARRIER TRACKING:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-medium">{trackingNumber} ({carrierStatus})</span>
            </div>
          </div>
        </div>

        {/* Right: (L, R) Settlement Matrix Breakdown */}
        <div className="relative rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#060b14]/80 p-5 flex flex-col justify-between font-mono text-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
              <span className="font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                (L, R) Deterministic Arbitration Scores
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">Section 5.3 Grounded</span>
            </div>

            {/* Score Sliders */}
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-sans font-medium">Merchant Liability Score (L):</span>
                  <span className="text-slate-900 dark:text-white font-bold">{liabilityScoreL.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${liabilityScoreL * 100}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">S_defect + S_non_delivery</div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-sans font-medium">Buyer Abuse / Tamper Risk (R):</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">{abuseRiskScoreR.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${abuseRiskScoreR * 100}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">I_tamper + S_velocity</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/80 dark:bg-[#0c1424] border border-slate-200/80 dark:border-white/10 shadow-xs">
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                Decision Rule: Because R = {abuseRiskScoreR.toFixed(2)} {abuseRiskScoreR >= 0.60 ? '>= 0.60' : '< 0.60'}, the autonomous arbiter selected{' '}
                <strong className="text-rose-600 dark:text-rose-400 font-bold">{tierActionKey}</strong> to submit compiled forensic evidence.
              </p>
            </div>
          </div>

          {/* Interactive HATEOAS Actions */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold">AVAILABLE HATEOAS ACTIONS:</span>
              {lastExecutedAction && (
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-mono flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" /> Executed: {lastExecutedAction}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1 font-sans">
              <button
                onClick={() => handleAction('provide-evidence')}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-sm shadow-rose-500/20"
              >
                {internalSubmittingAction === 'provide-evidence' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileCheck className="w-3.5 h-3.5" />
                )}
                <span>Submit Defense Dossier</span>
              </button>

              <button
                onClick={() => handleAction('propose-offer')}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-sm shadow-indigo-500/20"
              >
                {internalSubmittingAction === 'propose-offer' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <DollarSign className="w-3.5 h-3.5" />
                )}
                <span>Propose 50% Offer ({formatCents(partialOfferCents)})</span>
              </button>

              <button
                onClick={() => handleAction('escalate-sla')}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-amber-700 dark:text-amber-300 font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                {internalSubmittingAction === 'escalate-sla' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>Escalate SLA via Bryntum</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
