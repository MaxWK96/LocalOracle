"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import MarketList from "@/components/MarketList";
import CreateMarketForm from "@/components/CreateMarketForm";
import BetPanel from "@/components/BetPanel";
import { Market } from "@/lib/types";
import { MOCK_MARKETS } from "@/lib/mockData";

export default function Home() {
  const [markets] = useState<Market[]>(MOCK_MARKETS);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [nullifierHash, setNullifierHash] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const handleVerified = useCallback((hash: string) => {
    setIsVerified(true);
    setNullifierHash(hash);
  }, []);

  const handleSelectMarket = useCallback((market: Market) => {
    setSelectedMarket(market);
    setShowBetPanel(true);
  }, []);

  const handleCreateMarket = useCallback(
    (data: { question: string; lat: number; lng: number; durationDays: number }) => {
      console.log("Create market:", data);
      setShowCreateForm(false);
    },
    []
  );

  const handlePlaceBet = useCallback(
    (marketId: number, isYes: boolean, amount: number) => {
      console.log("Place bet:", { marketId, isYes, amount, nullifierHash });
      setShowBetPanel(false);
    },
    [nullifierHash]
  );

  const scrollToMap = () => mapRef.current?.scrollIntoView({ behavior: "smooth" });
  const scrollToHowItWorks = () => howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <Header onVerified={handleVerified} isVerified={isVerified} />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Live on Ethereum Sepolia &bull; Built for World Chain
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Local<span className="text-blue-400">Oracle</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Hyperlocal prediction markets with geo-fenced trading &mdash; only humans
            within 5km can participate, verified by World ID + location proof
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={scrollToMap}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/25"
            >
              Explore Nearby Markets
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors border border-gray-700"
            >
              How It Works
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-gray-800/50 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { label: "Markets Active", value: "4", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              { label: "Total Volume", value: "$1,250", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { label: "Markets Resolved", value: "2", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
              { label: "Powered By", value: "CRE + World ID", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
            ].map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <svg className="w-4 h-4 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why LocalOracle? ── */}
      <section className="border-b border-gray-800/50 bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="md:w-1/3">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Why LocalOracle?</h2>
              <div className="w-12 h-1 bg-blue-500 rounded-full" />
            </div>
            <div className="md:w-2/3">
              <p className="text-sm text-gray-400 leading-relaxed">
                Traditional prediction markets lack local context and sybil resistance.
                LocalOracle combines <span className="text-white font-medium">World ID</span> (one
                human = one stake cap), <span className="text-white font-medium">geo-fencing</span> (only
                locals within 5km participate), and <span className="text-white font-medium">Chainlink
                CRE</span> multi-source oracles to create trustless markets for neighborhood
                flooding, transit delays, and community events. Locals have skin in the
                game; outcomes are automated and verifiable on-chain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Map + Sidebar ── */}
      <section ref={mapRef} className="flex flex-col md:flex-row flex-1" style={{ minHeight: "560px" }}>
        <div className="flex-[7] relative">
          <MapView
            markets={markets}
            onSelectMarket={handleSelectMarket}
            selectedMarket={selectedMarket}
          />
        </div>
        <div className="flex-[3] border-l border-gray-800/50 bg-gray-900/30 min-w-[300px]">
          <MarketList
            markets={markets}
            selectedMarket={selectedMarket}
            onSelectMarket={handleSelectMarket}
            onCreateClick={() => setShowCreateForm(true)}
          />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section ref={howItWorksRef} className="border-t border-gray-800/50 bg-gray-950">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-gray-500 text-sm">Four steps to prediction market participation</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Connect & Verify",
                desc: "Connect your wallet and verify your identity with World ID to prove you are a unique human.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                color: "from-green-500/20 to-green-600/5 border-green-500/20",
                iconColor: "text-green-400",
              },
              {
                step: "2",
                title: "Find Local Markets",
                desc: "Browse the interactive map to discover markets near you. Markets are geo-fenced — you can only see and trade on markets within 5km of your current location.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                ),
                color: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
                iconColor: "text-blue-400",
              },
              {
                step: "3",
                title: "Place Your Bet",
                desc: "Stake up to 100 USDC per market. WorldID caps prevent whale manipulation — one human, one position.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                ),
                color: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
                iconColor: "text-amber-400",
              },
              {
                step: "4",
                title: "CRE Resolves",
                desc: "Chainlink CRE automatically settles markets using multi-source weather consensus + AI adjudication.",
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                color: "from-purple-500/20 to-purple-600/5 border-purple-500/20",
                iconColor: "text-purple-400",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`relative p-6 rounded-2xl border bg-gradient-to-b ${item.color} transition-transform hover:-translate-y-1`}
              >
                <div className="absolute top-4 right-4 text-4xl font-black text-white/5">
                  {item.step}
                </div>
                <div className={`${item.iconColor} mb-4`}>{item.icon}</div>
                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Example Resolution Flow ── */}
          <div className="mt-12 p-6 rounded-2xl bg-gray-900/50 border border-gray-800/50">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Example Resolution Flow
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-3">
                <span className="text-gray-600 shrink-0 w-4 text-right font-mono">1.</span>
                <p className="text-gray-400">
                  <span className="text-white font-medium">Question:</span>{" "}
                  &ldquo;Will it rain in Strandv&auml;gen tomorrow at 15:00?&rdquo;
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-600 shrink-0 w-4 text-right font-mono">2.</span>
                <p className="text-gray-400">
                  <span className="text-white font-medium">CRE fetches:</span>{" "}
                  OpenWeatherMap <span className="text-sky-400 font-mono">(code 500 = rain)</span>{" "}
                  + WeatherAPI <span className="text-amber-400 font-mono">(code 1000 = clear)</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-600 shrink-0 w-4 text-right font-mono">3.</span>
                <p className="text-gray-400">
                  <span className="text-red-400 font-medium">Sources disagree</span>{" "}
                  &rarr; AI adjudicator (Claude) reviews raw weather codes, descriptions, and station data
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-600 shrink-0 w-4 text-right font-mono">4.</span>
                <p className="text-gray-400">
                  <span className="text-white font-medium">AI determines:</span>{" "}
                  WeatherAPI more reliable for this location &rarr; Outcome: <span className="text-red-400 font-semibold">NO</span> (not raining)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-600 shrink-0 w-4 text-right font-mono">5.</span>
                <p className="text-gray-400">
                  <span className="text-white font-medium">Settlement:</span>{" "}
                  <span className="font-mono text-blue-400">resolveMarket(1, false)</span> called on-chain
                  &rarr; Winners claim proportional USDC payouts
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Powered By Chainlink ── */}
      <section className="border-t border-gray-800/50 bg-gray-900/20">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Powered by Chainlink</h2>
            <p className="text-gray-500 text-sm">Decentralized infrastructure for trustless market resolution</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Chainlink CRE",
                desc: "Fetches from OpenWeatherMap + WeatherAPI via CRE HTTPClient. Example: Stockholm flooding resolved using precipitation codes (803 vs 1213) from both APIs for DON consensus.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                ),
              },
              {
                title: "AI Adjudication",
                desc: "When APIs disagree (e.g., one says rain, one says clear), Claude AI evaluates raw readings, timestamps, and station reliability to determine the correct outcome. Wired into CRE workflow via Anthropic API.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                ),
              },
              {
                title: "On-Chain Settlement",
                desc: "CRE calls resolveMarket(marketId, outcome) automatically. Winning traders claim USDC payouts proportionally from the losing pool — no manual intervention needed.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: "World ID",
                desc: "One human = one position cap of 100 USDC. On-chain proof-of-personhood verification via WorldID nullifier hashes prevents sybil attacks and whale manipulation.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
              },
              {
                title: "World Chain Ready",
                desc: "Designed for World Chain deployment with low fees, World ID native integration, and account abstraction for seamless local market experiences. Currently live on Ethereum Sepolia.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
              >
                <div className="text-blue-400 mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800/50 bg-gray-950">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center text-white font-bold text-[8px]">
                LO
              </div>
              <span className="text-sm font-semibold text-white">LocalOracle</span>
              <span className="text-xs text-gray-600">|</span>
              <span className="text-xs text-gray-500">Built for Chainlink Convergence Hackathon 2026</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a
                href="https://sepolia.etherscan.io/address/0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Contract: 0x1924...f2F2
              </a>
              <a
                href="https://github.com/MaxWK96/LocalOracle"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}
      {showCreateForm && (
        <CreateMarketForm
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateMarket}
        />
      )}

      {showBetPanel && selectedMarket && (
        <BetPanel
          market={selectedMarket}
          isVerified={isVerified}
          onClose={() => setShowBetPanel(false)}
          onPlaceBet={handlePlaceBet}
        />
      )}
    </div>
  );
}
