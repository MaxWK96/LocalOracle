/**
 * LocalOracle - CRE Market Settlement Workflow
 * Chainlink Convergence Hackathon 2026
 *
 * Multi-source weather oracle that:
 * 1. Scans on-chain markets for expired, unresolved predictions
 * 2. Fetches weather data from OpenWeatherMap + WeatherAPI
 * 3. Runs consensus — if sources agree, uses that result
 * 4. If sources disagree, calls Anthropic Claude to adjudicate
 * 5. Settles the market on-chain via resolveMarket()
 */

import {
	bytesToHex,
	ConsensusAggregationByFields,
	consensusIdenticalAggregation,
	type CronPayload,
	handler,
	CronCapability,
	EVMClient,
	HTTPClient,
	type HTTPSendRequester,
	encodeCallMsg,
	getNetwork,
	LAST_FINALIZED_BLOCK_NUMBER,
	identical,
	prepareReportRequest,
	Runner,
	type Runtime,
	TxStatus,
	ok,
	json,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress } from 'viem'
import { z } from 'zod'
import { PredictionMarketABI } from './lib/abi'

// ============================================================================
// Configuration
// ============================================================================

const configSchema = z.object({
	schedule: z.string(),
	predictionMarketAddress: z.string(),
	chainSelectorName: z.string(),
	gasLimit: z.string(),
	openWeatherApiKey: z.string(),
	weatherApiKey: z.string(),
	anthropicApiKey: z.string(),
})

type Config = z.infer<typeof configSchema>

// ============================================================================
// Types
// ============================================================================

interface MarketData {
	id: bigint
	creator: string
	question: string
	lat: bigint
	lng: bigint
	endTime: bigint
	resolved: boolean
	outcome: boolean
	totalYesStake: bigint
	totalNoStake: bigint
}

interface WeatherResult {
	isRaining: boolean
	description: string
	source: string
	conditionCode: number
}

// ============================================================================
// Weather condition code classification
// ============================================================================

/**
 * OpenWeatherMap condition code ranges:
 * 2xx = Thunderstorm, 3xx = Drizzle, 5xx = Rain, 6xx = Snow
 * All codes 200-699 are precipitation.
 */
const isOWMRain = (code: number): boolean => code >= 200 && code < 700

/**
 * WeatherAPI rain-related condition codes.
 * See: https://www.weatherapi.com/docs/weather_conditions.json
 */
const WEATHERAPI_RAIN_CODES = new Set([
	1063, 1150, 1153, 1168, 1171, // patchy/light rain/drizzle
	1180, 1183, 1186, 1189, 1192, 1195, // rain intensities
	1198, 1201, // freezing rain
	1240, 1243, 1246, // rain showers
	1273, 1276, // thundery rain
])

const isWeatherAPIRain = (code: number): boolean => WEATHERAPI_RAIN_CODES.has(code)

// ============================================================================
// Step 1: Scan markets on-chain
// ============================================================================

const scanMarkets = (
	runtime: Runtime<Config>,
	evmClient: EVMClient,
	contractAddress: Address,
): MarketData[] => {
	runtime.log('')
	runtime.log('[1/5] Scanning on-chain markets...')

	// Read nextMarketId to know how many markets exist
	const nextIdCallData = encodeFunctionData({
		abi: PredictionMarketABI,
		functionName: 'nextMarketId',
	})

	const nextIdResult = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: contractAddress,
				data: nextIdCallData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	const nextIdHex = bytesToHex(nextIdResult.data)
	if (!nextIdHex || nextIdHex === '0x') {
		runtime.log('  Contract returned empty data — contract may not be deployed yet')
		runtime.log('  No markets to process.')
		return []
	}

	const nextMarketId = decodeFunctionResult({
		abi: PredictionMarketABI,
		functionName: 'nextMarketId',
		data: nextIdHex,
	})

	runtime.log(`  Total markets: ${nextMarketId}`)

	// Scan each market for expired + unresolved
	const now = BigInt(Math.floor(Date.now() / 1000))
	const pending: MarketData[] = []

	for (let i = 0n; i < nextMarketId; i++) {
		const callData = encodeFunctionData({
			abi: PredictionMarketABI,
			functionName: 'getMarket',
			args: [i],
		})

		const result = evmClient
			.callContract(runtime, {
				call: encodeCallMsg({
					from: zeroAddress,
					to: contractAddress,
					data: callData,
				}),
				blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
			})
			.result()

		const marketHex = bytesToHex(result.data)
		if (!marketHex || marketHex === '0x') {
			runtime.log(`  Market #${i}: empty response, skipping`)
			continue
		}

		const market = decodeFunctionResult({
			abi: PredictionMarketABI,
			functionName: 'getMarket',
			data: marketHex,
		}) as unknown as MarketData

		if (!market.resolved && market.endTime > 0n && market.endTime <= now) {
			pending.push(market)
			runtime.log(`  Market #${market.id}: "${market.question}" — EXPIRED, needs settlement`)
		}
	}

	runtime.log(`  Found ${pending.length} market(s) to settle`)
	return pending
}

