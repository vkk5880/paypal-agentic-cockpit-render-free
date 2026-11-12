import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, sanitizeForLogging, resolveLogLevel } from './logger.js';

test('createLogger: initializes with namespace and supports log levels', () => {
  const logger = createLogger('Test:Namespace', { minLevel: 'debug' });
  assert.equal(logger.namespace, 'Test:Namespace');
  assert.equal(logger.minLevel, 'debug');

  // Verify child logger
  const child = logger.child('Sub');
  assert.equal(child.namespace, 'Test:Namespace:Sub');
  assert.equal(child.minLevel, 'debug');
});

test('sanitizeForLogging: redacts sensitive keys and prevents circular references', () => {
  const sensitiveObj: Record<string, any> = {
    authorization: 'Bearer secret_token_123',
    cookie: 'session=abc',
    token: 'jwt_val',
    vault_token: 'vault_val',
    client_secret: 'secret_val',
    api_key: 'key_123',
    apiKey: 'key_456',
    refresh_token: 'refresh_val',
    token_count: 150, // Should NOT be redacted
    safe_data: 'visible',
    nested: {
      password: 'mypassword',
      allowed: 42,
    },
  };
  // Add circular reference
  sensitiveObj.circular = sensitiveObj;

  const sanitized = sanitizeForLogging(sensitiveObj);

  assert.equal(sanitized.authorization, '[REDACTED]');
  assert.equal(sanitized.cookie, '[REDACTED]');
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.vault_token, '[REDACTED]');
  assert.equal(sanitized.client_secret, '[REDACTED]');
  assert.equal(sanitized.api_key, '[REDACTED]');
  assert.equal(sanitized.apiKey, '[REDACTED]');
  assert.equal(sanitized.refresh_token, '[REDACTED]');
  assert.equal(sanitized.token_count, 150);
  assert.equal(sanitized.safe_data, 'visible');
  assert.equal(sanitized.nested.password, '[REDACTED]');
  assert.equal(sanitized.nested.allowed, 42);
  assert.equal(sanitized.circular, '[Circular Reference]');
});

test('sanitizeForLogging: serializes Error objects with stack traces', () => {
  const err = new Error('Test failure');
  const sanitized = sanitizeForLogging(err);

  assert.equal(sanitized.name, 'Error');
  assert.equal(sanitized.message, 'Test failure');
  assert.ok(typeof sanitized.stack === 'string');
});

test('resolveLogLevel: respects explicit minLevel, DEBUG env, and LOG_LEVEL', () => {
  assert.equal(resolveLogLevel('warn'), 'warn');

  const oldDebug = process.env.DEBUG;
  const oldLogLevel = process.env.LOG_LEVEL;

  try {
    process.env.DEBUG = 'true';
    assert.equal(resolveLogLevel(), 'debug');

    delete process.env.DEBUG;
    process.env.LOG_LEVEL = 'error';
    assert.equal(resolveLogLevel(), 'error');
  } finally {
    if (oldDebug !== undefined) process.env.DEBUG = oldDebug;
    else delete process.env.DEBUG;
    if (oldLogLevel !== undefined) process.env.LOG_LEVEL = oldLogLevel;
    else delete process.env.LOG_LEVEL;
  }
});

test('time(): tracks elapsed execution duration accurately', async () => {
  const logger = createLogger('Test:Timer', { minLevel: 'silent' });
  const endTimer = logger.time('benchmark-operation');
  await new Promise((r) => setTimeout(r, 15));
  const elapsed = endTimer('finished payload processing');
  assert.ok(elapsed >= 10, `Expected elapsed >= 10ms, got ${elapsed}`);
});
