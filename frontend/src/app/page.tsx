"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import MarketList from "@/components/MarketList";
import CreateMarketForm from "@/components/CreateMarketForm";
import BetPanel from "@/components/BetPanel";
import GridBackground from "@/components/GridBackground";
import { Market } from "@/lib/types";
import { MOCK_MARKETS } from "@/lib/mockData";
import { Footer } from "@/components/Footer";

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
    <div className="flex flex-col min-h-screen bg-background">
      <Header onVerified={handleVerified} isVerified={isVerified} />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        <GridBackground />
        <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-glow-pulse" />
            Live on Ethereum Sepolia &bull; Built for World Chain
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Local<span className="gradient-text">Oracle</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            Hyperlocal prediction markets with geo-fenced trading &mdash; only humans
            within 5km can participate, verified by World ID + location proof
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={scrollToMap}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg glow-primary"
            >
              Explore Nearby Markets
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-secondary/80 transition-colors border border-border"
            >
              How It Works
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-border/50 bg-secondary/10">
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
                  <svg className="w-4 h-4 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</span>
                </div>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why LocalOracle? ── */}
      <section className="border-b border-border/50 bg-background">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="md:w-1/3">
              <h2 className="text-xl md:text-2xl font-bold mb-2">Why LocalOracle?</h2>
              <div className="w-12 h-1 bg-primary rounded-full" />
            </div>
            <div className="md:w-2/3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Traditional prediction markets lack local context and sybil resistance.
                LocalOracle combines <span className="text-foreground font-medium">World ID</span> (one
                human = one stake cap), <span className="text-foreground font-medium">geo-fencing</span> (only
                locals within 5km participate), and <span className="text-foreground font-medium">Chainlink
                CRE</span> multi-source oracles to create trustless markets for neighborhood
                flooding, transit delays, and community events. Locals have skin in the
                game; outcomes are automated and verifiable on-chain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Agent + Governance Connection Banner ── */}
      <div className="border-b border-border/50 bg-secondary/5">
        <div className="max-w-5xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-full text-accent text-[10px] font-medium">
              🤖 Agent 001 active
            </span>
            <span>Auto-trading on open markets using Chainlink CRE data feeds</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <Link href="/agent" className="text-accent/70 hover:text-accent transition-colors">
              View Agent →
            </Link>
            <Link href="/governance" className="text-primary/70 hover:text-primary transition-colors">
              Governance →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <section ref={mapRef} className="flex flex-col md:flex-row flex-1" style={{ minHeight: "560px" }}>
        <div className="flex-[7] relative">
          <MapView
            markets={markets}
            onSelectMarket={handleSelectMarket}
            selectedMarket={selectedMarket}
          />
        </div>
        <div className="flex-[3] border-l border-border/50 bg-secondary/10 min-w-[300px]">
          <MarketList
            markets={markets}
            selectedMarket={selectedMarket}
            onSelectMarket={handleSelectMarket}
            onCreateClick={() => setShowCreateForm(true)}
          />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section ref={howItWorksRef} className="border-t border-border/50 bg-background">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground text-sm">Four steps to prediction market participation</p>
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
                border: "border-accent/20",
                bg: "bg-accent/5",
                iconColor: "text-accent",
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
                border: "border-primary/20",
                bg: "bg-primary/5",
                iconColor: "text-primary",
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
                border: "border-accent/20",
                bg: "bg-accent/5",
                iconColor: "text-accent",
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
                border: "border-primary/20",
                bg: "bg-primary/5",
                iconColor: "text-primary",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`relative p-6 rounded-2xl border ${item.border} ${item.bg} transition-transform hover:-translate-y-1`}
              >
                <div className="absolute top-4 right-4 text-4xl font-black text-foreground/5">
                  {item.step}
                </div>
                <div className={`${item.iconColor} mb-4`}>{item.icon}</div>
                <h3 className="text-sm font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Example Resolution Flow ── */}
          <div className="mt-12 glass p-6 rounded-2xl">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Example Resolution Flow
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-4 text-right font-mono">1.</span>
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">Question:</span>{" "}
                  &ldquo;Will it rain in Strandv&auml;gen tomorrow at 15:00?&rdquo;
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-4 text-right font-mono">2.</span>
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">CRE fetches:</span>{" "}
                  OpenWeatherMap <span className="text-primary font-mono">(code 500 = rain)</span>{" "}
                  + WeatherAPI <span className="text-accent font-mono">(code 1000 = clear)</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-4 text-right font-mono">3.</span>
                <p className="text-muted-foreground">
                  <span className="text-destructive font-medium">Sources disagree</span>{" "}
                  &rarr; AI adjudicator (Claude) reviews raw weather codes, descriptions, and station data
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-4 text-right font-mono">4.</span>
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">AI determines:</span>{" "}
                  WeatherAPI more reliable for this location &rarr; Outcome: <span className="text-destructive font-semibold">NO</span> (not raining)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-4 text-right font-mono">5.</span>
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">Settlement:</span>{" "}
                  <span className="font-mono text-primary">resolveMarket(1, false)</span> called on-chain
                  &rarr; Winners claim proportional USDC payouts
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Powered By Chainlink ── */}
      <section className="border-t border-border/50 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Powered by Chainlink</h2>
            <p className="text-muted-foreground text-sm">Decentralized infrastructure for trustless market resolution</p>
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
                className="glass rounded-xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="text-primary mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold mb-1.5">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

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
