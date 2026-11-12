import type {
  IServerSideDatasource,
  IServerSideGetRowsParams,
  IServerSideGetRowsRequest,
} from 'ag-grid-community';

/**
 * Validates and sanitizes column identifiers to guard against SQL injection.
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid SQL column identifier: ${identifier}`);
  }
  return identifier;
}

export interface SsrmSqlTranslationResult {
  dataQuery: string;
  countQuery: string;
  params: any[];
}

/**
 * Translates an AG Grid Server-Side Row Model request into safe, parameterized DuckDB SQL queries.
 */
export function translateSsrmRequestToSql(
  request: IServerSideGetRowsRequest,
  tableName = 'transactions'
): SsrmSqlTranslationResult {
  const safeTable = sanitizeSqlIdentifier(tableName);
  const whereClauses: string[] = [];
  const params: any[] = [];

  // 1. Group keys filter (when navigating drill-downs in grouped rows)
  if (Array.isArray(request.rowGroupCols) && Array.isArray(request.groupKeys)) {
    for (let i = 0; i < request.groupKeys.length; i++) {
      const groupCol = request.rowGroupCols[i];
      const groupKey = request.groupKeys[i];
      if (groupCol?.id) {
        whereClauses.push(`${sanitizeSqlIdentifier(groupCol.id)} = ?`);
        params.push(groupKey);
      }
    }
  }

  // 2. Filter model translation
  if (request.filterModel && typeof request.filterModel === 'object') {
    for (const [colId, filter] of Object.entries(request.filterModel)) {
      const safeCol = sanitizeSqlIdentifier(colId);
      const f = filter as any;

      if (!f) continue;

      if (f.filterType === 'text') {
        const val = String(f.filter || '');
        if (f.type === 'equals') {
          whereClauses.push(`${safeCol} = ?`);
          params.push(val);
        } else if (f.type === 'startsWith') {
          whereClauses.push(`${safeCol} LIKE ?`);
          params.push(`${val}%`);
        } else if (f.type === 'endsWith') {
          whereClauses.push(`${safeCol} LIKE ?`);
          params.push(`%${val}`);
        } else {
          // default contains
          whereClauses.push(`${safeCol} LIKE ?`);
          params.push(`%${val}%`);
        }
      } else if (f.filterType === 'number') {
        const numVal = Number(f.filter);
        if (f.type === 'greaterThan') {
          whereClauses.push(`${safeCol} > ?`);
          params.push(numVal);
        } else if (f.type === 'greaterThanOrEqual') {
          whereClauses.push(`${safeCol} >= ?`);
          params.push(numVal);
        } else if (f.type === 'lessThan') {
          whereClauses.push(`${safeCol} < ?`);
          params.push(numVal);
        } else if (f.type === 'lessThanOrEqual') {
          whereClauses.push(`${safeCol} <= ?`);
          params.push(numVal);
        } else {
          whereClauses.push(`${safeCol} = ?`);
          params.push(numVal);
        }
      } else if (f.filterType === 'set' && Array.isArray(f.values) && f.values.length > 0) {
        const placeholders = f.values.map(() => '?').join(', ');
        whereClauses.push(`${safeCol} IN (${placeholders})`);
        params.push(...f.values);
      } else if (f.filterType === 'date') {
        const dateFrom = f.dateFrom ? String(f.dateFrom) : '';
        const dateTo = f.dateTo ? String(f.dateTo) : '';
        if (f.type === 'greaterThan' && dateFrom) {
          whereClauses.push(`${safeCol} > ?`);
          params.push(dateFrom);
        } else if (f.type === 'lessThan' && dateFrom) {
          whereClauses.push(`${safeCol} < ?`);
          params.push(dateFrom);
        } else if (f.type === 'inRange' && dateFrom && dateTo) {
          whereClauses.push(`${safeCol} >= ? AND ${safeCol} <= ?`);
          params.push(dateFrom, dateTo);
        } else if (dateFrom) {
          whereClauses.push(`${safeCol} = ?`);
          params.push(dateFrom);
        }
      }
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 3. Sorting
  let orderSql = '';
  if (Array.isArray(request.sortModel) && request.sortModel.length > 0) {
    const orderItems = request.sortModel
      .map((item) => {
        const col = sanitizeSqlIdentifier(item.colId);
        const dir = item.sort === 'desc' ? 'DESC' : 'ASC';
        return `${col} ${dir}`;
      })
      .join(', ');
    orderSql = `ORDER BY ${orderItems}`;
  }

  // 4. Pagination
  const startRow = request.startRow ?? 0;
  const endRow = request.endRow ?? (startRow + 100);
  const limit = Math.max(1, endRow - startRow);
  const offset = Math.max(0, startRow);

  const countQuery = `SELECT COUNT(*) as total_count FROM ${safeTable} ${whereSql}`.trim();
  const dataQuery = `SELECT * FROM ${safeTable} ${whereSql} ${orderSql} LIMIT ${limit} OFFSET ${offset}`.trim();

  return {
    dataQuery,
    countQuery,
    params,
  };
}

export interface DuckDbQueryBridge {
  query: (sql: string, params: any[]) => Promise<any[]>;
}

/**
 * AG Grid Enterprise ServerSideRowModel datasource powered by local DuckDB-WASM OLAP execution.
 */
export class DuckDbServerSideDatasource implements IServerSideDatasource {
  private bridge: DuckDbQueryBridge;
  private tableName: string;
  private fallbackData: any[];

  constructor(bridge: DuckDbQueryBridge, tableName = 'transactions', fallbackData: any[] = []) {
    this.bridge = bridge;
    this.tableName = tableName;
    this.fallbackData = fallbackData;
  }

  async getRows(params: IServerSideGetRowsParams): Promise<void> {
    const request = params.request;

    try {
      const { dataQuery, countQuery, params: sqlParams } = translateSsrmRequestToSql(
        request,
        this.tableName
      );

      // Execute queries via DuckDB-WASM bridge
      const [rows, countRes] = await Promise.all([
        this.bridge.query(dataQuery, sqlParams),
        this.bridge.query(countQuery, sqlParams),
      ]);

      const totalCount = countRes?.[0]?.total_count ?? (countRes?.[0]?.count ? Number(countRes[0].count) : rows.length);

      params.success({
        rowData: rows,
        rowCount: totalCount,
      });
    } catch (err) {
      // In case DuckDB fails or is initializing, use in-memory fallback slice
      if (this.fallbackData.length > 0) {
        const start = request.startRow ?? 0;
        const end = request.endRow ?? (start + 100);
        const slice = this.fallbackData.slice(start, end);
        params.success({
          rowData: slice,
          rowCount: this.fallbackData.length,
        });
      } else {
        params.fail();
      }
    }
  }

  destroy(): void {
    // Cleanup if needed
  }
}
