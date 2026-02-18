"use client";

import Link from "next/link";
import { useReadContract } from "thirdweb/react";
import Header from "@/components/Header";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import { marketAgentContract, MARKET_AGENT_ADDRESS } from "@/lib/contracts";

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

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = "default" }: {
  label: string; value: string; sub?: string;
  accent?: "green" | "red" | "blue" | "purple" | "default";
}) {
  const cls = { green: "text-green-400", red: "text-red-400", blue: "text-blue-400",
                purple: "text-purple-400", default: "text-white" }[accent];
  return (
    <div className="bg-gray-900/40 border border-gray-800/50 rounded-xl p-4 space-y-1">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  );
}

// ─── CRE Integration ─────────────────────────────────────────────────────────

function CRESection() {
  return (
    <section className="border-b border-gray-800/50 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          {/* Chainlink-style hex logo */}
          <svg className="w-8 h-8 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L2 9l14 7 14-7-14-7z"  fill="#375BD2" />
            <path d="M2 23l14 7 14-7-14-7-14 7z"  fill="#375BD2" opacity="0.6" />
            <path d="M2 16l14 7 14-7"             stroke="#375BD2" strokeWidth="1.5" fill="none" />
          </svg>
          <h2 className="text-xl font-bold text-white">Under the Hood: Chainlink CRE Workflow</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900/50 rounded-xl border border-blue-500/20 p-5">
            <h3 className="font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              </svg>
              Data Sources &amp; Consensus
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                <span><span className="text-white font-medium">OpenWeatherMap</span> — 5-day forecast, hourly <code className="text-blue-300 text-xs">pop</code> (probability of precipitation), averaged over 4 slots</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                <span><span className="text-white font-medium">WeatherAPI</span> — Daily forecast, <code className="text-blue-300 text-xs">daily_chance_of_rain</code> field</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                <span><span className="text-white font-medium">Consensus:</span> <code className="text-blue-300 text-xs">ConsensusAggregationByFields</code> on rain% — integer rounding ensures DON nodes agree</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-900/50 rounded-xl border border-purple-500/20 p-5">
            <h3 className="font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              On-Chain Actions
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <span className="text-purple-400 mt-0.5 shrink-0">•</span>
                <span><span className="text-white font-medium">Place Bet:</span> <code className="text-purple-300 text-xs">MarketAgent.placeBet()</code> via <code className="text-purple-300 text-xs">runtime.report()</code> → <code className="text-purple-300 text-xs">evmClient.writeReport()</code></span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-purple-400 mt-0.5 shrink-0">•</span>
                <span><span className="text-white font-medium">Risk Caps:</span> 2% bankroll hard limit enforced on-chain, 1.5% used by workflow to stay safely below</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-purple-400 mt-0.5 shrink-0">•</span>
                <span><span className="text-white font-medium">Settlement:</span> CRE main workflow resolves markets; agent calls <code className="text-purple-300 text-xs">settleBet()</code> to claim payouts</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Code snippet teaser */}
        <div className="rounded-xl bg-gray-950 border border-gray-800 p-4 overflow-x-auto">
          <div className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">oracle-workflow/agent-main.ts</div>
          <pre className="text-xs text-gray-400 leading-relaxed"><code>{`// CRE fetches forecasts from both APIs simultaneously
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
    <section className="border-b border-gray-800/50 bg-gray-900/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-lg font-bold text-white mb-6">Trading Pipeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {PIPELINE_STEPS.map((step) => (
            <div key={step.num} className="relative">
              <div className="bg-gradient-to-b from-gray-800/80 to-gray-900 rounded-xl p-4 border border-gray-700/50 h-full">
                <div className="text-2xl mb-2">{step.icon}</div>
                <div className="text-[10px] text-gray-500 mb-1">Step {step.num}</div>
                <div className="font-semibold text-sm text-white mb-1">{step.title}</div>
                <div className="text-[10px] text-gray-400 leading-relaxed">{step.desc}</div>
              </div>
              {step.num < 5 && (
                <div className="hidden sm:flex absolute top-1/2 -right-2 z-10 w-4 items-center">
                  <div className="w-full h-px bg-blue-500/50" />
                  <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[4px] border-l-blue-500/50 shrink-0" />
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
    contract: marketAgentContract,
    method: "getStats",
    params: [],
    queryOptions: { enabled: IS_DEPLOYED },
  });

  const { data: agentOwner } = useReadContract({
    contract: marketAgentContract,
    method: "owner",
    params: [],
    queryOptions: { enabled: IS_DEPLOYED },
  });

  const { data: workflowAddr } = useReadContract({
    contract: marketAgentContract,
    method: "coreWorkflow",
    params: [],
    queryOptions: { enabled: IS_DEPLOYED },
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="flex-1">
        <PageHeader
          title="Autonomous Trading Agent"
          description="AI-powered agent analyzes weather forecasts from multiple sources and places bets every 6 hours using Chainlink CRE workflows — no human intervention needed."
          badge="Chainlink CRE"
        />

        {/* Market context banner */}
        <div className="border-b border-gray-800/50 bg-blue-500/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-start gap-3">
            <div className="text-2xl shrink-0">🎯</div>
            <div>
              <h3 className="font-semibold text-white mb-1">How This Agent Works</h3>
              <p className="text-sm text-gray-400">
                This agent runs on the same{" "}
                <Link href="/" className="text-blue-400 hover:underline">hyperlocal weather markets</Link>
                {" "}shown on the Markets page. Every 6 hours it scans for markets expiring within 24h,
                analyzes rain forecasts via Chainlink CRE, and places bets when the edge exceeds 20 percentage points.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 bg-gray-800 text-gray-400 rounded-lg border border-gray-700/50">Currently Watching: Markets #0, #1, #3</span>
                <span className="px-2.5 py-1 bg-gray-800 text-gray-400 rounded-lg border border-gray-700/50">Active Positions: {Number(activeBets)}/5</span>
                <span className="px-2.5 py-1 bg-gray-800 text-gray-400 rounded-lg border border-gray-700/50">Next run: ~6h</span>
              </div>
            </div>
          </div>
        </div>

        <CRESection />
        <TradingPipeline />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Live Stats</h2>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
              IS_DEPLOYED
                ? "bg-green-900/20 text-green-400 border-green-500/30"
                : "bg-gray-800 text-gray-500 border-gray-700"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${IS_DEPLOYED ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
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
          <div className="bg-gray-900/40 border border-gray-800/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">
              Recent Bets {isDemo && <span className="text-[10px] text-gray-600 font-normal ml-1">(demo)</span>}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="pb-2.5 font-medium">Market</th>
                    <th className="pb-2.5 font-medium">Side</th>
                    <th className="pb-2.5 font-medium">Amount</th>
                    <th className="pb-2.5 font-medium">Result</th>
                    <th className="pb-2.5 font-medium">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {DEMO_BETS.map((bet) => (
                    <tr key={bet.id}>
                      <td className="py-3 pr-4">
                        <Link href="/" className="text-gray-300 hover:text-blue-400 transition-colors text-xs">
                          #{bet.id}: {bet.question}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          bet.side === "YES"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {bet.side}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-400">{bet.amount} USDC</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          bet.result === "Won"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {bet.result}
                        </span>
                      </td>
                      <td className={`py-3 text-xs font-semibold ${bet.pos ? "text-green-400" : "text-red-400"}`}>
                        {bet.pnl} USDC
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Config — only when deployed */}
          {IS_DEPLOYED && (agentOwner || workflowAddr) && (
            <div className="bg-gray-900/40 border border-gray-800/50 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Agent Configuration</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-500 mb-0.5">Contract</div>
                  <div className="font-mono text-gray-300 break-all">{MARKET_AGENT_ADDRESS}</div>
                </div>
                {agentOwner && (
                  <div>
                    <div className="text-gray-500 mb-0.5">Owner</div>
                    <div className="font-mono text-gray-300">{shortAddr(agentOwner)}</div>
                  </div>
                )}
                {workflowAddr && (
                  <div>
                    <div className="text-gray-500 mb-0.5">CRE Workflow</div>
                    <div className="font-mono text-gray-300">{shortAddr(workflowAddr)}</div>
                  </div>
                )}
                <div>
                  <div className="text-gray-500 mb-0.5">Schedule</div>
                  <div className="text-gray-300">Every 6 hours</div>
                </div>
              </div>
            </div>
          )}

          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
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
