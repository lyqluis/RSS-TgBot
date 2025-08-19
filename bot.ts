import { Telegraf } from "telegraf"
import { HttpsProxyAgent } from "https-proxy-agent"

export interface BotConfig {
	token: string
	chatId: string
	proxyUrl?: string
	developmentMode?: boolean
	simulateBotOnly?: boolean
}

export interface MessageOptions {
	parse_mode?: "Markdown" | "MarkdownV2" | "HTML"
}

export interface BotServiceInterface {
	sendMessage(
		chatId: string,
		message: string,
		options?: MessageOptions
	): Promise<void>
	start(): Promise<void>
	stop(signal: string): void
	catch(callback: (err: any) => void): void
}

class BotService implements BotServiceInterface {
	private bot: Telegraf
	private chatId: string
	private developmentMode: boolean
	private simulateBotOnly: boolean

	constructor(config: BotConfig) {
		this.chatId = config.chatId
		this.developmentMode = config.developmentMode || false
		this.simulateBotOnly = config.simulateBotOnly || false

		// 检查是否有代理设置
		let telegramOptions: any = {}
		if (config.proxyUrl) {
			const agent = new HttpsProxyAgent(config.proxyUrl)
			telegramOptions = {
				telegram: {
					agent: agent,
				},
			}
			console.log(`🤖️🪜 Using proxy: ${config.proxyUrl}`)
		}

		// 创建 Telegram bot 实例，带代理配置
		this.bot = new Telegraf(config.token, telegramOptions)

		// 添加错误处理
		this.bot.catch((err: any) => {
			console.error("Bot error:", err)
		})

		console.log("🤖️ BotService initialized")
	}

	async sendMessage(
		chatId: string,
		message: string,
		options?: MessageOptions
	): Promise<void> {
		if (this.simulateBotOnly) {
			console.log(`[SIMULATE] Would send message to chat ${chatId}:`)
			console.log(`[SIMULATE] Message content: ${message}`)
			console.log(`[SIMULATE] Message options: ${JSON.stringify(options)}`)
			console.log(
				"[SIMULATE] Message not actually sent (simulate bot only mode active)"
			)
			return
		}

		try {
			await this.bot.telegram.sendMessage(chatId, message, options)
			console.log(`🤖️ Successfully sent message to chat ${chatId}`)
		} catch (error: any) {
			console.error("🤖️❌ Error sending message:", error.message)
			throw error
		}
	}

	async start(): Promise<void> {
		if (this.simulateBotOnly) {
			console.log(
				"🤖️🔧 BotService is simulating bot launch only"
			)
			// Simulate bot launch
			console.log("🤖️ Bot started successfully (simulated)")
			return
		}
		
		try {
			await this.bot.launch()
			console.log("🤖️ Bot started successfully")
		} catch (error: any) {
			console.error("🤖️❌ Failed to start bot:", error.message)
			throw error
		}
	}

	stop(signal: string): void {
		this.bot.stop(signal)
		console.log(`🤖️ Bot stopped with signal: ${signal}`)
	}

	catch(callback: (err: any) => void): void {
		this.bot.catch(callback)
	}
}

export default BotService
