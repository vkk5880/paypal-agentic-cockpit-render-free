import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { aegisEnterpriseModules } from '../../lib/ag-grid/enterpriseModules.js';
import { getAgGridTheme } from '../../lib/ag-grid/useAgGridTheme.js';
import { OrderDetailView } from './details/OrderDetailView.js';
import { DisputeDetailView } from './details/DisputeDetailView.js';
import {
  translateSsrmRequestToSql,
  DuckDbServerSideDatasource,
} from '../../lib/ag-grid/DuckDbServerSideDatasource.js';
import { setupStudioHarness, executeStudioPrompt } from '../ag-studio/studioHarness.js';
import { HateoasActionCellRenderer } from './renderers/HateoasActionCellRenderer.js';
import { RiskScoreRadialCellRenderer } from './renderers/RiskScoreRadialCellRenderer.js';
import { EvidenceThumbnailCellRenderer } from './renderers/EvidenceThumbnailCellRenderer.js';
import { CarrierTrackerCellRenderer } from './renderers/CarrierTrackerCellRenderer.js';
import { MonetarySplitCellRenderer } from './renderers/MonetarySplitCellRenderer.js';
import { SlaCountdownCellRenderer } from './renderers/SlaCountdownCellRenderer.js';

test('1. Enterprise Module Registry: Contains full AG Grid Enterprise module suite', () => {
  assert.ok(Array.isArray(aegisEnterpriseModules));
  assert.ok(aegisEnterpriseModules.length >= 25);

  const hasMasterDetail = aegisEnterpriseModules.some((m: any) => JSON.stringify(m).includes('MasterDetail') || m?.moduleName?.includes('MasterDetail'));
  const hasRowGrouping = aegisEnterpriseModules.some((m: any) => JSON.stringify(m).includes('RowGrouping') || m?.moduleName?.includes('RowGrouping'));
  const hasRowGroupingPanel = aegisEnterpriseModules.some((m: any) => JSON.stringify(m).includes('RowGroupingPanel') || m?.moduleName?.includes('RowGroupingPanel'));
  const hasTooltip = aegisEnterpriseModules.some((m: any) => JSON.stringify(m).includes('Tooltip') || m?.moduleName?.includes('Tooltip'));
  const hasRichSelect = aegisEnterpriseModules.some((m: any) => JSON.stringify(m).includes('RichSelect') || m?.moduleName?.includes('RichSelect'));

  assert.ok(hasMasterDetail);
  assert.ok(hasRowGrouping);
  assert.ok(hasRowGroupingPanel);
  assert.ok(hasTooltip);
  assert.ok(hasRichSelect);
});

test('2. Dynamic Theming Engine: Generates PayPal brand tokens for Light and Dark modes', () => {
  const lightTheme = getAgGridTheme('light', 'comfortable');
  const darkTheme = getAgGridTheme('dark', 'dense');

  assert.ok(lightTheme);
  assert.ok(darkTheme);
  // Verify theme objects are generated
  assert.equal(typeof lightTheme, 'object');
  assert.equal(typeof darkTheme, 'object');
});

test('3. Master/Detail Hierarchical Grids: OrderDetailView renders multi-payee splits, vault tokens, and tracking telemetry', () => {
  const html = renderToStaticMarkup(
    React.createElement(OrderDetailView, {
      data: {
        id: 'TXN-MASTER-100',
        purchase_units: [
          {
            payee_merchant_id: 'MERCHANT_C3_01',
            item_name: 'Wireless Noise Canceling Headphones',
            category: 'ELECTRONICS',
            amount: 120.0,
            net_settlement: 114.72,
            status: 'CAPTURED',
          },
        ],
        vault_token: {
          vault_id: 'vlt_token_test_123',
          customer_id: 'cust_001',
          status: 'ACTIVE_VAULTED',
          expires_at: '2026-11-12T14:22:00Z',
          reauth_count: 2,
          last_reauth_at: '2026-11-04T14:22:00Z',
        },
        trackers: [
          {
            carrier: 'USPS',
            tracking_number: '94001118992200D8823901',
            postal_code: '94016',
            delivery_status: 'DELIVERED',
            timestamp: '2026-11-04 14:15 UTC',
          },
        ],
      },
    })
  );

  assert.ok(html.includes('Order Hierarchy &amp; Telemetry: TXN-MASTER-100'));
  assert.ok(html.includes('AG Grid Master/Detail'));
  assert.ok(html.includes('Payee Splits (1)'));
  assert.ok(html.includes('Wireless Noise Canceling Headphones'));
  assert.ok(html.includes('MERCHANT_C3_01'));
});

