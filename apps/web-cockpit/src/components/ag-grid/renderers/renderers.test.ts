import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HateoasActionCellRenderer } from './HateoasActionCellRenderer.js';
import { RiskScoreRadialCellRenderer } from './RiskScoreRadialCellRenderer.js';
import { EvidenceThumbnailCellRenderer } from './EvidenceThumbnailCellRenderer.js';
import { CarrierTrackerCellRenderer } from './CarrierTrackerCellRenderer.js';
import { MonetarySplitCellRenderer } from './MonetarySplitCellRenderer.js';
import { SlaCountdownCellRenderer } from './SlaCountdownCellRenderer.js';

test('HateoasActionCellRenderer renders action buttons and handles null data', () => {
  // Null data safety
  const nullHtml = renderToStaticMarkup(
    React.createElement(HateoasActionCellRenderer, { data: undefined } as any)
  );
  assert.ok(nullHtml.includes('—'));

  // With active actions
  const html = renderToStaticMarkup(
    React.createElement(HateoasActionCellRenderer, {
      data: {
        disputeId: 'PP-D-TEST-123',
        hateoasAllowedActions: ['accept-claim', 'make-offer', 'provide-evidence'],
      },
    } as any)
  );
  assert.ok(html.includes('Accept Claim'));
  assert.ok(html.includes('Make Offer'));
  assert.ok(html.includes('Evidence'));
});

test('RiskScoreRadialCellRenderer renders SVG radial arcs and scores', () => {
  const html = renderToStaticMarkup(
    React.createElement(RiskScoreRadialCellRenderer, {
      data: {
        liability_score_l: 0.22,
        abuse_risk_score_r: 0.85,
        exif_tamper_flag: true,
      },
    } as any)
  );

  assert.ok(html.includes('svg'));
  assert.ok(html.includes('L: 22%'));
  assert.ok(html.includes('R: 85%'));
});

test('EvidenceThumbnailCellRenderer renders Channel3 pristine vs return thumbnails', () => {
  const html = renderToStaticMarkup(
    React.createElement(EvidenceThumbnailCellRenderer, {
      data: {
        channel3CleanedUrl: 'https://example.com/pristine.jpg',
        buyerReturnPhotoUrl: 'https://example.com/return.jpg',
      },
    } as any)
  );

  assert.ok(html.includes('C3'));
  assert.ok(html.includes('Ret'));
  assert.ok(html.includes('Diff'));
});

test('CarrierTrackerCellRenderer renders carrier badge and tracking status', () => {
  const html = renderToStaticMarkup(
    React.createElement(CarrierTrackerCellRenderer, {
      data: {
        carrier: 'USPS',
        tracking_number: '94001118992200000001',
        delivery_status: 'DELIVERED',
        postal_code: '94016',
      },
    } as any)
  );

  assert.ok(html.includes('USPS'));
  assert.ok(html.includes('94001118992200000001'));
  assert.ok(html.includes('DELIVERED'));
});

test('MonetarySplitCellRenderer renders gross, PayPal fee, and Channel3 rebate', () => {
  const html = renderToStaticMarkup(
    React.createElement(MonetarySplitCellRenderer, {
      data: {
        gross_amount: 150.0,
        paypal_fee: 4.65,
        channel3_rebate: 2.25,
        currency: 'USD',
      },
    } as any)
  );

  assert.ok(html.includes('150.00'));
  assert.ok(html.includes('(PP)'));
  assert.ok(html.includes('(C3)'));
});

test('SlaCountdownCellRenderer renders SLA timer badge', () => {
  const html = renderToStaticMarkup(
    React.createElement(SlaCountdownCellRenderer, {
      data: {
        seller_response_due_date: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
      },
    } as any)
  );

  assert.ok(html.includes('h '));
  assert.ok(html.includes('m '));
  assert.ok(html.includes('s'));
});
