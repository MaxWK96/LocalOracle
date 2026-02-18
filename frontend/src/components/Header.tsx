"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectWallet from "./ConnectWallet";
import WorldIDButton from "./WorldIDButton";
import { Logo } from "./Logo";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { governanceTokenContract, GOVERNANCE_TOKEN_ADDRESS } from "@/lib/contracts";

interface HeaderProps {
  onVerified?: (nullifierHash: string) => void;
  isVerified?: boolean;
}

const NAV_LINKS = [
  { href: "/",           label: "Markets",    activeClass: "text-blue-400",   hoverClass: "hover:text-blue-400"   },
  { href: "/governance", label: "Governance", activeClass: "text-purple-400", hoverClass: "hover:text-purple-400" },
  { href: "/agent",      label: "Agent",      activeClass: "text-green-400",  hoverClass: "hover:text-green-400"  },
];

const LOG_DEPLOYED = GOVERNANCE_TOKEN_ADDRESS !== "0x0000000000000000000000000000000000000000";

function formatLOGShort(raw: bigint): string {
  const n = Number(raw) / 1e18;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

export default function Header({ onVerified, isVerified = false }: HeaderProps) {
  const account = useActiveAccount();
  const pathname = usePathname();

  const { data: logBalance } = useReadContract({
    contract: governanceTokenContract,
    method: "balanceOf",
    params: account ? [account.address] : ["0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!account && LOG_DEPLOYED },
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-sm">
      <div className="relative flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Logo />
        </Link>

        {/* Centre nav — absolutely centered so it doesn't shift with logo/wallet widths */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label, activeClass, hoverClass }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  active ? activeClass : `text-gray-400 ${hoverClass}`
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          {/* Network pill */}
          <span className="hidden sm:inline-flex text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            Sepolia
          </span>

          {/* LOG balance */}
          {account && LOG_DEPLOYED && logBalance !== undefined && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
              {formatLOGShort(logBalance)} LOG
            </span>
          )}

          {/* WorldID — only on pages that supply onVerified */}
          {account && onVerified && !isVerified && (
            <WorldIDButton walletAddress={account.address} onVerified={onVerified} />
          )}
          {isVerified && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-900/20 border border-green-500/30 rounded-full text-green-400 text-[10px] font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Verified
            </div>
          )}

          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
