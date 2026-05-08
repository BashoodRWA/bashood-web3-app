const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with', deployer.address);

  const BashoodRescue = await hre.ethers.getContractFactory('BashoodRescue');
  const rescue = await BashoodRescue.deploy(deployer.address, deployer.address);
  await rescue.waitForDeployment();
  console.log('Rescue deployed to', await rescue.getAddress());

  // Example: deploy a presale to be authorized (replace with real params)
  const MockBHT = await hre.ethers.getContractFactory('MockBHT');
  const mockBHT = await MockBHT.deploy();
  await mockBHT.waitForDeployment();

  const MockNFT = await hre.ethers.getContractFactory('MockNFT1155');
  const mockNFT = await MockNFT.deploy();
  await mockNFT.waitForDeployment();

  const Referral = await hre.ethers.getContractFactory('BashoodReferral');
  const referral = await Referral.deploy(deployer.address, deployer.address, await mockNFT.getAddress());
  await referral.waitForDeployment();

  const Presale = await hre.ethers.getContractFactory('BashoodPresaleFinal');
  const now = Math.floor(Date.now() / 1000);
  const presale = await Presale.deploy(
    await mockBHT.getAddress(),
    await mockNFT.getAddress(),
    await referral.getAddress(),
    deployer.address,
    1,
    1,
    now - 1000,
    now + 1000,
    100
  );
  await presale.waitForDeployment();
  console.log('Presale deployed to', await presale.getAddress());

  // Authorize the presale in rescue
  const tx = await rescue.authorizeCaller(await presale.getAddress());
  await tx.wait();
  console.log('Authorized presale in rescue');

  // confirm
  const isAuth = await rescue.authorizedCallers(await presale.getAddress());
  console.log('is authorized:', isAuth);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