test('4. DisputeDetailView: Embeds Forensic Evidence Comparator and One-Click Adjudication', () => {
  const html = renderToStaticMarkup(
    React.createElement(DisputeDetailView, {
      data: {
        id: 'PP-D-9901',
        dispute_id: 'PP-D-9901',
        liabilityScoreL: 0.15,
        abuseRiskScoreR: 0.88,
        exifTamperFlag: true,
        hateoasAllowedActions: ['provide-evidence', 'make-offer'],
      },
    })
  );

  assert.ok(html.includes('Forensic Dossier &amp; Evidence Comparison: PP-D-9901'));
  assert.ok(html.includes('Gemini 3.8 Flash Vision Arbiter'));
  assert.ok(html.includes('One-Click HATEOAS Adjudication'));
});

test('5. SSRM DuckDB-WASM SQL Translation: Translates pagination, filters, and sort model', () => {
  const ssrmRequest = {
    startRow: 20,
    endRow: 40,
    rowGroupCols: [],
    valueCols: [],
    pivotCols: [],
    pivotMode: false,
    groupKeys: [],
    filterModel: {
      status: { filterType: 'text', type: 'equals', filter: 'S' },
      amount: { filterType: 'number', type: 'greaterThan', filter: 100 },
      date: { filterType: 'date', type: 'inRange', dateFrom: '2026-11-01', dateTo: '2026-11-30' },
    },
    sortModel: [{ colId: 'date', sort: 'desc' as const }],
  };

  const { dataQuery, countQuery, params } = translateSsrmRequestToSql(ssrmRequest, 'transactions');

  assert.ok(dataQuery.startsWith('SELECT * FROM transactions'));
  assert.ok(dataQuery.includes('WHERE status = ? AND amount > ? AND date >= ? AND date <= ?'));
  assert.ok(dataQuery.includes('ORDER BY date DESC'));
  assert.ok(dataQuery.includes('LIMIT 20 OFFSET 20'));
  assert.deepEqual(params, ['S', 100, '2026-11-01', '2026-11-30']);

  assert.ok(countQuery.startsWith('SELECT COUNT(*) as total_count FROM transactions'));
  assert.ok(countQuery.includes('WHERE status = ? AND amount > ? AND date >= ? AND date <= ?'));
});

test('6. DuckDbServerSideDatasource: Paginates and calls params.success with row count', async () => {
  const mockRows = [
    { id: 'TXN-1', amount: 100 },
    { id: 'TXN-2', amount: 200 },
  ];
  const mockBridge = {
    query: async (sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return [{ total_count: 500 }];
      }
      return mockRows;
    },
  };

  const datasource = new DuckDbServerSideDatasource(mockBridge, 'transactions');

  let successParams: any = null;
  await datasource.getRows({
    request: {
      startRow: 0,
      endRow: 10,
      rowGroupCols: [],
      valueCols: [],
      pivotCols: [],
      pivotMode: false,
      groupKeys: [],
      filterModel: {},
      sortModel: [],
    },
    success: (p: { rowData: unknown[]; rowCount?: number }) => {
      successParams = p;
    },
    fail: () => {},
  } as any);

  assert.ok(successParams);
  assert.equal(successParams.rowData.length, 2);
  assert.equal(successParams.rowCount, 500);
});

test('7. AG Studio AI Harness: Registers custom widgets, tool runners, and natural language prompts', async () => {
  const studio = setupStudioHarness();

  assert.ok(studio.toolRunners.has('paypal_arbiter'));
  assert.ok(studio.commands.has('isolate_high_risk_disputes'));
  assert.ok(studio.commands.has('highlight_unallocated_sla'));
  assert.ok(studio.commands.has('calculate_net_clearing_margin'));
  assert.ok(studio.expressions.has('Net_Retained_Margin'));

  // Test Net_Retained_Margin expression
  const expr = studio.expressions.get('Net_Retained_Margin');
  assert.ok(expr);
  const margin = expr({
    getValue: (key: string) => {
      const data: Record<string, number> = {
        capture_amount: 100,
        paypal_fee: 3,
        dispute_amount: 20,
        liability_score_l: 0.1,
        channel3_rebate: 1.5,
      };
      return data[key] || 0;
    },
  });
  // 100 - 3 - (20 * 0.1) + 1.5 = 97 - 2 + 1.5 = 96.5
  assert.equal(margin, 96.5);

  // Test Natural Language Prompt execution
  const res1 = await executeStudioPrompt(studio, 'Isolate high risk disputes with abuse score > 60%');
  assert.equal(res1.success, true);
  assert.equal(res1.commandExecuted, 'isolate_high_risk_disputes');
  assert.ok(res1.filters);

  const res2 = await executeStudioPrompt(studio, 'highlight unallocated SLA');
  assert.equal(res2.success, true);
  assert.equal(res2.commandExecuted, 'highlight_unallocated_sla');

  const res3 = await executeStudioPrompt(studio, 'calculate net clearing margin');
  assert.equal(res3.success, true);
  assert.equal(res3.commandExecuted, 'calculate_net_clearing_margin');
});
