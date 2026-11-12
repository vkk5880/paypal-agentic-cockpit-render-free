import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ValueFormatterParams } from 'ag-grid-community';
import { DashboardReports } from './DashboardReports.js';
import {
  DataGrid,
  formatMoney,
  formatTimestamp,
  sanitizeQuickFilter,
  columnTypes,
  type Row,
} from './DataGrid.js';
import { EndpointPage } from './EndpointPage.js';
import { SellerExplainerCard } from './SellerExplainerCard.js';
import BalancesPage from '../../app/(merchant)/merchant/balances/page.js';
import InvoicesPage from '../../app/(merchant)/merchant/invoices/page.js';
import PlansPage from '../../app/(merchant)/merchant/plans/page.js';
import ProductsPage from '../../app/(merchant)/merchant/products/page.js';
import TransactionsPage from '../../app/(merchant)/merchant/transactions/page.js';

test('formatMoney: correctly formats valid numbers and currencies', () => {
  const params1 = {
    value: 1250.5,
    data: { currency: 'USD' },
  } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(params1), '$1,250.50');

  const params2 = {
    value: 99,
    data: { currency: 'EUR' },
  } as unknown as ValueFormatterParams<Row>;
  assert.ok(formatMoney(params2).includes('99.00'));

  const params3 = {
    value: 0,
    data: { currency: 'USD' },
  } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(params3), '$0.00');

  const params4 = {
    value: -45.2,
    data: { currency: 'USD' },
  } as unknown as ValueFormatterParams<Row>;
  assert.ok(formatMoney(params4).includes('45.20'));
});

test('formatMoney: gracefully handles null, undefined, NaN, and invalid currencies', () => {
  const nullVal = { value: null, data: { currency: 'USD' } } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(nullVal), '—');

  const undefinedVal = { value: undefined, data: { currency: 'USD' } } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(undefinedVal), '—');

  const emptyVal = { value: '', data: { currency: 'USD' } } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(emptyVal), '—');

  const nanVal = { value: NaN, data: { currency: 'USD' } } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(nanVal), '—');

  const infVal = { value: Infinity, data: { currency: 'USD' } } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(infVal), '—');

  // Missing or non-string currency falls back to USD
  const missingCurrency = { value: 25.5, data: {} } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(missingCurrency), '$25.50');

  // Invalid currency format (e.g. symbols, lowercase or non-3-letter) sanitized to USD
  const invalidCurrency = { value: 10, data: { currency: 'INVALID_123' } } as unknown as ValueFormatterParams<Row>;
  assert.equal(formatMoney(invalidCurrency), '$10.00');
});

test('formatTimestamp: correctly formats valid ISO strings and Date objects', () => {
  const isoParams = {
    value: '2026-11-04T14:22:00.000Z',
  } as ValueFormatterParams<Row>;
  assert.equal(formatTimestamp(isoParams), '2026-11-04 14:22:00 UTC');

  const dateParams = {
    value: new Date('2026-05-10T12:00:00.000Z'),
  } as ValueFormatterParams<Row>;
  assert.equal(formatTimestamp(dateParams), '2026-05-10 12:00:00 UTC');
});

test('formatTimestamp: gracefully handles null, undefined, empty, and invalid dates', () => {
  assert.equal(formatTimestamp({ value: null } as ValueFormatterParams<Row>), '—');
  assert.equal(formatTimestamp({ value: undefined } as ValueFormatterParams<Row>), '—');
  assert.equal(formatTimestamp({ value: '' } as ValueFormatterParams<Row>), '—');
  assert.equal(formatTimestamp({ value: 'not-a-real-date' } as ValueFormatterParams<Row>), '—');
});

test('sanitizeQuickFilter: safely escapes regex metacharacters and handles non-string inputs', () => {
  assert.equal(sanitizeQuickFilter(null), '');
  assert.equal(sanitizeQuickFilter(undefined), '');
  assert.equal(sanitizeQuickFilter(123), '');
  assert.equal(sanitizeQuickFilter('simple text'), 'simple text');
  assert.equal(sanitizeQuickFilter('   trimmed text   '), 'trimmed text');

  // Special regex characters: [.*+?^${}()|[\]\\]
  const maliciousRegex = '[.*+?^${}()|[\\]\\]';
  const sanitized = sanitizeQuickFilter(maliciousRegex);
  // None of the unescaped characters should remain raw
  assert.equal(sanitized, '\\[\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\\\\\]\\\\\\]');

  // Common quick search queries with symbols
  assert.equal(sanitizeQuickFilter('$100.00 USD'), '\\$100\\.00 USD');
  assert.equal(sanitizeQuickFilter('Order #123 (pending)?'), 'Order #123 \\(pending\\)\\?');
});

test('columnTypes definition registers money, timestamp, and dateTime formatters', () => {
  assert.ok(columnTypes.money);
  assert.equal(columnTypes.money.valueFormatter, formatMoney);
  assert.ok(columnTypes.timestamp);
  assert.equal(columnTypes.timestamp.valueFormatter, formatTimestamp);
  assert.ok(columnTypes.dateTime);
  assert.equal(columnTypes.dateTime.valueFormatter, formatTimestamp);
});

