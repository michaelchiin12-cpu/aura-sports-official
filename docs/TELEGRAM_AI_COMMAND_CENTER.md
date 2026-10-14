# Telegram AI Command Center — AURA SPORT MANAGER

## Phase 1 scope
Analysis-only Telegram webhook with chat-ID allowlist, /help, /status, and OpenAI-powered /ask. It does not execute GitHub writes, Vercel deployments, or Supabase mutations and does not change application data.

## Vercel environment variables
- TELEGRAM_BOT_TOKEN — token from BotFather.
- TELEGRAM_WEBHOOK_SECRET — random 1–256 character secret using A-Z, a-z, 0-9, underscore, hyphen.
- TELEGRAM_ALLOWED_CHAT_IDS — comma-separated numeric Telegram chat IDs allowed to use the bot.
- OPENAI_API_KEY — OpenAI API key with API billing configured.
- OPENAI_MODEL — optional; defaults to gpt-4o-mini.

Keep all secrets in Vercel Environment Variables. Never commit them or send them in Telegram.

## Deploy and connect Telegram
1. Review and merge this branch only after review.
2. Configure environment variables in Vercel for Preview first.
3. Deploy a preview and test it before production.
4. Set the webhook from a secure terminal after replacing placeholders:
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<YOUR_VERCEL_DOMAIN>/api/telegram","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```
5. Send /start, /status, then /ask Buat rencana pemeriksaan bug skor pertandingan tanpa mengubah data.

## Security boundaries
- Only IDs in TELEGRAM_ALLOWED_CHAT_IDS receive responses.
- The handler validates Telegram's X-Telegram-Bot-Api-Secret-Token header.
- Advice-only: no shell commands, GitHub writes, deployments, or database mutations.
- Add rate limiting and durable audit logging before enabling actions.
- Phase 2 should add an approval queue with expiring one-time approval IDs and narrowly scoped action handlers. Never implement arbitrary free-form command execution.
- Database writes and production deployment must require explicit confirmation; prefer pull requests and preview deployments.

## Current limitations
- /status reports configuration presence only, not live GitHub/Vercel/Supabase health.
- No persistent conversation history or approval/execute commands yet.
- Webhook setup and environment configuration require an authorized operator; code commit does not do these steps.
