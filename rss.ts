import got from "got"
import Parser from "rss-parser"

export interface FeedItem {
	title: string
	link: string
	pubDate?: string
	isoDate?: string
	contentSnippet?: string
	summary?: string
}

export interface Feed {
	items: FeedItem[]
	title?: string
	description?: string
	link?: string
}

class RSSService {
	private rssHubUrl: string
	private parser: Parser

	constructor(rssHubUrl: string) {
		this.rssHubUrl = rssHubUrl
		this.parser = new Parser()
	}

	async fetchRSSFeed(feedPath: string): Promise<Feed> {
		try {
			// 如果 feedPath 本身就是一个完整的 HTTPS URL，则直接使用
			let url: string
			if (feedPath.startsWith("https://") || feedPath.startsWith("http://")) {
				url = feedPath
				console.log(`Fetching RSS feed from network: ${url}`)
			} else {
				// 否则将其与 RSS Hub URL 拼接
				url = `${this.rssHubUrl}${feedPath}`
				console.log(`Fetching RSS feed from rsshub: ${url}`)
			}

			const response = await got(url, {
				timeout: {
					request: 10000, // 10 秒超时
				},
				retry: 3, // 重试 3 次
			})

			const parsedFeed = await this.parser.parseString(response.body)
			console.log(
				`Successfully fetched and parsed RSS feed with ${parsedFeed.items.length} items`
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
			console.error(`Error fetching RSS feed from ${feedPath}:`, error.message)
			throw error
		}
	}

	getLatestItems(feed: Feed, limit?: number): FeedItem[] {
		// Sort items by date and return the latest ones
		const sortedItems = [...feed.items].sort((a, b) => {
			const dateA = new Date(a.pubDate || a.isoDate || 0)
			const dateB = new Date(b.pubDate || b.isoDate || 0)
			return dateB.getTime() - dateA.getTime()
		})

		return sortedItems.slice(0, limit)
	}
}

export default RSSService
