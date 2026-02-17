"use client";

import { ConnectButton } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb";
import { targetChain } from "@/lib/contracts";

export default function ConnectWallet() {
  return (
    <ConnectButton
      client={thirdwebClient}
      chain={targetChain}
      connectButton={{
        label: "Connect Wallet",
        className: "!bg-blue-600 !text-white !rounded-lg !px-4 !py-2 !text-sm !font-medium hover:!bg-blue-700",
      }}
    />
  );
}