// ============================================================================
// Step 2: Fetch weather data from two sources
// ============================================================================

const fetchOpenWeatherMap = (
	sendRequester: HTTPSendRequester,
	lat: number,
	lng: number,
	apiKey: string,
): WeatherResult => {
	const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}`
	const response = sendRequester.sendRequest({ method: 'GET', url }).result()

	if (!ok(response)) {
		return {
			isRaining: false,
			description: `API error (${response.statusCode})`,
			source: 'OpenWeatherMap',
			conditionCode: -1,
		}
	}

	const data = json(response) as any
	const code = data.weather?.[0]?.id ?? 800
	const description = data.weather?.[0]?.description ?? 'unknown'

	return {
		isRaining: isOWMRain(code),
		description,
		source: 'OpenWeatherMap',
		conditionCode: code,
	}
}

const fetchWeatherAPI = (
	sendRequester: HTTPSendRequester,
	lat: number,
	lng: number,
	apiKey: string,
): WeatherResult => {
	const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lng}`
	const response = sendRequester.sendRequest({ method: 'GET', url }).result()

	if (!ok(response)) {
		return {
			isRaining: false,
			description: `API error (${response.statusCode})`,
			source: 'WeatherAPI',
			conditionCode: -1,
		}
	}

	const data = json(response) as any
	const code = data.current?.condition?.code ?? 1000
	const description = data.current?.condition?.text ?? 'unknown'

	return {
		isRaining: isWeatherAPIRain(code),
		description,
		source: 'WeatherAPI',
		conditionCode: code,
	}
}

// ============================================================================
// Step 3 + 4: Consensus logic + AI adjudication
// ============================================================================

