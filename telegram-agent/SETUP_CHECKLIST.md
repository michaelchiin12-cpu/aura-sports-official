# Private setup checklist

This checklist is for the repository owner. Do not paste credentials into issues, PR comments, Telegram messages, or ChatGPT.

## A. Telegram bot

1. Create a bot through the official Telegram BotFather.
2. Copy the bot token directly into the separate Vercel project's environment settings as `TELEGRAM_BOT_TOKEN`.
3. Generate a strong random webhook secret (1-256 characters, using Telegram's supported characters) and store the same value as `TELEGRAM_WEBHOOK_SECRET`.
4. Keep the bot private and test with the owner only first.
5. Record the numeric Telegram user ID and numeric private chat ID; set `OWNER_TELEGRAM_IDS` and `ALLOWED_TELEGRAM_CHAT_IDS` to those values. Add a group ID only after private testing succeeds.

## B. OpenAI

1. Create or select an API key in the OpenAI platform.
2. Add it directly in Vercel as `OPENAI_API_KEY`.
3. Optionally set `OPENAI_MODEL` to a model available to the account.
4. Never expose this key in a Telegram message or repository.

## C. Separate Vercel project

1. Create a new Vercel project from this repository.
2. Set Root Directory to `telegram-agent`.
3. Confirm it is not the existing `aura-sports-official` website project.
4. Add the environment variables above to Preview first.
5. Deploy Preview, then set the Telegram webhook URL to `https://<your-agent-domain>/api/telegram/webhook` with the same webhook secret.
6. Test `/help`, `/status`, `/task`, and rejection of an unauthorized Telegram user.
7. Only promote this agent to a production environment after Preview tests pass.

## D. Current limitations

The current bot produces a plan only. It does not yet edit repository files, create branches or PRs, store task history, or deploy. Those capabilities must be implemented and tested before the bot can deliver code changes from Telegram. Production changes must remain approval-gated.
