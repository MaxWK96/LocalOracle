import { defineChain, getContract } from "thirdweb";
import { thirdwebClient } from "./thirdweb";
import { PREDICTION_MARKET_ABI } from "./abi";

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

export const predictionMarketContract = getContract({
  client: thirdwebClient,
  chain: targetChain,
  address: PREDICTION_MARKET_ADDRESS,
  abi: PREDICTION_MARKET_ABI,
});
