import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeShareData,
  decodeShareData,
  buildShareUrl,
  copyToClipboard,
  safeUtf8ToBase64,
  safeBase64ToUtf8,
  type ShareData,
} from './share.js';

test('share.ts: encodeShareData and decodeShareData round-trip cleanly with unicode characters', () => {
  const data: ShareData = {
    query: 'Bose ANC Headphones 🎧 — 20% off',
    winner: {
      title: 'AcousticPro ANC Studio Headphones (Midnight) — Special Edition ★',
      price: 249.99,
      source: 'Amazon',
      link: 'https://example.com/product/123',
      score: 96.5,
      justification: 'Best active noise cancellation & battery life value.',
      rating: 4.8,
      review_count: 512,
    },
    total_compared: 14,
    timestamp: '2026-04-17T12:00:00.000Z',
  };

  const encoded = encodeShareData(data);
  assert.equal(typeof encoded, 'string');
  assert.ok(encoded.length > 0);

  const decoded = decodeShareData(encoded);
  assert.deepEqual(decoded, data);
});

test('share.ts: safeUtf8ToBase64 and safeBase64ToUtf8 handle UTF-8 symbols and emojis', () => {
  const text = 'Cyberpunk 2077: 🚀 Phantom Liberty ★ ¥ € £';
  const b64 = safeUtf8ToBase64(text);
  assert.ok(b64.length > 0);
  const back = safeBase64ToUtf8(b64);
  assert.equal(back, text);
});

test('share.ts: decodeShareData handles invalid base64 or corrupted json gracefully', () => {
  assert.equal(decodeShareData('not-valid-base64-@@!#'), null);
  assert.equal(decodeShareData(btoa('invalid-json-payload')), null);
  assert.equal(decodeShareData(''), null);
  assert.equal(decodeShareData(null as unknown as string), null);
});

test('share.ts: buildShareUrl constructs valid share query URL', () => {
  const data: ShareData = {
    query: 'Mechanical Keyboard',
    winner: {
      title: 'NuPhy Air75 V2',
      price: 119.95,
      source: 'NuPhy Direct',
      link: 'https://nuphy.com/products/air75-v2',
      score: 94.2,
    },
    total_compared: 8,
    timestamp: '2026-04-17T12:00:00.000Z',
  };

  const urlStr = buildShareUrl(data);
  const parsed = new URL(urlStr);
  assert.equal(parsed.pathname, '/share');
  const dParam = parsed.searchParams.get('d');
  assert.ok(dParam);
  const decoded = decodeShareData(dParam);
  assert.deepEqual(decoded, data);
});

test('share.ts: copyToClipboard handles SSR and missing navigator gracefully', async () => {
  const res = await copyToClipboard('test copy');
  assert.equal(typeof res, 'boolean');
});
