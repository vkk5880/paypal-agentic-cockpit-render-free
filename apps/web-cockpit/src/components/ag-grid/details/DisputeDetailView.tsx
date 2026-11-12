'use client';

import React, { useState } from 'react';
import type { CustomCellRendererProps } from 'ag-grid-react';
import { EvidenceComparatorWidget } from '@/components/ag-studio/EvidenceComparatorWidget';
import { HateoasDisputeActionRenderer } from '@/components/ag-studio/HateoasDisputeActionRenderer';
import { ShieldCheck, FileText, Cpu, ShieldAlert } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/utils';

export interface DisputeDetailProps {
  data?: {
    id?: string;
    dispute_id?: string;
    channel3CleanedUrl?: string;
    buyerReturnPhotoUrl?: string;
    defectBoundingBox?: { ymin: number; xmin: number; ymax: number; xmax: number };
    exifTamperFlag?: boolean;
    liabilityScoreL?: number;
    abuseRiskScoreR?: number;
    hateoasAllowedActions?: string[];
    [key: string]: unknown;
  };
}

export function DisputeDetailView(props: CustomCellRendererProps<any> | DisputeDetailProps) {
  const data = (props as any).data || {};

  const disputeId = data.dispute_id || data.id || 'PP-D-DEMO-9001';
  const cleanUrl =
    data.channel3CleanedUrl ||
    data.cleaned_url ||
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80';
  const returnUrl =
    data.buyerReturnPhotoUrl ||
    data.buyer_return_photo_url ||
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80';
  const box = data.defectBoundingBox || { ymin: 0.3, xmin: 0.4, ymax: 0.7, xmax: 0.8 };
  const exifTamper = data.exifTamperFlag !== undefined ? data.exifTamperFlag : true;
  const liabilityL = typeof data.liabilityScoreL === 'number' ? data.liabilityScoreL : 0.18;
  const abuseR = typeof data.abuseRiskScoreR === 'number' ? data.abuseRiskScoreR : 0.84;
  const actions = data.hateoasAllowedActions || ['provide-evidence', 'make-offer'];

  const [isAppealing, setIsAppealing] = useState(false);
  const [appealMessage, setAppealMessage] = useState<string | null>(null);

  const handleAppeal = async () => {
    setIsAppealing(true);
    try {
      const orchestratorUrl = getApiBaseUrl();
      const res = await fetch(`${orchestratorUrl}/api/disputes/${encodeURIComponent(disputeId)}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appeal_reason: 'MERCHANT_RECEIVED_EMPTY_BOX',
          evidence_notes: 'Visual scan confirmed empty box return. Initiating PayPal dispute appeal.',
        }),
      });
      if (res.ok) {
        setAppealMessage('Appeal Submitted');
      } else {
        setAppealMessage('Appeal Failed');
      }
    } catch {
      setAppealMessage('Network Error');
    } finally {
      setIsAppealing(false);
    }
  };

  return (
    <div className="p-4 bg-slate-950/95 border-t border-b border-rose-500/30 text-slate-100 rounded-b-xl my-1 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-rose-400">
            Forensic Dossier & Evidence Comparison: {disputeId}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 border border-rose-500/40 text-rose-300 font-mono flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            Gemini 3.8 Flash Vision Arbiter
          </span>
        </div>

        <div className="flex items-center gap-2">
          {appealMessage ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              {appealMessage}
            </span>
          ) : (
            <button
              onClick={handleAppeal}
              disabled={isAppealing}
              className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-500/40 transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              {isAppealing ? 'Submitting Appeal...' : 'Appeal Decision'}
            </button>
          )}
          <a
            href={`/api/disputes/${disputeId}/dossier`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-white border border-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Compiled pdf-lib Dossier
          </a>
        </div>
      </div>

      {/* Embedded Forensic Comparator */}
      <EvidenceComparatorWidget
        channel3CleanedUrl={cleanUrl}
        buyerReturnPhotoUrl={returnUrl}
        defectBoundingBox={box}
        exifTamperFlag={exifTamper}
        liabilityScoreL={liabilityL}
        abuseRiskScoreR={abuseR}
      />

      {/* Embedded 1-Click Action Resolution */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-400 font-mono">
          One-Click HATEOAS Adjudication (Hold 2s with 5s Undo Buffer):
        </span>
        <HateoasDisputeActionRenderer
          disputeId={disputeId}
          hateoasAllowedActions={actions}
        />
      </div>
    </div>
  );
}

export default DisputeDetailView;
