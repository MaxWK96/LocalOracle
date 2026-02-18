/**
 * LocalOracle — CRE Agent Trading Workflow
 * Chainlink Convergence Hackathon 2026
 *
 * Autonomous AI agent that:
 * 1. Reads its bankroll + active-bet count from the MarketAgent contract
 * 2. Scans for active markets expiring within the next 24 hours
 * 3. Fetches 12-hour rain-probability forecasts from OpenWeatherMap + WeatherAPI
 * 4. Computes the edge between the combined forecast and market-implied odds
 * 5. Places a bet via MarketAgent.placeBet() when |edge| > EDGE_THRESHOLD_PP
 *
 * NOTE: follows the same synchronous CRE SDK pattern as main.ts — no async/await.
 * All network calls go through the SDK's .result() chain so the DON can
 * run consensus over the results before submitting an on-chain tx.
 */

import {
	bytesToHex,
	ConsensusAggregationByFields,
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
import { MarketAgentABI } from './lib/agent-abi'

// ============================================================================
// Configuration
// ============================================================================

const configSchema = z.object({
	schedule: z.string(),
	predictionMarketAddress: z.string(),
	marketAgentAddress: z.string(),
	chainSelectorName: z.string(),
	gasLimit: z.string(),
	openWeatherApiKey: z.string(),
	weatherApiKey: z.string(),
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

interface ForecastResult {
	rainProbability: number // 0–100 integer; -1 means unavailable
	description: string
	source: string
	available: boolean
}

// ============================================================================
// Trading constants
// ============================================================================

/** Minimum edge (forecast prob − market prob, in percentage points) to trade. */
const EDGE_THRESHOLD_PP = 20

/** Bet size as basis points of bankroll (1.5 %; MarketAgent hard cap is 2 %). */
const BET_SIZE_BPS = 150

/** Only trade on markets whose end time falls within this many hours. */
const TRADING_WINDOW_HOURS = 24

// ============================================================================
// Step 3: Weather forecast fetching
// ============================================================================

/**
 * OpenWeatherMap 5-day/3-hour forecast.
 * Averages the `pop` (probability of precipitation, 0–1) field over the next
 * four time slots (≈ 12 hours) and returns an integer 0–100.
 */
const fetchOWMForecast = (
	sendRequester: HTTPSendRequester,
	lat: number,
	lng: number,
	apiKey: string,
): ForecastResult => {
	// cnt=4 limits the response to 4 × 3 h = 12 h of data
	const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&cnt=4`
	const response = sendRequester.sendRequest({ method: 'GET', url }).result()

	if (!ok(response)) {
		return {
			rainProbability: -1,
			description: `HTTP ${response.statusCode}`,
			source: 'OWM-Forecast',
			available: false,
		}
	}

	const data = json(response) as any
	const list: any[] = (data.list ?? []).slice(0, 4)

	if (list.length === 0) {
		return { rainProbability: -1, description: 'empty list', source: 'OWM-Forecast', available: false }
	}

	const avgPop = list.reduce((sum: number, slot: any) => sum + (Number(slot.pop) || 0), 0) / list.length
	const rainProbability = Math.round(avgPop * 100)
	const description = (list[0].weather?.[0]?.description ?? 'unknown') as string

	return { rainProbability, description, source: 'OWM-Forecast', available: true }
}

/**
 * WeatherAPI daily forecast.
 * Uses `daily_chance_of_rain` (integer 0–100) for the next 24-hour window.
 */
const fetchWeatherAPIForecast = (
	sendRequester: HTTPSendRequester,
	lat: number,
	lng: number,
	apiKey: string,
): ForecastResult => {
	const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lng}&days=1`
	const response = sendRequester.sendRequest({ method: 'GET', url }).result()

	if (!ok(response)) {
		return {
			rainProbability: -1,
			description: `HTTP ${response.statusCode}`,
			source: 'WeatherAPI-Forecast',
			available: false,
		}
	}

	const data = json(response) as any
	const day = data.forecast?.forecastday?.[0]?.day

	if (!day) {
		return { rainProbability: -1, description: 'no forecast data', source: 'WeatherAPI-Forecast', available: false }
	}

	const rainProbability = Math.round(Number(day.daily_chance_of_rain ?? -1))
	const description = (day.condition?.text ?? 'unknown') as string
	const available = rainProbability >= 0

	return { rainProbability, description, source: 'WeatherAPI-Forecast', available }
}

// ============================================================================
// EVM read helpers
// ============================================================================

/**
 * Reads bankroll (USDC, 6 dec) and activeBetCount from MarketAgent.getStats().
 * Returns zeros on any decoding error so the rest of the pipeline can skip gracefully.
 */
const readAgentStats = (
	runtime: Runtime<Config>,
	evmClient: EVMClient,
	agentAddress: Address,
): { bankroll: bigint; activeBets: bigint } => {
	const callData = encodeFunctionData({ abi: MarketAgentABI, functionName: 'getStats' })

	const result = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({ from: zeroAddress, to: agentAddress, data: callData }),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	const hex = bytesToHex(result.data)
	if (!hex || hex === '0x') return { bankroll: 0n, activeBets: 0n }

	// getStats returns (bankroll, totalBets, wins, losses, totalPnL, activeBets)
	const decoded = decodeFunctionResult({
		abi: MarketAgentABI,
		functionName: 'getStats',
		data: hex,
	}) as readonly [bigint, bigint, bigint, bigint, bigint, bigint]

	return { bankroll: decoded[0], activeBets: decoded[5] }
}

/**
 * Returns true if the agent already holds an open position on this market.
 * Reads the public marketToBetIndex(marketId) mapping — non-zero means bet exists.
 */
const agentHasBet = (
	runtime: Runtime<Config>,
	evmClient: EVMClient,
	agentAddress: Address,
	marketId: bigint,
): boolean => {
	const callData = encodeFunctionData({
		abi: MarketAgentABI,
		functionName: 'marketToBetIndex',
		args: [marketId],
	})

	const result = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({ from: zeroAddress, to: agentAddress, data: callData }),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	const hex = bytesToHex(result.data)
	if (!hex || hex === '0x') return false

	const index = decodeFunctionResult({
		abi: MarketAgentABI,
		functionName: 'marketToBetIndex',
		data: hex,
	}) as bigint

	return index !== 0n
}

// ============================================================================
// Step 2: Scan for tradeable markets
// ============================================================================

const scanActiveMarkets = (
	runtime: Runtime<Config>,
	evmClient: EVMClient,
	contractAddress: Address,
): MarketData[] => {
	runtime.log('')
	runtime.log('[2/5] Scanning for active markets expiring within 24 h...')

	const nextIdCallData = encodeFunctionData({ abi: PredictionMarketABI, functionName: 'nextMarketId' })

	const nextIdResult = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: nextIdCallData }),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	const nextIdHex = bytesToHex(nextIdResult.data)
	if (!nextIdHex || nextIdHex === '0x') {
		runtime.log('  Contract returned empty data — no markets deployed yet.')
		return []
	}

	const nextMarketId = decodeFunctionResult({
		abi: PredictionMarketABI,
		functionName: 'nextMarketId',
		data: nextIdHex,
	}) as bigint

	runtime.log(`  Total markets on-chain: ${nextMarketId}`)

	const now = BigInt(Math.floor(Date.now() / 1000))
	const windowEnd = now + BigInt(TRADING_WINDOW_HOURS * 3600)
	const tradeable: MarketData[] = []

	for (let i = 0n; i < nextMarketId; i++) {
		const callData = encodeFunctionData({
			abi: PredictionMarketABI,
			functionName: 'getMarket',
			args: [i],
		})

		const result = evmClient
			.callContract(runtime, {
				call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: callData }),
				blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
			})
			.result()

		const marketHex = bytesToHex(result.data)
		if (!marketHex || marketHex === '0x') continue

		const market = decodeFunctionResult({
			abi: PredictionMarketABI,
			functionName: 'getMarket',
			data: marketHex,
		}) as unknown as MarketData

		// Active: not yet resolved, end time within the 24 h trading window
		if (!market.resolved && market.endTime > now && market.endTime <= windowEnd) {
			tradeable.push(market)
			const hoursLeft = Number(market.endTime - now) / 3600
			runtime.log(`  [TRADEABLE] #${market.id}: "${market.question}" — ${hoursLeft.toFixed(1)} h left`)
		}
	}

	runtime.log(`  Found ${tradeable.length} tradeable market(s)`)
	return tradeable
}

