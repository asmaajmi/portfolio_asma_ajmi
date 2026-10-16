// Entry point: `npm start`. Reads .env, creates the Claude client (server-side only) and listens.
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'node:url';
import { loadEnvFile, readConfig } from './env.js';
import { createChatService } from './chat.js';
import { createHttpServer } from './app.js';

loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
const config = readConfig();

// The API key only ever lives here, in the server process — it is never sent to the browser.
const client = config.apiKey ? new Anthropic({ apiKey: config.apiKey, timeout: 30_000, maxRetries: 1 }) : null;
if (!client) {
  console.warn('[server] ANTHROPIC_API_KEY is not set — the chatbot will use its offline answers.');
}

const chatService = createChatService({
  client,
  model: config.model,
  effort: config.effort,
  fallbacks: config.fallbacks
});

const server = createHttpServer({ chatService, aiEnabled: Boolean(client), config });
server.listen(config.port, config.host, () => {
  console.log(`[server] Portfolio on http://${config.host}:${config.port} (AI chat: ${client ? config.model : 'offline'})`);
});
