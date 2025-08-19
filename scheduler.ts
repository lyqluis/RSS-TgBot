import cron from "node-cron"
import RSSService, { FeedItem, Feed } from "./rss"
import BotService from "./bot"
import MockService from "./mock"

class Scheduler {
	private bot: BotService
	private rssService: RSSService
	private mockService: MockService
	private feedPaths: string[]
	private chatId: string
	private intervalHours: number
	private sentItems: Set<string>
	private startTime?: string // 可选：自定义开始时间，格式 "HH:mm"
	private useMockData: boolean // 是否使用模拟数据

	constructor(
		bot: BotService,
		rssService: RSSService,
		feedPaths: string[],
		chatId: string,
		intervalHours: number,
		startTime?: string, // 可选的开始时间
		useMockData?: boolean // 是否使用模拟数据
	) {
		this.bot = bot
		this.rssService = rssService
		this.mockService = new MockService()
		// 如果使用模拟数据，只使用一个模拟路径
		this.feedPaths = useMockData
			? ["/mock/36kr_newsflashes_rss.xml"]
			: feedPaths
		this.chatId = chatId
		this.intervalHours = intervalHours
		this.startTime = startTime
		this.useMockData = useMockData || false
		this.sentItems = new Set() // 用于跟踪已发送的项目
	}

	start(): void {
		// 立即执行一次（除非配置了跳过或配置了开始时间）
		const skipInitialCheck = process.env.SKIP_INITIAL_CHECK === "true"
		const shouldSkipInitialCheck =
			skipInitialCheck || this.startTime !== undefined

		if (!shouldSkipInitialCheck) {
			console.log(
				"⏰ [${this.getCurrentTimestamp()}] Starting initial RSS check..."
			)
			this.checkAndSendRSS()
		} else if (this.startTime !== undefined) {
			console.log(
				`Skipping initial check, will start at configured time: ${this.startTime}`
			)
		}

		// 安排定时任务
		if (this.intervalHours > 0) {
			if (this.startTime) {
				this.scheduleWithStartTime()
			} else {
				this.scheduleRecurringTask()
			}
		} else {
			console.log(
				"⏰ RSS check interval is 0 or negative, skipping scheduled checks"
			)
		}
	}

	async checkAndSendRSS(): Promise<void> {
		console.log("Checking RSS feeds for updates...")

		try {
			for (const feedPath of this.feedPaths) {
				console.log(`Fetching RSS feed from: ${feedPath}`)

				// 检查是否为模拟路径或使用模拟数据模式
				let feed: Feed
				if (this.mockService.isMockPath(feedPath) || this.useMockData) {
					feed = await this.mockService.fetchMockFeed(feedPath)
				} else {
					feed = await this.rssService.fetchRSSFeed(feedPath)
				}

				console.log(
					`Successfully fetched RSS feed. Items count: ${feed.items.length}`
				)
				const latestItems = this.rssService.getLatestItems(feed)
				console.log(`Latest items count: ${latestItems.length}`)

				// 收集需要发送的项目
				const itemsToSend: FeedItem[] = []

				for (const item of latestItems) {
					console.log(`Processing item: ${item.title}`)
					// 检查是否启用调试模式（跳过重复检查）
					const debugMode = process.env.DEBUG_MODE === "true"

					if (debugMode) {
						// 调试模式：添加到待发送列表，不检查重复
						console.log(
							"Debug mode: Adding item to send list without duplicate check"
						)
						itemsToSend.push(item)
					} else {
						// 正常模式：检查是否已发送
						const itemKey = `${item.title}-${item.link}`

						if (!this.sentItems.has(itemKey)) {
							// 添加到待发送列表
							itemsToSend.push(item)
							// 添加到已发送集合
							this.sentItems.add(itemKey)

							// 限制集合大小以避免内存问题
							if (this.sentItems.size > 1000) {
								const keys = Array.from(this.sentItems).slice(500)
								this.sentItems = new Set(keys)
							}
						} else {
							console.log(`Item already sent, skipping: ${item.title}`)
						}
					}
				}

				// 如果有待发送的项目，则整合成一条消息发送
				if (itemsToSend.length > 0) {
					await this.sendCombinedMessage(feed, itemsToSend)
				}
			}
		} catch (error: any) {
			console.error("Error checking RSS feeds:", error.message)
			console.error("Error stack:", error.stack)
		}
	}

