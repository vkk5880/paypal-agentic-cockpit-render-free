import * as duckdb from '@duckdb/duckdb-wasm';
import { createLogger, type Logger } from '@aegispay/shared-types';
import { translateSsrmRequestToSql } from '../lib/ag-grid/DuckDbServerSideDatasource.js';

const logger: Logger = createLogger('Worker:DuckDB');

export interface AnonymizedDisputeRecord {
  paypal_dispute_id: string;
  dispute_reason: string;
  dispute_state: string;
  dispute_amount_cents: number;
  liability_score_l: number;
  abuse_risk_score_r: number;
  exif_tamper_flag: boolean;
  selected_tier_action: string;
  seller_response_due_date: string;
  // NOTE: compiled_evidence_pdf_base64 is deliberately EXCLUDED from the in-browser Arrow schema
  // to avoid WebAssembly linear memory heap exhaustion across high dispute volumes.
}

/**
 * Web Worker Message Protocol Definitions
 */
export type DuckDBWorkerAction = 'QUERY' | 'INGEST' | 'INGEST_RECORD_BATCH' | 'AGGREGATE' | 'CLEAR_CACHE' | 'SSRM_QUERY';

export interface DuckDBQueryPayload {
  query: string;
  params?: any[];
}

export interface DuckDBIngestPayload {
  tableName?: string;
  records: AnonymizedDisputeRecord[];
}

export interface DuckDBAggregatePayload {
  records?: AnonymizedDisputeRecord[];
  dimension?: 'selected_tier_action' | 'dispute_reason' | 'dispute_state';
  metric?: 'count' | 'sum_amount' | 'avg_liability' | 'avg_abuse_risk';
}

export interface DuckDBWorkerMessage {
  id: string;
  action: DuckDBWorkerAction;
  payload?: DuckDBQueryPayload | DuckDBIngestPayload | DuckDBAggregatePayload | Record<string, unknown>;
  timestamp?: number;
}

export interface DuckDBWorkerSuccessResponse<T = any> {
  id: string;
  action: DuckDBWorkerAction;
  success: true;
  data: T;
  fallback?: boolean;
  executionTimeMs?: number;
}

export interface DuckDBWorkerErrorResponse {
  id: string;
  action?: DuckDBWorkerAction;
  success: false;
  error: string;
  code?: string;
}

export type DuckDBWorkerResponse<T = any> = DuckDBWorkerSuccessResponse<T> | DuckDBWorkerErrorResponse;

export interface DisputeTierAggregationResult {
  tier: string;
  count: number;
  total_dispute_amount_cents: number;
  avg_liability: number;
  avg_abuse_risk: number;
}

/**
 * Validates incoming Web Worker message contracts.
 * Returns true if valid, throws Error if invalid or returns false when safeCheck is true.
 */
