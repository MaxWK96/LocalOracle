import { defineChain, getContract } from "thirdweb";
import { thirdwebClient } from "./thirdweb";
import { PREDICTION_MARKET_ABI } from "./abi";
import { GOVERNANCE_TOKEN_ABI } from "@/abi/governanceToken";
import { PARAMETER_REGISTRY_ABI } from "@/abi/parameterRegistry";
import { MARKET_AGENT_ABI } from "@/abi/marketAgent";

// Ethereum Sepolia testnet
export const targetChain = defineChain({
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockExplorers: [
    {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
    },
  ],
});

// Deployed contract addresses (Ethereum Sepolia)
export const PREDICTION_MARKET_ADDRESS =
  process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2";

export const USDC_ADDRESS = "0xCfc1805c565D453F12A8474a2CFfa4d8B1F39c37";
export const WORLD_ID_ADDRESS = "0x6B1B3257d9C790eb20c7937fab4ef3F95176b07d";

export const GOVERNANCE_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";

export const PARAMETER_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_PARAMETER_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000";

export const MARKET_AGENT_ADDRESS =
  process.env.NEXT_PUBLIC_MARKET_AGENT_ADDRESS || "0x0000000000000000000000000000000000000000";

export const predictionMarketContract = getContract({
  client: thirdwebClient,
  chain: targetChain,
  address: PREDICTION_MARKET_ADDRESS,
  abi: PREDICTION_MARKET_ABI,
});

export const governanceTokenContract = getContract({
  client: thirdwebClient,
  chain: targetChain,
  address: GOVERNANCE_TOKEN_ADDRESS,
  abi: GOVERNANCE_TOKEN_ABI,
});

export const parameterRegistryContract = getContract({
  client: thirdwebClient,
  chain: targetChain,
  address: PARAMETER_REGISTRY_ADDRESS,
  abi: PARAMETER_REGISTRY_ABI,
});

export const marketAgentContract = getContract({
  client: thirdwebClient,
  chain: targetChain,
  address: MARKET_AGENT_ADDRESS,
  abi: MARKET_AGENT_ABI,
});
