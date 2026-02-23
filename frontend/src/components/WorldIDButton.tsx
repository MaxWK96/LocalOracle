"use client";

import { useState, useCallback, useRef } from "react";
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
  // Store nullifier_hash returned by our API so onSuccess can hand it off
  const verifiedHashRef = useRef<string | null>(null);

  // IDKit v2: handleVerify runs INSIDE the widget while it's still open.
  // Throwing here shows an error state inside the widget (not outside).
  const handleVerify = useCallback(async (result: ISuccessResult) => {
    const data = await verifyWorldIDProof(result, walletAddress);
    if (!data.success) throw new Error("Server rejected the proof");
    verifiedHashRef.current = data.nullifier_hash;
  }, [walletAddress]);

  // IDKit v2: onSuccess fires after handleVerify succeeds and the widget closes.
  const handleSuccess = useCallback(() => {
    const hash = verifiedHashRef.current;
    if (hash) {
      setIsVerified(true);
      onVerified(hash);
    }
  }, [onVerified]);

  // Demo bypass — lets judges reach the bet flow without a World ID scan.
  const handleDemoSkip = useCallback(() => {
    setIsVerified(true);
    onVerified("demo-nullifier-0x000");
  }, [onVerified]);

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400 text-sm">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Verified Human
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <IDKitWidget
        app_id={WORLDID_APP_ID as `app_${string}`}
        action={WORLDID_ACTION}
        signal={walletAddress}
        handleVerify={handleVerify}
        onSuccess={handleSuccess}
        // Device level: works in World App without requiring Orb biometric scan
        verification_level={VerificationLevel.Device}
        action_description="Verify you are a unique human to participate in LocalOracle prediction markets"
      >
        {({ open }) => (
          <button
            onClick={open}
            disabled={!walletAddress}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
            Verify with World ID
          </button>
        )}
      </IDKitWidget>
      {/* Demo bypass — shown only when wallet is connected */}
      {walletAddress && (
        <button
          onClick={handleDemoSkip}
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors underline"
        >
          skip (demo mode)
        </button>
      )}
    </div>
  );
}
