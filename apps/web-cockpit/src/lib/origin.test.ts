import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeOrigin,
  sanitizeCallbackUrl,
  resolvePublicOrigin,
  getClientOrigin,
} from './origin.js';

test('sanitizeOrigin: rewrites 0.0.0.0 hostname to localhost across ports', () => {
  assert.equal(sanitizeOrigin('http://0.0.0.0:10000'), 'http://localhost:10000');
  assert.equal(sanitizeOrigin('https://0.0.0.0:10000'), 'https://localhost:10000');
  assert.equal(sanitizeOrigin('http://0.0.0.0:3000'), 'http://localhost:3000');
  assert.equal(sanitizeOrigin('http://0.0.0.0'), 'http://localhost');
});

test('sanitizeOrigin: preserves valid domain names and localhost', () => {
  assert.equal(sanitizeOrigin('http://localhost:3000'), 'http://localhost:3000');
  assert.equal(sanitizeOrigin('https://aegispay-unified.onrender.com'), 'https://aegispay-unified.onrender.com');
  assert.equal(sanitizeOrigin('https://aegispay-web-cockpit.onrender.com/path'), 'https://aegispay-web-cockpit.onrender.com');
});

test('sanitizeOrigin: handles invalid, null, and empty inputs gracefully', () => {
  assert.equal(sanitizeOrigin(''), 'http://localhost:3000');
  assert.equal(sanitizeOrigin(null as any), 'http://localhost:3000');
  assert.equal(sanitizeOrigin(undefined as any), 'http://localhost:3000');
  assert.equal(sanitizeOrigin('not-a-valid-url'), 'http://localhost:3000');
});

test('sanitizeCallbackUrl: rewrites 0.0.0.0 while preserving query parameters and paths', () => {
  const badUrl =
    'https://0.0.0.0:10000/auth/vault-callback?cancelled=true&approval_token_id=20S247531L696364N&approval_session_id=20S247531L696364N';
  const expectedUrl =
    'https://localhost:10000/auth/vault-callback?cancelled=true&approval_token_id=20S247531L696364N&approval_session_id=20S247531L696364N';

  assert.equal(sanitizeCallbackUrl(badUrl), expectedUrl);
});

test('sanitizeCallbackUrl: preserves valid URLs untouched', () => {
  const validUrl =
    'https://aegispay-unified.onrender.com/auth/vault-callback?approval_session_id=TOKEN_123';
  assert.equal(sanitizeCallbackUrl(validUrl), validUrl);
});

test('resolvePublicOrigin: prioritizes bodyOrigin when provided and rewrites 0.0.0.0', () => {
  const mockReq = {
    nextUrl: { origin: 'http://0.0.0.0:10000' },
    headers: { get: () => null },
  };

  const resolved = resolvePublicOrigin(mockReq, 'http://0.0.0.0:10000');
  assert.equal(resolved, 'http://localhost:10000');
});

test('resolvePublicOrigin: respects RENDER_EXTERNAL_URL environment variable', () => {
  const prior = process.env.RENDER_EXTERNAL_URL;
  try {
    process.env.RENDER_EXTERNAL_URL = 'https://aegispay-live.onrender.com';
    const mockReq = {
      nextUrl: { origin: 'http://0.0.0.0:10000' },
      headers: { get: () => null },
    };
    const resolved = resolvePublicOrigin(mockReq);
    assert.equal(resolved, 'https://aegispay-live.onrender.com');
  } finally {
    if (prior === undefined) {
      delete process.env.RENDER_EXTERNAL_URL;
    } else {
      process.env.RENDER_EXTERNAL_URL = prior;
    }
  }
});

test('resolvePublicOrigin: uses x-forwarded-host and x-forwarded-proto proxy headers', () => {
  const mockReq = {
    nextUrl: { origin: 'http://0.0.0.0:10000' },
    headers: {
      get: (header: string) => {
        if (header === 'x-forwarded-host') return 'aegispay-custom.domain.com';
        if (header === 'x-forwarded-proto') return 'https';
        return null;
      },
    },
  };

  const resolved = resolvePublicOrigin(mockReq);
  assert.equal(resolved, 'https://aegispay-custom.domain.com');
});

test('resolvePublicOrigin: falls back to req.nextUrl.origin rewritten to localhost when 0.0.0.0', () => {
  const mockReq = {
    nextUrl: { origin: 'http://0.0.0.0:10000' },
    headers: { get: () => null },
  };

  const resolved = resolvePublicOrigin(mockReq);
  assert.equal(resolved, 'http://localhost:10000');
});

test('getClientOrigin: falls back gracefully in Node environment without window', () => {
  assert.equal(getClientOrigin(), 'http://localhost:3000');
});
