import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AutonomyDialWidget } from './AutonomyDialWidget.js';
import { EvidenceComparatorWidget } from './EvidenceComparatorWidget.js';
import { HateoasDisputeActionRenderer } from './HateoasDisputeActionRenderer.js';

test('AutonomyDialWidget renders 3 modes correctly', () => {
  const html = renderToStaticMarkup(
    React.createElement(AutonomyDialWidget, { initialMode: 'SUPERVISED' })
  );

  assert.ok(html.includes('Merchant Autonomy Dial'));
  assert.ok(html.includes('Co-Pilot'));
  assert.ok(html.includes('Supervised'));
  assert.ok(html.includes('Full Autonomous'));
  assert.ok(html.includes('&lt; $50 Micro-Refunds'));
});

test('EvidenceComparatorWidget renders forensic rationale card with metrics', () => {
  const html = renderToStaticMarkup(
    React.createElement(EvidenceComparatorWidget, {
      channel3CleanedUrl: 'https://example.com/clean.jpg',
      buyerReturnPhotoUrl: 'https://example.com/damaged.jpg',
      defectBoundingBox: { ymin: 0.2, xmin: 0.3, ymax: 0.6, xmax: 0.7 },
      exifTamperFlag: true,
      liabilityScoreL: 0.2,
      abuseRiskScoreR: 0.85,
    })
  );

  assert.ok(html.includes('Forensic Rationale Card'));
  assert.ok(html.includes('Carrier Match:'));
  assert.ok(html.includes('EXIF Integrity:'));
  assert.ok(html.includes('EXIF TAMPER DETECTED'));
  assert.ok(html.includes('Recommended Tier Action'));
  assert.ok(html.includes('Tier 4 — Autonomous Forensic Defense'));
});

test('HateoasDisputeActionRenderer renders hold buttons and preview icon', () => {
  const html = renderToStaticMarkup(
    React.createElement(HateoasDisputeActionRenderer, {
      disputeId: 'PP-D-TEST',
      hateoasAllowedActions: ['provide-evidence', 'make-offer', 'accept-claim'],
    })
  );

  assert.ok(html.includes('Submit PDF Defense (Hold 2s)'));
  assert.ok(html.includes('Offer 35% Settlement (Hold 2s)'));
  assert.ok(html.includes('Accept Synthetic Bid (Hold 2s)'));
  assert.ok(html.includes('Preview Destructive pdf-lib Dossier'));
});
