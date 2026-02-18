"use client";

import { useState } from "react";
import Link from "next/link";
import { useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import Header from "@/components/Header";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import {
  governanceTokenContract,
  parameterRegistryContract,
  PARAMETER_REGISTRY_ADDRESS,
} from "@/lib/contracts";

// ─── helpers ────────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const LOG_SCALE = BigInt("1000000000000000"); // 1e15 — avoids Number overflow

function formatLOG(raw: bigint): string {
  const n = Number(raw / LOG_SCALE) / 1000;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1)    return n.toFixed(0);
  return n.toFixed(2);
}

function timeLeft(deadline: bigint): string {
  const diff = Number(deadline) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Ended";
  const days  = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${hours}h ${mins}m left`;
}

// ─── Demo proposals ────────────────────────────────────────────────────────

const now = Math.floor(Date.now() / 1000);

const DEMO_PROPOSALS = [
  {
    id: 1,
    proposer: "0xdeadbeef00000000000000000000000000001234",
    dataSources: ["openweathermap", "weatherapi", "smhi"],
    consensusThreshold: 51,
    settlementFee: 50,
    aiProvider: "claude-opus-4-6",
    targetMarketId: 0,
    forVotes:     BigInt("65000000000000000000000"),
    againstVotes: BigInt("35000000000000000000000"),
    deadline:     BigInt(now + 86400), // ends in 24h
    executed:     false,
    statusLabel:  "Active",
    statusColor:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    id: 2,
    proposer: "0xcafebabe00000000000000000000000000005678",
    dataSources: ["openweathermap", "weatherapi"],
    consensusThreshold: 100,
    settlementFee: 50,
    aiProvider: "claude-opus-4-6",
    targetMarketId: 0,
    forVotes:     BigInt("82000000000000000000000"),
    againstVotes: BigInt("18000000000000000000000"),
    deadline:     BigInt(now - 3600), // ended 1h ago
    executed:     true,
    statusLabel:  "Executed",
    statusColor:  "bg-green-500/20 text-green-400 border-green-500/30",
  },
  {
    id: 3,
    proposer: "0xf00d000000000000000000000000000000009abc",
    dataSources: ["openweathermap", "weatherapi"],
    consensusThreshold: 51,
    settlementFee: 30,
    aiProvider: "claude-opus-4-6",
    targetMarketId: 0,
    forVotes:     BigInt("45000000000000000000000"),
    againstVotes: BigInt("55000000000000000000000"),
    deadline:     BigInt(now - 7200), // ended 2h ago
    executed:     false,
    statusLabel:  "Rejected",
    statusColor:  "bg-red-500/20 text-red-400 border-red-500/30",
  },
];

// ─── DemoProposalCard ─────────────────────────────────────────────────────────

function DemoProposalCard({ p }: { p: (typeof DEMO_PROPOSALS)[number] }) {
  const totalVotes = p.forVotes + p.againstVotes;
  const forPct = totalVotes > 0n ? Number((p.forVotes * 100n) / totalVotes) : 50;

  return (
    <div className="p-5 rounded-xl border border-gray-700/40 bg-gray-900/30 space-y-4 opacity-90">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">#{p.id}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.statusColor}`}>
            {p.statusLabel}
          </span>
          <span className="text-[10px] text-gray-500">Global parameters</span>
          <span className="text-[10px] text-gray-600 italic">demo</span>
        </div>
        <span className="text-[10px] text-gray-500 shrink-0">{timeLeft(p.deadline)}</span>
      </div>

      <div className="text-xs text-gray-400">
        Proposer: <span className="font-mono text-gray-300">{shortAddr(p.proposer)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: "Data Sources",   value: p.dataSources.join(", ")    },
          { label: "Consensus",      value: `${p.consensusThreshold}%`  },
          { label: "Settlement Fee", value: `${p.settlementFee} bps`    },
          { label: "AI Provider",    value: p.aiProvider                },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800/50 rounded-lg p-2.5 space-y-0.5">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
            <div className="text-gray-200 font-medium truncate">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-green-400">{formatLOG(p.forVotes)} LOG FOR</span>
          <span className="text-red-400">{formatLOG(p.againstVotes)} LOG AGAINST</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-gradient-to-r from-green-600 to-green-500" style={{ width: `${forPct}%` }} />
          <div className="h-full bg-gradient-to-r from-red-600 to-red-500"   style={{ width: `${100 - forPct}%` }} />
        </div>
        <div className="text-[10px] text-gray-600 text-center">
          {formatLOG(totalVotes)} LOG cast · 51% quorum required
        </div>
      </div>
    </div>
  );
}

