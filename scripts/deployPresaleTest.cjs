const hre = require('hardhat');

async function main() {
  const { ethers } = hre;
  const [owner, referrer, user, treasury] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory('MockERC20');
  console.log('About to deploy MockERC20');
  const token = await MockERC20.deploy();
  console.log('MockERC20 deployed');
  await token.waitForDeployment();
  await token.mint(await user.getAddress(), ethers.parseEther('100'));

  const MockNFT = await ethers.getContractFactory('MockNFT1155');
  console.log('About to deploy MockNFT1155');
  const nft = await MockNFT.deploy();
  console.log('MockNFT deployed');
  await nft.waitForDeployment();
  await nft.mintTo(await owner.getAddress(), 1, 10);

  // Deploy a simple ReferralValidator and then deploy BashoodReferral with correct args
  const Validator = await ethers.getContractFactory('ReferralValidator');
  console.log('About to deploy ReferralValidator');
  const validator = await Validator.deploy(owner.address);
  console.log('ReferralValidator deployed');
  await validator.waitForDeployment();

  const Referral = await ethers.getContractFactory('BashoodReferral');
  console.log('About to deploy Referral');
  const fakePresaleAddress = '0x1000000000000000000000000000000000000001';
  const referral = await Referral.deploy(fakePresaleAddress, await validator.getAddress(), await nft.getAddress());
  console.log('Referral deployed');
  await referral.waitForDeployment();

  const MockRescue = await ethers.getContractFactory('MockRescue');
  console.log('About to deploy MockRescue');
  const mockRescue = await MockRescue.deploy();
  console.log('MockRescue deployed');
  await mockRescue.waitForDeployment();

  console.log('About to get BashoodPresaleFinal factory');
  const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
  console.log('Got BashoodPresaleFinal factory');
  const args = [
    await token.getAddress(),
    await nft.getAddress(),
    await referral.getAddress(),
    owner.address,
    ethers.parseEther('1'),
    ethers.parseEther('2'),
    1700000000,
    1800000000,
    10
  ];

  // Log factory deploy inputs to compare against provided args
  const deployInputs = (BashoodPresaleFinal.interface && BashoodPresaleFinal.interface.deploy && BashoodPresaleFinal.interface.deploy.inputs) || [];
  console.log('Factory deploy inputs length:', deployInputs.length);
  console.log('Factory deploy inputs:', deployInputs.map(i => i.type + ' ' + i.name));

  console.log('Args length', args.length);
  console.log('Args types/values', args.map(a => ({ t: typeof a, v: String(a).slice(0,80) })));

  console.log('About to deploy. Checking lengths:', args.length, 'vs factory inputs', deployInputs.length);
  for (let i = 0; i < Math.max(args.length, deployInputs.length); i++) {
    console.log(i, 'arg:', args[i], 'type:', typeof args[i], 'factory:', deployInputs[i] ? (deployInputs[i].type + ' ' + deployInputs[i].name) : undefined);
  }

  // Use getDeployTransaction to validate ABI encoding without sending the constructor tx
  try {
    const tx = await BashoodPresaleFinal.getDeployTransaction(...args);
    console.log('getDeployTransaction succeeded, data length:', tx.data ? tx.data.length : 0);
  } catch (err) {
    console.error('getDeployTransaction failed:', err && err.stack || err);
    throw err;
  }
}

main().catch(err => { console.error(err); process.exit(1); });
