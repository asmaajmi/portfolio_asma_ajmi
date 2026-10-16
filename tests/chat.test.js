import { test } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { validateChatRequest, createChatService, ChatValidationError, LIMITS } from '../server/chat.js';
import { buildPortfolioFacts, loadI18n, getSystemPrompt } from '../server/knowledge.js';

const silent = { error() {}, warn() {}, log() {} };
const user = (content) => ({ role: 'user', content });
const bot = (content) => ({ role: 'assistant', content });

test('validate: accepts a normal conversation and defaults the language', () => {
  const out = validateChatRequest({ lang: 'xx', messages: [user('Hello'), bot('Hi'), user('Her stack?')] });
  assert.equal(out.lang, 'fr');
  assert.equal(out.messages.length, 3);
});

test('validate: rejects bad shapes', () => {
  const bad = [null, [], {}, { messages: [] }, { messages: 'x' },
    { messages: [{ role: 'system', content: 'x' }] }, { messages: [{ role: 'user', content: 5 }] }];
  for (const body of bad) assert.throws(() => validateChatRequest(body), ChatValidationError);
});

test('validate: too long message and too many messages', () => {
  assert.throws(
    () => validateChatRequest({ messages: [user('a'.repeat(LIMITS.maxMessageChars + 1))] }),
    (e) => e.code === 'too_long'
  );
  const many = Array.from({ length: LIMITS.maxMessages + 1 }, () => user('x'));
  assert.throws(() => validateChatRequest({ messages: many }), (e) => e.code === 'invalid_request');
});

test('validate: long earlier assistant replies are accepted (cap only applies to visitor input)', () => {
  const longReply = 'r'.repeat(LIMITS.maxMessageChars + 500);
  const out = validateChatRequest({ messages: [user('q'), bot(longReply), user('follow-up')] });
  assert.equal(out.messages.length, 3);
  assert.throws(
    () => validateChatRequest({ messages: [user('q'), bot('r'.repeat(LIMITS.maxAssistantChars + 1)), user('f')] }),
    (e) => e.code === 'too_long'
  );
});

test('validate: last message must be from the user; leading assistant dropped; same roles merged', () => {
  assert.throws(() => validateChatRequest({ messages: [user('a'), bot('b')] }), ChatValidationError);
  const out = validateChatRequest({ messages: [bot('greeting'), user('a'), user('b')] });
  assert.deepEqual(out.messages, [{ role: 'user', content: 'a\n\nb' }]);
});

test('validate: strips control characters and only keeps recent context', () => {
  const out = validateChatRequest({ messages: [user('he\u0000llo\u0007')] });
  assert.equal(out.messages[0].content, 'hello');
  const long = [];
  for (let i = 0; i < 30; i++) { long.push(user(`q${i}`)); long.push(bot(`a${i}`)); }
  long.push(user('last'));
  const kept = validateChatRequest({ messages: long.slice(-LIMITS.maxMessages) }).messages;
  assert.ok(kept.length <= LIMITS.contextMessages);
  assert.equal(kept[kept.length - 1].content, 'last');
});

function fakeClient(impl) {
  const calls = [];
  const handler = async (params) => { calls.push(params); return impl(params); };
  return { calls, beta: { messages: { create: handler } }, messages: { create: handler } };
}
const ok = (text) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });

test('service: sends system prompt, effort, history and fallbacks; returns the reply', async () => {
  const client = fakeClient(() => ok('Bonjour !'));
  const svc = createChatService({ client, model: 'claude-opus-5-5', effort: 'low', logger: silent });
  const res = await svc.reply({ lang: 'ar', messages: [user('مرحبا'), bot('أهلا'), user('ما هي مشاريعها؟')] });
  assert.deepEqual(res, { ok: true, reply: 'Bonjour !' });
  const [params] = client.calls;
  assert.equal(params.model, 'claude-opus-5-5');
  assert.deepEqual(params.output_config, { effort: 'low' });
  assert.equal(params.messages.length, 3, 'follow-up context is sent');
  assert.equal(params.fallbacks, 'default');
  assert.deepEqual(params.betas, ['server-side-fallback-2026-07-01']);
  assert.match(params.system[0].text, /Asma Ajmi/);
  assert.match(params.system[1].text, /Arabic/);
  assert.equal(params.thinking, undefined, 'thinking is left to the model default');
  assert.equal(params.temperature, undefined, 'sampling params are not accepted by this model');
});

test('service: fallbacks can be disabled (uses the stable endpoint)', async () => {
  const client = fakeClient(() => ok('hi'));
  const svc = createChatService({ client, model: 'm', fallbacks: false, logger: silent });
  await svc.reply({ lang: 'en', messages: [user('hi')] });
  assert.equal(client.calls[0].fallbacks, undefined);
});

test('service: no client configured gives unavailable (503)', async () => {
  const svc = createChatService({ client: null, model: 'm', logger: silent });
  assert.deepEqual(await svc.reply({ lang: 'en', messages: [user('hi')] }), { ok: false, status: 503, code: 'unavailable' });
});

test('service: refusals and empty answers are not returned as replies', async () => {
  const refused = createChatService({ client: fakeClient(() => ({ stop_reason: 'refusal', content: [] })), model: 'm', logger: silent });
  assert.equal((await refused.reply({ lang: 'en', messages: [user('x')] })).code, 'invalid_request');
  const empty = createChatService({ client: fakeClient(() => ({ stop_reason: 'end_turn', content: [] })), model: 'm', logger: silent });
  assert.equal((await empty.reply({ lang: 'en', messages: [user('x')] })).code, 'upstream_error');
});

test('service: upstream errors map to safe codes and never expose the upstream message', async () => {
  const mk = (Cls, message) => Object.assign(Object.create(Cls.prototype), { message, status: 500 });
  const cases = [
    [mk(Anthropic.AuthenticationError, 'invalid x-api-key sk-ant-SECRET'), 503, 'unavailable'],
    [mk(Anthropic.RateLimitError, 'slow down'), 503, 'unavailable'],
    [mk(Anthropic.APIConnectionError, 'ECONNRESET'), 503, 'unavailable'],
    [mk(Anthropic.BadRequestError, 'bad'), 502, 'upstream_error'],
    [mk(Anthropic.InternalServerError, 'boom'), 503, 'unavailable'],
    [new Error('weird'), 500, 'upstream_error']
  ];
  for (const [error, status, code] of cases) {
    const svc = createChatService({ client: fakeClient(() => { throw error; }), model: 'm', logger: silent });
    const res = await svc.reply({ lang: 'en', messages: [user('x')] });
    assert.deepEqual(res, { ok: false, status, code });
    assert.ok(!JSON.stringify(res).includes('SECRET'));
  }
});

test('knowledge: facts come from the site content, with no HTML and no invented data', () => {
  const facts = buildPortfolioFacts(loadI18n().dictionaries.en);
  const needles = ['MyCoris Bank Corporate', 'BNA H24', 'CBS Mock', 'AllSystems', 'Proxym IT',
    'asmaajmi237@gmail.com', 'Keycloak', 'EPI International'];
  for (const needle of needles) assert.ok(facts.includes(needle), `missing ${needle}`);
  assert.ok(!/<[a-z]/.test(facts), 'HTML tags leaked into the prompt');
  assert.match(getSystemPrompt(), /language of the visitor's latest message/);
});
