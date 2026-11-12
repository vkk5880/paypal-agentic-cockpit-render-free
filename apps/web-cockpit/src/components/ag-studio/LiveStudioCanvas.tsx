'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { setupStudioHarness, executeStudioPrompt, type AgStudioMock } from './studioHarness';
import { Bot, Sparkles, Send, Filter, CheckCircle2, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';
import { useUiMode } from '@/context/UiModeContext';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';

export function LiveStudioCanvas() {
  const { showTechnicalDetails } = useUiMode();
  const [studio, setStudio] = useState<AgStudioMock | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ openDisputes?: number; usdBalance?: string }>({});

  useEffect(() => {
    async function fetchCanvasMetrics() {
      try {
        const orchestratorUrl = getApiBaseUrl();
        const res = await fetch(`${orchestratorUrl}/api/merchant/overview-metrics`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err: any) {
        logger.debug('[LiveStudioCanvas] Failed to fetch canvas overview metrics', err?.message);
      }
    }
    fetchCanvasMetrics();
  }, []);

  useEffect(() => {
    logger.info('[LiveStudioCanvas] Initializing AG Studio 3 Live Canvas harness');
    try {
      const s = setupStudioHarness();
      setStudio(s);
      logger.info('[LiveStudioCanvas] AG Studio 3 Live Canvas harness initialized successfully', {
        registeredAgentsCount: s.registeredAgents.length,
        commandsCount: s.commands.size,
        widgetsCount: s.customWidgets.size,
      });
    } catch (err: any) {
      logger.error('[LiveStudioCanvas] Error initializing AG Studio 3 harness', {
        error: err?.message,
        stack: err?.stack,
      });
    }

    return () => {
      logger.info('[LiveStudioCanvas] Unmounting AG Studio 3 Live Canvas');
    };
  }, []);

  const handleRunPrompt = async (textToRun?: string) => {
    const query = (textToRun ?? promptInput).trim();
    logger.info('[LiveStudioCanvas] handleRunPrompt triggered', {
      query,
      hasStudio: Boolean(studio),
      isProcessing,
    });

    if (!query) {
      logger.warn('[LiveStudioCanvas] handleRunPrompt ignored empty prompt query');
      return;
    }
    if (!studio) {
      logger.warn('[LiveStudioCanvas] handleRunPrompt aborted: AG Studio instance not initialized');
      return;
    }

    setIsProcessing(true);
    setAiResponse(null);

    const startTime = Date.now();
    try {
      logger.debug('[LiveStudioCanvas] Executing AG Studio prompt with harness...', { query });
      const res = await executeStudioPrompt(studio, query);
      const elapsedMs = Date.now() - startTime;
      logger.info('[LiveStudioCanvas] AG Studio prompt executed successfully', {
        query,
        commandExecuted: res.commandExecuted,
        hasFilters: Boolean(res.filters && res.filters.length > 0),
        filtersCount: res.filters ? res.filters.length : 0,
        elapsedMs,
      });

      setAiResponse(res.message);
      if (res.filters) {
        logger.debug('[LiveStudioCanvas] Setting active cross-filters on canvas', { filters: res.filters });
        setActiveFilters(res.filters);
      } else {
        logger.debug('[LiveStudioCanvas] No new filters returned; keeping existing filters', { currentCount: activeFilters.length });
      }
    } catch (err: any) {
      const elapsedMs = Date.now() - startTime;
      logger.error('[LiveStudioCanvas] AG Studio prompt execution failed', {
        query,
        error: err?.message,
        stack: err?.stack,
        elapsedMs,
      });
      setAiResponse(`Error: ${err?.message || 'Agent command execution failed'}`);
    } finally {
      setIsProcessing(false);
      logger.debug('[LiveStudioCanvas] handleRunPrompt execution cycle completed');
    }
  };

  const presetPrompts = [
    'Isolate high risk disputes with abuse score > 60%',
    'Highlight unallocated SLA (< 24 hours remaining)',
    'Calculate net clearing margin after Channel3 rebates',
  ];

  return (
    <div className="bg-white/90 dark:bg-[#0c1424]/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/25 border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col h-[530px] relative">
      {/* Top subtle radiant border light */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      {/* Studio Header Bar */}
      <div className="bg-slate-50/90 dark:bg-[#080d19]/90 border-b border-slate-200/80 dark:border-white/5 px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              {showTechnicalDetails
                ? 'AG Studio 3 Live Multi-Agent Canvas'
                : 'AI Resolution Studio & Command Center'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFilters.length > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300">
              <Filter className="w-3 h-3" />
              {activeFilters.length} Active Cross-Filter{activeFilters.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
            AG Studio 3.0 Active
          </span>
        </div>
      </div>

      {/* Natural Language Prompt Bar */}
      <div className="p-3.5 bg-slate-100/70 dark:bg-[#070c18]/70 border-b border-slate-200/80 dark:border-white/5 flex flex-col gap-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunPrompt();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask AG Studio (e.g. 'Isolate high risk disputes', 'Calculate net clearing margin')…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f172a] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-medium placeholder:text-slate-400 transition-colors shadow-inner"
            />
            <Sparkles className="w-4 h-4 absolute left-3 top-3 text-cyan-500" />
          </div>
          <button
            type="submit"
            disabled={isProcessing}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-cyan-600/20 active:scale-95"
          >
            {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Execute
          </button>
        </form>

        {/* Preset Prompt Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold uppercase tracking-wider">Presets:</span>
          {presetPrompts.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                logger.info('[LiveStudioCanvas] Preset prompt selected', { preset, index: idx });
                setPromptInput(preset);
                handleRunPrompt(preset);
              }}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all cursor-pointer border border-slate-200 dark:border-white/10 shadow-xs"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* AI Response Toast */}
      {aiResponse && (
        <div className="px-4 py-2.5 bg-cyan-950/60 border-b border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between font-mono animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{aiResponse}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              logger.debug('[LiveStudioCanvas] Dismissing AI response banner');
              setAiResponse(null);
            }}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Studio Canvas View */}
      <div className="flex-1 bg-slate-50/50 dark:bg-[#060b14] p-4 overflow-y-auto space-y-4">
        {/* Dynamic Studio Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a101f] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-500" />
              Active High-Risk Cases
            </span>
            <p className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {activeFilters.length > 0 ? `${activeFilters.length} Filtered` : `${metrics.openDisputes ?? 0} Cases`}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Abuse Risk &ge; 0.60, Liability &lt; 0.25</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a101f] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
              Net Retained Margin
            </span>
            <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.usdBalance || '$0.00'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Evaluated via Studio Expression Engine</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a101f] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              Studio Widget Registry
            </span>
            <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">3 Custom Widgets</p>
            <p className="text-[10px] text-slate-500 font-mono">EvidenceComparator, Hateoas, AutonomyDial</p>
          </div>
        </div>

        {/* Live Studio Layout Preview Grid */}
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#080e1c]/80 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-200/60 dark:border-white/5 pb-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              AG Studio 3 Page Layout: `page_arbitration`
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Tool Runner: paypal_arbiter Connected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0e172a] border border-slate-200/70 dark:border-white/5 space-y-1.5">
              <div className="font-bold text-cyan-700 dark:text-cyan-300 font-mono text-[11px]">
                Widget: `widget_disputes_grid` (AG Grid SSRM)
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Server-side row model streaming DuckDB-WASM query results. Cross-filtered by Studio Lead Agent commands.
              </p>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Status: <span className="font-bold text-cyan-600 dark:text-cyan-400">{activeFilters.length > 0 ? 'CROSS-FILTERED' : 'STREAMING LIVE'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0e172a] border border-slate-200/70 dark:border-white/5 space-y-1.5">
              <div className="font-bold text-purple-700 dark:text-purple-300 font-mono text-[11px]">
                Widget: `widget_settlement_chart` (AG Charts)
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Integrated grouped column chart reflecting active grid cell selections and dynamic aggregations.
              </p>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Aggregation: <span className="font-bold text-purple-600 dark:text-purple-400">`Net_Retained_Margin` Computed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveStudioCanvas;
