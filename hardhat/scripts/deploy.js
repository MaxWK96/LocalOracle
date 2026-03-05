const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('=== LocalOracle PredictionMarket Deployment ===');
  console.log(`Network:  Sepolia`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatEther(balance)} ETH`);
  console.log('');

  // 1. MockWorldID
  console.log('Deploying MockWorldID...');
  const MockWorldID = await hre.ethers.getContractFactory('MockWorldID');
  const worldId = await MockWorldID.deploy();
  await worldId.waitForDeployment();
  console.log(`  MockWorldID: ${await worldId.getAddress()}`);

  // 2. MockERC20
  console.log('Deploying MockERC20 (USDC)...');
  const MockERC20 = await hre.ethers.getContractFactory('MockERC20');
  const usdc = await MockERC20.deploy();
  await usdc.waitForDeployment();
  console.log(`  MockERC20:   ${await usdc.getAddress()}`);

  // 3. PredictionMarket (with onReport support)
  console.log('Deploying PredictionMarket (with onReport)...');
  const PredictionMarket = await hre.ethers.getContractFactory('PredictionMarket');
  const market = await PredictionMarket.deploy(
    await worldId.getAddress(),
    await usdc.getAddress()
  );
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log(`  PredictionMarket: ${marketAddress}`);

  // 4. OracleGovernanceToken
  console.log('Deploying OracleGovernanceToken...');
  const OracleGovernanceToken = await hre.ethers.getContractFactory('OracleGovernanceToken');
  const logToken = await OracleGovernanceToken.deploy();
  await logToken.waitForDeployment();
  console.log(`  OracleGovernanceToken: ${await logToken.getAddress()}`);

  // 5. Wire governance token
  await logToken.setDistributor(marketAddress);
  await market.setGovernanceToken(await logToken.getAddress());
  console.log('  Governance token wired.');

  // 6. Create demo markets (7 day duration so they can be tested)
  const sevenDays = 7 * 24 * 3600;
  const endTime = Math.floor(Date.now() / 1000) + sevenDays;

  const markets = [
    { question: 'Will it rain in Stockholm this week?', lat: 59329300, lng: 18068600 },
    { question: 'Will there be flooding in Warsaw this week?', lat: 52229700, lng: 21012200 },
    { question: 'Will it snow in Gothenburg this week?', lat: 57708900, lng: 11974600 },
  ];

  console.log(`\nCreating ${markets.length} demo markets (expire in 7 days)...`);
  for (const m of markets) {
    await market.createMarket(m.question, m.lat, m.lng, endTime);
    console.log(`  Created: "${m.question}"`);
  }

  console.log('');
  console.log('=== DEPLOYMENT COMPLETE ===');
  console.log(`PredictionMarket: ${marketAddress}`);
  console.log('');
  console.log('NEXT STEPS:');
  console.log(`  1. Update oracle-workflow/config.staging.json:`);
  console.log(`     "predictionMarketAddress": "${marketAddress}"`);
  console.log(`  2. cd oracle-workflow && npm run cre:broadcast`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Deployment failed:', err.message);
    process.exit(1);
  });
