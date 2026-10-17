# Aura Sports Telegram Agent

Deploy this folder as a **separate Vercel project** with Root Directory set to `telegram-agent`. Never change the existing website project to use this folder.

## Current capability

- Validates Telegram's `X-Telegram-Bot-Api-Secret-Token` header.
- Fails closed unless the sender's numeric Telegram user ID and chat ID are explicitly allowlisted.
- Supports `/start`, `/help`, `/status`, and `/task <instruction>`.
- Uses the OpenAI Responses API to classify task risk and draft changes.
- For LOW-risk changes only, it can create a **Draft Pull Request** for one to three allowlisted existing app files: `index.html`, `mobile-responsive.css`, `mobile-responsive.js`, `story-mvp.js`.
- It never merges a PR and never deploys to Production.
- MEDIUM/HIGH tasks are not executed. A complete persistent approval workflow is not implemented yet.
- GitHub Actions checks TypeScript for changes in this folder.

## Setup

Follow [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md). Configure these variables directly in the separate Vercel project:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `GITHUB_TOKEN` — fine-grained token limited to this repository, with Contents (read/write) and Pull requests (read/write) permissions only
- `GITHUB_REPOSITORY=michaelchiin12-cpu/aura-sports-official`
- `OWNER_TELEGRAM_IDS` — numeric owner ID
- `ALLOWED_TELEGRAM_CHAT_IDS` — start with owner's private chat ID only
- Optional: `OPENAI_MODEL`

Never place actual values in repository files, PR comments, Telegram messages, or ChatGPT.

## Required validation before use

1. Create a separate Vercel project linked to this repository, Root Directory `telegram-agent`.
2. Add environment variables to Preview first.
3. Deploy Preview and configure Telegram webhook to `https://<agent-domain>/api/telegram/webhook` using the same webhook secret.
4. Test `/help`, `/status`, rejection of unauthorized senders, a harmless low-risk task, and a medium-risk task.
5. Confirm the bot only creates Draft PRs and never merges or deploys.
6. Keep the bot private until these checks pass.

## Limitations and safety

This agent creates draft PRs, not guaranteed correct code. Every PR needs human review and tests before merge. The model's risk classification is not a substitute for review. Database, authentication, permissions, secrets, deployment workflows, deletion, and other high-risk changes are outside the automatic allowlist.

There is no durable task queue or commit-SHA-bound approval flow for medium/high-risk actions yet. Those tasks are deliberately refused for execution. Do not promote the agent to unrestricted use until approval handling, idempotency, runtime tests, and monitoring are implemented.

The GitHub Actions workflow runs a TypeScript check only; it does not validate external integrations at runtime.
