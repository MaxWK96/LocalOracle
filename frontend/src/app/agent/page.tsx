"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import Header from "@/components/Header";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import { MARKET_AGENT_ADDRESS, MARKET_AGENT_ABI } from "@/lib/contracts";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_STATS = {
  bankroll:   BigInt(101_200_000), // 101.20 USDC
  totalBets:  BigInt(3),           // matches 3-row bets table
  wins:       BigInt(2),           // Stockholm + Gothenburg
  losses:     BigInt(1),           // Malmö
  totalPnL:   BigInt(20_000),      // +0.02 USDC net
  activeBets: BigInt(2),
};

const DEMO_BETS = [
  { id: 0, question: "Rain in Stockholm tomorrow",  side: "YES", amount: "2.00", result: "Won",  pnl: "+1.20", pos: true  },
  { id: 1, question: "Rain in Gothenburg tomorrow", side: "NO",  amount: "1.80", result: "Won",  pnl: "+0.90", pos: true  },
  { id: 2, question: "Rain in Malmö tomorrow",      side: "YES", amount: "2.10", result: "Lost", pnl: "−2.10", pos: false },
];

// ─── Live Activity Log ───────────────────────────────────────────────────────

type LogLevel = "bet" | "scan" | "settle" | "skip";

interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}

const LOG_POOL: Omit<LogEntry, "id" | "time">[] = [
  { level: "bet",    message: "Agent placed YES (Strandvägen flooding) based on precipitation forecast 89%" },
  { level: "scan",   message: "Scanning 8 active markets — 3 expire within 24h" },
  { level: "bet",    message: "Agent placed NO (Gothenburg snow Sunday) — OWM 14%, WeatherAPI 11%, edge −36 pp" },
  { level: "settle", message: "Settled market #0 (Strandvägen flooding) → YES confirmed — claimed +$1.20" },
  { level: "skip",   message: "Skipped market #5 (Warsaw Marathon) — insufficient edge (8 pp < 20 pp threshold)" },
  { level: "bet",    message: "Agent placed YES (Vistula flood warning) — IMGW precipitation 76%, WeatherAPI 71%" },
  { level: "scan",   message: "Fetching forecasts via Chainlink CRE — OWM + WeatherAPI for 3 markets" },
  { level: "settle", message: "Settled market #3 (Södermalm snow) → NO confirmed — claimed +$0.90" },
  { level: "skip",   message: "Skipped market #2 (Djurgården derby) — Sports markets use ESPN/SportsRadar, not in this run" },
  { level: "bet",    message: "Agent placed YES (Gothenburg Half Marathon cancel) — Met.no storm warning active" },
  { level: "scan",   message: "DON consensus achieved — 4/5 nodes agree on Stockholm precipitation (67%)" },
  { level: "skip",   message: "Skipped market #6 — risk cap reached (active bets: 5/5)" },
  { level: "settle", message: "Settled market #1 (T-Centralen metro) → NO confirmed — claimed +$0.45" },
  { level: "bet",    message: "Agent placed NO (Warsaw Marathon closure) — Warsaw city API shows no road closures" },
  { level: "scan",   message: "Next scheduled run in 6h — bankroll $101.20 USDC" },
];

