/**
 * Minimal PredictionMarket ABI - only functions the oracle needs.
 */
export const PredictionMarketABI = [
	{
		type: 'function',
		name: 'nextMarketId',
		inputs: [],
		outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
		stateMutability: 'view',
	},
	{
		type: 'function',
		name: 'getMarket',
		inputs: [{ name: 'marketId', type: 'uint256', internalType: 'uint256' }],
		outputs: [
			{
				name: '',
				type: 'tuple',
				internalType: 'struct PredictionMarket.Market',
				components: [
					{ name: 'id', type: 'uint256', internalType: 'uint256' },
					{ name: 'creator', type: 'address', internalType: 'address' },
					{ name: 'question', type: 'string', internalType: 'string' },
					{ name: 'lat', type: 'int256', internalType: 'int256' },
					{ name: 'lng', type: 'int256', internalType: 'int256' },
					{ name: 'endTime', type: 'uint256', internalType: 'uint256' },
					{ name: 'resolved', type: 'bool', internalType: 'bool' },
					{ name: 'outcome', type: 'bool', internalType: 'bool' },
					{ name: 'totalYesStake', type: 'uint256', internalType: 'uint256' },
					{ name: 'totalNoStake', type: 'uint256', internalType: 'uint256' },
				],
			},
		],
		stateMutability: 'view',
	},
	{
		type: 'function',
		name: 'resolveMarket',
		inputs: [
			{ name: 'marketId', type: 'uint256', internalType: 'uint256' },
			{ name: 'outcome', type: 'bool', internalType: 'bool' },
		],
		outputs: [],
		stateMutability: 'nonpayable',
	},
] as const
