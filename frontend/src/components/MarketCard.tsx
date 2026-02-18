"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "thirdweb/react";
import { Market, MarketCategory } from "@/lib/types";
import { parameterRegistryContract, PARAMETER_REGISTRY_ADDRESS } from "@/lib/contracts";

interface MarketCardProps {
  market: Market;
  onSelect: (market: Market) => void;
  isSelected: boolean;
}

function formatUSDC(amount: bigint): string {
  const n = Number(amount) / 1e6;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function computeTimeLeft(endTime: number): string {
  const diff = endTime - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${hours}h ${mins}m`;
}

const categoryConfig: Record<MarketCategory, { color: string }> = {
  Weather: { color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  Transit: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  Sports: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  Community: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

const REGISTRY_DEPLOYED =
  PARAMETER_REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";

export default function MarketCard({ market, onSelect, isSelected }: MarketCardProps) {
  const [timeLeftStr, setTimeLeftStr] = useState("");

  useEffect(() => {
    setTimeLeftStr(computeTimeLeft(market.endTime));
    const interval = setInterval(() => {
      setTimeLeftStr(computeTimeLeft(market.endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [market.endTime]);

  // Fetch active oracle params for this market (falls back to global if no market-specific params)
  const { data: oracleParams } = useReadContract({
    contract: parameterRegistryContract,
    method: "getActiveParameters",
    params: [BigInt(market.id)],
    queryOptions: { enabled: REGISTRY_DEPLOYED },
  });

  const totalPool = market.totalYesStake + market.totalNoStake;
  const yesPercent = totalPool > 0n
    ? Number((market.totalYesStake * 100n) / totalPool)
    : 50;
  const noPercent = 100 - yesPercent;
  const cat = market.category ? categoryConfig[market.category] : null;

  return (
    <button
      onClick={() => onSelect(market)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
        isSelected
          ? "bg-blue-950/40 border-blue-500/50 shadow-lg shadow-blue-500/10"
          : "bg-gray-800/40 border-gray-700/50 hover:border-gray-500/50 hover:bg-gray-800/60"
      }`}
    >
      {/* Top row: category + time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {cat && (
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${cat.color}`}>
              {market.category}
            </span>
          )}
          {market.location && (
            <span className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
              <svg className="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {market.location}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-medium shrink-0 ml-2 ${timeLeftStr === "Ended" ? "text-gray-500" : "text-gray-400"}`}>
          {timeLeftStr || "\u00A0"}
        </span>
      </div>

      {/* Question */}
      <p className="text-sm font-medium text-white mb-2 line-clamp-2 leading-snug">
        {market.question}
      </p>

      {/* Geo-fence badge */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[9px] text-gray-600 flex items-center gap-1">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          Geo-fenced: 5km radius
        </span>
      </div>

      {/* Agent / governance connection labels */}
      {!market.resolved && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/20 border border-green-500/20 text-green-400/80 font-medium">
            🤖 Agent watching
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/20 border border-purple-500/20 text-purple-400/80 font-medium">
            📋 Gov params v1.2
          </span>
        </div>
      )}

      {/* Odds visualization */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-green-400 w-10 text-right">{yesPercent}%</span>
        <div className="flex-1 h-2.5 bg-gray-700/50 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
            style={{ width: `${noPercent}%` }}
          />
        </div>
        <span className="text-xs font-bold text-red-400 w-10">{noPercent}%</span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
        <span className="text-green-500/70">YES</span>
        <span className="text-red-500/70">NO</span>
      </div>

      {/* Bottom row: pool + badges + trade button */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/30">
        <span className="text-xs text-gray-400">
          Pool: <span className="text-white font-medium">{formatUSDC(totalPool)}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {market.resolved ? (
            <>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                market.outcome
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {market.outcome ? "YES" : "NO"}
              </span>
              <span className="text-[9px] text-blue-400/70 flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                CRE Consensus
              </span>
            </>
          ) : (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 opacity-0 group-hover:opacity-100 transition-opacity">
              Trade
            </span>
          )}
        </div>
      </div>

      {/* Oracle governance params */}
      {oracleParams && (
        <div className="mt-2 pt-2 border-t border-gray-700/20 flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-gray-600">Oracle:</span>
          {oracleParams.dataSources.map((src) => (
            <span
              key={src}
              className="text-[9px] text-gray-500 bg-gray-800/60 px-1.5 py-0.5 rounded font-mono"
            >
              {src}
            </span>
          ))}
          <span className="text-[9px] text-gray-600 ml-auto">
            {oracleParams.consensusThreshold}% consensus
          </span>
        </div>
      )}

      {/* Resolution method for resolved markets */}
      {market.resolved && !oracleParams && (
        <div className="mt-2 pt-1.5 text-[9px] text-gray-600 flex items-center gap-1">
          <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          Resolved by: OpenWeatherMap + WeatherAPI consensus
        </div>
      )}

      {/* View Details */}
      <div className="mt-2 pt-1.5 flex items-center justify-end gap-0.5 text-[10px] text-gray-600 group-hover:text-blue-400/60 transition-colors">
        View Details
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
