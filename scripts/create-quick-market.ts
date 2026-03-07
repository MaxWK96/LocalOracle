import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const CONTRACT = '0x1C727B1Aeb82e8dBCC65b56CA7b5d0Ff0E4De76F' as const;
const RPC_URL = process.env.RPC_URL ?? 'https://sepolia.drpc.org';

const ABI = parseAbi([
  'function createMarket(string calldata question, int256 lat, int256 lng, uint256 endTime) external returns (uint256 marketId)',
  'function nextMarketId() external view returns (uint256)',
]);

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: set PRIVATE_KEY env var (e.g. export PRIVATE_KEY=0x...)');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(RPC_URL) });

  const nextId = await publicClient.readContract({ address: CONTRACT, abi: ABI, functionName: 'nextMarketId' });
  const endTime = BigInt(Math.floor(Date.now() / 1000) + 2 * 60);

  console.log(`Deployer : ${account.address}`);
  console.log(`Market ID: ${nextId}`);
  console.log(`Expiry   : ${new Date(Number(endTime) * 1000).toISOString()} (2 min from now)`);
  console.log('Sending createMarket tx...');

  const hash = await walletClient.writeContract({
    address: CONTRACT,
    abi: ABI,
    functionName: 'createMarket',
    args: [
      'Will it rain in Stockholm in the next 2 minutes?',
      BigInt(59329300),  // lat 59.3293 * 1e6
      BigInt(18068600),  // lng 18.0686 * 1e6
      endTime,
    ],
  });

  console.log(`Tx hash  : ${hash}`);
  console.log('Waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);
  console.log('');
  console.log(`Market #${nextId} created. Expires at: ${new Date(Number(endTime) * 1000).toISOString()}`);
  console.log('');
  console.log('NEXT: Wait 2 minutes, then run:');
  console.log('  cd oracle-workflow && npm run cre:broadcast');
}

main().catch((err) => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
