import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useX402, parseChallengeHeaders } from './useX402.js';

test('useX402: exports and initializes cleanly', () => {
  assert.equal(typeof useX402, 'function');
  assert.equal(typeof parseChallengeHeaders, 'function');
});

test('useX402: parseChallengeHeaders extracts challenge token and WWW-Authenticate properly', () => {
  const headers1 = new Headers({
    'x402-challenge': 'challenge-token-abc-123',
  });
  const parsed1 = parseChallengeHeaders(headers1);
  assert.equal(parsed1.challengeToken, 'challenge-token-abc-123');

  const headers2 = new Headers({
    'pay-to': 'merchant-wallet-vault',
    'payment-required': '{"accepts":[]}',
    'www-authenticate': 'L402 token="sample_token_l402", invoice="lnbc123"',
  });
  const parsed2 = parseChallengeHeaders(headers2);
  assert.equal(parsed2.challengeToken, 'merchant-wallet-vault');
  assert.equal(parsed2.paymentRequiredHeader, '{"accepts":[]}');
  assert.equal(parsed2.wwwAuthenticate, 'L402 token="sample_token_l402", invoice="lnbc123"');
});

test('useX402: parseChallengeHeaders handles empty or missing headers safely', () => {
  const emptyHeaders = new Headers();
  const res = parseChallengeHeaders(emptyHeaders);
  assert.equal(res.challengeToken, null);
  assert.equal(res.paymentRequiredHeader, null);
  assert.equal(res.wwwAuthenticate, null);
});
