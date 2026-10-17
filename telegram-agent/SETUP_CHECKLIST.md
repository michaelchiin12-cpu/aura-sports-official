# Private setup checklist

Do not paste credentials into issues, PR comments, Telegram messages, or ChatGPT.

## A. Telegram bot

1. Create a bot through the official Telegram BotFather.
2. Copy the bot token directly into the separate Vercel project's environment settings as `TELEGRAM_BOT_TOKEN`.
3. Generate a strong random webhook secret supported by Telegram and store it as `TELEGRAM_WEBHOOK_SECRET`.
4. Keep the bot private and test with the owner only first.
5. Set the numeric Telegram user ID in `OWNER_TELEGRAM_IDS` and the owner's private chat ID in `ALLOWED_TELEGRAM_CHAT_IDS`. Add the group ID only after private tests pass.

## B. OpenAI

1. Create or select an API key in the OpenAI platform.
2. Add it directly in Vercel as `OPENAI_API_KEY`.
3. Optionally set `OPENAI_MODEL` to a model available to the account.
4. Never expose this key in Telegram or the repository.

## C. GitHub token

1. Create a fine-grained personal access token limited to `michaelchiin12-cpu/aura-sports-official`.
2. Grant only the permissions needed to read repository content, create/update files on branches, and open pull requests (Contents: Read and write; Pull requests: Read and write; Metadata: read).
3. Set it as `GITHUB_TOKEN` in the separate Vercel project.
4. Set `GITHUB_REPOSITORY=michaelchiin12-cpu/aura-sports-official`.
5. Never use an organization-wide token if a repository-scoped token is sufficient.

## D. Separate Vercel project

1. Create a new Vercel project linked to this repository.
2. Set Root Directory to `telegram-agent`.
3. Confirm it is not the existing `aura-sports-official` website project.
4. Add all environment variables to Preview first.
5. Deploy Preview after the bootstrap PR has been reviewed and merged into the repository branch that the Vercel project uses.
6. Set the Telegram webhook URL to `https://<agent-domain>/api/telegram/webhook` with the same secret configured in `TELEGRAM_WEBHOOK_SECRET`.
7. Test `/help`, `/status`, unauthorized-user rejection, and one harmless `/task` that creates a Draft PR. Test a medium/high-risk task and confirm it is not executed.
8. Do not configure Production deployment or add the bot to a broad group until Preview tests pass.

## E. Current safety limits

- Only LOW-risk changes to these existing files can be automated: `index.html`, `mobile-responsive.css`, `mobile-responsive.js`, `story-mvp.js`.
- A task can change at most three files.
- The bot creates Draft PRs only; it never merges or deploys.
- MEDIUM/HIGH tasks are refused for execution until a durable approval flow is implemented.
- Every PR must be reviewed and tested by a human.
