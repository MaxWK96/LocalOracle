import { PREDICTION_MARKET_ABI } from "./abi";
import { GOVERNANCE_TOKEN_ABI } from "@/abi/governanceToken";
import { PARAMETER_REGISTRY_ABI } from "@/abi/parameterRegistry";
import { MARKET_AGENT_ABI } from "@/abi/marketAgent";

// Deployed contract addresses (Ethereum Sepolia)
export const PREDICTION_MARKET_ADDRESS = (
  process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS ||
  "0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2"
).trim() as `0x${string}`;

export const USDC_ADDRESS = "0xCfc1805c565D453F12A8474a2CFfa4d8B1F39c37" as `0x${string}`;
export const WORLD_ID_ADDRESS = "0x6B1B3257d9C790eb20c7937fab4ef3F95176b07d" as `0x${string}`;

export const GOVERNANCE_TOKEN_ADDRESS = (
  process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS ||
  "0x0000000000000000000000000000000000000000"
).trim() as `0x${string}`;

export const PARAMETER_REGISTRY_ADDRESS = (
  process.env.NEXT_PUBLIC_PARAMETER_REGISTRY_ADDRESS ||
  "0x0000000000000000000000000000000000000000"
).trim() as `0x${string}`;

export const MARKET_AGENT_ADDRESS = (
  process.env.NEXT_PUBLIC_MARKET_AGENT_ADDRESS ||
  "0x0000000000000000000000000000000000000000"
).trim() as `0x${string}`;

export {
  PREDICTION_MARKET_ABI,
  GOVERNANCE_TOKEN_ABI,
  PARAMETER_REGISTRY_ABI,
  MARKET_AGENT_ABI,
};
