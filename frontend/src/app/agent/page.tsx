"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useReadContract,
  useReadContracts,
  usePublicClient,
  useWatchContractEvent,
} from "wagmi";
import Header from "@/components/Header";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import { MARKET_AGENT_ADDRESS, MARKET_AGENT_ABI } from "@/lib/contracts";

// ─── Constant ────────────────────────────────────────────────────────────────

const IS_DEPLOYED =
  MARKET_AGENT_ADDRESS !== "0x0000000000000000000000000000000000000000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUSDC(raw: bigint): string {
  const n = Number(raw) / 1e6;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${n.toFixed(2)}`;
}

function formatPnL(raw: bigint): string {
  const n = Number(raw) / 1e6;
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

// Matches the tuple returned by getBet(uint256)
type GetBetTuple = readonly [bigint, boolean, bigint, bigint, boolean, bigint, string];

interface BetRecord {
  index: number;
  marketId: bigint;
  outcome: boolean;
  amount: bigint;
  timestamp: bigint;
  settled: boolean;
  pnl: bigint; // int256 — can be negative
  reasoning: string;
}

type LogLevel = "bet" | "scan" | "settle" | "skip";

interface LogEntry {
  id: string;
  blockNumber: bigint;
  level: LogLevel;
  message: string;
  txHash: `0x${string}` | null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<LogLevel, string> = {
  bet:    "text-accent border-accent/30 bg-accent/10",
  scan:   "text-primary border-primary/30 bg-primary/10",
  settle: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  skip:   "text-muted-foreground border-border bg-secondary/40",
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  bet:    "BET",
  scan:   "SCAN",
  settle: "SETTLE",
  skip:   "SKIP",
};

// ─── On-Chain Activity Log ────────────────────────────────────────────────────

function ContractEventLog() {
  const publicClient = usePublicClient();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(IS_DEPLOYED);
  const [pulse, setPulse] = useState(false);

  // Fetch historical BetPlaced + BetSettled events on mount
  useEffect(() => {
    if (!publicClient || !IS_DEPLOYED) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        // Query last ~2 weeks of Sepolia blocks to avoid RPC range limits
        const fromBlock = latest > 100_000n ? latest - 100_000n : 0n;

        const [placed, settled] = await Promise.all([
          publicClient.getContractEvents({
            address: MARKET_AGENT_ADDRESS,
            abi: MARKET_AGENT_ABI,
            eventName: "BetPlaced",
            fromBlock,
          }),
          publicClient.getContractEvents({
            address: MARKET_AGENT_ADDRESS,
            abi: MARKET_AGENT_ABI,
            eventName: "BetSettled",
            fromBlock,
          }),
        ]);

        const all: LogEntry[] = [
          ...placed.map((e) => ({
            id: `p-${e.transactionHash}-${e.logIndex}`,
            blockNumber: e.blockNumber ?? 0n,
            level: "bet" as const,
            message: `Placed ${e.args.outcome ? "YES" : "NO"} on market #${e.args.marketId} — ${(Number(e.args.amount ?? 0n) / 1e6).toFixed(2)} USDC`,
            txHash: e.transactionHash,
          })),
          ...settled.map((e) => {
            const pnl = e.args.pnl ?? 0n;
            return {
              id: `s-${e.transactionHash}-${e.logIndex}`,
              blockNumber: e.blockNumber ?? 0n,
              level: pnl > 0n ? ("settle" as const) : ("skip" as const),
              message: `Settled market #${e.args.marketId} — PnL: ${formatPnL(pnl)}`,
              txHash: e.transactionHash,
            };
          }),
        ]
          .sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1))
          .slice(0, 12);

        setEntries(all);
      } catch (err) {
        console.error("Failed to fetch contract events:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [publicClient]);

  // Watch for new BetPlaced events in real time
  useWatchContractEvent({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    eventName: "BetPlaced",
    pollingInterval: 30_000,
    onLogs(logs) {
      setEntries((prev) =>
        [
          ...logs.map((e) => ({
            id: `p-${e.transactionHash}-${e.logIndex}`,
            blockNumber: e.blockNumber ?? 0n,
            level: "bet" as const,
            message: `Placed ${e.args.outcome ? "YES" : "NO"} on market #${e.args.marketId} — ${(Number(e.args.amount ?? 0n) / 1e6).toFixed(2)} USDC`,
            txHash: e.transactionHash,
          })),
          ...prev,
        ].slice(0, 12)
      );
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    },
  });

  // Watch for new BetSettled events in real time
  useWatchContractEvent({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    eventName: "BetSettled",
    pollingInterval: 30_000,
    onLogs(logs) {
      setEntries((prev) =>
        [
          ...logs.map((e) => {
            const pnl = e.args.pnl ?? 0n;
            return {
              id: `s-${e.transactionHash}-${e.logIndex}`,
              blockNumber: e.blockNumber ?? 0n,
              level: pnl > 0n ? ("settle" as const) : ("skip" as const),
              message: `Settled market #${e.args.marketId} — PnL: ${formatPnL(pnl)}`,
              txHash: e.transactionHash,
            };
          }),
          ...prev,
        ].slice(0, 12)
      );
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    },
  });

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full bg-accent ${
              pulse ? "animate-ping" : "animate-glow-pulse"
            }`}
          />
          On-Chain Activity
        </h3>
        <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-secondary rounded-full border border-border">
          live events
        </span>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse py-2">
            Fetching contract events…
          </div>
        ) : entries.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            No activity yet — agent runs every 6 hours via Chainlink CRE
          </div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-start gap-3 text-xs ${
                i === 0 && pulse ? "animate-pulse" : ""
              }`}
            >
              <span className="font-mono text-muted-foreground shrink-0 text-[9px] tabular-nums mt-px w-16 truncate">
                #{entry.blockNumber.toString()}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-px ${
                  LEVEL_STYLE[entry.level]
                }`}
              >
                {LEVEL_LABEL[entry.level]}
              </span>
              <span className="text-muted-foreground leading-relaxed flex-1">
                {entry.message}
              </span>
              {entry.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${entry.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-mono text-primary/40 hover:text-primary shrink-0 tabular-nums"
                >
                  {entry.txHash.slice(0, 10)}…
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "blue" | "purple" | "default";
}) {
  const cls = {
    green:   "text-accent",
    red:     "text-destructive",
    blue:    "text-primary",
    purple:  "text-primary",
    default: "text-foreground",
  }[accent];
  return (
    <div className="glass rounded-xl p-4 space-y-1">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      {sub && (
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

// ─── CRE Integration ──────────────────────────────────────────────────────────

function CRESection() {
  return (
    <section className="border-b border-border/50 bg-secondary/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <svg
            className="w-8 h-8 shrink-0"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M16 2L2 9l14 7 14-7-14-7z" fill="#375BD2" />
            <path
              d="M2 23l14 7 14-7-14-7-14 7z"
              fill="#375BD2"
              opacity="0.6"
            />
            <path
              d="M2 16l14 7 14-7"
              stroke="#375BD2"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
          <h2 className="text-xl font-bold">
            Under the Hood: Chainlink CRE Workflow
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="glass rounded-xl border border-primary/20 p-5">
            <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                />
              </svg>
              Data Sources &amp; Consensus
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span>
                  <span className="text-foreground font-medium">
                    OpenWeatherMap
                  </span>{" "}
                  — 5-day forecast, hourly{" "}
                  <code className="text-primary text-xs">pop</code>{" "}
                  (probability of precipitation), averaged over 4 slots
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span>
                  <span className="text-foreground font-medium">WeatherAPI</span>{" "}
                  — Daily forecast,{" "}
                  <code className="text-primary text-xs">
                    daily_chance_of_rain
                  </code>{" "}
                  field
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span>
                  <span className="text-foreground font-medium">Consensus:</span>{" "}
                  <code className="text-primary text-xs">
                    ConsensusAggregationByFields
                  </code>{" "}
                  on rain% — integer rounding ensures DON nodes agree
                </span>
              </li>
            </ul>
          </div>

          <div className="glass rounded-xl border border-accent/20 p-5">
            <h3 className="font-semibold text-accent mb-4 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
              On-Chain Actions
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="text-accent mt-0.5 shrink-0">•</span>
                <span>
                  <span className="text-foreground font-medium">Place Bet:</span>{" "}
                  <code className="text-accent text-xs">
                    MarketAgent.placeBet()
                  </code>{" "}
                  via{" "}
                  <code className="text-accent text-xs">runtime.report()</code>{" "}
                  →{" "}
                  <code className="text-accent text-xs">
                    evmClient.writeReport()
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-accent mt-0.5 shrink-0">•</span>
                <span>
                  <span className="text-foreground font-medium">Risk Caps:</span>{" "}
                  2% bankroll hard limit enforced on-chain, 1.5% used by
                  workflow to stay safely below
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-accent mt-0.5 shrink-0">•</span>
                <span>
                  <span className="text-foreground font-medium">Settlement:</span>{" "}
                  CRE main workflow resolves markets; agent calls{" "}
                  <code className="text-accent text-xs">settleBet()</code> to
                  claim payouts
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Code snippet */}
        <div className="rounded-xl bg-background border border-border p-4 overflow-x-auto">
          <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
            oracle-workflow/agent-main.ts
          </div>
          <pre className="text-xs text-muted-foreground leading-relaxed">
            <code>{`// API keys loaded from process.env, not workflow config JSON