test('DashboardReports renders all 5 report cards and metrics', () => {
  const html = renderToStaticMarkup(
    React.createElement(DashboardReports, {
      metrics: {
        totalProducts: 4,
        activePlans: 2,
        openInvoices: 5,
        usdBalance: '$25,000.00',
        recentTxCount: 12,
      },
    })
  );

  assert.ok(html.includes('Catalog Products'));
  assert.ok(html.includes('Subscription Plans'));
  assert.ok(html.includes('Commercial Invoices'));
  assert.ok(html.includes('Held Balances'));
  assert.ok(html.includes('Transaction Stream'));
  assert.ok(html.includes('$25,000.00'));
  assert.ok(html.includes('/merchant/products'));
  assert.ok(html.includes('/merchant/plans'));
  assert.ok(html.includes('/merchant/invoices'));
  assert.ok(html.includes('/merchant/balances'));
  assert.ok(html.includes('/merchant/transactions'));
});

test('DataGrid renders search input and grid container markup', () => {
  const rows = [
    { id: 'PROD-1', name: 'Software Tier 1', price: 99.0, currency: 'USD' },
    { id: 'PROD-2', name: 'Software Tier 2', price: 199.0, currency: 'USD' },
  ];
  const columns = [
    { field: 'name', headerName: 'Product Name' },
    { field: 'price', headerName: 'Price', type: 'money' },
  ];

  const html = renderToStaticMarkup(
    React.createElement(DataGrid, { rows, columns })
  );

  assert.ok(html.includes('Search all columns…'));
  assert.ok(html.includes('overflow-hidden'));
});

test('EndpointPage renders header metadata, source API, calls, and DataGrid', () => {
  const rows = [{ currency: 'USD', total: 1000 }];
  const columns = [{ field: 'currency', headerName: 'Currency' }];

  const html = renderToStaticMarkup(
    React.createElement(EndpointPage, {
      title: 'Merchant Held Balances',
      calls: ['GET /v1/reporting/balances'],
      source: 'getBalances()',
      note: 'Account balance reporting test note',
      rows,
      columns,
    })
  );

  assert.ok(html.includes('Merchant Held Balances'));
  assert.ok(html.includes('GET /v1/reporting/balances'));
  assert.ok(html.includes('getBalances()'));
  assert.ok(html.includes('Account balance reporting test note'));
  assert.ok(html.includes('1 row'));
  assert.ok(html.includes('Search all columns…'));
});

test('All 5 merchant report subpages load seamlessly under SSR without errors', async () => {
  const balancesEl = await BalancesPage();
  const balancesHtml = renderToStaticMarkup(balancesEl);
  assert.ok(balancesHtml.includes('Merchant Balances'));
  assert.ok(balancesHtml.includes('GET /v1/reporting/balances'));
  assert.ok(balancesHtml.includes('getBalances()'));

  const invoicesEl = await InvoicesPage();
  const invoicesHtml = renderToStaticMarkup(invoicesEl);
  assert.ok(invoicesHtml.includes('Commercial Invoices'));
  assert.ok(invoicesHtml.includes('GET /v2/invoicing/invoices'));
  assert.ok(invoicesHtml.includes('listInvoices()'));

  const plansEl = await PlansPage();
  const plansHtml = renderToStaticMarkup(plansEl);
  assert.ok(plansHtml.includes('Billing Plans'));
  assert.ok(plansHtml.includes('GET /v1/billing/plans'));
  assert.ok(plansHtml.includes('listPlans()'));

  const productsEl = await ProductsPage();
  const productsHtml = renderToStaticMarkup(productsEl);
  assert.ok(productsHtml.includes('Catalog Products'));
  assert.ok(productsHtml.includes('GET /v1/catalogs/products'));
  assert.ok(productsHtml.includes('listProducts()'));

  const txEl = await TransactionsPage();
  const txHtml = renderToStaticMarkup(txEl);
  assert.ok(txHtml.includes('Transaction Search (Last 31 Days)'));
  assert.ok(txHtml.includes('GET /v1/reporting/transactions'));
  assert.ok(txHtml.includes('searchTransactions(start, end)'));
});

test('SellerExplainerCard renders welcome message, 4 feature pillars, and dismiss button', () => {
  const html = renderToStaticMarkup(
    React.createElement(SellerExplainerCard, {})
  );

  assert.ok(html.includes('Welcome to your Seller Hub'));
  assert.ok(html.includes('Sales &amp; Revenue Overview') || html.includes('Sales & Revenue Overview'));
  assert.ok(html.includes('Resolution Center &amp; Returns') || html.includes('Resolution Center & Returns'));
  assert.ok(html.includes('Products &amp; Subscription Plans') || html.includes('Products & Subscription Plans'));
  assert.ok(html.includes('Invoices &amp; Fast Payouts') || html.includes('Invoices & Fast Payouts'));
  assert.ok(html.includes('Got it, Dismiss'));
});

test('EndpointPage renders sleek embedded layout when embedded prop is true', () => {
  const rows = [{ currency: 'USD', total: 1000 }];
  const columns = [{ field: 'currency', headerName: 'Currency' }];

  const html = renderToStaticMarkup(
    React.createElement(EndpointPage, {
      title: 'Commercial Invoices',
      calls: ['GET /v2/invoicing/invoices'],
      source: 'listInvoices()',
      note: 'Embedded invoice table test note',
      rows,
      columns,
      embedded: true,
    })
  );

  assert.ok(html.includes('Commercial Invoices'));
  assert.ok(html.includes('1 Record'));
  assert.ok(html.includes('Embedded invoice table test note'));
  assert.ok(html.includes('Search all columns…'));
  // Should NOT render the full page back-link when embedded
  assert.ok(!html.includes('Back to Seller Portal'));
});
