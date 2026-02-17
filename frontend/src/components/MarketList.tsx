"use client";

import { Market } from "@/lib/types";
import MarketCard from "./MarketCard";

interface MarketListProps {
  markets: Market[];
  selectedMarket: Market | null;
  onSelectMarket: (market: Market) => void;
  onCreateClick: () => void;
}

export default function MarketList({
  markets,
  selectedMarket,
  onSelectMarket,
  onCreateClick,
}: MarketListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <div>
          <h2 className="text-sm font-bold text-white">Nearby Markets</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">{markets.length} active</p>
        </div>
        <button
          onClick={onCreateClick}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
        >
          + Create
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {markets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">No markets nearby</p>
            <p className="text-gray-600 text-xs mt-1">Create the first one!</p>
          </div>
        ) : (
          markets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onSelect={onSelectMarket}
              isSelected={selectedMarket?.id === market.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
