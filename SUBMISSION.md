# LocalOracle - Chainlink Convergence Hackathon 2026 Submission

## Project Name
**LocalOracle** -- Geo-fenced prediction markets settled by decentralized weather oracles

## Tagline
Hyperlocal prediction markets where anyone can bet on the weather, verified by WorldID, and automatically settled by a Chainlink CRE workflow using multi-source consensus with AI adjudication.

---

## Problem

Prediction markets today are centralized, global, and vulnerable to sybil attacks. There's no platform for hyperlocal, geo-fenced predictions that everyday people can participate in fairly. Manual market settlement is slow and trust-dependent.

## Solution

LocalOracle solves this with three innovations:

1. **Geo-fenced markets** -- Markets are pinned to GPS coordinates. Weather outcomes are fetched for that exact location.
2. **Sybil-resistant participation** -- WorldID proof-of-personhood enforces a 100 USDC stake cap per human per market, preventing whale manipulation.
3. **Automated oracle settlement** -- A Chainlink CRE workflow fetches weather data from two independent APIs, runs consensus, and uses AI adjudication when sources disagree.

---

## Chainlink Technology Used

### Chainlink CRE (Convergence Runtime Environment)

LocalOracle's core oracle workflow runs as a CRE TypeScript workflow compiled to WASM and executed on Chainlink DON nodes.

**CRE features used:**

| Feature | Usage |
|---------|-------|
| `CronCapability` | Triggers settlement scan every 10 minutes |
| `EVMClient.callContract()` | Reads on-chain market data (nextMarketId, getMarket) |
| `EVMClient.writeReport()` | Writes settlement results on-chain |
| `HTTPClient.sendRequest()` | Fetches weather data from OpenWeatherMap and WeatherAPI |
| `ConsensusAggregationByFields` | Ensures DON nodes agree on weather data |
| `consensusIdenticalAggregation` | Consensus for AI adjudication results |
| `prepareReportRequest` | Prepares signed reports for on-chain submission |
| `Runner.newRunner()` | CRE workflow initialization pattern |
| `getNetwork()` | Chain selector resolution |
| `encodeCallMsg()` | EVM call encoding |

**Workflow file:** [`oracle-workflow/main.ts`](oracle-workflow/main.ts) (~550 lines)

### Evidence of CRE Integration

- **CRE simulation (local):** Successfully ran `cre workflow simulate --settings staging-settings`
- **CRE broadcast (live testnet):** Successfully ran against Ethereum Sepolia with `--broadcast` flag
  - Scanned on-chain markets
  - Fetched weather from both APIs
  - Ran consensus (both agreed: not raining in Stockholm)
  - Settled market on-chain
