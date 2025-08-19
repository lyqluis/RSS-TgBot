import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import Parser from "rss-parser"
import { Feed } from "../rss"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class MockService {
	private parser: Parser

	constructor() {
		this.parser = new Parser()
	}

	/**
	 * 从本地文件读取模拟的 RSS 数据
	 * @param mockPath 模拟文件路径，格式为 "/mock/filename.xml"
	 * @returns 解析后的 Feed 对象
	 */
	async fetchMockFeed(mockPath: string): Promise<Feed> {
		try {
			console.log(`Reading mock RSS feed from local file: ${mockPath}`)
			const fileName = mockPath.replace("/mock/", "")
			const filePath = path.join(__dirname, fileName)
			const xmlData = await fs.readFile(filePath, "utf8")
			const parsedFeed = await this.parser.parseString(xmlData)
			console.log(
				`Successfully parsed mock RSS feed with ${parsedFeed.items.length} items`
			)

			// Transform the parsed feed to match our Feed interface
			const feed: Feed = {
				title: parsedFeed.title,
				description: parsedFeed.description,
				link: parsedFeed.link,
				items: parsedFeed.items
					.map((item) => ({
						title: item.title || "",
						link: item.link || "",
						pubDate: item.pubDate,
						isoDate: item.isoDate,
						contentSnippet: item.contentSnippet,
						summary: item.summary,
					}))
					.filter((item) => item.title !== ""), // Filter out items without titles
			}

			return feed
		} catch (error: any) {
			console.error(
				`Error reading mock RSS feed from ${mockPath}:`,
				error.message
			)
			throw error
		}
	}

	/**
	 * 检查给定路径是否为模拟路径
	 * @param path 要检查的路径
	 * @returns 如果是模拟路径返回 true，否则返回 false
	 */
	isMockPath(path: string): boolean {
		return path.startsWith("/mock/")
	}

	/**
	 * 模拟模式下显示消息内容
	 * @param chatId 聊天 ID
	 * @param message 消息内容
	 * @param options 消息选项
	 */
	logSimulatedMessage(chatId: string, message: string, options?: any): void {
		console.log(`[SIMULATE] Would send combined message to chat ${chatId}:`)
		console.log(`[SIMULATE] Message content:\n${message}`)
		console.log(`[SIMULATE] Message options: ${JSON.stringify(options)}`)
		console.log(
			"[SIMULATE] Message not actually sent (simulate bot only mode active)"
		)
	}
}

export default MockService
