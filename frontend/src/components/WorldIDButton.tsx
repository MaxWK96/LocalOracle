"use client";

import { useState, useCallback } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async (result: ISuccessResult) => {
    setLoading(true);
    setError(null);
    try {
      const data = await verifyWorldIDProof(result, walletAddress);
      if (data.verified) {
        setIsVerified(true);
        onVerified(data.nullifier_hash);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, onVerified]);

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
    <div>
      <IDKitWidget
        app_id={WORLDID_APP_ID as `app_${string}`}
        action={WORLDID_ACTION}
        signal={walletAddress}
        onSuccess={handleVerify}
        verification_level={VerificationLevel.Orb}
      >
        {({ open }) => (
          <button
            onClick={open}
            disabled={loading || !walletAddress}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
            )}
            Verify with World ID
          </button>
        )}
      </IDKitWidget>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
