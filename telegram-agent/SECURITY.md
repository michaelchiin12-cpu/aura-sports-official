# Security policy for the Aura Sports Agent

- Keep the bot owner-only until access checks are tested.
- Never commit real API keys, bot tokens, private keys, database service keys, or webhook secrets.
- Only allow exact numeric Telegram user IDs and chat IDs.
- Do not treat group administrator status as Production approval authority.
- Do not merge or deploy to Production from the bootstrap agent.
- Every future write action must be implemented as a backend allowlisted function with validated arguments.
- Future Production approval must be bound to an exact PR/commit SHA, expire, and become invalid when the approved SHA changes.
- Never execute commands, SQL, URLs, or tool names supplied by an untrusted Telegram message directly.
- Avoid logging message content, API request headers, secrets, or raw provider error bodies.
- Report suspected credential exposure and rotate affected credentials immediately.
