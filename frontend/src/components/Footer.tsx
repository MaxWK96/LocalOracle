import Link from "next/link";
import { Logo } from "./Logo";
import { PREDICTION_MARKET_ADDRESS } from "@/lib/contracts";

const TECH_BADGES = [
  { name: "Chainlink CRE", color: "blue"   },
  { name: "World ID",      color: "purple" },
  { name: "World Chain",   color: "green"  },
  { name: "Thirdweb",      color: "pink"   },
] as const;

type BadgeColor = (typeof TECH_BADGES)[number]["color"];

const colorMap: Record<BadgeColor, string> = {
  blue:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  green:  "bg-green-500/10 text-green-400 border-green-500/20",
  pink:   "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

export function Footer() {
  const shortAddr = `${PREDICTION_MARKET_ADDRESS.slice(0, 6)}…${PREDICTION_MARKET_ADDRESS.slice(-4)}`;

  return (
    <footer className="border-t border-gray-800/50 bg-gray-950 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Branding */}
          <div>
            <Logo className="mb-3" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Hyperlocal prediction markets with community governance and autonomous AI agents.
              Powered by Chainlink CRE + World ID.
            </p>
          </div>

          {/* Built With */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Built With</h3>
            <div className="flex flex-wrap gap-2">
              {TECH_BADGES.map(({ name, color }) => (
                <span
                  key={name}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium ${colorMap[color]}`}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Hackathon */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Chainlink Convergence 2026</h3>
            <p className="text-sm text-gray-400 mb-3">
              Submitted across multiple prize categories
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {["Prediction Markets", "DeFi", "AI Agents", "Tokenization"].map((cat) => (
                <span key={cat} className="px-2 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700/50">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Divider + bottom bar */}
        <div className="border-t border-gray-800/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>© 2026 LocalOracle. Built for Chainlink Convergence Hackathon.</div>
          <div className="flex items-center gap-4">
            <a
              href={`https://sepolia.etherscan.io/address/${PREDICTION_MARKET_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {shortAddr}
            </a>
            <a
              href="https://github.com/MaxWK96/LocalOracle"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
            <Link href="/governance" className="hover:text-purple-400 transition-colors">
              Governance
            </Link>
            <Link href="/agent" className="hover:text-green-400 transition-colors">
              Agent
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