- **CRE broadcast transaction:** [`0x1589ff18...`](https://sepolia.etherscan.io/tx/0x1589ff18bdad3d7eba6dfae82fb52f8362a997529c8bf301374152930f6242bd)
- **Manual settlement matching CRE outcome:** [`0x03f6b98b...`](https://sepolia.etherscan.io/tx/0x03f6b98ba9e3394ee8c35433cc5ce863a4790710f0cfbaeead8c6333aa095719)

---

## Additional Technologies

### WorldID (Sybil Resistance)
- On-chain proof-of-personhood verification in `placeBet()`
- Per-human stake cap of 100 USDC per market
- Nullifier hash tracking prevents double-identity staking

### Anthropic Claude (AI Adjudication)
- Called only when weather sources disagree
- Receives raw weather codes and descriptions from both APIs
- Returns YES/NO verdict, executed through CRE's `HTTPClient` with consensus

---

## Deployed Contracts

**Network:** Ethereum Sepolia (chain ID: 11155111)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| PredictionMarket | `0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2` | [View](https://sepolia.etherscan.io/address/0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2) |
| MockERC20 (USDC) | `0xCfc1805c565D453F12A8474a2CFfa4d8B1F39c37` | [View](https://sepolia.etherscan.io/address/0xCfc1805c565D453F12A8474a2CFfa4d8B1F39c37) |
| MockWorldID | `0x6B1B3257d9C790eb20c7937fab4ef3F95176b07d` | [View](https://sepolia.etherscan.io/address/0x6B1B3257d9C790eb20c7937fab4ef3F95176b07d) |

### On-Chain Settlement Evidence

| Action | Transaction Hash |
|--------|-----------------|
| Market #0 resolved | [`0x84e90b998eff55dd25f620077b59ce483cab2a70fa97f49f456010f8556b842c`](https://sepolia.etherscan.io/tx/0x84e90b998eff55dd25f620077b59ce483cab2a70fa97f49f456010f8556b842c) |
| CRE broadcast (forwarder) | [`0x1589ff18bdad3d7eba6dfae82fb52f8362a997529c8bf301374152930f6242bd`](https://sepolia.etherscan.io/tx/0x1589ff18bdad3d7eba6dfae82fb52f8362a997529c8bf301374152930f6242bd) |
| Market #1 resolved (CRE outcome) | [`0x03f6b98ba9e3394ee8c35433cc5ce863a4790710f0cfbaeead8c6333aa095719`](https://sepolia.etherscan.io/tx/0x03f6b98ba9e3394ee8c35433cc5ce863a4790710f0cfbaeead8c6333aa095719) |

---

## Demo Flow

### Quick Demo (< 2 minutes)

1. **Create market:** Run the deploy script to create a demo market with a short expiration
2. **CRE settlement:** Run `cre workflow simulate --settings staging-settings --broadcast`
3. **Verify on Etherscan:** Check the settlement transaction and market state

### Full Demo

1. Open the frontend at `http://localhost:3000`
2. Connect wallet via Thirdweb
3. Browse markets on the map
4. Verify identity with WorldID
5. Place a bet on an active market
6. Wait for market expiration
7. CRE workflow automatically settles the market
8. Claim winnings

---

## Architecture Diagram

```
User (Browser)
     |
     v
+--------------------+
|  Next.js Frontend  |  Thirdweb wallet connect
|  Map + Market UI   |  WorldID verification
+--------+-----------+
         |
         v
+--------+-----------+      +---------------------------+
|  PredictionMarket  |<-----|  Chainlink CRE Workflow   |
|  (Solidity)        |      |  (TypeScript -> WASM)     |
|                    |      |                           |
|  createMarket()    |      |  CronCapability (10 min)  |
|  placeBet()        |      |        |                  |
|  resolveMarket()   |      |        v                  |
|  claimPayout()     |      |  Scan expired markets     |
|                    |      |        |                  |
|  WorldID verify    |      |        v                  |
|  100 USDC cap      |      |  +-------------------+   |
+--------------------+      |  | OpenWeatherMap API |   |
                            |  | WeatherAPI         |   |
                            |  +--------+----------+   |
                            |           |               |
                            |     Agree? ------+        |
                            |      |     |     |        |
                            |     YES   NO     |        |
                            |      |     |     v        |
                            |      |     | Anthropic    |
                            |      |     | Claude AI    |
                            |      |     |  adjudicate  |
                            |      |     +-----+        |
                            |      v           v        |
                            |  resolveMarket(id, bool)  |
                            +---------------------------+
```

---

## Team

Solo developer project.

---

## Prize Categories

### Primary: Best use of Chainlink CRE
- Full CRE workflow implementation with all major SDK features
- Multi-source data fetching with consensus
- On-chain reading and writing via EVMClient
- Cron-triggered automated execution
- Live testnet broadcast with real settlement

### Secondary: Most Innovative Oracle Design
- Multi-source weather consensus with AI adjudication fallback
- Geo-fenced data fetching based on on-chain GPS coordinates
- Three-tier resolution: consensus > AI adjudication > single-source fallback

### Tertiary: Best use of WorldID
- On-chain sybil resistance at the smart contract level
- Per-human stake caps preventing whale manipulation
- Nullifier hash tracking for fair participation

---

## What's Next

- **CRE deployment to DON:** Currently in CRE early access waitlist for full DON deployment
- **CRE receiver interface:** Implement `IReceiver` on PredictionMarket for direct CRE-to-contract settlement
- **More market types:** Expand beyond weather to support arbitrary verifiable predictions
- **Mainnet deployment:** Deploy to World Chain mainnet with real USDC and production WorldID
- **Additional data sources:** Add more weather APIs for stronger consensus (3-of-5)