// ─── ProposalRow (live) ───────────────────────────────────────────────────────

function ProposalRow({ proposalId, logBalance }: { proposalId: number; logBalance: bigint }) {
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [localVoted, setLocalVoted] = useState<boolean | null>(null);

  const { data: proposal, isLoading } = useReadContract({
    contract: parameterRegistryContract,
    method: "getProposal",
    params: [BigInt(proposalId)],
  });

  if (isLoading) return <div className="p-4 rounded-xl border border-gray-800/50 bg-gray-900/40 animate-pulse h-32" />;
  if (!proposal || proposal.proposer === "0x0000000000000000000000000000000000000000") return null;

  const nowBig = BigInt(Math.floor(Date.now() / 1000));
  const isActive = proposal.deadline > nowBig && !proposal.executed;
  const isEnded  = proposal.deadline <= nowBig && !proposal.executed;
  const totalVotes = proposal.forVotes + proposal.againstVotes;
  const forPct = totalVotes > 0n ? Number((proposal.forVotes * 100n) / totalVotes) : 50;
  const canVote = isActive && logBalance > 0n && localVoted === null;

  const statusColor = proposal.executed ? "bg-green-500/20 text-green-400 border-green-500/30"
    : isActive ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : "bg-gray-500/20 text-gray-400 border-gray-500/30";
  const statusLabel = proposal.executed ? "Executed" : isActive ? "Active" : "Ended";

  function handleVote(support: boolean) {
    const tx = prepareContractCall({ contract: parameterRegistryContract, method: "vote", params: [BigInt(proposalId), support] });
    sendTx(tx, { onSuccess: () => setLocalVoted(support) });
  }
  function handleExecute() {
    const tx = prepareContractCall({ contract: parameterRegistryContract, method: "executeProposal", params: [BigInt(proposalId)] });
    sendTx(tx);
  }

  return (
    <div className="p-5 rounded-xl border border-gray-700/50 bg-gray-900/40 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">#{proposalId}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
          <span className="text-[10px] text-gray-500">{proposal.targetMarketId === 0n ? "Global parameters" : `Market #${proposal.targetMarketId}`}</span>
        </div>
        <span className="text-[10px] text-gray-500 shrink-0">{timeLeft(proposal.deadline)}</span>
      </div>
      <div className="text-xs text-gray-400">Proposer: <span className="font-mono text-gray-300">{shortAddr(proposal.proposer)}</span></div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: "Data Sources",   value: proposal.proposed.dataSources.join(", ") || "—" },
          { label: "Consensus",      value: `${proposal.proposed.consensusThreshold}%`       },
          { label: "Settlement Fee", value: `${proposal.proposed.settlementFee} bps`          },
          { label: "AI Provider",    value: proposal.proposed.aiProvider || "—"              },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800/50 rounded-lg p-2.5 space-y-0.5">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
            <div className="text-gray-200 font-medium truncate">{value}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-green-400">{formatLOG(proposal.forVotes)} FOR</span>
          <span className="text-red-400">{formatLOG(proposal.againstVotes)} AGAINST</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all" style={{ width: `${forPct}%` }} />
          <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all"   style={{ width: `${100 - forPct}%` }} />
        </div>
        <div className="text-[10px] text-gray-600 text-center">{formatLOG(totalVotes)} LOG cast · 51% quorum required</div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        {localVoted !== null ? (
          <div className="text-xs text-gray-400 italic">You voted {localVoted ? "FOR" : "AGAINST"} — tx submitted</div>
        ) : canVote ? (
          <>
            <button onClick={() => handleVote(true)} disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 transition-colors disabled:opacity-50">Vote FOR</button>
            <button onClick={() => handleVote(false)} disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors disabled:opacity-50">Vote AGAINST</button>
          </>
        ) : isActive && logBalance === 0n ? (
          <span className="text-xs text-gray-600 italic">Need LOG tokens to vote</span>
        ) : isEnded ? (
          <button onClick={handleExecute} disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-50">Execute Proposal</button>
        ) : null}
        {isPending && <span className="text-xs text-gray-500 animate-pulse">Submitting…</span>}
      </div>
    </div>
  );
}

