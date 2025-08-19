import fs from "fs/promises"
import yaml from "js-yaml"

export interface RSSConfig {
	rssHubUrl: string
	checkInterval: number
	feedPaths: string[]
	startTime?: string // 可选的开始时间，格式 "HH:mm"
}

class ConfigService {
	private static instance: ConfigService
	private config: RSSConfig | null = null

	private constructor() {}

	public static getInstance(): ConfigService {
		if (!ConfigService.instance) {
			ConfigService.instance = new ConfigService()
		}
		return ConfigService.instance
	}

	async loadConfig(
		configPath: string = "./config.yaml"
	): Promise<RSSConfig> {
		try {
			const configFile = await fs.readFile(configPath, "utf8")
			const config = yaml.load(configFile) as RSSConfig

			// Validate required fields
			if (!config.rssHubUrl) {
				throw new Error("rssHubUrl is required in config")
			}

			if (!config.feedPaths || !Array.isArray(config.feedPaths)) {
				throw new Error("feedPaths is required and must be an array")
			}

			this.config = config
			return config
		} catch (error: any) {
			console.error(`Error loading config from ${configPath}:`, error.message)
			throw error
		}
	}

	getConfig(): RSSConfig {
		if (!this.config) {
			throw new Error("Config not loaded. Call loadConfig() first.")
		}
		return this.config
	}
}

export default ConfigService
