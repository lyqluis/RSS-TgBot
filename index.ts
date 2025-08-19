import dotenv from "dotenv"
import RSSService from "./rss"
import Scheduler from "./scheduler"
import BotService from "./bot"
import ConfigService from "./config"

async function main() {
	dotenv.config()

	// 验证环境变量 (敏感数据保留在.env 中)
	const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || ""
	const CHAT_ID: string = process.env.CHAT_ID || ""

	if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
		console.error(
			"Missing required environment variables (TELEGRAM_BOT_TOKEN, CHAT_ID)"
		)
		process.exit(1)
	}

	// 加载 RSS 配置 (非敏感数据从 YAML 文件中读取)
	const configService = ConfigService.getInstance()
	const rssConfig = await configService.loadConfig("./rss-config.yaml")
	const RSS_HUB_URL: string = rssConfig.rssHubUrl
	const RSS_FEED_PATHS: string[] = rssConfig.feedPaths
	const CHECK_INTERVAL: number = rssConfig.checkInterval

	// 检查是否有代理设置
	let proxyUrl: string | undefined
	if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
		proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ""
	}

	// 检查是否为开发模式
	const isDevelopmentMode =
		process.env.NODE_ENV === "development" || process.env.DEV_MODE === "true"

	// 检查是否只模拟 bot（不实际连接）
	const simulateBotOnly = process.env.SIMULATE_BOT_ONLY === "true"
	// 检查是否使用模拟数据
	const useMockData = process.env.USE_MOCK_DATA === "true"

	// 创建 Bot 服务实例
	const botService = new BotService({
		token: TELEGRAM_BOT_TOKEN,
		chatId: CHAT_ID,
		proxyUrl: proxyUrl,
		developmentMode: isDevelopmentMode,
		simulateBotOnly: simulateBotOnly,
	})

	// 创建 RSS 服务实例
	const rssService = new RSSService(RSS_HUB_URL)

	// 获取可选的开始时间配置
	const START_TIME: string | undefined = rssConfig.startTime

	// 创建调度器实例
	const scheduler = new Scheduler(
		botService,
		rssService,
		RSS_FEED_PATHS,
		CHAT_ID,
		CHECK_INTERVAL,
		START_TIME,
		useMockData
	)

	// 启动调度器
	scheduler.start()

	// 启动 bot
	try {
		await botService.start()
		console.log("RSS Hub Telegram Bot started successfully")
	} catch (error: any) {
		console.error("Failed to launch bot:", error.message)
	}

	console.log("RSS Hub Telegram Bot initialization complete")

	// 启用优雅停机
	process.once("SIGINT", () => botService.stop("SIGINT"))
	process.once("SIGTERM", () => botService.stop("SIGTERM"))
}

main().catch((error) => {
	console.error("Unexpected error:", error)
	process.exit(1)
})
