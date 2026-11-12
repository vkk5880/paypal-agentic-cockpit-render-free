'use client';

import { useState, useEffect, useRef } from 'react';
import { webLogger as logger } from '@/lib/logger';
import { getApiBaseUrl } from '@/lib/utils';

export interface ScoredProduct {
  title: string;
  price: number;
  rating: number;
  review_count: number;
  source: string;
  link: string;
  score: number;
  /** Plain-English deal verdict from compare_agent */
  verdict?: string;
  /** CSS hex color for the verdict text */
  verdict_colour?: string;
  /** True when Serper/Groq returned an actual rating (not defaulted) */
  rating_verified?: boolean;
  /** Raw signal from Serper — false means rating was missing in API response */
  has_real_rating?: boolean;
  /** Synthetic 30-day historical average price (Price History Context) */
  historical_30d_avg?: number | null;
  /** % drop from 30-day average — positive means current price is lower */
  price_drop_pct?: number | null;
  /** Trust tier classification */
  trust_tier?: string;
}

export interface Recommendation extends ScoredProduct {
  justification: string;
  rank: number;
  total_compared: number;
  community_sentiment?: string;
}

export interface BudgetMiss {
  product: ScoredProduct;
  budget: number;
  overage: number;
  overage_pct: number;
  message: string;
}

export interface StreamResult {
  type: 'result';
  query: string;
  scored_products: ScoredProduct[];
  recommendation: Recommendation | null;
  budget_miss?: BudgetMiss | null;
  /** Two top contenders for the Battle Arena */
  battle_contenders?: ScoredProduct[] | null;
  /** LLM referee verdict from decision_agent */
  battle_report?: string | null;
  error: string | null;
}

const MAX_STREAM_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 8000;

export function useAgentStream(query: string | null) {
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<StreamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  useEffect(() => {
    if (!query) {
      logger.debug('[useAgentStream:Query] No query provided, idle state');
      return;
    }
    let isActive = true;
    let usedFallback = false;
    reconnectAttemptsRef.current = 0;

    logger.info('[useAgentStream:Init] Initializing SSE search stream for query', { query });

    const cleanupActiveConnection = () => {
      if (esRef.current) {
        logger.debug('[useAgentStream:Cleanup] Closing EventSource connection');
        esRef.current.close();
        esRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    cleanupActiveConnection();

    setLoading(true);
    setResult(null);
    setStatus('');
    setStreamError(null);

    const apiUrl = getApiBaseUrl();

    const runFallbackSearch = async (reason: string) => {
      if (usedFallback || !isActive) {
        logger.debug('[useAgentStream:Fallback] Fallback already executed or hook inactive');
        return;
      }
      usedFallback = true;
      cleanupActiveConnection();
      logger.warn('[useAgentStream:Fallback] Initiating fallback HTTP search endpoint', { reason, query });
      setStatus('Live stream interrupted. Retrying via HTTP endpoint...');
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const endpointUrl = `${apiUrl}/api/search?user_id=demo`;
        logger.debug('[useAgentStream:Fallback] POST request to search fallback', { endpointUrl });
        const res = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!isActive) return;
        logger.info('[useAgentStream:Fallback] Fallback HTTP search completed successfully', {
          productCount: data.scored_products?.length || 0,
          hasRecommendation: !!data.recommendation,
        });
        setResult({
          type: 'result',
          query: data.query ?? query,
          scored_products: data.scored_products ?? [],
          recommendation: data.recommendation ?? null,
          budget_miss: data.budget_miss ?? null,
          battle_contenders: data.battle_contenders ?? null,
          battle_report: data.battle_report ?? null,
          error: data.error ?? null,
        });
        setStreamError(reason);
        setLoading(false);
      } catch (err: any) {
        if (!isActive) return;
        logger.error('[useAgentStream:FallbackError] Fallback HTTP request failed', {
          error: err?.message || String(err),
          stack: err?.stack,
        });
        setStreamError('Connection to agent server failed. Is the API running?');
        setLoading(false);
      }
    };

    const armTimeout = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        logger.warn('[useAgentStream:Timeout] Stream read inactivity timeout reached (30s)');
        runFallbackSearch('Live stream timed out. Loaded fallback response.');
      }, 30000);
    };

    const connectStream = () => {
      if (!isActive || usedFallback) return;

      const url = `${apiUrl}/api/search/stream?query=${encodeURIComponent(query)}`;
      logger.info('[useAgentStream:Connect] Opening SSE EventSource connection', { url });
      const es = new EventSource(url);
      esRef.current = es;

      armTimeout();

      es.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          logger.debug('[useAgentStream:Chunk] Message chunk received', { type: data.type });
          armTimeout();
          // Reset reconnect count on active message received
          reconnectAttemptsRef.current = 0;

          if (data.type === 'result') {
            logger.info('[useAgentStream:Result] Result received from stream, closing connection', {
              scoredCount: data.scored_products?.length || 0,
            });
            setResult(data as StreamResult);
            setLoading(false);
            cleanupActiveConnection();
          } else if (data.type === 'error') {
            logger.warn('[useAgentStream:ErrorChunk] Error received from stream', { message: data.message });
            setStreamError(data.message);
            setStatus(data.message);
            setLoading(false);
            cleanupActiveConnection();
          } else if (data.type === 'status') {
            logger.debug('[useAgentStream:StatusChunk] Status update received', { message: data.message });
            setStatus(data.message);
          }
        } catch (parseErr: any) {
          logger.warn('[useAgentStream:ParseWarning] Non-JSON stream message received or parse error', {
            error: parseErr?.message || String(parseErr),
            rawChunkLength: e.data?.length,
          });
        }
      };

      es.onerror = (err) => {
        if (!isActive || usedFallback) return;

        logger.warn('[useAgentStream:Error] EventSource error encountered', {
          readyState: es.readyState,
          reconnectAttempts: reconnectAttemptsRef.current,
        });

        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }

        if (reconnectAttemptsRef.current < MAX_STREAM_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const attempt = reconnectAttemptsRef.current;
          const backoff = Math.min(
            BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 300,
            MAX_RECONNECT_DELAY_MS
          );
          logger.info('[useAgentStream:Reconnect] Scheduling stream reconnection', {
            attempt,
            maxAttempts: MAX_STREAM_RECONNECT_ATTEMPTS,
            backoffMs: backoff,
          });
          setStatus(`Reconnecting stream (attempt ${attempt}/${MAX_STREAM_RECONNECT_ATTEMPTS})...`);

          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isActive && !usedFallback) {
              connectStream();
            }
          }, backoff);
        } else {
          logger.warn('[useAgentStream:Exhausted] Max stream reconnect attempts exceeded, falling back to HTTP');
          runFallbackSearch('Live stream disconnected after retries. Loaded fallback response.');
        }
      };
    };

    connectStream();

    return () => {
      logger.debug('[useAgentStream:Teardown] Tearing down useAgentStream hook effect', { query });
      isActive = false;
      cleanupActiveConnection();
    };
  }, [query]);

  return { status, result, loading, streamError };
}
