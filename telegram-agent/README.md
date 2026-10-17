# Aura Sports Telegram Agent (Bootstrap)

This folder is intended to be deployed as a **separate Vercel project** with Root Directory set to `telegram-agent`. Do not attach this folder as the root of the existing Aura Sports website project.

## Current capability

- Validates Telegram's `X-Telegram-Bot-Api-Secret-Token` header.
- Fails closed unless the sender's numeric Telegram user ID and chat ID are explicitly allowlisted.
- Supports `/start`, `/help`, `/status`, and `/task <instruction>`.
- Uses the OpenAI Responses API to produce a risk-labelled plan only.
- Does **not** read or write GitHub, create branches/PRs, access Supabase, or deploy Production yet.
- Does not log incoming message contents or provider response bodies.

## Configure privately

1. Create a bot using Telegram's official BotFather.
2. Create a **separate Vercel project** from this repository and set Root Directory to `telegram-agent`. Do not change the existing `aura-sports-official` project.
3. Add environment variables using `.env.example` as a name-only checklist. Enter real values directly in Vercel Settings, never in GitHub files, Telegram messages, or ChatGPT.
4. Set `OWNER_TELEGRAM_IDS` to the owner's numeric Telegram ID and `ALLOWED_TELEGRAM_CHAT_IDS` to the approved group chat ID. Keep owner-only access during initial testing.
5. Deploy a Preview first. Configure the Telegram webhook to the deployed endpoint `/api/telegram/webhook`, with a random webhook secret supplied privately. The webhook header secret must match `TELEGRAM_WEBHOOK_SECRET`.
6. Confirm `/help`, `/status`, unauthorized-user rejection, and `/task` before expanding access.

## Important

This is a security-first bootstrap, not the complete coding agent. GitHub branch/PR automation, database-backed task history, durable job queue, approval records tied to commit SHAs, and controlled Vercel deployment actions remain future implementation steps. Do not enable Production actions until those controls and tests are implemented and reviewed.

## Local typecheck

Use Node.js 20 or later:

```sh
npm install
npm run typecheck
```

Vercel deployment and provider credentials are intentionally not included in this repository.
