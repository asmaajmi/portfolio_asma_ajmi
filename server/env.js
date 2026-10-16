// Minimal .env loader (Node 18 has no --env-file). Existing environment variables always win.
import { existsSync, readFileSync } from 'node:fs';

export function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trim().startsWith('#')) continue;
    const [, key, raw] = match;
    const value = raw.replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function readConfig(env = process.env) {
  const int = (value, fallback) => {
    const n = Number.parseInt(value ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    port: int(env.PORT, 5173),
    host: env.HOST || '127.0.0.1',
    apiKey: env.ANTHROPIC_API_KEY || '',
    model: env.ANTHROPIC_MODEL || 'claude-opus-5-5',
    effort: ['low', 'medium', 'high'].includes(env.ANTHROPIC_EFFORT) ? env.ANTHROPIC_EFFORT : 'low',
    fallbacks: env.ANTHROPIC_FALLBACKS !== 'off',
    rateLimitPerMinute: int(env.CHAT_RATE_LIMIT_PER_MINUTE, 8),
    rateLimitPerDay: int(env.CHAT_RATE_LIMIT_PER_DAY, 100),
    allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    trustProxy: env.TRUST_PROXY === '1'
  };
}
