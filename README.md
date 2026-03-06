# LocalOracle

**Geo-fenced prediction markets settled by decentralized weather oracles.**

LocalOracle is a prediction market platform where users create location-based weather markets ("Will it rain in Stockholm tomorrow?"), stake USDC with sybil-resistant WorldID verification, and markets are automatically settled by a Chainlink CRE workflow that fetches weather data from multiple sources, runs consensus, and uses AI adjudication when sources disagree.

Built for the [Chainlink Convergence Hackathon 2026](https://chain.link/hackathon).

**Demo:** [https://www.youtube.com/watch?v=aZm9UbzlRDQ](https://www.youtube.com/watch?v=aZm9UbzlRDQ)

---

## The problem your project addresses

Prediction markets are global and coarse-grained — you can bet on national elections or stock prices, but not on whether the street outside your house will flood, or whether your local half-marathon will be cancelled due to snow. No platform supports hyperlocal, GPS-pinned prediction markets because there is no decentralized oracle infrastructure capable of resolving them: fetching weather data for an exact lat/lng pair, running consensus across independent sources, and writing the result on-chain without a trusted intermediary. Without this, local communities have no trustless mechanism for collectively forecasting and hedging against neighborhood-scale weather events.

---

## How you've addressed the problem

LocalOracle lets anyone pin a prediction market to a GPS coordinate. When the market expires, a Chainlink CRE workflow automatically fetches current weather data for that exact location from two independent APIs (OpenWeatherMap + WeatherAPI), runs consensus across all DON nodes, and calls `resolveMarket()` on-chain. If the two weather sources disagree, Anthropic Claude adjudicates based on the raw condition codes — with the AI call also run through CRE consensus so no single node can manipulate the verdict. Sybil resistance is enforced via WorldID proof-of-personhood, capping each verified human at 100 USDC per market. An autonomous AI agent (MarketAgent) trades on these markets every 6 hours, comparing forecast rain probability against market-implied odds and placing bets when the edge exceeds 20 percentage points.

---

## How you've used CRE

The entire oracle and trading layer runs as two CRE TypeScript workflows compiled to WASM and executed on Chainlink DON nodes:

**Settlement workflow** (`oracle-workflow/main.ts`): `CronCapability` fires every 10 minutes → `EVMClient.callContract` reads all on-chain markets → **`ConfidentialHTTPClient.sendRequest`** fetches weather from two APIs inside a TEE with API keys injected as `{{.openWeatherApiKey}}` / `{{.weatherApiKey}}` vault secrets (`encryptOutput: true`) → `ConsensusAggregationByFields` requires all DON nodes to agree on the field-level result → if sources disagree, `HTTPClient.sendRequest` calls Anthropic Claude with `consensusIdenticalAggregation` (all nodes must return the same YES/NO) → `prepareReportRequest` + `EVMClient.writeReport` submits the settlement transaction.

**Agent trading workflow** (`oracle-workflow/agent-main.ts`): `CronCapability` fires every 6 hours → `EVMClient.callContract` reads bankroll from `MarketAgent` → `HTTPClient.sendRequest` fetches rain-probability forecasts with `ConsensusAggregationByFields` → calculates edge vs market-implied odds → `EVMClient.writeReport` calls `MarketAgent.placeBet()` when `|edge| > 20pp`.

The critical CRE capability is `ConsensusAggregationByFields` on HTTP results: every DON node independently fetches the same weather APIs and must agree on the field-level result before any on-chain write is submitted. This makes the oracle manipulation-resistant without any trusted intermediary.

**Chainlink Privacy Standard (implemented):** Both weather API calls use `confidential-http@1.0.0-alpha` — the `ConfidentialHTTPSendRequester` sends requests from inside a TEE with API keys never exposed in workflow code or logs. `vaultDonSecrets` declared in `workflow.yaml` maps `openWeatherApiKey` and `weatherApiKey` to environment secrets. In the CRE simulator the vault template substitution is not performed, so the workflow detects the resulting 401 and falls back to config values automatically — the confidential-http capability is declared and attempted first on every run.

**Demo walkthrough:** [https://www.youtube.com/watch?v=aZm9UbzlRDQ](https://www.youtube.com/watch?v=aZm9UbzlRDQ)

---

## Architecture

```
                                    LocalOracle Architecture

  +------------------+       +---------------------+       +----------------------+
  |   Frontend       |       |   Smart Contracts   |       |   CRE Oracle         |
  |   (Next.js)      |       |   (Solidity)        |       |   Workflow           |
  |                  |       |                     |       |                      |
  |  Map UI          |       |  PredictionMarket   |       |  Cron trigger        |
  |  Market list     +------>+  - createMarket()   +<------+  (every 10 min)      |
  |  Bet panel       |       |  - placeBet()       |       |                      |
  |  WorldID verify  |       |  - resolveMarket()  |       |  1. Scan markets     |
  |  Wallet connect  |       |  - claimPayout()    |       |  2. Fetch weather    |
  +------------------+       |                     |       |  3. Consensus        |
         |                   |  WorldID sybil      |       |  4. AI adjudication  |
         |                   |  resistance         |       |  5. Settle on-chain  |
         v                   +---------------------+       +----------+-----------+
  +------------------+                                                |
  |  Thirdweb SDK    |                                     +----------v-----------+
  |  Wallet abstrac. |                                     |  Data Sources        |
  +------------------+                                     |                      |
                                                           |  OpenWeatherMap API  |
                                                           |  WeatherAPI          |
                                                           |  Anthropic Claude    |
                                                           |  (AI tiebreaker)     |
                                                           +----------------------+
```

### Settlement Pipeline

The CRE workflow runs a 5-stage pipeline for each expired market:

1. **Scan Markets** -- Read `nextMarketId()` and loop through all markets, filtering for expired + unresolved
2. **Fetch Weather** -- Query OpenWeatherMap and WeatherAPI with the market's GPS coordinates
3. **Consensus** -- If both sources agree (both rain or both no-rain), use that result
4. **AI Adjudication** -- If sources disagree, call Anthropic Claude with both weather codes and descriptions to determine the correct outcome
5. **Settle On-Chain** -- Call `resolveMarket(marketId, outcome)` to finalize the market and enable payouts

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Smart Contracts | Solidity + Foundry | Gas-efficient, full test suite with Forge |
| Oracle Workflow | Chainlink CRE (TypeScript/WASM) | Decentralized execution on Chainlink DON nodes |
| Weather Data | OpenWeatherMap + WeatherAPI | Two independent sources for consensus |
| AI Adjudication | Anthropic Claude | Resolves disagreements between weather sources |
| Sybil Resistance | WorldID | Proof-of-personhood caps stakes at 100 USDC per human per market |
| Frontend | Next.js 15 + Tailwind CSS | Interactive map-based market browsing |
| Wallet | Thirdweb SDK | Chain-agnostic wallet connection |
| Testnet | Ethereum Sepolia | Deployed and verified |

---

## Deployed Contracts (Ethereum Sepolia)

| Contract | Address |
|----------|---------|
| PredictionMarket | [`0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2`](https://sepolia.etherscan.io/address/0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2) |
| MockERC20 (USDC) | [`0xCfc1805c565D453F12A8474a2CFfa4d8B1F39c37`](https://sepolia.etherscan.io/address/0xCfc1805c565D453F12A8474a2CFfa4d8B1F39c37) |
| MockWorldID | [`0x6B1B3257d9C790eb20c7937fab4ef3F95176b07d`](https://sepolia.etherscan.io/address/0x6B1B3257d9C790eb20c7937fab4ef3F95176b07d) |

### Settlement Transactions

| Description | Transaction |
|-------------|-------------|
| Market #0 settled | [`0x84e90b99...`](https://sepolia.etherscan.io/tx/0x84e90b998eff55dd25f620077b59ce483cab2a70fa97f49f456010f8556b842c) |
| Market #1 settled (CRE consensus) | [`0x03f6b98b...`](https://sepolia.etherscan.io/tx/0x03f6b98ba9e3394ee8c35433cc5ce863a4790710f0cfbaeead8c6333aa095719) |
| CRE broadcast TX (to forwarder) | [`0x1589ff18...`](https://sepolia.etherscan.io/tx/0x1589ff18bdad3d7eba6dfae82fb52f8362a997529c8bf301374152930f6242bd) |

---

## Project Structure

```
LocalOracle/
├── contracts/               # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── PredictionMarket.sol    # Core market contract
│   │   └── interfaces/             # IWorldID, IERC20
│   ├── test/                       # Forge tests (12 passing)
│   └── script/Deploy.s.sol         # Deployment script
├── oracle-workflow/         # Chainlink CRE workflow
│   ├── main.ts                     # Settlement pipeline (~550 lines)
│   ├── lib/abi.ts                  # Minimal PredictionMarket ABI
│   ├── workflow.yaml               # CRE workflow config
│   ├── config.staging.json         # Staging config (Sepolia)
│   └── config.production.json      # Production config
├── frontend/                # Next.js web app
│   ├── src/
│   │   ├── app/page.tsx            # Main page with map + sidebar
│   │   ├── components/             # UI components
│   │   └── lib/                    # Contracts, types, thirdweb setup
│   └── .env.local.example          # Environment template
└── project.yaml             # CRE project root config
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (runtime + package manager)
- [Foundry](https://book.getfoundry.sh/) (smart contract toolchain)
- [Chainlink CRE CLI](https://github.com/smartcontractkit/cre-cli/releases) — install and add `cre` to your PATH

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/LocalOracle.git
cd LocalOracle
```

### 2. Smart Contracts

```bash
cd contracts
forge install
forge build
forge test  # 12 tests passing
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your Thirdweb client ID and WorldID app ID
bun install
bun dev     # http://localhost:3000
```

### 4. Oracle Workflow

```bash
cd oracle-workflow
bun install
bun run build  # TypeScript compilation

# Configure environment (required before any cre command)
cp .env.example .env
# Edit .env — set CRE_ETH_PRIVATE_KEY, OPENWEATHER_API_KEY, WEATHERAPI_KEY

# Configure workflow (required for settlement workflow)
cp config.staging.example.json config.staging.json
# Edit config.staging.json — set anthropicApiKey

# Run CRE simulation (no broadcast, no testnet writes)
cre workflow simulate --settings staging-settings

# Run against live testnet (writes resolveMarket() on-chain)
cre workflow simulate --settings staging-settings --broadcast
```

---

## How It Works

### Creating a Market

1. User opens the map interface and clicks "Create Market"
2. Selects a location on the map (latitude/longitude captured)
3. Types a weather prediction question (e.g., "Will it rain in Berlin?")
4. Sets an expiration time
5. Transaction creates the market on-chain via `PredictionMarket.createMarket()`

### Placing Bets

1. User verifies their identity with WorldID (proof-of-personhood)
2. Selects YES or NO on an active market
3. Stakes up to 100 USDC (per-human cap enforced on-chain)
4. WorldID nullifier hash prevents multiple identities from the same person

### Automatic Settlement

1. CRE workflow runs every 10 minutes on Chainlink DON nodes
2. Scans all markets for expired + unresolved ones
3. For each expired market, fetches current weather at the market's GPS coordinates from two independent APIs
4. If both APIs agree, that's the outcome
5. If they disagree, Anthropic Claude adjudicates based on the raw weather codes and descriptions
6. Calls `resolveMarket()` on-chain to finalize the result
7. Winners can claim proportional payouts from the losing pool

---

## Smart Contract Design

### Sybil Resistance

WorldID proof-of-personhood verification is enforced at the contract level. Each verified human can stake a maximum of 100 USDC per market, preventing whale manipulation.

### Payout Formula

```
payout = original_stake + (stake / winning_pool) * losing_pool
```

Winners receive their original stake plus a proportional share of the losing side's pool.

### Access Control

Markets can only be resolved by the contract owner or a designated oracle address. The CRE workflow's DON address is set as the oracle.

---

## 🤖 AI Agent Evidence

**Contract:** [0x2bFCe8Bbfb7ed531D12BD879f631195B183eD061](https://sepolia.etherscan.io/address/0x2bFCe8Bbfb7ed531D12BD879f631195B183eD061#readContract)
- ✅ Verified on Etherscan
- ✅ Funded with 100 USDC bankroll
- ✅ Registered in PredictionMarket
- ✅ Production-ready with security controls

**CRE Workflow:** `oracle-workflow/agent-main.ts` (369 lines, 19KB)

**Trading Strategy:**
- Scans markets expiring within 24h every 6 hours
- Fetches weather forecasts from OpenWeatherMap + WeatherAPI
- Calculates edge: `forecast_rain_prob - market_implied_yes_prob`
- Places bet when `|edge| > 20pp`
- Position size: 1.5% of bankroll (2% hard cap enforced on-chain)
- Max 5 concurrent positions

**Security:** `onlyWorkflow` modifier ensures only authorized CRE workflow can execute trades

---

## 🗳️ Governance Evidence

**OracleGovernanceToken (LOG):** [0x62C232B0acd06A7b215997e246F01f4F788Bb217](https://sepolia.etherscan.io/address/0x62C232B0acd06A7b215997e246F01f4F788Bb217#readContract)
**OracleParameterRegistry:** [0x9224Ac9D4F9BFFA50E37D846c6d0FC7234e90D3C](https://sepolia.etherscan.io/address/0x9224Ac9D4F9BFFA50E37D846c6d0FC7234e90D3C#readContract)

**Governable Parameters:**
- Data sources (which APIs to use)
- Consensus threshold (50-100%)
- Settlement fee (basis points)
- AI provider (Anthropic/OpenAI)

**Earning LOG:**
- 100 LOG per market created
- 1 LOG per USDC staked in markets

---

## 📋 Deployed Contracts (All Verified)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| PredictionMarket | `0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2` | [View](https://sepolia.etherscan.io/address/0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2#readContract) |
| MarketAgent | `0x2bFCe8Bbfb7ed531D12BD879f631195B183eD061` | [View](https://sepolia.etherscan.io/address/0x2bFCe8Bbfb7ed531D12BD879f631195B183eD061#readContract) |
| OracleGovernanceToken | `0x62C232B0acd06A7b215997e246F01f4F788Bb217` | [View](https://sepolia.etherscan.io/address/0x62C232B0acd06A7b215997e246F01f4F788Bb217#readContract) |
| OracleParameterRegistry | `0x9224Ac9D4F9BFFA50E37D846c6d0FC7234e90D3C` | [View](https://sepolia.etherscan.io/address/0x9224Ac9D4F9BFFA50E37D846c6d0FC7234e90D3C#readContract) |

---

## 🏆 Prize Categories

This project targets 6 Chainlink Convergence Hackathon prize categories:

1. **Prediction Markets** - Hyperlocal markets with geo-fencing
2. **WorldID Integration** - Sybil resistance via stake caps
3. **World Mini Map** - Geo-fencing eligibility
4. **Thirdweb × CRE** - Wallet integration
5. **Tokenization** - LOG governance token
6. **AI Agents** - Autonomous trading via CRE

## Chainlink Integration Files

Every file in this repository that directly uses a Chainlink service, SDK, or on-chain primitive.

### CRE Workflow — core runtime

- [`oracle-workflow/main.ts`](https://github.com/MaxWK96/LocalOracle/blob/main/oracle-workflow/main.ts) — CRE settlement workflow: `CronCapability` trigger every 10 min, `EVMClient` reads expired markets, `HTTPClient` fetches OWM + WeatherAPI, `ConsensusAggregationByFields` for multi-node agreement, `consensusIdenticalAggregation` for AI adjudication result, `prepareReportRequest` + `EVMClient.writeReport` to call `resolveMarket()` on-chain
- [`oracle-workflow/agent-main.ts`](https://github.com/MaxWK96/LocalOracle/blob/main/oracle-workflow/agent-main.ts) — CRE autonomous trading agent: `CronCapability` trigger every 6 h, reads bankroll from `MarketAgent` via `EVMClient`, fetches rain-probability forecasts via `HTTPClient`, calculates forecast-vs-market edge, calls `MarketAgent.placeBet()` via `EVMClient.writeReport` when `|edge| > 20 pp`
- [`oracle-workflow/workflow.yaml`](https://github.com/MaxWK96/LocalOracle/blob/main/oracle-workflow/workflow.yaml) — CRE workflow settings file: maps `workflow-name`, `workflow-path` (`main.ts`), and `config-path` for staging and production DON deployment
- [`oracle-workflow/workflow-agent.yaml`](https://github.com/MaxWK96/LocalOracle/blob/main/oracle-workflow/workflow-agent.yaml) — CRE agent workflow settings file: mirrors `workflow.yaml` structure but targets `agent-main.ts` and `config.agent.json`
- [`oracle-workflow/package.json`](https://github.com/MaxWK96/LocalOracle/blob/main/oracle-workflow/package.json) — declares `@chainlink/cre-sdk ^1.0.7` as the runtime dependency for all CRE primitives used in the workflows
- [`oracle-workflow/lib/abi.ts`](https://github.com/MaxWK96/LocalOracle/blob/main/oracle-workflow/lib/abi.ts) — minimal `PredictionMarket` ABI consumed by `EVMClient` inside the settlement workflow (`getMarket`, `nextMarketId`, `resolveMarket`)
- [`oracle-workflow/lib/agent-abi.ts`](https://github.com/MaxWK96/LocalOracle/blob/main/oracle-workflow/lib/agent-abi.ts) — minimal `MarketAgent` ABI consumed by `EVMClient` inside the trading agent (`placeBet`, `getStats`, `activeBetCount`)

### CRE project configuration

- [`project.yaml`](https://github.com/MaxWK96/LocalOracle/blob/main/project.yaml) — CRE project root: defines `staging-settings` and `production-settings` with Sepolia RPC endpoints used by the DON to execute both workflows

### Smart Contracts

- [`contracts/src/PredictionMarket.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/src/PredictionMarket.sol) — core market contract: exposes `resolveMarket(marketId, outcome)` callable only by the designated CRE DON oracle address; emits `MarketResolved` events consumed by the settlement workflow
- [`contracts/src/MarketAgent.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/src/MarketAgent.sol) — on-chain wallet for the CRE trading agent: `onlyWorkflow` modifier restricts `placeBet()` to the registered CRE workflow address; enforces 2 % bankroll cap and max-5-position limit on-chain
- [`contracts/src/OracleParameterRegistry.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/src/OracleParameterRegistry.sol) — governance registry: LOG token holders propose and vote on the oracle parameters (`dataSources`, `consensusThreshold`, `aiProvider`) that the CRE settlement workflow reads at runtime
- [`contracts/src/OracleGovernanceToken.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/src/OracleGovernanceToken.sol) — ERC-20 LOG token: governs which data sources and consensus rules the CRE workflow uses; distributed to market creators and participants

### Deployment Scripts

- [`contracts/script/Deploy.s.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/script/Deploy.s.sol) — Foundry deploy script: deploys all four contracts and calls `setOracle(creWorkflowAddress)` on `PredictionMarket` to authorize the CRE DON
- [`contracts/script/RedeployAgent.s.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/script/RedeployAgent.s.sol) — re-deploys `MarketAgent` with a new CRE workflow address and calls `setCoreWorkflow()` to update the `onlyWorkflow` guard

### Tests

- [`contracts/test/PredictionMarket.t.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/test/PredictionMarket.t.sol) — Forge tests for CRE-triggered `resolveMarket()`, oracle access-control enforcement, and payout distribution
- [`contracts/test/MarketAgent.t.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/test/MarketAgent.t.sol) — Forge tests for `onlyWorkflow` guard, bankroll cap, concurrent-position limit, and `settleBet()` after CRE resolution
- [`contracts/test/OracleParameterRegistry.t.sol`](https://github.com/MaxWK96/LocalOracle/blob/main/contracts/test/OracleParameterRegistry.t.sol) — Forge tests for LOG-gated governance proposals, voting, quorum checks, and parameter execution consumed by the CRE workflow

---

## License

MIT