const adjudicateWithAI = (
	httpClient: HTTPClient,
	runtime: Runtime<Config>,
	market: MarketData,
	owm: WeatherResult,
	wa: WeatherResult,
	lat: number,
	lng: number,
): boolean => {
	runtime.log('[4/5] Sources disagree — calling Anthropic Claude to adjudicate...')

	const prompt = `You are a weather oracle adjudicator for a blockchain prediction market. Two weather data sources disagree and you must determine the correct outcome.

Market question: "${market.question}"
Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}

SOURCE 1 — OpenWeatherMap:
  Condition: ${owm.description} (code: ${owm.conditionCode})
  Rain detected: ${owm.isRaining}

SOURCE 2 — WeatherAPI:
  Condition: ${wa.description} (code: ${wa.conditionCode})
  Rain detected: ${wa.isRaining}

Based on the condition descriptions and codes, is it currently raining at this location? Consider:
- The specific condition descriptions (drizzle, mist, overcast vs actual rain)
- Weather code severity and specificity
- Which source's classification better matches the market question

Respond with EXACTLY one word: YES or NO`

	const requestBody = JSON.stringify({
		model: 'claude-sonnet-4-20250514',
		max_tokens: 10,
		messages: [{ role: 'user', content: prompt }],
	})

	const bodyBase64 = Buffer.from(requestBody).toString('base64')

	const fetchAI = httpClient.sendRequest(
		runtime,
		(sendRequester: HTTPSendRequester, config: Config) => {
			const response = sendRequester
				.sendRequest({
					method: 'POST',
					url: 'https://api.anthropic.com/v1/messages',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': config.anthropicApiKey,
						'anthropic-version': '2023-06-01',
					},
					body: bodyBase64,
				})
				.result()

			if (!ok(response)) {
				// Fallback: if AI call fails, use OpenWeatherMap (generally more reliable)
				return owm.isRaining
			}

			const data = json(response) as any
			let answer = (data.content?.[0]?.text ?? '').trim().toUpperCase()
			// Strip markdown if present
			answer = answer.replace(/```/g, '').trim()
			return answer === 'YES'
		},
		consensusIdenticalAggregation<boolean>(),
	)

	const aiOutcome = fetchAI(runtime.config).result()
	runtime.log(`  AI verdict: ${aiOutcome ? 'YES (raining)' : 'NO (not raining)'}`)
	return aiOutcome
}

// ============================================================================
// Step 5: Settle market on-chain
// ============================================================================

const settleMarket = (
	runtime: Runtime<Config>,
	evmClient: EVMClient,
	contractAddress: Address,
	config: Config,
	marketId: bigint,
	outcome: boolean,
): void => {
	runtime.log(`[5/5] Settling market #${marketId} on-chain — outcome: ${outcome ? 'YES' : 'NO'}`)

	const callData = encodeFunctionData({
		abi: PredictionMarketABI,
		functionName: 'resolveMarket',
		args: [marketId, outcome],
	})

	const reportResponse = runtime
		.report(prepareReportRequest(callData))
		.result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: contractAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: config.gasLimit,
			},
		})
		.result()

	if (resp.txStatus === TxStatus.SUCCESS) {
		const txHash = bytesToHex(resp.txHash || new Uint8Array(32))
		runtime.log(`  Settlement successful! TxHash: ${txHash}`)
	} else if (resp.txStatus === TxStatus.REVERTED) {
		runtime.log(`  Settlement REVERTED: ${resp.errorMessage || 'unknown reason'}`)
	} else {
		runtime.log(`  Settlement FAILED: status=${resp.txStatus}, error=${resp.errorMessage || 'none'}`)
	}
}

// ============================================================================
// Main Settlement Pipeline
// ============================================================================

