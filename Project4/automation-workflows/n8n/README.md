# Operational n8n Workflows

This folder contains the operational workflows used by the order-management automation.

| File | Original workflow name |
|---|---|
| `add-order.json` | `add order` |
| `search-order.json` | `search` |
| `update-and-redirect.json` | `update and redirect` |
| `create-telegram-group.json` | `create telegram group` |
| `send-telegram-create-sheet.json` | `Send telegram , create sheet (first)` |

Import the JSON files into n8n and configure the required credentials and environment-specific URLs in your own instance.

**Security:** The Telegram bot token in `send-telegram-create-sheet.json` has been replaced with
`YOUR_TELEGRAM_BOT_TOKEN`. Configure the actual token securely in n8n before activating the workflow.
Do not commit credentials, private tokens, or production secrets to the repository.
