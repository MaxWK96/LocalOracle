"use client";

import ConnectWallet from "./ConnectWallet";
import WorldIDButton from "./WorldIDButton";
import { useActiveAccount } from "thirdweb/react";

interface HeaderProps {
  onVerified: (nullifierHash: string) => void;
  isVerified: boolean;
}

export default function Header({ onVerified, isVerified }: HeaderProps) {
  const account = useActiveAccount();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-gray-950/80 border-b border-gray-800/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20">
            LO
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">LocalOracle</h1>
        </div>
        <span className="text-[10px] text-gray-400 bg-gray-800/60 px-2.5 py-1 rounded-full border border-gray-700/50 font-medium">
          Ethereum Sepolia
        </span>
      </div>

      <div className="flex items-center gap-3">
        {account && !isVerified && (
          <WorldIDButton
            walletAddress={account.address}
            onVerified={onVerified}
          />
        )}
        {isVerified && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/20 border border-green-500/30 rounded-full text-green-400 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            World ID Verified
          </div>
        )}
        <ConnectWallet />
      </div>
    </header>
  );
}
