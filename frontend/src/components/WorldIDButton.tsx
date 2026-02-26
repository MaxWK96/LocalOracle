"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { WORLDID_APP_ID, WORLDID_ACTION, verifyWorldIDProof } from "@/lib/worldid";
import type { ISuccessResult } from "@worldcoin/idkit";
import { VerificationLevel } from "@worldcoin/idkit";

const IDKitWidget = dynamic(
  () => import("@worldcoin/idkit").then((mod) => mod.IDKitWidget),
  { ssr: false }
);

interface WorldIDButtonProps {
  walletAddress: string;
  onVerified: (nullifierHash: string) => void;
}

export default function WorldIDButton({ walletAddress, onVerified }: WorldIDButtonProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSimInfo, setShowSimInfo] = useState(false);
  const verifiedHashRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const idkitOpenRef = useRef<(() => void) | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setShowSimInfo(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleVerify = useCallback(async (result: ISuccessResult) => {
    const data = await verifyWorldIDProof(result, walletAddress);
    if (!data.success) throw new Error("Server rejected the proof");
    verifiedHashRef.current = data.nullifier_hash;
  }, [walletAddress]);

  const handleSuccess = useCallback(() => {
    const hash = verifiedHashRef.current;
    if (hash) {
      setIsVerified(true);
      onVerified(hash);
    }
  }, [onVerified]);

  const handleDemoSkip = useCallback(() => {
    setDropdownOpen(false);
    setIsVerified(true);
    onVerified("demo-nullifier-0x000");
  }, [onVerified]);

  if (isVerified) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 border border-green-500/40 rounded-lg text-green-400 text-xs font-medium">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Verified Human
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* IDKitWidget invisible wrapper — just to get the open() fn */}
      <IDKitWidget
        app_id={WORLDID_APP_ID as `app_${string}`}
        action={WORLDID_ACTION}
        signal={walletAddress}
        handleVerify={handleVerify}
        onSuccess={handleSuccess}
        verification_level={VerificationLevel.Device}
      >
        {({ open }) => {
          idkitOpenRef.current = open;
          return (
            /* Split button: [Verify | ▾] */
            <div className="flex items-center">
              <button
                onClick={open}
                disabled={!walletAddress}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-l-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
                Verify with World ID
              </button>
              <button
                onClick={() => { setDropdownOpen((v) => !v); setShowSimInfo(false); }}
                disabled={!walletAddress}
                className="flex items-center px-2 py-1.5 bg-purple-700 text-white text-xs rounded-r-lg border-l border-purple-500/50 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="More verification options"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          );
        }}
      </IDKitWidget>

      {/* Dropdown panel */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden">
          {/* Demo Mode */}
          <button
            onClick={handleDemoSkip}
            className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/5 transition-colors text-left"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 shrink-0">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-white">Demo Mode</p>
              <p className="text-[11px] text-muted-foreground">Skip verification — for demos &amp; judges</p>
            </div>
          </button>

          <div className="border-t border-white/5" />

          {/* Simulator guide toggle */}
          <button
            onClick={() => setShowSimInfo((v) => !v)}
            className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/5 transition-colors text-left"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/20 shrink-0">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 0V6a2 2 0 012-2h10a2 2 0 012 2v2M5 8h14M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Simulator Guide</p>
              <p className="text-[11px] text-muted-foreground">For staging builds without real World App</p>
            </div>
            <svg className={`w-3 h-3 text-muted-foreground transition-transform ${showSimInfo ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {showSimInfo && (
            <div className="px-4 pb-4 pt-1 space-y-1.5 text-[11px] text-muted-foreground border-t border-white/5 bg-white/[0.02]">
              <p className="text-yellow-400/80 font-medium">Staging app — use simulator, not World App</p>
              <p><span className="text-white">1.</span> Close this menu, click <span className="text-white">"Verify with World ID"</span> — QR appears on screen.</p>
              <p><span className="text-white">2.</span> On your <span className="text-white">phone</span>, open:</p>
              <a
                href="https://simulator.worldcoin.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-purple-400 underline"
              >
                simulator.worldcoin.org ↗
              </a>
              <p><span className="text-white">3.</span> Tap the QR scanner in the simulator and scan the QR on your laptop screen.</p>
              <p><span className="text-white">4.</span> Tap Verify in simulator — verification completes automatically.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
