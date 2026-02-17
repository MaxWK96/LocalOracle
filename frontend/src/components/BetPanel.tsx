"use client";

import { useState, useEffect } from "react";
import { Market } from "@/lib/types";

interface BetPanelProps {
  market: Market;
  isVerified: boolean;
  onClose: () => void;
  onPlaceBet: (marketId: number, isYes: boolean, amount: number) => void;
}

function formatUSDC(amount: bigint): string {
  return `$${(Number(amount) / 1e6).toFixed(2)}`;
}

function computeTimeLeft(endTime: number): string {
  const diff = endTime - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${hours}h ${mins}m left`;
}

export default function BetPanel({ market, isVerified, onClose, onPlaceBet }: BetPanelProps) {
  const [isYes, setIsYes] = useState(true);
  const [amount, setAmount] = useState("");
  const [timeLeftStr, setTimeLeftStr] = useState("");

  useEffect(() => {
    setTimeLeftStr(computeTimeLeft(market.endTime));
    const interval = setInterval(() => {
      setTimeLeftStr(computeTimeLeft(market.endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [market.endTime]);

  const totalPool = market.totalYesStake + market.totalNoStake;
  const yesPercent = totalPool > 0n ? Number((market.totalYesStake * 100n) / totalPool) : 50;

  const potentialPayout = (() => {
    const amountBi = BigInt(Math.floor(parseFloat(amount || "0") * 1e6));
    if (amountBi === 0n) return "0.00";
    const winPool = isYes ? market.totalYesStake + amountBi : market.totalNoStake + amountBi;
    const losePool = isYes ? market.totalNoStake : market.totalYesStake;
    const payout = amountBi + (amountBi * losePool) / winPool;
    return (Number(payout) / 1e6).toFixed(2);
  })();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Place Bet</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-300">{market.question}</p>

          {/* Odds */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="text-green-400">Yes {yesPercent}%</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${yesPercent}%` }} />
            </div>
            <span className="text-red-400">No {100 - yesPercent}%</span>
          </div>

          <div className="flex gap-4 text-xs text-gray-500">
            <span>Pool: {formatUSDC(totalPool)}</span>
            <span>{timeLeftStr}</span>
          </div>

          {/* Side selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsYes(true)}
              className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isYes
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setIsYes(false)}
              className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                !isYes
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              NO
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Amount (USDC)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Max: 100 USDC per human per market</p>
          </div>

          {/* Payout estimate */}
          {parseFloat(amount || "0") > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Potential payout</span>
                <span className="text-white font-medium">${potentialPayout}</span>
              </div>
            </div>
          )}

          {!isVerified && (
            <p className="text-amber-400 text-xs text-center">
              You must verify with World ID before placing bets
            </p>
          )}

          <button
            disabled={!isVerified || !amount || parseFloat(amount) <= 0}
            onClick={() => onPlaceBet(market.id, isYes, parseFloat(amount))}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerified ? "Place Bet" : "Verify World ID First"}
          </button>
        </div>
      </div>
    </div>
  );
}
