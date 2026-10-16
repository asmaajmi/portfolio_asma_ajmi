// HTTP layer: serves the static portfolio and the /api/chat proxy. No framework, no extra dependency.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateChatRequest, ChatValidationError } from './chat.js';
import { createRateLimiter } from './rate-limit.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MAX_BODY_BYTES = 128 * 1024;

// Only these files/folders are public — server code, .env, tests and node_modules never are.
const PUBLIC_FILES = new Set(['/index.html', '/styles.css', '/script.js', '/i18n.js']);
const PUBLIC_DIRS = ['/assets/'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (tooLarge) {
        // Keep draining so the client can read our 413, but cut off clearly abusive uploads.
        if (size > MAX_BODY_BYTES * 32) req.destroy();
        return;
      }
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function clientIp(req, trustProxy) {
  if (trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * @param {object} opts
 * @param {{ reply: Function }} opts.chatService
 * @param {boolean} opts.aiEnabled
 * @param {{ rateLimitPerMinute: number, rateLimitPerDay: number, allowedOrigins: string[], trustProxy: boolean }} opts.config
 */
export function createApp({ chatService, aiEnabled, config, logger = console }) {
  const perMinute = createRateLimiter({ limit: config.rateLimitPerMinute, windowMs: 60_000 });
  const perDay = createRateLimiter({ limit: config.rateLimitPerDay, windowMs: 24 * 60 * 60_000 });
  const sweeper = setInterval(() => { perMinute.sweep(); perDay.sweep(); }, 10 * 60_000);
  sweeper.unref();

  async function handleChat(req, res) {
    const origin = req.headers.origin;
    if (config.allowedOrigins.length && origin && !config.allowedOrigins.includes(origin)) {
      return sendJson(res, 403, { error: 'forbidden' });
    }
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      return sendJson(res, 415, { error: 'invalid_request' });
    }

    const ip = clientIp(req, config.trustProxy);
    for (const limiter of [perMinute, perDay]) {
      const { allowed, retryAfterSeconds } = limiter.check(ip);
      if (!allowed) {
        return sendJson(res, 429, { error: 'rate_limited', retryAfter: retryAfterSeconds }, { 'Retry-After': String(retryAfterSeconds) });
      }
    }

    let payload;
    try {
      payload = validateChatRequest(JSON.parse(await readBody(req)));
    } catch (error) {
      if (error.status === 413) return sendJson(res, 413, { error: 'too_long' });
      if (error instanceof ChatValidationError) return sendJson(res, 400, { error: error.code });
      return sendJson(res, 400, { error: 'invalid_request' }); // malformed JSON
    }

    const result = await chatService.reply(payload);
    if (result.ok) return sendJson(res, 200, { reply: result.reply });
    return sendJson(res, result.status, { error: result.code });
  }

  async function serveStatic(req, res, pathname) {
    let filePath = pathname === '/' ? '/index.html' : pathname;
    try {
      filePath = decodeURIComponent(filePath);
    } catch {
      return sendJson(res, 400, { error: 'invalid_request' });
    }
    const normalised = path.posix.normalize(filePath);
    const isPublic = PUBLIC_FILES.has(normalised) || PUBLIC_DIRS.some((dir) => normalised.startsWith(dir));
    if (!isPublic || normalised.includes('..') || normalised.includes('\0')) {
      return sendJson(res, 404, { error: 'not_found' });
    }

    const absolute = path.join(ROOT, normalised);
    if (!absolute.startsWith(ROOT)) return sendJson(res, 404, { error: 'not_found' });
    try {
      const info = await stat(absolute);
      if (!info.isFile()) throw new Error('not a file');
      const ext = path.extname(absolute).toLowerCase();
      // Code files are revalidated on every load (cheap 304s) so a deploy is never masked by a stale cache;
      // images and fonts under /assets can be cached for a day.
      const revalidate = ['.html', '.css', '.js'].includes(ext);
      const lastModified = new Date(Math.floor(info.mtimeMs / 1000) * 1000);
      const baseHeaders = {
        ...SECURITY_HEADERS,
        'Last-Modified': lastModified.toUTCString(),
        'Cache-Control': revalidate ? 'no-cache' : 'public, max-age=86400'
      };
      const since = Date.parse(req.headers['if-modified-since'] || '');
      if (revalidate && Number.isFinite(since) && since >= lastModified.getTime()) {
        res.writeHead(304, baseHeaders);
        return res.end();
      }
      res.writeHead(200, {
        ...baseHeaders,
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': info.size
      });
      if (req.method === 'HEAD') return res.end();
      createReadStream(absolute).pipe(res);
    } catch {
      sendJson(res, 404, { error: 'not_found' });
    }
  }

  return async function handler(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (pathname === '/api/chat') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST' });
        return await handleChat(req, res);
      }
      if (pathname === '/api/health') {
        return sendJson(res, 200, { ok: true, ai: aiEnabled });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendJson(res, 405, { error: 'method_not_allowed' }, { Allow: 'GET, HEAD' });
      }
      return await serveStatic(req, res, pathname);
    } catch (error) {
      logger.error('[server] Unhandled error:', error);
      if (!res.headersSent) sendJson(res, 500, { error: 'upstream_error' });
      else res.end();
    }
  };
}

export function createHttpServer(options) {
  return http.createServer(createApp(options));
}
