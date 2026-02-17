# LocalOracle

**Geo-fenced prediction markets settled by decentralized weather oracles.**

LocalOracle is a prediction market platform where users create location-based weather markets ("Will it rain in Stockholm tomorrow?"), stake USDC with sybil-resistant WorldID verification, and markets are automatically settled by a Chainlink CRE workflow that fetches weather data from multiple sources, runs consensus, and uses AI adjudication when sources disagree.

Built for the [Chainlink Convergence Hackathon 2026](https://chain.link/hackathon).

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
- [Chainlink CRE CLI](https://docs.chain.link/cre) (oracle workflow)

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

# Run CRE simulation
cre workflow simulate --settings staging-settings

# Run against live testnet
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

## License

MIT