// ============================================================================
// Step 5: Place bet on-chain via MarketAgent
// ============================================================================

const executeBet = (
	runtime: Runtime<Config>,
	evmClient: EVMClient,
	config: Config,
	marketId: bigint,
	outcome: boolean,
	amount: bigint,
	reasoning: string,
): void => {
	const callData = encodeFunctionData({
		abi: MarketAgentABI,
		functionName: 'placeBet',
		args: [marketId, outcome, amount, reasoning],
	})

	const reportResponse = runtime.report(prepareReportRequest(callData)).result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: config.marketAgentAddress as Address,
			report: reportResponse,
			gasConfig: { gasLimit: config.gasLimit },
		})
		.result()

	if (resp.txStatus === TxStatus.SUCCESS) {
		const txHash = bytesToHex(resp.txHash || new Uint8Array(32))
		runtime.log(`    Bet placed — TxHash: ${txHash.substring(0, 20)}...`)
	} else if (resp.txStatus === TxStatus.REVERTED) {
		runtime.log(`    Bet REVERTED: ${resp.errorMessage ?? 'unknown reason'}`)
	} else {
		runtime.log(`    Bet FAILED: status=${resp.txStatus}, error=${resp.errorMessage ?? 'none'}`)
	}
}

// ============================================================================
// Steps 3+4: Fetch forecasts and decide whether to trade
// ============================================================================