	async sendCombinedMessage(feed: Feed, items: FeedItem[]): Promise<void> {
		if (items.length === 0) return

		// 使用 feed 的标题，如果没有标题则使用 feed.link，如果都没有则使用"未知订阅源"
		const feedTitle = feed.title || feed.link || "未知订阅源"

		// 创建整合消息 (使用 HTML 格式)
		let message = `<b>${this.escapeHtml(feedTitle ?? feed.link)} - ${
			items.length
		} 条新更新</b>\n\n`

		items.forEach((item, index) => {
			const title = this.escapeHtml(item.title || "")
			// 截断过长的内容，保留前 100 个字符
			const fullContent = item.contentSnippet || item.summary || ""
			const truncatedContent = this.truncateContent(fullContent, 100)
			const content = this.escapeHtml(truncatedContent)
			const link = item.link || ""

			message += `${index + 1}. <b>${title}</b>\n${content}\n${link}\n\n`
		})

		// 使用 feed.link 作为日志信息
		const feedPath = feed.link || "未知链接"
		console.log(
			`Sending combined message for ${feedPath} with ${items.length} items`
		)

		// 检查是否为模拟模式
		const isSimulateMode = process.env.SIMULATE_BOT_ONLY === "true"
		let sendMessage = isSimulateMode
			? this.mockService.logSimulatedMessage
			: this.bot.sendMessage
		let _this = isSimulateMode ? this.mockService : this.bot

		try {
			// Telegram 消息长度限制为 4096 字符，需要分批发送
			if (message.length > 4000) {
				// 如果消息太长，分批发送
				const chunks = this.splitMessage(message, 4000)
				for (const chunk of chunks) {
					await sendMessage.call(_this, this.chatId, chunk, {
						parse_mode: "HTML",
					})
				}
			} else {
				// 发送整合消息
				await sendMessage.call(_this, this.chatId, message, {
					parse_mode: "HTML",
				})
			}
			console.log(`Successfully sent combined message for ${feedPath}`)
		} catch (error: any) {
			console.error("Error sending combined message:", error.message)
			console.error("Error stack:", error.stack)
		}
	}

