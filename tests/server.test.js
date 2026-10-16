import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpServer } from '../server/app.js';

const silent = { error() {}, warn() {}, log() {} };
const config = { rateLimitPerMinute: 50, rateLimitPerDay: 100, allowedOrigins: [], trustProxy: false };
const valid = { lang: 'en', messages: [{ role: 'user', content: 'Hi' }] };
let server, base, replyImpl, chatCalls = 0;

before(async () => {
  replyImpl = async () => ({ ok: true, reply: 'Hello from the model' });
  const chatService = { reply: async (payload) => { chatCalls++; return replyImpl(payload); } };
  server = createHttpServer({ chatService, aiEnabled: true, config, logger: silent });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (body, headers = {}) => fetch(`${base}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

async function withServer(options, fn) {
  const s = createHttpServer({ aiEnabled: true, logger: silent, ...options });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  try { await fn(`http://127.0.0.1:${s.address().port}`); } finally { s.close(); }
}

test('serves the portfolio and only whitelisted files', async () => {
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(`${base}/i18n.js`)).status, 200);
  assert.equal((await fetch(`${base}/assets/favicon.svg`)).status, 200);
  const hidden = ['/package.json', '/.env', '/.env.example', '/server/index.js', '/server/chat.js',
    '/tests/chat.test.js', '/node_modules/@anthropic-ai/sdk/package.json', '/assets/../package.json',
    '/assets/%2e%2e/package.json', '/%2e%2e/package.json'];
  for (const p of hidden) assert.equal((await fetch(`${base}${p}`)).status, 404, p);
});

test('health endpoint reports AI availability without secrets', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true, ai: true });
});

test('chat: success returns only the reply', async () => {
  const res = await post(valid);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { reply: 'Hello from the model' });
});

test('chat: input validation (400, 413, 415, 405)', async () => {
  assert.equal((await post('{not json')).status, 400);
  assert.equal((await post({ messages: [] })).status, 400);
  assert.equal((await post({ messages: [{ role: 'user', content: 'x'.repeat(1001) }] })).status, 400);
  assert.equal((await post({ messages: [{ role: 'user', content: 'x'.repeat(200_000) }] })).status, 413);
  const wrongType = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hi' });
  assert.equal(wrongType.status, 415);
  assert.equal((await fetch(`${base}/api/chat`)).status, 405);
});

test('chat: upstream failures are forwarded as safe error codes', async () => {
  replyImpl = async () => ({ ok: false, status: 503, code: 'unavailable' });
  const res = await post(valid);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'unavailable' });
  replyImpl = async () => ({ ok: true, reply: 'Hello from the model' });
});

test('chat: rate limiting returns 429 + Retry-After and does not call the model', async () => {
  let calls = 0;
  const chatService = { reply: async () => { calls++; return { ok: true, reply: 'x' }; } };
  await withServer({ chatService, config: { ...config, rateLimitPerMinute: 2 } }, async (url) => {
    const send = () => fetch(`${url}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid) });
    assert.equal((await send()).status, 200);
    assert.equal((await send()).status, 200);
    const third = await send();
    assert.equal(third.status, 429);
    assert.ok(Number(third.headers.get('retry-after')) >= 1);
    assert.equal((await third.json()).error, 'rate_limited');
    assert.equal(calls, 2);
  });
});

test('chat: origin allow-list', async () => {
  const chatService = { reply: async () => ({ ok: true, reply: 'x' }) };
  await withServer({ chatService, config: { ...config, allowedOrigins: ['https://asma.example'] } }, async (url) => {
    const send = (origin) => fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(valid)
    });
    assert.equal((await send('https://evil.example')).status, 403);
    assert.equal((await send('https://asma.example')).status, 200);
  });
});

test('the API key never appears in any public file or response', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-SECRET-123';
  try {
    for (const p of ['/', '/script.js', '/i18n.js', '/styles.css', '/api/health']) {
      const text = await (await fetch(`${base}${p}`)).text();
      assert.ok(!text.includes('SECRET-123') && !/sk-ant-/.test(text), p);
      assert.ok(!/ANTHROPIC_API_KEY/.test(text), `${p} mentions the env var`);
    }
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});