const owmResult  = fetchOWMForecast(sendRequest, lat, lng, owmApiKey).result();
const wapiResult = fetchWeatherAPIForecast(sendRequest, lat, lng, waApiKey).result();

// Calculate edge vs market odds
const edge = combinedRainPct - marketYesPct;
if (Math.abs(edge) > 20) {
  executeBet(runtime, marketId, edge > 0, betSize, reasoning);
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

// ─── Trading Pipeline ─────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { num: 1, icon: "🔍", title: "Scan Markets",    desc: "Active weather markets expiring within 24h that agent hasn't bet on" },
  { num: 2, icon: "🌦️", title: "Fetch Forecasts", desc: "OWM + WeatherAPI via CRE HTTPClient with DON consensus" },
  { num: 3, icon: "📊", title: "Calculate Edge",  desc: "Forecast rain% vs market-implied YES odds" },
  { num: 4, icon: "💰", title: "Place Bet",        desc: "Edge > 20 pp → bet 1.5% of bankroll on-chain" },
  { num: 5, icon: "✅", title: "Settlement",       desc: "CRE resolves market; agent auto-claims payout" },
] as const;

function TradingPipeline() {
  return (
    <section className="border-b border-border/50 bg-secondary/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-lg font-bold mb-6">Trading Pipeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {PIPELINE_STEPS.map((step) => (
            <div key={step.num} className="relative">
              <div className="glass rounded-xl p-4 h-full">
                <div className="text-2xl mb-2">{step.icon}</div>
                <div className="text-[10px] text-muted-foreground mb-1">
                  Step {step.num}
                </div>
                <div className="font-semibold text-sm mb-1">{step.title}</div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">
                  {step.desc}
                </div>
              </div>
              {step.num < 5 && (
                <div className="hidden sm:flex absolute top-1/2 -right-2 z-10 w-4 items-center">
                  <div className="w-full h-px bg-primary/50" />
                  <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[4px] border-l-primary/50 shrink-0" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentPage() {
  // ── Contract reads ──────────────────────────────────────────────────────────

  const { data: statsRaw } = useReadContract({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    functionName: "getStats",
    query: { enabled: IS_DEPLOYED, refetchInterval: 30_000 },
  });

  const { data: agentOwner } = useReadContract({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    functionName: "owner",
    query: { enabled: IS_DEPLOYED },
  });

  const { data: workflowAddr } = useReadContract({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    functionName: "coreWorkflow",
    query: { enabled: IS_DEPLOYED },
  });

  const { data: betCount } = useReadContract({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    functionName: "getBetCount",
    query: { enabled: IS_DEPLOYED, refetchInterval: 30_000 },
  });

  // Multicall: fetch every bet by index once betCount is known
  const betContracts =
    betCount !== undefined && betCount > 0n
      ? Array.from({ length: Number(betCount) }, (_, i) => ({
          address: MARKET_AGENT_ADDRESS,
          abi: MARKET_AGENT_ABI,
          functionName: "getBet" as const,
          args: [BigInt(i)] as readonly [bigint],
        }))
      : [];

  const { data: betsRaw } = useReadContracts({
    contracts: betContracts,
    query: {
      enabled: IS_DEPLOYED && betCount !== undefined && betCount > 0n,
      refetchInterval: 60_000,
    },
  });

  // ── Derived values ──────────────────────────────────────────────────────────

  const stats = statsRaw
    ? {
        bankroll:   statsRaw[0],
        totalBets:  statsRaw[1],
        wins:       statsRaw[2],
        losses:     statsRaw[3],
        totalPnL:   statsRaw[4],
        activeBets: statsRaw[5],
      }
    : null;

  // Parse multicall results; reverse so newest bet is first
  const bets: BetRecord[] = betsRaw
    ? betsRaw
        .map((item, i) => {
          if (item.status !== "success" || item.result === undefined)
            return null;
          const r = item.result as unknown as GetBetTuple;
          return {
            index:     i,
            marketId:  r[0],
            outcome:   r[1],
            amount:    r[2],
            timestamp: r[3],
            settled:   r[4],
            pnl:       r[5],
            reasoning: r[6],
          };
        })
        .filter((b): b is BetRecord => b !== null)
        .reverse()
    : [];

  const betsLoading =
    IS_DEPLOYED && betCount !== undefined && betCount > 0n && betsRaw === undefined;

  const winRate =
    stats && stats.totalBets > 0n
      ? `${((Number(stats.wins) / Number(stats.totalBets)) * 100).toFixed(1)}%`
      : stats
      ? "—"
      : "…";

  // ── Countdown to next 6-hour CRE run ───────────────────────────────────────
  const [nextRunStr, setNextRunStr] = useState("");

  useEffect(() => {
    function computeNextRun(): string {
      const SIX_HOURS = 6 * 3600;
      const nowSec = Math.floor(Date.now() / 1000);
      let secsLeft = SIX_HOURS - (nowSec % SIX_HOURS);
      if (secsLeft === 0) secsLeft = SIX_HOURS;
      const h = Math.floor(secsLeft / 3600);
      const m = Math.floor((secsLeft % 3600) / 60);
      const s = secsLeft % 60;
      if (h > 0)
        return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
      return `${m}m ${String(s).padStart(2, "0")}s`;
    }
    setNextRunStr(computeNextRun());
    const id = setInterval(() => setNextRunStr(computeNextRun()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1">
        <PageHeader
          title="Autonomous Trading Agent"
          description="AI-powered agent analyzes weather forecasts from multiple sources and places bets every 6 hours using Chainlink CRE workflows — no human intervention needed."
          badge="Chainlink CRE"
        />

        {/* Market context banner */}
        <div className="border-b border-border/50 bg-primary/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-start gap-3">
            <div className="text-2xl shrink-0">🎯</div>
            <div>
              <h3 className="font-semibold mb-1">How This Agent Works</h3>
              <p className="text-sm text-muted-foreground">
                This agent trades on{" "}
                <Link href="/" className="text-primary hover:underline">
                  hyperlocal weather markets
                </Link>{" "}
                — the only market type supported by the CRE oracle workflow.
                Every 6 hours it scans all active markets, fetches
                rain/precipitation forecasts via Chainlink CRE, and places bets
                when the edge exceeds 20 percentage points.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 bg-secondary text-muted-foreground rounded-lg border border-border/50">
                  Active Positions: {stats ? Number(stats.activeBets) : "…"}/5
                </span>
                <span className="px-2.5 py-1 bg-accent/10 text-accent rounded-lg border border-accent/20 font-mono tabular-nums">
                  ⏱ Next run: {nextRunStr || "…"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <CRESection />
        <TradingPipeline />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Live Stats
            </h2>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                IS_DEPLOYED
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  IS_DEPLOYED
                    ? "bg-accent animate-glow-pulse"
                    : "bg-muted-foreground"
                }`}
              />
              {IS_DEPLOYED ? "Agent deployed" : "Not deployed"}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label="Bankroll"
              value={stats ? formatUSDC(stats.bankroll) : "…"}
              sub="USDC available"
              accent="blue"
            />
            <StatCard
              label="Total PnL"
              value={stats ? formatPnL(stats.totalPnL) : "…"}
              sub="all-time"
              accent={
                stats
                  ? stats.totalPnL >= 0n
                    ? "green"
                    : "red"
                  : "default"
              }
            />
            <StatCard
              label="Win Rate"
              value={winRate}
              sub={
                stats
                  ? `${Number(stats.wins)}W / ${Number(stats.losses)}L`
                  : undefined
              }
              accent={
                stats && stats.wins > stats.losses ? "green" : "default"
              }
            />
            <StatCard
              label="Total Bets"
              value={stats ? String(Number(stats.totalBets)) : "…"}
              sub="placed by agent"
            />
            <StatCard
              label="Active Bets"
              value={stats ? `${Number(stats.activeBets)}/5` : "…"}
              sub="max 5 concurrent"
              accent={
                stats && Number(stats.activeBets) >= 5 ? "red" : "default"
              }
            />
            <StatCard
              label="Risk Limit"
              value="2%"
              sub="hard cap per bet (1.5% used)"
              accent="purple"
            />
          </div>

          {/* Bet history table */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Bet History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2.5 font-medium">Date</th>
                    <th className="pb-2.5 font-medium">Market</th>
                    <th className="pb-2.5 font-medium">Side</th>
                    <th className="pb-2.5 font-medium">Amount</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {betsLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-4 text-xs text-muted-foreground animate-pulse"
                      >
                        Loading bets from contract…
                      </td>
                    </tr>
                  ) : bets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-4 text-xs text-muted-foreground"
                      >
                        No bets placed yet — agent runs every 6 hours
                      </td>
                    </tr>
                  ) : (
                    bets.map((bet) => {
                      const status = !bet.settled
                        ? "Pending"
                        : bet.pnl > 0n
                        ? "Won"
                        : "Lost";
                      const statusCls =
                        status === "Won"
                          ? "bg-accent/10 text-accent border-accent/20"
                          : status === "Lost"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-secondary/60 text-muted-foreground border-border";

                      return (
                        <tr key={bet.index}>
                          <td className="py-3 pr-3 text-xs text-muted-foreground tabular-nums">
                            {formatDate(bet.timestamp)}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="text-xs">
                              Market #{bet.marketId.toString()}
                            </div>
                            {bet.reasoning && (
                              <div
                                className="text-[10px] text-muted-foreground/60 mt-0.5 max-w-[180px] truncate"
                                title={bet.reasoning}
                              >
                                {bet.reasoning}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                bet.outcome
                                  ? "bg-accent/10 text-accent border-accent/20"
                                  : "bg-destructive/10 text-destructive border-destructive/20"
                              }`}
                            >
                              {bet.outcome ? "YES" : "NO"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground tabular-nums">
                            {(Number(bet.amount) / 1e6).toFixed(2)} USDC
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusCls}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td
                            className={`py-3 text-xs font-semibold tabular-nums ${
                              !bet.settled
                                ? "text-muted-foreground"
                                : bet.pnl > 0n
                                ? "text-accent"
                                : "text-destructive"
                            }`}
                          >
                            {bet.settled ? `${formatPnL(bet.pnl)} USDC` : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live activity log — real contract events */}
          <ContractEventLog />

          {/* Config — only when deployed */}
          {IS_DEPLOYED && (agentOwner || workflowAddr) && (
            <div className="glass rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Agent Configuration
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">Contract</div>
                  <div className="font-mono break-all">{MARKET_AGENT_ADDRESS}</div>
                </div>
                {agentOwner && (
                  <div>
                    <div className="text-muted-foreground mb-0.5">Owner</div>
                    <div className="font-mono">{shortAddr(agentOwner)}</div>
                  </div>
                )}
                {workflowAddr && (
                  <div>
                    <div className="text-muted-foreground mb-0.5">
                      CRE Workflow
                    </div>
                    <div className="font-mono">{shortAddr(workflowAddr)}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground mb-0.5">Schedule</div>
                  <div>Every 6 hours</div>
                </div>
              </div>
            </div>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Markets
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
