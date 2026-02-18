export const PARAMETER_REGISTRY_ABI = [
  {
    type: "function",
    name: "proposalCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposal",
    inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct OracleParameterRegistry.ProposalInfo",
        components: [
          { name: "proposer",       type: "address", internalType: "address"  },
          { name: "forVotes",       type: "uint256", internalType: "uint256"  },
          { name: "againstVotes",   type: "uint256", internalType: "uint256"  },
          { name: "deadline",       type: "uint256", internalType: "uint256"  },
          { name: "executed",       type: "bool",    internalType: "bool"     },
          { name: "targetMarketId", type: "uint256", internalType: "uint256"  },
          {
            name: "proposed",
            type: "tuple",
            internalType: "struct OracleParameterRegistry.OracleParams",
            components: [
              { name: "dataSources",        type: "string[]", internalType: "string[]" },
              { name: "consensusThreshold", type: "uint8",    internalType: "uint8"    },
              { name: "settlementFee",      type: "uint16",   internalType: "uint16"   },
              { name: "aiProvider",         type: "string",   internalType: "string"   },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveParameters",
    inputs: [{ name: "marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct OracleParameterRegistry.OracleParams",
        components: [
          { name: "dataSources",        type: "string[]", internalType: "string[]" },
          { name: "consensusThreshold", type: "uint8",    internalType: "uint8"    },
          { name: "settlementFee",      type: "uint16",   internalType: "uint16"   },
          { name: "aiProvider",         type: "string",   internalType: "string"   },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "propose",
    inputs: [
      { name: "dataSources",        type: "string[]", internalType: "string[]" },
      { name: "consensusThreshold", type: "uint8",    internalType: "uint8"    },
      { name: "settlementFee",      type: "uint16",   internalType: "uint16"   },
      { name: "aiProvider",         type: "string",   internalType: "string"   },
      { name: "targetMarketId",     type: "uint256",  internalType: "uint256"  },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "vote",
    inputs: [
      { name: "proposalId", type: "uint256", internalType: "uint256" },
      { name: "support",    type: "bool",    internalType: "bool"    },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeProposal",
    inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