	// 转义 HTML 特殊字符
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;")
			.replace(/\n/g, "\n") // 保留换行符
	}

	// 截断内容并在必要时添加省略号
	private truncateContent(content: string, maxLength: number): string {
		if (!content) return ""

		// 移除多余的空白字符和换行符
		const cleanedContent = content.replace(/\s+/g, " ").trim()

		if (cleanedContent.length <= maxLength) {
			return cleanedContent
		}

		// 截断内容并添加省略号
		return cleanedContent.substring(0, maxLength) + "..."
	}

	// 获取当前时间戳格式化字符串（本地时间）
	private getCurrentTimestamp(): string {
		return new Date().toLocaleString("zh-CN", {
			timeZone: "Asia/Shanghai",
			hour12: false,
		})
	}

	// 辅助方法：分割长消息
	private splitMessage(message: string, maxLength: number): string[] {
		const chunks: string[] = []
		let currentChunk = ""

		const lines = message.split("\n")
		for (const line of lines) {
			// 检查添加这行后是否会超过长度限制
			if (
				currentChunk.length + line.length + 1 > maxLength &&
				currentChunk.length > 0
			) {
				chunks.push(currentChunk)
				currentChunk = line + "\n"
			} else {
				currentChunk += line + "\n"
			}
		}

		// 添加最后一块
		if (currentChunk.length > 0) {
			chunks.push(currentChunk)
		}

		return chunks
	}

	private scheduleRecurringTask(): void {
		// 转换小时为分钟，支持小数
		const minutes = Math.max(1, Math.round(this.intervalHours * 60))
		const cronExpression = `*/${minutes} * * * *` // 每 minutes 分钟执行一次

		cron.schedule(cronExpression, () => {
			console.log(
				`⏰ [${this.getCurrentTimestamp()}] Scheduled RSS check triggered`
			)
			this.checkAndSendRSS()
		})

		console.log(
			`⏰ RSS check scheduled every ${minutes} minutes (${this.intervalHours} hours) starting now`
		)
	}

	// 安排定时任务（有开始时间）
	private scheduleWithStartTime(): void {
		// 如果配置了开始时间，则计算下一个执行时间点
		const [startHour, startMinute] = this.startTime!.split(":").map(Number)

		// 转换小时为分钟，支持小数
		const intervalMinutes = Math.max(1, Math.round(this.intervalHours * 60))

		if (this.intervalHours < 1) {
			// 对于小于 1 小时的间隔，使用分钟级的 cron 表达式
			const cronExpression = `*/${intervalMinutes} * * * *`

			cron.schedule(cronExpression, () => {
				console.log(
					`⏰ [${this.getCurrentTimestamp()}] Scheduled RSS check triggered`
				)
				this.checkAndSendRSS()
			})

			console.log(
				`⏰ RSS check scheduled every ${intervalMinutes} minutes starting now`
			)

			// 如果当前时间已经过了今天开始时间，则立即执行一次
			const now = new Date()
			const startToday = new Date()
			startToday.setHours(startHour, startMinute, 0, 0)
			if (now >= startToday) {
				console.log(
					`⏰ [${this.getCurrentTimestamp()}] Immediate execution triggered (past start time ${
						this.startTime
					})`
				)
				this.checkAndSendRSS()
			}
		} else {
			// 对于大于等于 1 小时的间隔，计算下一个执行时间点并创建一次性任务
			const now = new Date()
			const startToday = new Date()
			startToday.setHours(startHour, startMinute, 0, 0)

			// 计算下一个执行时间点
			let nextExecutionTime = startToday
			const intervalMs = intervalMinutes * 60 * 1000

			// 如果今天的开始时间已经过去，则计算下一个执行时间点
			if (now >= startToday) {
				// 计算从今天开始时间到现在的间隔数
				const elapsedMs = now.getTime() - startToday.getTime()
				const intervalsPassed = Math.ceil(elapsedMs / intervalMs)
				nextExecutionTime = new Date(
					startToday.getTime() + intervalsPassed * intervalMs
				)
			}

			// 创建一次性任务
			const cronExpression = `${nextExecutionTime.getSeconds()} ${nextExecutionTime.getMinutes()} ${nextExecutionTime.getHours()} ${nextExecutionTime.getDate()} ${
				nextExecutionTime.getMonth() + 1
			} *`

			const scheduleNext = () => {
				console.log(
					`⏰ [${this.getCurrentTimestamp()}] Scheduled RSS check triggered`
				)
				this.checkAndSendRSS()

				// 计算并安排下一次执行
				const nextTime = new Date(nextExecutionTime.getTime() + intervalMs)
				const nextCronExpression = `${nextTime.getSeconds()} ${nextTime.getMinutes()} ${nextTime.getHours()} ${nextTime.getDate()} ${
					nextTime.getMonth() + 1
				} *`

				cron.schedule(nextCronExpression, scheduleNext, {
					timezone: "Asia/Shanghai", // 使用中国时区
				})

				// 更新下次执行时间
				nextExecutionTime = nextTime

				console.log(
					`⏰ Next RSS check scheduled for ${nextExecutionTime.toString()}`
				)
			}

			cron.schedule(cronExpression, scheduleNext, {
				timezone: "Asia/Shanghai", // 使用中国时区
			})

			console.log(
				`⏰ RSS check scheduled for ${nextExecutionTime.toString()} and then every ${intervalMinutes} minutes`
			)

			// 如果当前时间已经过了今天开始时间，则立即执行一次
			if (now >= startToday) {
				console.log(
					`⏰ [${this.getCurrentTimestamp()}] Immediate execution triggered (past start time ${
						this.startTime
					})`
				)
				this.checkAndSendRSS()
			}
		}
	}
}

export default Scheduler
