/**
 * settle-via-onreport.ts
 *
 * Demonstrates CRE settlement by calling onReport() directly with the
 * same ABI-encoded payload that the CRE writeReport capability would send.
 *
 * onReport(bytes metadata, bytes report) — no access control, callable by
 * the CRE forwarder or, for demo purposes, directly from this script.
 */
import { ethers } from 'hardhat';

const PREDICTION_MARKET_ADDRESS = '0x1C727B1Aeb82e8dBCC65b56CA7b5d0Ff0E4De76F';

const ABI = [
  'function getMarket(uint256) external view returns (tuple(uint256 id, address creator, string question, int256 lat, int256 lng, uint256 endTime, bool resolved, bool outcome, uint256 totalYesStake, uint256 totalNoStake))',
  'function nextMarketId() external view returns (uint256)',
  'function resolveMarket(uint256 marketId, bool outcome) external',
  'function onReport(bytes calldata metadata, bytes calldata report) external',
];

async function main(): Promise<void> {
  const [signer] = await ethers.getSigners();
  const market = new ethers.Contract(PREDICTION_MARKET_ADDRESS, ABI, signer);

  const nextId = await market.nextMarketId();
  console.log(`Total markets: ${nextId}`);

  // Find an expired, unresolved market
  const now = Math.floor(Date.now() / 1000);
  let targetId: number | null = null;
  let targetMarket: any = null;

  for (let i = 0; i < Number(nextId); i++) {
    const m = await market.getMarket(i);
    const endTime = Number(m.endTime);
    const expired = endTime <= now && endTime > 0;
    const unresolved = !m.resolved;
    console.log(`  Market #${i}: "${m.question}" — expired=${expired}, resolved=${m.resolved}, endTime=${new Date(endTime * 1000).toISOString()}`);
    if (expired && unresolved && targetId === null) {
      targetId = i;
      targetMarket = m;
    }
  }

  if (targetId === null) {
    console.error('\nNo expired unresolved market found. Wait for market expiry and retry.');
    process.exit(1);
  }

  console.log(`\nSettling market #${targetId}: "${targetMarket.question}"`);

  // Encode the report exactly as CRE does:
  // report = abi.encodeWithSelector(resolveMarket.selector, marketId, outcome)
  // The outcome is false (no rain) — adjust as appropriate for the demo
  const outcome = false;
  const iface = new ethers.Interface(ABI);
  const reportPayload = iface.encodeFunctionData('resolveMarket', [targetId, outcome]);
  console.log(`  Encoded report payload: ${reportPayload}`);

  // metadata is empty bytes (CRE may pass workflow execution metadata here)
  const metadata = '0x';

  console.log(`  Calling onReport(metadata, report) on PredictionMarket...`);
  const tx = await market.onReport(metadata, reportPayload);
  console.log(`\n  Tx hash: ${tx.hash}`);
  console.log(`  Waiting for confirmation...`);
  const receipt = await tx.wait();
  console.log(`  Confirmed in block ${receipt.blockNumber}  (status=${receipt.status === 1 ? 'SUCCESS' : 'FAILED'})`);

  console.log('');
  console.log('=== SETTLEMENT COMPLETE ===');
  console.log(`Market #${targetId} settled via onReport()`);
  console.log(`Outcome: ${outcome ? 'YES (raining)' : 'NO (not raining)'}`);
  console.log(`Tx hash: ${tx.hash}`);
  console.log(`Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
