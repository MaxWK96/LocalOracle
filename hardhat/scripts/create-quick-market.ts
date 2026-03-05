import { ethers } from 'hardhat';

const PREDICTION_MARKET_ADDRESS = '0x1C727B1Aeb82e8dBCC65b56CA7b5d0Ff0E4De76F';

const PREDICTION_MARKET_ABI = [
  'function createMarket(string calldata question, int256 lat, int256 lng, uint256 endTime) external returns (uint256 marketId)',
  'function nextMarketId() external view returns (uint256)',
  'function getMarket(uint256 marketId) external view returns (tuple(uint256 id, address creator, string question, int256 lat, int256 lng, uint256 endTime, bool resolved, bool outcome, uint256 totalYesStake, uint256 totalNoStake))',
];

async function main(): Promise<void> {
  const [signer] = await ethers.getSigners();
  console.log('Creating quick-expiry market...');
  console.log(`  Deployer: ${signer.address}`);

  const market = new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, signer);

  const nextId: bigint = await market.nextMarketId();
  const endTime = Math.floor(Date.now() / 1000) + 2 * 60; // now + 2 minutes

  console.log(`  Next market ID: ${nextId}`);
  console.log(`  End time: ${new Date(endTime * 1000).toISOString()} (2 min from now)`);

  const tx = await market.createMarket(
    'Will it rain in Stockholm in the next 2 minutes?',
    59329300,  // lat: 59.3293 * 1e6
    18068600,  // lng: 18.0686 * 1e6
    endTime,
  );

  console.log(`  Tx hash: ${tx.hash}`);
  console.log('  Waiting for confirmation...');
  const receipt = await tx.wait();
  console.log(`  Confirmed in block ${receipt.blockNumber}`);
  console.log('');
  console.log(`Market #${nextId} created. Expires at: ${new Date(endTime * 1000).toISOString()}`);
  console.log('');
  console.log('NEXT: Wait 2 minutes, then run:');
  console.log('  cd oracle-workflow && npm run cre:broadcast');
}

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
