const hre = require('hardhat');

async function main() {
  const [owner, alice, bob, project] = await hre.ethers.getSigners();
  const MockBHT = await hre.ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
  const bht = await MockBHT.deploy(); await bht.waitForDeployment();
  const MockNFT = await hre.ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
  const nft = await MockNFT.deploy(); await nft.waitForDeployment();
  const Referral = await hre.ethers.getContractFactory('BashoodReferral');
  const referral = await Referral.deploy(); await referral.waitForDeployment();

  const BPF = await hre.ethers.getContractFactory('BashoodPresaleFinal');
  const now = Math.floor(Date.now() / 1000);
  const args = [
    await bht.getAddress ? await bht.getAddress() : (bht.address || bht.target),
    await nft.getAddress ? await nft.getAddress() : (nft.address || nft.target),
    await referral.getAddress ? await referral.getAddress() : (referral.address || referral.target),
    project.address,
    hre.ethers.parseEther('0.01'),
    hre.ethers.parseEther('1'),
    now - 10,
    now + 3600,
    100
  ];

  console.log('Prepared args:', args.map(a => String(a)).slice(0,8));
  try {
    const tx = await BPF.getDeployTransaction(...args);
    console.log('getDeployTransaction succeeded, tx data length:', tx.data ? tx.data.length : 'none');
  } catch (err) {
    console.error('getDeployTransaction error:', err.message);
  }
}

main().catch((e)=>{console.error(e); process.exit(1)});
