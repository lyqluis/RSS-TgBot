# RSS TgBot

A Telegram bot that fetches RSS feeds and sends updates to users at regular intervals.

## Features

- Fetches RSS feeds at regular intervals
- Supports multiple RSS sources
- Avoids sending duplicate content
- Supports proxy configuration

## Project Structure

```bash
.
├── index.ts          # Main entry point
├── bot.ts            # Telegram bot service
├── rss.ts            # RSS service
├── scheduler.ts      # Scheduler service
├── config.ts         # Configuration service
├── mock/             # Mock data
└── config.yaml       # RSS configuration
```

## Installation

```bash
pnpm install
```

## Usage

```bash
# Development mode
pnpm run dev

# Production mode
pnpm run build
pnpm run start
```

## Configuration

### Environment Variables (.env)

Create a `.env` file with sensitive configuration:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
CHAT_ID=your_chat_id_here
HTTPS_PROXY=your_proxy_url_here
```

### RSS Configuration (rss-config.yaml)

Configure RSS feeds and other settings in `config.yaml`:

```yaml
rssHubUrl: "your_rsshub_url"
checkInterval: 12 # every 12 hours
startTime: "8:00"
feedPaths:
  - "/github/trending/weekly/javascript/"
  - "..."
```
