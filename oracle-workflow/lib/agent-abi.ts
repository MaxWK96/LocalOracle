/**
 * Minimal MarketAgent ABI — only the functions the CRE agent workflow needs.
 */
export const MarketAgentABI = [
	{
		type: 'function',
		name: 'getStats',
		inputs: [],
		outputs: [
			{ name: 'bankroll',    type: 'uint256', internalType: 'uint256' },
			{ name: '_totalBets',  type: 'uint256', internalType: 'uint256' },
			{ name: '_wins',       type: 'uint256', internalType: 'uint256' },
			{ name: '_losses',     type: 'uint256', internalType: 'uint256' },
			{ name: '_totalPnL',   type: 'int256',  internalType: 'int256'  },
			{ name: '_activeBets', type: 'uint256', internalType: 'uint256' },
		],
		stateMutability: 'view',
	},
	{
		type: 'function',
		name: 'marketToBetIndex',
		inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
		outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
		stateMutability: 'view',
	},
	{
		type: 'function',
		name: 'placeBet',
		inputs: [
			{ name: 'marketId',  type: 'uint256', internalType: 'uint256' },
			{ name: 'outcome',   type: 'bool',    internalType: 'bool'    },
			{ name: 'amount',    type: 'uint256', internalType: 'uint256' },
			{ name: 'reasoning', type: 'string',  internalType: 'string'  },
		],
		outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
		stateMutability: 'nonpayable',
	},
] as const
