import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../server/rate-limit.js';

test('allows up to the limit then blocks with a retry delay', () => {
  const t = 0;
  const rl = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => t });
  for (let i = 0; i < 3; i++) assert.equal(rl.check('a').allowed, true);
  const blocked = rl.check('a');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
});

test('window slides and keys are independent', () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
  assert.equal(rl.check('a').allowed, true);
  assert.equal(rl.check('b').allowed, true);
  assert.equal(rl.check('a').allowed, false);
  t = 1001;
  assert.equal(rl.check('a').allowed, true);
});

test('sweep drops expired keys', () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
  rl.check('a');
  rl.check('b');
  assert.equal(rl.size(), 2);
  t = 5000;
  rl.sweep();
  assert.equal(rl.size(), 0);
});
