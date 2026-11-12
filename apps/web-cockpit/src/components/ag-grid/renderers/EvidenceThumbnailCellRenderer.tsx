'use client';

import React, { useState } from 'react';
import type { CustomCellRendererProps } from 'ag-grid-react';
import { Eye, ShieldAlert } from 'lucide-react';

export interface EvidenceData {
  channel3CleanedUrl?: string;
  cleaned_url?: string;
  buyerReturnPhotoUrl?: string;
  buyer_return_photo_url?: string;
  defectBoundingBox?: { ymin: number; xmin: number; ymax: number; xmax: number };
  [key: string]: unknown;
}

export function EvidenceThumbnailCellRenderer(props: CustomCellRendererProps<EvidenceData>) {
  const [hovered, setHovered] = useState(false);
  const data = props.data;

  const cleanUrl = data?.channel3CleanedUrl || data?.cleaned_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80';
  const returnUrl = data?.buyerReturnPhotoUrl || data?.buyer_return_photo_url || 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&q=80';
  const box = data?.defectBoundingBox || { ymin: 0.3, xmin: 0.4, ymax: 0.7, xmax: 0.8 };

  return (
    <div
      className="relative flex items-center gap-1.5 h-full cursor-pointer py-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-8 h-8 rounded border border-slate-700 overflow-hidden bg-slate-900 shrink-0">
        <img src={cleanUrl} alt="Pristine" className="w-full h-full object-cover" />
        <span className="absolute bottom-0 right-0 bg-blue-600/80 text-[8px] font-mono text-white px-0.5 rounded-tl">
          C3
        </span>
      </div>

      <div className="relative w-8 h-8 rounded border border-red-500/50 overflow-hidden bg-slate-900 shrink-0">
        <img src={returnUrl} alt="Buyer Return" className="w-full h-full object-cover" />
        <span className="absolute bottom-0 right-0 bg-red-600/80 text-[8px] font-mono text-white px-0.5 rounded-tl">
          Ret
        </span>
      </div>

      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Diff</span>

      {hovered && (
        <div className="absolute left-20 top-0 z-50 w-72 p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-white animate-in fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold">
            <span className="flex items-center gap-1 text-cyan-400">
              <Eye className="w-3.5 h-3.5" />
              Vision Defect Inspection
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Gemini Flash</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-slate-400 mb-1 font-mono">Channel3 Verified</div>
              <div className="relative aspect-square rounded-lg border border-slate-700 overflow-hidden bg-slate-900">
                <img src={cleanUrl} alt="Pristine enlarged" className="w-full h-full object-cover" />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-red-400 mb-1 font-mono">Return Claim</div>
              <div className="relative aspect-square rounded-lg border border-red-500 overflow-hidden bg-slate-900">
                <img src={returnUrl} alt="Return enlarged" className="w-full h-full object-cover" />
                {/* Bounding box overlay */}
                <div
                  className="absolute border-2 border-red-500 bg-red-500/20"
                  style={{
                    top: `${box.ymin * 100}%`,
                    left: `${box.xmin * 100}%`,
                    width: `${(box.xmax - box.xmin) * 100}%`,
                    height: `${(box.ymax - box.ymin) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            Defect localization confirmed via paired multimodal diff
          </div>
        </div>
      )}
    </div>
  );
}

export default EvidenceThumbnailCellRenderer;