const analyzeMarket = (
	runtime: Runtime<Config>,
	config: Config,
	httpClient: HTTPClient,
	evmClient: EVMClient,
	market: MarketData,
	bankroll: bigint,
): void => {
	const lat = Number(market.lat) / 1e6
	const lng = Number(market.lng) / 1e6

	runtime.log('')
	runtime.log(`  ── Market #${market.id}: "${market.question}" ──`)
	runtime.log(`     Location: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`)

	// Skip if the agent already has a position here
	if (agentHasBet(runtime, evmClient, config.marketAgentAddress as Address, market.id)) {
		runtime.log('     Already have an active bet on this market. Skipping.')
		return
	}

	// Need existing bets to infer market-implied probability
	const totalYes = market.totalYesStake
	const totalNo = market.totalNoStake
	const total = totalYes + totalNo

	if (total === 0n) {
		runtime.log('     No bets placed yet — cannot compute market odds. Skipping.')
		return
	}

	const marketYesPct = Math.round(Number(totalYes * 10000n / total) / 100)
	runtime.log(`     Market odds : ${marketYesPct}% YES  (${Number(totalYes) / 1e6} USDC YES | ${Number(totalNo) / 1e6} USDC NO)`)

	// ── Fetch forecasts from both sources in parallel via DON consensus ──
	runtime.log('[3/5] Fetching weather forecasts...')

	const owmForecaster = httpClient.sendRequest(
		runtime,
		fetchOWMForecast,
		ConsensusAggregationByFields<ForecastResult>({
			rainProbability: identical,
			description: identical,
			source: identical,
			available: identical,
		}),
	)
	const owmForecast = owmForecaster(lat, lng, config.openWeatherApiKey).result()

	const waForecaster = httpClient.sendRequest(
		runtime,
		fetchWeatherAPIForecast,
		ConsensusAggregationByFields<ForecastResult>({
			rainProbability: identical,
			description: identical,
			source: identical,
			available: identical,
		}),
	)
	const waForecast = waForecaster(lat, lng, config.weatherApiKey).result()

	runtime.log(`     OWM Forecast:        "${owmForecast.description}" → ${owmForecast.available ? owmForecast.rainProbability + '%' : 'unavailable'}`)
	runtime.log(`     WeatherAPI Forecast: "${waForecast.description}" → ${waForecast.available ? waForecast.rainProbability + '%' : 'unavailable'}`)

	// ── Combine forecasts ──
	let combinedRainPct: number

	if (!owmForecast.available && !waForecast.available) {
		runtime.log('     Both forecast APIs failed. Skipping market.')
		return
	} else if (!owmForecast.available) {
		combinedRainPct = waForecast.rainProbability
		runtime.log('     OWM unavailable — using WeatherAPI only.')
	} else if (!waForecast.available) {
		combinedRainPct = owmForecast.rainProbability
		runtime.log('     WeatherAPI unavailable — using OWM only.')
	} else {
		combinedRainPct = Math.round((owmForecast.rainProbability + waForecast.rainProbability) / 2)
	}

	runtime.log(`     Combined forecast : ${combinedRainPct}% rain probability`)

	// ── Edge = forecast probability minus market-implied probability ──
	const edge = combinedRainPct - marketYesPct
	runtime.log(`[4/5] Edge: ${edge >= 0 ? '+' : ''}${edge} pp  (forecast ${combinedRainPct}% − market ${marketYesPct}%)`)

	if (Math.abs(edge) <= EDGE_THRESHOLD_PP) {
		runtime.log(`     Edge ≤ ${EDGE_THRESHOLD_PP} pp threshold — no trade.`)
		return
	}

	// ── Size and place bet ──
	const betOutcome = edge > 0           // YES if we think rain is underpriced
	const betAmount = (bankroll * BigInt(BET_SIZE_BPS)) / 10000n
	const reasoning =
		`OWM: ${owmForecast.available ? owmForecast.rainProbability + '%' : 'N/A'} | ` +
		`WeatherAPI: ${waForecast.available ? waForecast.rainProbability + '%' : 'N/A'} | ` +
		`Combined: ${combinedRainPct}% vs market ${marketYesPct}% → ${edge >= 0 ? '+' : ''}${edge} pp edge`

	runtime.log('')
	runtime.log(`[5/5] PLACING BET: ${betOutcome ? 'YES (rain)' : 'NO (no rain)'} · ${Number(betAmount) / 1e6} USDC`)
	runtime.log(`      Reasoning: ${reasoning}`)

	executeBet(runtime, evmClient, config, market.id, betOutcome, betAmount, reasoning)
}

