const hre = require('hardhat');

async function main() {
  const ethers = hre.ethers;
  const [deployer, user, admin] = await ethers.getSigners();
  console.log('got signers');
  const BashoodToken = await ethers.getContractFactory('MockBashoodToken');
  console.log('got BashoodToken factory');
  const bashoodToken = await BashoodToken.deploy();
  console.log('called BashoodToken.deploy()');
  await bashoodToken.waitForDeployment();
  console.log('MockBashoodToken deployed at', await bashoodToken.getAddress());
  const MockNFT = await ethers.getContractFactory('MockNFT1155');
  const nft = await MockNFT.deploy();
  await nft.waitForDeployment();
  const MockFeed = await ethers.getContractFactory('MockPriceFeed');
  const priceFeed = await MockFeed.deploy(ethers.parseUnits('2', 8), 8);
  await priceFeed.waitForDeployment();
  const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
  const referral = await BashoodReferral.deploy(await bashoodToken.getAddress(), await nft.getAddress());
  console.log('called BashoodReferral.deploy()');
  await referral.waitForDeployment();
  console.log('BashoodReferral deployed at', await referral.getAddress());

  const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');

  const deployArgs = [
    await bashoodToken.getAddress(),
    await nft.getAddress(),
    await referral.getAddress(),
    await admin.getAddress(),
    BigInt(0),
    BigInt(0),
    BigInt(1),
    BigInt(10000000000),
    BigInt(100)
  ];

  console.log('Deploy args length:', deployArgs.length);
  deployArgs.forEach((a, i) => console.log(i, typeof a, a && a.toString ? a.toString() : String(a)));

  try {
    const tx = await BashoodPresaleFinal.getDeployTransaction(...deployArgs);
    console.log('getDeployTransaction ok, data len', tx.data ? tx.data.length : 0);
  } catch (e) {
    console.error('getDeployTransaction error:', e);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