export function validateWorkerMessage(message: unknown): message is DuckDBWorkerMessage {
  if (!message || typeof message !== 'object') {
    logger.warn('[duckdb.worker] validateWorkerMessage rejected: message is null, undefined, or non-object');
    return false;
  }

  const msg = message as Record<string, any>;

  if (typeof msg.id !== 'string' || msg.id.trim() === '') {
    logger.warn('[duckdb.worker] validateWorkerMessage rejected: missing or empty message.id');
    return false;
  }

  const validActions: DuckDBWorkerAction[] = ['QUERY', 'INGEST', 'INGEST_RECORD_BATCH', 'AGGREGATE', 'CLEAR_CACHE', 'SSRM_QUERY'];
  if (!validActions.includes(msg.action)) {
    logger.warn('[duckdb.worker] validateWorkerMessage rejected: invalid action', { action: msg.action });
    return false;
  }

  if (msg.action === 'SSRM_QUERY') {
    if (!msg.payload || typeof msg.payload !== 'object' || !msg.payload.request || typeof msg.payload.request !== 'object') {
      logger.warn('[duckdb.worker] validateWorkerMessage rejected: invalid SSRM_QUERY payload');
      return false;
    }
  }

  if (msg.action === 'QUERY') {
    if (!msg.payload || typeof msg.payload !== 'object') {
      logger.warn('[duckdb.worker] validateWorkerMessage rejected: missing QUERY payload');
      return false;
    }
    if (typeof msg.payload.query !== 'string' || msg.payload.query.trim() === '') {
      logger.warn('[duckdb.worker] validateWorkerMessage rejected: missing or empty query string');
      return false;
    }
    if (msg.payload.params !== undefined && !Array.isArray(msg.payload.params)) {
      logger.warn('[duckdb.worker] validateWorkerMessage rejected: query params must be an array');
      return false;
    }
  }

  if (msg.action === 'INGEST' || msg.action === 'INGEST_RECORD_BATCH') {
    if (!msg.payload || typeof msg.payload !== 'object' || !Array.isArray(msg.payload.records)) {
      logger.warn('[duckdb.worker] validateWorkerMessage rejected: records must be an array for INGEST');
      return false;
    }
  }

  if (msg.action === 'AGGREGATE') {
    if (msg.payload !== undefined && (typeof msg.payload !== 'object' || msg.payload === null)) {
      logger.warn('[duckdb.worker] validateWorkerMessage rejected: invalid AGGREGATE payload');
      return false;
    }
    if (msg.payload?.records !== undefined && !Array.isArray(msg.payload.records)) {
      logger.warn('[duckdb.worker] validateWorkerMessage rejected: AGGREGATE records must be an array');
      return false;
    }
  }

  logger.debug('[duckdb.worker] validateWorkerMessage validated successfully', { id: msg.id, action: msg.action });
  return true;
}

/**
 * Projects a raw dispute database record or webhook delta into an optimized DuckDB-WASM Arrow row,
 * explicitly stripping heavy binary payloads like compiled_evidence_pdf_base64.
 */
