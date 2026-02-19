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
  { href: "/",           label: "Markets"    },
  { href: "/governance", label: "Governance" },
  { href: "/agent",      label: "Agent"      },
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
    <header className="sticky top-0 z-50 w-full glass-strong">
      <div className="relative flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Logo />
        </Link>

        {/* Centre nav — absolutely centered so it doesn't shift with logo/wallet widths */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors relative pb-0.5 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          {/* Network pill */}
          <span className="hidden sm:inline-flex text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
            Sepolia
          </span>

          {/* LOG balance */}
          {account && LOG_DEPLOYED && logBalance !== undefined && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 font-semibold">
              {formatLOGShort(logBalance)} LOG
            </span>
          )}

          {/* WorldID — only on pages that supply onVerified */}
          {account && onVerified && !isVerified && (
            <WorldIDButton walletAddress={account.address} onVerified={onVerified} />
          )}
          {isVerified && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-[10px] font-medium">
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
