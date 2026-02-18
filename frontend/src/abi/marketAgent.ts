export const MARKET_AGENT_ABI = [
  {
    type: "function",
    name: "getStats",
    inputs: [],
    outputs: [
      { name: "bankroll",    type: "uint256", internalType: "uint256" },
      { name: "_totalBets",  type: "uint256", internalType: "uint256" },
      { name: "_wins",       type: "uint256", internalType: "uint256" },
      { name: "_losses",     type: "uint256", internalType: "uint256" },
      { name: "_totalPnL",   type: "int256",  internalType: "int256"  },
      { name: "_activeBets", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketToBetIndex",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "placeBet",
    inputs: [
      { name: "marketId",  type: "uint256", internalType: "uint256" },
      { name: "outcome",   type: "bool",    internalType: "bool"    },
      { name: "amount",    type: "uint256", internalType: "uint256" },
      { name: "reasoning", type: "string",  internalType: "string"  },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "coreWorkflow",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
] as const;
