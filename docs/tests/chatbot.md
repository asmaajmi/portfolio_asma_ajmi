# Chatbot — test scenarios

Automated coverage: `tests/chat.test.js`, `tests/server.test.js`, `tests/rate-limit.test.js` (`npm test`).
Manual / browser scenarios (run against a server started with `npm start`) are marked **Manual**.
To exercise the AI path without a real key, point the SDK at a mock: `ANTHROPIC_API_KEY=sk-ant-fake ANTHROPIC_BASE_URL=http://127.0.0.1:<mock-port> npm start`.

| ID | Preconditions | Steps | Expected result | Type |
|----|---------------|-------|-----------------|------|
| CH-01 | Valid payload | `POST /api/chat` with `{lang, messages:[user]}` | 200 `{reply}`; nothing else in the body | Auto |
| CH-02 | — | Send malformed JSON, `messages: []`, wrong roles, non-string content | 400 `invalid_request` | Auto |
| CH-03 | — | Send a visitor message > 1000 chars | 400 `too_long` | Auto |
| CH-04 | — | Send a body > 128 KB | 413 `too_long` (client receives the response, connection not reset) | Auto |
| CH-05 | — | `POST` with `Content-Type: text/plain`; `GET /api/chat` | 415 / 405 | Auto |
| CH-06 | Limit set to 2/min | Send 3 requests from one IP | 3rd returns 429 + `Retry-After`; model is not called | Auto |
| CH-07 | `ALLOWED_ORIGINS` set | Send request with a foreign `Origin` | 403 | Auto |
| CH-08 | Earlier assistant reply > 1000 chars in history | Send a follow-up | Accepted (cap only applies to visitor input) | Auto |
| CH-09 | History ends with an assistant turn / starts with assistant | Send payload | Last-must-be-user enforced; leading assistant dropped; consecutive same-role turns merged | Auto |
| CH-10 | Fake Claude client | Call the chat service | Request carries system prompt, `output_config.effort`, full follow-up context, `fallbacks:"default"` + beta header; no `temperature`/`thinking` | Auto |
| CH-11 | Fake client throws auth / rate-limit / connection / 400 / 5xx / unknown errors | Call the chat service | Mapped to `unavailable` (503) or `upstream_error` (502/500); upstream message never returned | Auto |
| CH-12 | Model returns `stop_reason: refusal` or empty text | Call the chat service | No reply leaked; `invalid_request` / `upstream_error` | Auto |
| CH-13 | `ANTHROPIC_API_KEY` set | Fetch `/`, `/script.js`, `/i18n.js`, `/styles.css`, `/api/health` | Key / env-var name never present; `/server`, `/.env`, `package.json` return 404 | Auto |
| CH-14 | No API key | `GET /api/health` and open the chat | `ai:false`; header shows "Offline mode"; questions get short local answers in the visitor's language | Manual |
| CH-15 | AI server running | Click a suggestion chip, then ask a follow-up | Typing indicator shows, Send disabled and `aria-busy`; replies arrive; request carries 1 then 3 messages (context kept) | Manual |
| CH-16 | Conversation in progress | Switch FR → EN → AR | Conversation kept; greeting, placeholder, labels switch; next request carries the new interface language; direction flips | Manual |
| CH-17 | Visitor writes in a language other than the interface | Ask in French while UI is English | Reply in French (system prompt rule); local fallback also detects the language | Manual |
| CH-18 | Upstream returns 500 | Send a message | One bubble: local quick answer + Retry; status stays "AI"; next message hits the API again | Manual |
| CH-19 | Server stopped mid-session | Send a message | Local answer + Retry within a few seconds; Send re-enabled; Retry after restart replaces the fallback with a real reply | Manual |
| CH-20 | Rate limit reached | Send many messages quickly | Localized "too many messages" bubble | Manual |
| CH-21 | — | Type `<img src=x onerror=alert(1)>` | Rendered as text; no element injected | Manual |
| CH-22 | Long text | Type > 800 chars | Counter shows `n / 1000`; at 1000 the input stops | Manual |
| CH-23 | Chat open | Press Esc; click Clear | Esc closes and returns focus to the toggle; Clear removes history from `sessionStorage` and shows the suggestions again | Manual |
| CH-24 | Static hosting (no backend) | Open chat and send a message | 404/405 handled: switches to offline mode, no console errors | Manual |