// ============================================================================
// Main Agent Pipeline
// ============================================================================

const runAgent = (runtime: Runtime<Config>): string => {
	const config = runtime.config

	runtime.log('════════════════════════════════════════════════════════════')
	runtime.log('  LocalOracle Agent — Autonomous Market Trader')
	runtime.log('  Chainlink Convergence Hackathon 2026')
	runtime.log('════════════════════════════════════════════════════════════')
	runtime.log(`  Run time: ${new Date().toISOString()}`)

	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})

	if (!network) throw new Error(`Unknown chain: ${config.chainSelectorName}`)

	const evmClient = new EVMClient(network.chainSelector.selector)
	const agentAddress = config.marketAgentAddress as Address
	const marketAddress = config.predictionMarketAddress as Address

	// ── Step 1: Portfolio health check ──
	runtime.log('')
	runtime.log('[1/5] Reading agent portfolio...')

	const { bankroll, activeBets } = readAgentStats(runtime, evmClient, agentAddress)

	runtime.log(`  Bankroll    : ${Number(bankroll) / 1e6} USDC`)
	runtime.log(`  Active bets : ${activeBets} / 5`)

	if (bankroll === 0n) {
		runtime.log('  No bankroll — skipping run.')
		return 'no-bankroll'
	}

	if (activeBets >= 5n) {
		runtime.log('  Portfolio full (5 active bets) — skipping run.')
		return 'max-bets'
	}

	// ── Step 2: Scan markets ──
	const markets = scanActiveMarkets(runtime, evmClient, marketAddress)

	if (markets.length === 0) {
		runtime.log('')
		runtime.log('  No tradeable markets in the 24 h window. Run complete.')
		return 'no-markets'
	}

	// ── Steps 3-5: Forecast + trade each market ──
	runtime.log('')
	runtime.log('[3-5/5] Analysing markets...')

	const httpClient = new HTTPClient()

	for (const market of markets) {
		analyzeMarket(runtime, config, httpClient, evmClient, market, bankroll)
	}

	runtime.log('')
	runtime.log('════════════════════════════════════════════════════════════')
	runtime.log('  AGENT RUN COMPLETE')
	runtime.log(`  Markets analysed: ${markets.length}`)
	runtime.log('════════════════════════════════════════════════════════════')

	return `analysed:${markets.length}`
}

// ============================================================================
// Trigger Handler
// ============================================================================

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}
	runtime.log(`Cron triggered at: ${new Date().toISOString()}`)
	return runAgent(runtime)
}

// ============================================================================
// Workflow Initialization
// ============================================================================

const initWorkflow = (config: Config) => {
	const cronTrigger = new CronCapability()
	return [
		handler(
			cronTrigger.trigger({ schedule: config.schedule }),
			onCronTrigger,
		),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}