function timeLabel(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

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

function LiveActivityLog() {
  const [entries, setEntries] = useState<LogEntry[]>(() => {
    // Pre-populate with last 5 simulated entries (working backwards in time)
    const now = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const t = new Date(now.getTime() - (4 - i) * 6 * 60 * 1000);
      const poolEntry = LOG_POOL[(LOG_POOL.length - 5 + i) % LOG_POOL.length];
      return {
        id: i,
        time: `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`,
        ...poolEntry,
      };
    });
  });

  const [nextIdx, setNextIdx] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const poolEntry = LOG_POOL[nextIdx % LOG_POOL.length];
      const newEntry: LogEntry = { id: Date.now(), time: timeLabel(), ...poolEntry };
      setEntries((prev) => [newEntry, ...prev].slice(0, 12));
      setNextIdx((n) => n + 1);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 30_000);
    return () => clearInterval(interval);
  }, [nextIdx]);

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-accent ${pulse ? "animate-ping" : "animate-glow-pulse"}`} />
          Live Activity Log
          <span className="text-[10px] font-normal">— updates every 30s</span>
        </h3>
        <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-secondary rounded-full border border-border">
          simulated
        </span>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            className={`flex items-start gap-3 text-xs transition-opacity ${i === 0 && pulse ? "animate-pulse" : ""}`}
          >
            <span className="font-mono text-muted-foreground shrink-0 w-11">{entry.time}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-px ${LEVEL_STYLE[entry.level]}`}>
              {LEVEL_LABEL[entry.level]}
            </span>
            <span className="text-muted-foreground leading-relaxed">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = "default" }: {
  label: string; value: string; sub?: string;
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
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── CRE Integration ─────────────────────────────────────────────────────────

function CRESection() {
  return (
    <section className="border-b border-border/50 bg-secondary/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          {/* Chainlink-style hex logo */}
          <svg className="w-8 h-8 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L2 9l14 7 14-7-14-7z"  fill="#375BD2" />
            <path d="M2 23l14 7 14-7-14-7-14 7z"  fill="#375BD2" opacity="0.6" />
            <path d="M2 16l14 7 14-7"             stroke="#375BD2" strokeWidth="1.5" fill="none" />
          </svg>
          <h2 className="text-xl font-bold">Under the Hood: Chainlink CRE Workflow</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="glass rounded-xl border border-primary/20 p-5">
            <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              </svg>
              Data Sources &amp; Consensus
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span><span className="text-foreground font-medium">OpenWeatherMap</span> — 5-day forecast, hourly <code className="text-primary text-xs">pop</code> (probability of precipitation), averaged over 4 slots</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span><span className="text-foreground font-medium">WeatherAPI</span> — Daily forecast, <code className="text-primary text-xs">daily_chance_of_rain</code> field</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span><span className="text-foreground font-medium">Consensus:</span> <code className="text-primary text-xs">ConsensusAggregationByFields</code> on rain% — integer rounding ensures DON nodes agree</span>
              </li>
            </ul>
          </div>

          <div className="glass rounded-xl border border-accent/20 p-5">
            <h3 className="font-semibold text-accent mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              On-Chain Actions
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="text-accent mt-0.5 shrink-0">•</span>
                <span><span className="text-foreground font-medium">Place Bet:</span> <code className="text-accent text-xs">MarketAgent.placeBet()</code> via <code className="text-accent text-xs">runtime.report()</code> → <code className="text-accent text-xs">evmClient.writeReport()</code></span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-accent mt-0.5 shrink-0">•</span>
                <span><span className="text-foreground font-medium">Risk Caps:</span> 2% bankroll hard limit enforced on-chain, 1.5% used by workflow to stay safely below</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-accent mt-0.5 shrink-0">•</span>
                <span><span className="text-foreground font-medium">Settlement:</span> CRE main workflow resolves markets; agent calls <code className="text-accent text-xs">settleBet()</code> to claim payouts</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Code snippet teaser */}
        <div className="rounded-xl bg-background border border-border p-4 overflow-x-auto">
          <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">oracle-workflow/agent-main.ts</div>
          <pre className="text-xs text-muted-foreground leading-relaxed"><code>{`// CRE fetches forecasts from both APIs simultaneously
const owmResult  = fetchOWMForecast(sendRequest, lat, lng, config.openWeatherApiKey).result();
const wapiResult = fetchWeatherAPIForecast(sendRequest, lat, lng, config.weatherApiKey).result();

// Calculate edge vs market odds
const edge = combinedRainPct - marketYesPct;
if (Math.abs(edge) > 20) {
  executeBet(runtime, marketId, edge > 0, betSize, reasoning);
}`}</code></pre>
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
                <div className="text-[10px] text-muted-foreground mb-1">Step {step.num}</div>
                <div className="font-semibold text-sm mb-1">{step.title}</div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">{step.desc}</div>
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

// ─── Page ────────────────────────────────────────────────────────────────────

const IS_DEPLOYED = MARKET_AGENT_ADDRESS !== "0x0000000000000000000000000000000000000000";

export default function AgentPage() {
  const { data: stats } = useReadContract({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    functionName: "getStats",
    args: [],
    query: { enabled: IS_DEPLOYED },
  });

  const { data: agentOwner } = useReadContract({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    functionName: "owner",
    args: [],
    query: { enabled: IS_DEPLOYED },
  });

  const { data: workflowAddr } = useReadContract({
    address: MARKET_AGENT_ADDRESS,
    abi: MARKET_AGENT_ABI,
    functionName: "coreWorkflow",
    args: [],
    query: { enabled: IS_DEPLOYED },
  });

  // Use real stats when available, fall back to demo data so page is never empty
  const displayStats = stats
    ? { bankroll: stats[0], totalBets: stats[1], wins: stats[2],
        losses: stats[3], totalPnL: stats[4], activeBets: stats[5] }
    : DEMO_STATS;

  const isDemo = !stats;

  const { bankroll, totalBets, wins, losses, totalPnL, activeBets } = displayStats;

  const winRate = totalBets > 0n
    ? `${((Number(wins) / Number(totalBets)) * 100).toFixed(1)}%`
    : "—";

  // ── Countdown to next 6-hour CRE run (anchored to UTC 00/06/12/18) ─────────
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
      if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
      return `${m}m ${String(s).padStart(2, "0")}s`;
    }
    setNextRunStr(computeNextRun());
    const id = setInterval(() => setNextRunStr(computeNextRun()), 1000);
    return () => clearInterval(id);
  }, []);

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
                <Link href="/" className="text-primary hover:underline">hyperlocal weather markets</Link>
                {" "}— the only market type supported by the CRE oracle workflow.
                Every 6 hours it scans all four active markets (Stockholm ×2, Warsaw, Gothenburg),
                fetches rain/precipitation forecasts via Chainlink CRE, and places bets when the edge exceeds 20 percentage points.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 bg-secondary text-muted-foreground rounded-lg border border-border/50">Currently Watching: Markets #0, #1, #2, #3</span>
                <span className="px-2.5 py-1 bg-secondary text-muted-foreground rounded-lg border border-border/50">Active Positions: {Number(activeBets)}/5</span>
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
            <h2 className="text-sm font-semibold text-muted-foreground">Live Stats</h2>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
              IS_DEPLOYED
                ? "bg-accent/10 text-accent border-accent/30"
                : "bg-secondary text-muted-foreground border-border"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${IS_DEPLOYED ? "bg-accent animate-glow-pulse" : "bg-muted-foreground"}`} />
              {IS_DEPLOYED ? "Agent deployed" : "Not deployed"}
            </div>
          </div>

          {/* Demo notice */}
          {isDemo && (
            <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
              <span>📊</span>
              Showing testnet demo data — agent will populate real stats once deployed and running
            </div>
          )}

          {/* Stats grid — always shown (real or demo) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Bankroll"    value={formatUSDC(bankroll)}       sub="USDC available"                           accent="blue"   />
            <StatCard label="Total PnL"   value={formatPnL(totalPnL)}        sub="all-time"                                 accent={totalPnL >= 0n ? "green" : "red"} />
            <StatCard label="Win Rate"    value={winRate}                     sub={`${Number(wins)}W / ${Number(losses)}L`}  accent={Number(wins) > Number(losses) ? "green" : "default"} />
            <StatCard label="Total Bets"  value={String(Number(totalBets))}   sub="placed by agent"                                         />
            <StatCard label="Active Bets" value={`${Number(activeBets)}/5`}   sub="max 5 concurrent"                        accent={Number(activeBets) >= 5 ? "red" : "default"} />
            <StatCard label="Risk Limit"  value="2%"                          sub="hard cap per bet (1.5% used)"            accent="purple" />
          </div>

          {/* Recent bets */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Recent Bets {isDemo && <span className="text-[10px] font-normal ml-1">(demo)</span>}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2.5 font-medium">Market</th>
                    <th className="pb-2.5 font-medium">Side</th>
                    <th className="pb-2.5 font-medium">Amount</th>
                    <th className="pb-2.5 font-medium">Result</th>
                    <th className="pb-2.5 font-medium">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {DEMO_BETS.map((bet) => (
                    <tr key={bet.id}>
                      <td className="py-3 pr-4">
                        <Link href="/" className="text-muted-foreground hover:text-primary transition-colors text-xs">
                          #{bet.id}: {bet.question}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          bet.side === "YES"
                            ? "bg-accent/10 text-accent border border-accent/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        }`}>
                          {bet.side}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{bet.amount} USDC</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          bet.result === "Won"
                            ? "bg-accent/10 text-accent border border-accent/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        }`}>
                          {bet.result}
                        </span>
                      </td>
                      <td className={`py-3 text-xs font-semibold ${bet.pos ? "text-accent" : "text-destructive"}`}>
                        {bet.pnl} USDC
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live activity log */}
          <LiveActivityLog />

          {/* Config — only when deployed */}
          {IS_DEPLOYED && (agentOwner || workflowAddr) && (
            <div className="glass rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Agent Configuration</h3>
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
                    <div className="text-muted-foreground mb-0.5">CRE Workflow</div>
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

          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Markets
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