// ─── CreateProposalModal ──────────────────────────────────────────────────────

function CreateProposalModal({ onClose, logBalance }: { onClose: () => void; logBalance: bigint }) {
  const THRESHOLD = BigInt("10000000000000000000000");
  const [sources, setSources]           = useState("openweathermap, weatherapi");
  const [threshold, setThreshold]       = useState("51");
  const [fee, setFee]                   = useState("50");
  const [aiProvider, setAiProvider]     = useState("claude-opus-4-6");
  const [targetMarketId, setTargetMkt]  = useState("0");
  const [error, setError]               = useState("");
  const { mutate: sendTx, isPending }   = useSendTransaction();

  function handleSubmit() {
    setError("");
    if (logBalance < THRESHOLD) { setError("You need at least 10,000 LOG to create a proposal."); return; }
    const thresholdNum = parseInt(threshold);
    if (isNaN(thresholdNum) || thresholdNum < 1 || thresholdNum > 100) { setError("Consensus threshold must be 1–100."); return; }
    const feeNum = parseInt(fee);
    if (isNaN(feeNum) || feeNum < 0) { setError("Settlement fee must be non-negative."); return; }
    const parsedSources = sources.split(",").map((s) => s.trim()).filter(Boolean);
    if (parsedSources.length === 0) { setError("At least one data source is required."); return; }
    const tx = prepareContractCall({
      contract: parameterRegistryContract, method: "propose",
      params: [parsedSources, thresholdNum, feeNum, aiProvider, BigInt(targetMarketId || "0")],
    });
    sendTx(tx, { onSuccess: () => onClose() });
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700/50 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Create Proposal</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-400">Requires 10,000 LOG · 3-day voting period · 51% quorum</p>
        {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-gray-400 font-medium">Data Sources (comma-separated)</span>
            <input type="text" value={sources} onChange={(e) => setSources(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-gray-400 font-medium">Consensus Threshold (%)</span>
              <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} min={1} max={100}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-gray-400 font-medium">Settlement Fee (bps)</span>
              <input type="number" value={fee} onChange={(e) => setFee(e.target.value)} min={0}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60" />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-gray-400 font-medium">AI Provider</span>
            <input type="text" value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-gray-400 font-medium">Target Market ID (0 = global)</span>
            <input type="number" value={targetMarketId} onChange={(e) => setTargetMkt(e.target.value)} min={0}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60" />
          </label>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={isPending || logBalance < THRESHOLD}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending ? "Submitting…" : "Create Proposal"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const IS_DEPLOYED = PARAMETER_REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";

const GOVERNABLE_PARAMS = [
  { name: "Data Sources",        desc: "Which weather APIs are used for market settlement",        live: true  },
  { name: "Consensus Threshold", desc: "Required agreement % between oracle sources",               live: true  },
  { name: "Settlement Fee",      desc: "Platform fee in basis points, paid on payout",             live: true  },
  { name: "AI Provider",         desc: "AI model used for adjudicating conflicting oracle data",    live: true  },
  { name: "Max Market Radius",   desc: "Maximum geo-fence radius in km per market",                live: false },
  { name: "Max Stake Per Human", desc: "WorldID-verified stake cap, currently 100 USDC",           live: false },
];

export default function GovernancePage() {
  const account = useActiveAccount();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: proposalCount } = useReadContract({
    contract: parameterRegistryContract,
    method: "proposalCount",
    params: [],
    queryOptions: { enabled: IS_DEPLOYED },
  });

  const { data: logBalance } = useReadContract({
    contract: governanceTokenContract,
    method: "balanceOf",
    params: account ? [account.address] : ["0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!account },
  });

  const totalProposals = Number(proposalCount ?? 0n);
  const userLogBalance = logBalance ?? 0n;
  const proposalIds    = Array.from({ length: totalProposals }, (_, i) => i + 1);
  const showDemo       = totalProposals === 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="flex-1 pb-20">
        <PageHeader
          title="Community Governance"
          description="LOG token holders vote on oracle parameters, data sources, consensus rules, and settlement fees for every market."
          badge="On-chain governance"
        />

        {/* Governable parameters */}
        <section className="border-b border-gray-800/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <h2 className="text-lg font-bold text-white mb-5">What&apos;s Governable</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GOVERNABLE_PARAMS.map(({ name, desc, live }) => (
                <div key={name} className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-sm text-blue-400">{name}</div>
                    {!live && (
                      <span className="text-[9px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">future</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Action row */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{showDemo ? "3" : String(totalProposals)}</div>
                <div className="text-[10px] text-gray-500">Proposals</div>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">3 days</div>
                <div className="text-[10px] text-gray-500">Voting Period</div>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">51%</div>
                <div className="text-[10px] text-gray-500">Quorum</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {account && userLogBalance > 0n && (
                <div className="text-right">
                  <div className="text-[10px] text-gray-500">Your LOG</div>
                  <div className="text-sm font-bold text-purple-300">{formatLOG(userLogBalance)}</div>
                </div>
              )}
              <button onClick={() => setShowCreateModal(true)} disabled={!account}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                + Propose
              </button>
            </div>
          </div>

          {/* Deploy notice */}
          {!IS_DEPLOYED && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-4 text-sm text-amber-400">
              OracleParameterRegistry not deployed. Set{" "}
              <code className="text-amber-300">NEXT_PUBLIC_PARAMETER_REGISTRY_ADDRESS</code> in .env to connect.
            </div>
          )}

          {/* 2-col: LOG sidebar (left) + proposals (right) */}
          <div className="grid lg:grid-cols-4 gap-8 items-start">

            {/* Left sidebar */}
            <div className="space-y-4">
              {/* Earn LOG — prominent */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-900/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🪙</span>
                  <h3 className="text-sm font-semibold text-purple-300">Earn LOG</h3>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300">
                  <li className="flex items-start gap-2.5">
                    <span className="text-purple-400 shrink-0 font-bold w-6">100</span>
                    <span>LOG for creating a market</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-purple-400 shrink-0 font-bold w-6">1:1</span>
                    <span>LOG per USDC staked</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-purple-400 shrink-0 font-bold w-6">10k</span>
                    <span>LOG required to propose</span>
                  </li>
                </ul>
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-gray-800/50 bg-gray-900/30 p-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">How It Works</h3>
                <div className="space-y-3">
                  {[
                    { step: "1", title: "Earn LOG",      body: "Create markets or stake to earn from the 1M LOG pool." },
                    { step: "2", title: "Propose & Vote", body: "10k LOG to propose. All holders vote in a 3-day window." },
                    { step: "3", title: "Execute",        body: "51%+ quorum → anyone can execute. Changes apply immediately." },
                  ].map(({ step, title, body }) => (
                    <div key={step} className="flex gap-2.5">
                      <span className="text-[10px] font-bold text-gray-600 bg-gray-800 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                      <div>
                        <div className="text-xs font-semibold text-gray-300">{title}</div>
                        <div className="text-[10px] text-gray-500 leading-relaxed">{body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Proposals */}
            <div className="lg:col-span-3 space-y-3">
              <h2 className="text-sm font-semibold text-gray-300">
                {showDemo ? "Demo Proposals" : `${totalProposals} Proposal${totalProposals !== 1 ? "s" : ""}`}
              </h2>

              {showDemo && (
                <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
                  <span>📊</span>
                  Showing demo proposals — real on-chain proposals will appear once governance is active
                </div>
              )}

              {showDemo
                ? DEMO_PROPOSALS.map((p) => <DemoProposalCard key={p.id} p={p} />)
                : proposalIds.map((id) => <ProposalRow key={id} proposalId={id} logBalance={userLogBalance} />)
              }
            </div>
          </div>

          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Markets
          </Link>
        </div>
      </main>

      <Footer />

      {showCreateModal && (
        <CreateProposalModal onClose={() => setShowCreateModal(false)} logBalance={userLogBalance} />
      )}
    </div>
  );
}