const settleMarkets = (runtime: Runtime<Config>): string => {
	const config = runtime.config

	runtime.log('================================================================')
	runtime.log('  LocalOracle — Multi-Source Weather Oracle Settlement')
	runtime.log('  Chainlink Convergence Hackathon 2026')
	runtime.log('================================================================')

	// Resolve network + create EVM client
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Unknown chain: ${config.chainSelectorName}`)
	}

	const evmClient = new EVMClient(network.chainSelector.selector)
	const contractAddress = config.predictionMarketAddress as Address

	// ---- Step 1: Scan markets ----
	const pendingMarkets = scanMarkets(runtime, evmClient, contractAddress)

	if (pendingMarkets.length === 0) {
		runtime.log('')
		runtime.log('No markets to settle. Workflow complete.')
		runtime.log('================================================================')
		return 'no-markets'
	}

	// Create HTTP client for weather + AI calls
	const httpClient = new HTTPClient()

	let settledCount = 0

	for (const market of pendingMarkets) {
		runtime.log('')
		runtime.log(`--- Processing Market #${market.id} ---`)
		runtime.log(`  Question: "${market.question}"`)

		const lat = Number(market.lat) / 1e6
		const lng = Number(market.lng) / 1e6
		runtime.log(`  Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)

		// ---- Step 2: Fetch weather from both sources ----
		runtime.log('')
		runtime.log('[2/5] Fetching weather data from 2 sources...')

		const owmFetcher = httpClient.sendRequest(
			runtime,
			fetchOpenWeatherMap,
			ConsensusAggregationByFields<WeatherResult>({
				isRaining: identical,
				description: identical,
				source: identical,
				conditionCode: identical,
			}),
		)
		const owmResult = owmFetcher(lat, lng, config.openWeatherApiKey).result()

		const waFetcher = httpClient.sendRequest(
			runtime,
			fetchWeatherAPI,
			ConsensusAggregationByFields<WeatherResult>({
				isRaining: identical,
				description: identical,
				source: identical,
				conditionCode: identical,
			}),
		)
		const waResult = waFetcher(lat, lng, config.weatherApiKey).result()

		runtime.log(`  OpenWeatherMap: "${owmResult.description}" (code ${owmResult.conditionCode}) → rain=${owmResult.isRaining}`)
		runtime.log(`  WeatherAPI:     "${waResult.description}" (code ${waResult.conditionCode}) → rain=${waResult.isRaining}`)

		// ---- Step 3: Consensus ----
		runtime.log('')
		runtime.log('[3/5] Running consensus logic...')

		let outcome: boolean
		let consensusMethod: string

		if (owmResult.conditionCode === -1 && waResult.conditionCode === -1) {
			// Both APIs failed — skip this market
			runtime.log('  BOTH weather APIs failed. Skipping market — will retry next cycle.')
			continue
		} else if (owmResult.conditionCode === -1) {
			// Only OpenWeatherMap failed — use WeatherAPI
			outcome = waResult.isRaining
			consensusMethod = 'single-source (WeatherAPI, OWM failed)'
			runtime.log(`  OpenWeatherMap failed. Using WeatherAPI: ${outcome ? 'YES' : 'NO'}`)
		} else if (waResult.conditionCode === -1) {
			// Only WeatherAPI failed — use OpenWeatherMap
			outcome = owmResult.isRaining
			consensusMethod = 'single-source (OpenWeatherMap, WA failed)'
			runtime.log(`  WeatherAPI failed. Using OpenWeatherMap: ${outcome ? 'YES' : 'NO'}`)
		} else if (owmResult.isRaining === waResult.isRaining) {
			// Both agree
			outcome = owmResult.isRaining
			consensusMethod = 'unanimous (both sources agree)'
			runtime.log(`  CONSENSUS: Both sources agree → ${outcome ? 'YES (raining)' : 'NO (not raining)'}`)
		} else {
			// Sources disagree — AI adjudication
			consensusMethod = 'ai-adjudicated (sources disagreed)'
			outcome = adjudicateWithAI(httpClient, runtime, market, owmResult, waResult, lat, lng)
		}

		// ---- Step 5: Settle on-chain ----
		runtime.log('')
		settleMarket(runtime, evmClient, contractAddress, config, market.id, outcome)
		settledCount++

		// Summary for this market
		runtime.log('')
		runtime.log(`  Market #${market.id} Summary:`)
		runtime.log(`    Question:   "${market.question}"`)
		runtime.log(`    OWM:        ${owmResult.description} (rain=${owmResult.isRaining})`)
		runtime.log(`    WeatherAPI: ${waResult.description} (rain=${waResult.isRaining})`)
		runtime.log(`    Method:     ${consensusMethod}`)
		runtime.log(`    Outcome:    ${outcome ? 'YES' : 'NO'}`)
	}

	// Final summary
	runtime.log('')
	runtime.log('================================================================')
	runtime.log('  SETTLEMENT COMPLETE')
	runtime.log(`  Markets scanned:  ${pendingMarkets.length}`)
	runtime.log(`  Markets settled:  ${settledCount}`)
	runtime.log(`  Markets skipped:  ${pendingMarkets.length - settledCount}`)
	runtime.log('================================================================')

	return `settled:${settledCount}/${pendingMarkets.length}`
}

// ============================================================================
// Trigger Handler
// ============================================================================

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}

	runtime.log(`Cron triggered at: ${new Date().toISOString()}`)
	return settleMarkets(runtime)
}

// ============================================================================
// Workflow Initialization
// ============================================================================

const initWorkflow = (config: Config) => {
	const cronTrigger = new CronCapability()

	return [
		handler(
			cronTrigger.trigger({
				schedule: config.schedule,
			}),
			onCronTrigger,
		),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}
