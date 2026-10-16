// Chat request validation + call to the Claude API. Kept free of HTTP concerns so it can be unit-tested
// with a fake client.
import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt, interfaceLanguageNote } from './knowledge.js';

export const LANGUAGES = ['fr', 'en', 'ar'];
export const LIMITS = Object.freeze({
  maxMessageChars: 1000,    // per visitor message (mirrors the input maxlength in the UI)
  maxAssistantChars: 8000,  // earlier model replies echoed back by the browser
  maxMessages: 40,          // accepted in a request…
  contextMessages: 12,      // …but only the most recent ones are sent to the model
  maxTotalChars: 20000
});

export class ChatValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'invalid_request' | 'too_long'
  }
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Validates and normalises a chat payload: { lang, messages: [{ role, content }] }.
 * Consecutive messages with the same role are merged and leading assistant turns dropped,
 * so the history the browser keeps (which may contain failed turns) is always API-valid.
 */
export function validateChatRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ChatValidationError('invalid_request', 'Body must be a JSON object.');
  }
  const lang = LANGUAGES.includes(body.lang) ? body.lang : 'fr';
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > LIMITS.maxMessages) {
    throw new ChatValidationError('invalid_request', `messages must be an array of 1-${LIMITS.maxMessages} items.`);
  }

  const normalised = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      throw new ChatValidationError('invalid_request', 'Each message needs role user|assistant and string content.');
    }
    const content = m.content.replace(CONTROL_CHARS, '').trim();
    if (!content) continue;
    const cap = m.role === 'user' ? LIMITS.maxMessageChars : LIMITS.maxAssistantChars;
    if (content.length > cap) {
      throw new ChatValidationError('too_long', `Messages are limited to ${cap} characters.`);
    }
    const last = normalised[normalised.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${content}`;
    else if (normalised.length || m.role === 'user') normalised.push({ role: m.role, content });
  }

  let context = normalised.slice(-LIMITS.contextMessages);
  if (context[0]?.role === 'assistant') context = context.slice(1);
  if (!context.length || context[context.length - 1].role !== 'user') {
    throw new ChatValidationError('invalid_request', 'The last message must come from the user.');
  }
  const total = context.reduce((n, m) => n + m.content.length, 0);
  if (total > LIMITS.maxTotalChars) {
    throw new ChatValidationError('too_long', 'Conversation is too long.');
  }
  return { lang, messages: context };
}

/**
 * @param {object} opts
 * @param {Anthropic | null} opts.client  null when no API key is configured
 * @param {string} opts.model
 * @param {'low'|'medium'|'high'} opts.effort
 * @param {boolean} opts.fallbacks  server-side refusal fallbacks (Claude API, Opus 5.5 / Sonnet 5.5 / Fable)
 */
export function createChatService({ client, model, effort = 'low', maxTokens = 4096, fallbacks = true, logger = console }) {
  const systemPrompt = getSystemPrompt();

  async function reply({ lang, messages }) {
    if (!client) return { ok: false, status: 503, code: 'unavailable' };

    const params = {
      model,
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: interfaceLanguageNote(lang) }
      ],
      messages,
      output_config: { effort }
    };

    try {
      const response = fallbacks
        ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
        : await client.messages.create(params);

      if (response.stop_reason === 'refusal') {
        return { ok: false, status: 422, code: 'invalid_request' };
      }
      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
      if (!text) return { ok: false, status: 502, code: 'upstream_error' };
      return { ok: true, reply: text };
    } catch (error) {
      return mapUpstreamError(error, logger);
    }
  }

  return { reply };
}

function mapUpstreamError(error, logger) {
  // Most specific first. Never forward upstream messages to the browser: they can contain request details.
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    logger.error('[chat] Claude API rejected the credentials — check ANTHROPIC_API_KEY.');
    return { ok: false, status: 503, code: 'unavailable' };
  }
  if (error instanceof Anthropic.RateLimitError) {
    logger.warn('[chat] Claude API rate limit reached.');
    return { ok: false, status: 503, code: 'unavailable' };
  }
  if (error instanceof Anthropic.BadRequestError) {
    logger.error('[chat] Claude API bad request:', error.message);
    return { ok: false, status: 502, code: 'upstream_error' };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    logger.warn('[chat] Could not reach the Claude API:', error.message);
    return { ok: false, status: 503, code: 'unavailable' };
  }
  if (error instanceof Anthropic.APIError) {
    logger.error(`[chat] Claude API error ${error.status}:`, error.message);
    return { ok: false, status: 503, code: 'unavailable' };
  }
  logger.error('[chat] Unexpected error:', error);
  return { ok: false, status: 500, code: 'upstream_error' };
}
