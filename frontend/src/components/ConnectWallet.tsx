"use client";

import { useConnectModal, useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb";
import { targetChain } from "@/lib/contracts";
import { useState, useRef, useEffect } from "react";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectWallet() {
  const { connect } = useConnectModal();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!account) {
    return (
      <button
        onClick={() => connect({ client: thirdwebClient, chain: targetChain })}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        {shortAddress(account.address)}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-lg border border-white/10 bg-[#0f1117] shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 text-[11px] text-muted-foreground border-b border-white/10 font-mono break-all select-all">
            {account.address}
          </div>
          <button
            onClick={() => { if (wallet) disconnect(wallet); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