export function projectOptimizedDisputeRecord(rawRecord: any): AnonymizedDisputeRecord {
  return {
    paypal_dispute_id: String(rawRecord.paypal_dispute_id),
    dispute_reason: String(rawRecord.dispute_reason || 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED'),
    dispute_state: String(rawRecord.dispute_state || 'REQUIRED_ACTION'),
    dispute_amount_cents: Number(rawRecord.dispute_amount_cents || 0),
    liability_score_l: Number(rawRecord.liability_score_l || 0),
    abuse_risk_score_r: Number(rawRecord.abuse_risk_score_r || 0),
    exif_tamper_flag: Boolean(rawRecord.exif_tamper_flag),
    selected_tier_action: String(rawRecord.selected_tier_action || 'TIER1_REFUND'),
    seller_response_due_date: String(rawRecord.seller_response_due_date || new Date().toISOString()),
  };
}

/**
 * Helper to assert whether an Arrow/DuckDB record contains bulky PDF base64 blobs.
 */
export function hasPdfBase64Payload(record: any): boolean {
  return 'compiled_evidence_pdf_base64' in record && Boolean(record.compiled_evidence_pdf_base64);
}

/**
 * Loads the heavy compiled forensic PDF dossier on-demand via the dedicated REST endpoint,
 * keeping the WebAssembly linear memory lean and decoupled.
 */
export async function fetchDisputeDossier(disputeId: string, apiBaseUrl = ''): Promise<{
  dispute_id: string;
  compiled_evidence_pdf_base64?: string;
  dossier_url?: string;
  status: string;
}> {
  const url = `${apiBaseUrl}/api/disputes/${encodeURIComponent(disputeId)}/dossier`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch dispute dossier for ${disputeId}: ${res.status}`);
  }
  return await res.json();
}

/**
 * Validates that an incoming query is strictly a read-only SELECT or WITH statement.
 * Rejects non-read-only queries (e.g. INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, ATTACH, COPY).
 * Guards against stacked queries (semicolon injection), dangerous internal functions, and SQL evasion tricks.
 */
export function validateReadOnlySelectQuery(query: string): boolean {
  if (!query || typeof query !== 'string') {
    logger.warn('[duckdb.worker] validateReadOnlySelectQuery rejected: query is null or non-string');
    return false;
  }

  // Strip leading/trailing SQL comments (-- comment or /* comment */) and whitespace
  const sanitized = query
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  if (!sanitized) {
    logger.warn('[duckdb.worker] validateReadOnlySelectQuery rejected: empty sanitized query');
    return false;
  }

  // Check for semicolon injection / stacked queries:
  // If a semicolon exists before the end of the query and is followed by any non-whitespace, reject.
  const withoutTrailingSemicolons = sanitized.replace(/;+\s*$/, '');
  if (withoutTrailingSemicolons.includes(';')) {
    logger.warn('[duckdb.worker] validateReadOnlySelectQuery rejected: stacked query / semicolon detected', {
      sanitized: withoutTrailingSemicolons,
    });
    return false;
  }

  // Check for unbalanced string quotes which can break parser state
  const singleQuotes = (sanitized.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    logger.warn('[duckdb.worker] validateReadOnlySelectQuery rejected: unbalanced single quotes');
    return false;
  }

  // Must start with SELECT or WITH (case-insensitive)
  if (!/^(SELECT|WITH)\b/i.test(withoutTrailingSemicolons)) {
    logger.warn('[duckdb.worker] validateReadOnlySelectQuery rejected: query does not start with SELECT or WITH');
    return false;
  }

  // Prohibit dangerous DDL, mutation, file I/O, installation, and pragma statements
  const forbiddenKeywords = [
    /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|ATTACH|DETACH|COPY|PRAGMA|EXPORT|LOAD|INSTALL)\b/i,
    /\b(EXEC|EXECUTE|SYSTEM|CALL|GRANT|REVOKE|VACUUM|CHECKPOINT)\b/i,
    /\bread_csv\b/i,
    /\bread_parquet\b/i,
    /\bparquet_scan\b/i,
    /\bto_csv\b/i,
    /\bto_parquet\b/i,
  ];

  for (const regex of forbiddenKeywords) {
    if (regex.test(withoutTrailingSemicolons)) {
      logger.warn('[duckdb.worker] validateReadOnlySelectQuery rejected: matched forbidden keyword or I/O function', {
        pattern: regex.toString(),
      });
      return false;
    }
  }

  logger.debug('[duckdb.worker] validateReadOnlySelectQuery approved query');
  return true;
}

/**
 * Whitelist-based query builder for dynamic dispute analytics.
 * Protects against SQL injection by allowing only strictly validated identifiers and sort directions.
 */
const ALLOWED_DIMENSIONS = new Set([
  'selected_tier_action',
  'dispute_reason',
  'dispute_state',
  'exif_tamper_flag',
]);

const ALLOWED_SORT_DIRECTIONS = new Set(['ASC', 'DESC']);

export function buildSafeAnalyticsQuery(options: {
  dimension?: string;
  sortBy?: 'count' | 'avg_liability' | 'total_amount';
  sortDirection?: 'ASC' | 'DESC';
  minLiability?: number;
}): { query: string; params: any[] } {
  const dimension = options.dimension || 'selected_tier_action';
  if (!ALLOWED_DIMENSIONS.has(dimension)) {
    throw new Error(`Invalid dimension: ${dimension}. Permitted: ${Array.from(ALLOWED_DIMENSIONS).join(', ')}`);
  }

  const sortDirection = options.sortDirection || 'DESC';
  if (!ALLOWED_SORT_DIRECTIONS.has(sortDirection)) {
    throw new Error(`Invalid sort direction: ${sortDirection}`);
  }

  const sortFieldMap: Record<string, string> = {
    count: 'count',
    avg_liability: 'avg_liability',
    total_amount: 'total_amount_cents',
  };
  const sortBy = sortFieldMap[options.sortBy || 'count'] || 'count';

  const params: any[] = [];
  let whereClause = '';

  if (options.minLiability !== undefined && !Number.isNaN(options.minLiability)) {
    whereClause = 'WHERE liability_score_l >= ?';
    params.push(Number(options.minLiability));
  }

  const query = `SELECT ${dimension}, COUNT(*) as count, SUM(dispute_amount_cents) as total_amount_cents, ROUND(AVG(CAST(liability_score_l AS FLOAT)), 3) as avg_liability, ROUND(AVG(CAST(abuse_risk_score_r AS FLOAT)), 3) as avg_abuse_risk FROM dispute_arbitrations ${whereClause} GROUP BY ${dimension} ORDER BY ${sortBy} ${sortDirection}`.trim();

  return { query, params };
}

// Bounded LRU prepared statement cache mapping normalized query string to compiled prepared statement
const MAX_STATEMENT_CACHE_SIZE = 50;
const statementCache = new Map<string, duckdb.AsyncPreparedStatement>();

/**
 * Sets the maximum number of cached prepared statements (useful for tuning or tests).
 */
let currentMaxCacheSize = MAX_STATEMENT_CACHE_SIZE;
export function setMaxStatementCacheSize(size: number): void {
  currentMaxCacheSize = Math.max(1, size);
}

/**
 * Evicts the oldest prepared statement in the statementCache if it exceeds currentMaxCacheSize.
 * Closes the statement to prevent WebAssembly linear heap memory leaks.
 */
async function evictOldestIfNeeded(): Promise<void> {
  while (statementCache.size >= currentMaxCacheSize) {
    const oldestKey = statementCache.keys().next().value;
    if (!oldestKey) break;
    logger.debug('[duckdb.worker] Evicting oldest prepared statement from LRU cache', {
      key: oldestKey,
      currentCacheSize: statementCache.size,
    });
    const stmt = statementCache.get(oldestKey);
    statementCache.delete(oldestKey);
    if (stmt) {
      try {
        await stmt.close();
      } catch (err: any) {
        logger.warn('[duckdb.worker] Failed to close prepared statement during eviction', {
          error: err?.message,
        });
      }
    }
  }
}

/**
 * Clears the prepared statement cache and closes each prepared statement.
 */
export async function clearStatementCache(): Promise<void> {
  logger.info('[duckdb.worker] Clearing prepared statement cache', {
    cachedStatementsCount: statementCache.size,
  });
  const closePromises: Promise<void>[] = [];
  for (const stmt of statementCache.values()) {
    try {
      closePromises.push(
        stmt.close().catch((err) => {
          logger.warn('[duckdb.worker] Error closing statement during clearStatementCache', {
            error: err?.message,
          });
        })
      );
    } catch (err: any) {
      logger.warn('[duckdb.worker] Exception closing statement during clearStatementCache', {
        error: err?.message,
      });
    }
  }
  await Promise.all(closePromises);
  statementCache.clear();
  logger.info('[duckdb.worker] Prepared statement cache cleared');
}

/**
 * Returns the current number of cached prepared statements.
 */
export function getStatementCacheSize(): number {
  return statementCache.size;
}

/**
 * Checks if WebAssembly is supported in the current runtime environment.
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly !== 'object' || typeof WebAssembly.validate !== 'function') {
      return false;
    }
    // Minimal valid WebAssembly module: '\0asm\1\0\0\0'
    const bin = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    return WebAssembly.validate(bin);
  } catch {
    return false;
  }
}

/**
 * Fallback in-memory analytics aggregator for AnonymizedDisputeRecord items.
 * Used when WebAssembly is blocked, unavailable, or throws linear memory errors.
 */
export function computeDisputeAnalyticsFallback(
  records: AnonymizedDisputeRecord[],
  dimension: 'selected_tier_action' | 'dispute_reason' | 'dispute_state' = 'selected_tier_action'
): DisputeTierAggregationResult[] {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  const groups = new Map<
    string,
    {
      count: number;
      total_amount_cents: number;
      sum_liability: number;
      sum_abuse_risk: number;
    }
  >();

  for (const r of records) {
    const groupKey = String(r[dimension] || 'UNKNOWN');
    let entry = groups.get(groupKey);
    if (!entry) {
      entry = { count: 0, total_amount_cents: 0, sum_liability: 0, sum_abuse_risk: 0 };
      groups.set(groupKey, entry);
    }
    entry.count += 1;
    entry.total_amount_cents += Number(r.dispute_amount_cents || 0);
    entry.sum_liability += Number(r.liability_score_l || 0);
    entry.sum_abuse_risk += Number(r.abuse_risk_score_r || 0);
  }

  const results: DisputeTierAggregationResult[] = [];
  for (const [tier, data] of groups.entries()) {
    results.push({
      tier,
      count: data.count,
      total_dispute_amount_cents: data.total_amount_cents,
      avg_liability: Number((data.sum_liability / data.count).toFixed(3)),
      avg_abuse_risk: Number((data.sum_abuse_risk / data.count).toFixed(3)),
    });
  }

  // Sort descending by count
  results.sort((a, b) => b.count - a.count);
  return results;
}

export async function initDuckDbWorker() {
  logger.info('[duckdb.worker] Initializing DuckDB-WASM Worker and bundle selection');
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  logger.debug('[duckdb.worker] DuckDB bundle selected', {
    mainModule: bundle.mainModule,
    pthreadWorker: bundle.pthreadWorker,
  });

  const worker = new Worker(bundle.mainWorker!);
  const duckLogger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(duckLogger, worker);

  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  logger.info('[duckdb.worker] DuckDB-WASM database instantiated successfully');

  return db;
}

/**
 * Executes a read-only query against the in-memory DuckDB ledger.
 * Validates query is read-only SELECT, reuses cached prepared statements for repeated queries,
 * enforces LRU eviction, and guarantees connection cleanup in a try ... finally block to prevent connection leaks.
 */
export async function queryAnonymizedFinancialLedger(
  db: duckdb.AsyncDuckDB,
  query: string,
  params: any[] = []
) {
  logger.info('[duckdb.worker] Executing queryAnonymizedFinancialLedger', {
    queryPreview: query.slice(0, 100),
    paramsCount: params.length,
  });

  if (!validateReadOnlySelectQuery(query)) {
    logger.error('[duckdb.worker] Query rejected by validateReadOnlySelectQuery', { query });
    throw new Error('Query rejected: Only read-only SELECT queries are permitted');
  }

  const startTime = Date.now();
  const conn = await db.connect();

  try {
    let stmt = statementCache.get(query);
    if (!stmt) {
      logger.debug('[duckdb.worker] Statement cache miss, compiling new prepared statement');
      await evictOldestIfNeeded();
      stmt = await conn.prepare(query);
      statementCache.set(query, stmt);
    } else {
      logger.debug('[duckdb.worker] Statement cache hit, reusing prepared statement');
      // Re-insert to refresh LRU order
      statementCache.delete(query);
      statementCache.set(query, stmt);
    }

    const result = await stmt.query(...params);
    const rows = result.toArray();
    const durationMs = Date.now() - startTime;
    logger.info('[duckdb.worker] Query executed successfully via DuckDB-WASM', {
      durationMs,
      rowsReturned: rows.length,
    });
    return rows;
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    logger.error('[duckdb.worker] Query execution failed in DuckDB-WASM', {
      error: err?.message,
      stack: err?.stack,
      durationMs,
    });
    throw err;
  } finally {
    await conn.close();
  }
}

/**
 * Safely executes analytics queries with transparent pure-TypeScript fallback.
 * If DuckDB-WASM is not initialized or fails, gracefully aggregates using in-memory fallback.
 */
export async function queryFinancialLedgerWithFallback(
  db: duckdb.AsyncDuckDB | null | undefined,
  query: string,
  params: any[] = [],
  fallbackRecords: AnonymizedDisputeRecord[] = []
): Promise<{ result: any[]; fallback: boolean }> {
  if (!validateReadOnlySelectQuery(query)) {
    logger.error('[duckdb.worker] queryFinancialLedgerWithFallback rejected: non-read-only query', { query });
    throw new Error('Query rejected: Only read-only SELECT queries are permitted');
  }

  const wasmOk = isWasmSupported();
  logger.debug('[duckdb.worker] queryFinancialLedgerWithFallback assessing execution path', {
    hasDb: Boolean(db),
    wasmSupported: wasmOk,
  });

  if (db && wasmOk) {
    try {
      const rows = await queryAnonymizedFinancialLedger(db, query, params);
      return { result: rows, fallback: false };
    } catch (err: any) {
      logger.warn('[duckdb.worker] WASM query execution failed, falling back to pure-TS aggregation', {
        error: err?.message,
        stack: err?.stack,
      });
      // If WASM execution fails (e.g. heap exhaustion or runtime panic), fallback gracefully
    }
  } else {
    logger.info('[duckdb.worker] Running pure-TS in-memory aggregation fallback (WASM unavailable or db null)');
  }

  // Graceful pure TS fallback
  const fallbackResult = computeDisputeAnalyticsFallback(fallbackRecords);
  return { result: fallbackResult, fallback: true };
}

/**
 * Central Web Worker message handler for worker threads.
 * Validates message contracts and dispatches actions safely.
 */
export async function handleWorkerMessage(
  db: duckdb.AsyncDuckDB | null,
  message: unknown,
  cachedRecords: AnonymizedDisputeRecord[] = []
): Promise<DuckDBWorkerResponse> {
  if (!validateWorkerMessage(message)) {
    logger.warn('[duckdb.worker] handleWorkerMessage failed contract validation', { message });
    return {
      id: typeof (message as any)?.id === 'string' ? (message as any).id : 'unknown',
      success: false,
      error: 'Invalid worker message contract or schema violation',
      code: 'CONTRACT_VALIDATION_ERROR',
    };
  }

  const startTime = Date.now();
  logger.info('[duckdb.worker] handleWorkerMessage processing action', {
    id: message.id,
    action: message.action,
  });

  try {
    switch (message.action) {
      case 'QUERY': {
        const payload = message.payload as DuckDBQueryPayload;
        logger.debug('[duckdb.worker] Action QUERY details', { id: message.id, query: payload.query });
        const res = await queryFinancialLedgerWithFallback(
          db,
          payload.query,
          payload.params || [],
          cachedRecords
        );
        const elapsed = Date.now() - startTime;
        logger.info('[duckdb.worker] Action QUERY completed', {
          id: message.id,
          fallback: res.fallback,
          rows: res.result.length,
          executionTimeMs: elapsed,
        });
        return {
          id: message.id,
          action: message.action,
          success: true,
          data: res.result,
          fallback: res.fallback,
          executionTimeMs: elapsed,
        };
      }
      case 'AGGREGATE': {
        const payload = (message.payload || {}) as DuckDBAggregatePayload;
        const records = payload.records || cachedRecords;
        logger.debug('[duckdb.worker] Action AGGREGATE details', {
          id: message.id,
          dimension: payload.dimension,
          recordsCount: records.length,
        });
        const aggResult = computeDisputeAnalyticsFallback(records, payload.dimension);
        const elapsed = Date.now() - startTime;
        logger.info('[duckdb.worker] Action AGGREGATE completed', {
          id: message.id,
          categories: aggResult.length,
          executionTimeMs: elapsed,
        });
        return {
          id: message.id,
          action: message.action,
          success: true,
          data: aggResult,
          fallback: true,
          executionTimeMs: elapsed,
        };
      }
      case 'SSRM_QUERY': {
        const payload = message.payload as any;
        const request = payload.request;
        const tableName = payload.tableName || 'dispute_arbitrations';
        const { dataQuery, countQuery, params } = translateSsrmRequestToSql(request, tableName);
        logger.debug('[duckdb.worker] Action SSRM_QUERY SQL translated', {
          id: message.id,
          tableName,
          dataQuery,
          countQuery,
        });

        if (db && isWasmSupported()) {
          try {
            const rows = await queryAnonymizedFinancialLedger(db, dataQuery, params);
            const countRows = await queryAnonymizedFinancialLedger(db, countQuery, params);
            const totalCount = countRows?.[0]?.total_count ?? (countRows?.[0]?.count ? Number(countRows[0].count) : rows.length);
            const elapsed = Date.now() - startTime;
            logger.info('[duckdb.worker] Action SSRM_QUERY completed via WASM', {
              id: message.id,
              rowCount: totalCount,
              returnedRows: rows.length,
              executionTimeMs: elapsed,
            });
            return {
              id: message.id,
              action: message.action,
              success: true,
              data: { rowData: rows, rowCount: totalCount },
              fallback: false,
              executionTimeMs: elapsed,
            };
          } catch (err: any) {
            logger.warn('[duckdb.worker] SSRM_QUERY failed in WASM, falling back to sliced memory array', {
              error: err?.message,
            });
            // Fall through to fallback
          }
        }

        // In-memory fallback
        const start = request.startRow ?? 0;
        const end = request.endRow ?? (start + 100);
        const sliced = cachedRecords.slice(start, end);
        const elapsed = Date.now() - startTime;
        logger.info('[duckdb.worker] Action SSRM_QUERY completed via in-memory fallback', {
          id: message.id,
          start,
          end,
          slicedCount: sliced.length,
          totalCached: cachedRecords.length,
          executionTimeMs: elapsed,
        });
        return {
          id: message.id,
          action: message.action,
          success: true,
          data: { rowData: sliced, rowCount: cachedRecords.length },
          fallback: true,
          executionTimeMs: elapsed,
        };
      }
      case 'CLEAR_CACHE': {
        logger.info('[duckdb.worker] Action CLEAR_CACHE invoked', { id: message.id });
        await clearStatementCache();
        const elapsed = Date.now() - startTime;
        return {
          id: message.id,
          action: message.action,
          success: true,
          data: { cleared: true },
          executionTimeMs: elapsed,
        };
      }
      case 'INGEST':
      case 'INGEST_RECORD_BATCH': {
        const payload = message.payload as DuckDBIngestPayload;
        logger.info('[duckdb.worker] Ingesting record batch into worker state', {
          id: message.id,
          recordsCount: payload.records.length,
          action: message.action,
        });
        const projected = payload.records.map(projectOptimizedDisputeRecord);
        const elapsed = Date.now() - startTime;
        logger.info('[duckdb.worker] Record batch projection complete', {
          id: message.id,
          projectedCount: projected.length,
          executionTimeMs: elapsed,
        });
        return {
          id: message.id,
          action: message.action,
          success: true,
          data: { ingested_count: projected.length },
          executionTimeMs: elapsed,
        };
      }
      default: {
        logger.warn('[duckdb.worker] Unhandled worker action received', {
          id: message.id,
          action: (message as any).action,
        });
        return {
          id: message.id,
          success: false,
          error: `Unhandled worker action: ${(message as any).action}`,
          code: 'UNHANDLED_ACTION',
        };
      }
    }
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    logger.error('[duckdb.worker] Worker message processing encountered uncaught error', {
      id: message.id,
      action: message.action,
      error: err?.message,
      stack: err?.stack,
      executionTimeMs: elapsed,
    });
    return {
      id: message.id,
      action: message.action,
      success: false,
      error: err?.message || 'Worker processing error',
      code: 'EXECUTION_ERROR',
    };
  }
}
