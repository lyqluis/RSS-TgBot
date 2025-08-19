# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram bot that fetches RSS feeds and sends updates to users at regular intervals. The bot is designed to work with RSSHub services and can be configured to check for updates on a schedule.

## Architecture

The project consists of several key components:

1. **Main Entry Point** (`index.ts`): Initializes the bot, loads configuration from environment variables, sets up proxy if needed, and starts the scheduler.

2. **RSS Service** (`rssService.ts`): Handles fetching and parsing RSS feeds from network URLs.

3. **Mock Service** (`mockService.ts`): Handles fetching and parsing RSS feeds from local mock files for testing, and simulating message sending in development mode.

4. **Scheduler** (`scheduler.ts`): Manages the timing of RSS checks and sends updates to users via Telegram. Includes duplicate detection to avoid sending the same content multiple times.

5. **Configuration** (`.env`): Stores environment variables including Telegram bot token, chat ID, RSS Hub URL, check interval, and proxy settings.

## Common Development Tasks

### Running the Bot

```bash
tsx index.ts
```

### Environment Variables

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from BotFather
- `CHAT_ID`: The chat ID where messages should be sent
- `RSS_HUB_URL`: Base URL for RSSHub service (default: http://localhost:3000)
- `CHECK_INTERVAL`: Interval in hours between RSS checks (default: 12)
- `RSS_FEED_PATHS`: Path to RSS feed (can be multiple entries)
- `DEBUG_MODE`: Set to "true" to skip duplicate checking (useful for testing)
- `HTTPS_PROXY`/`HTTP_PROXY`: Proxy settings if needed
- `SKIP_INITIAL_CHECK`: Set to "true" to skip the initial RSS check when the bot starts

### Configuration File Settings (rss-config.yaml)

- `rssHubUrl`: Base URL for RSSHub service
- `checkInterval`: Interval in hours between RSS checks
- `startTime`: Optional start time in HH:mm format (24-hour). If not specified, checks run immediately and then at regular intervals.
- `feedPaths`: List of RSS feed paths to monitor

### Testing with Mock Data

The bot can use local XML files for testing by setting RSS feed paths to `/mock/filename.xml`. A sample mock file is provided at `36kr_newsflashes_rss.xml`. The MockService handles all mock data operations separately from the RSSService.

## Key Implementation Details

- Uses Telegraf library for Telegram bot functionality
- Uses node-cron for scheduling RSS checks
- Uses got for HTTP requests
- Uses rss-parser for parsing RSS feeds
- Supports proxy configuration for environments that require it
- Implements duplicate detection to avoid sending the same content multiple times
- Supports both local file reading (for testing) and network requests (for production)
