const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Presale rescue interface enforcement', function () {
  it('setRescueContract reverts if target does not support IBashoodRescue', async function () {
    const [owner, admin, emergency] = await ethers.getSigners();

    const MockNFT = await ethers.getContractFactory('MockNFT1155');
    const mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();

    // Deploy MockBHT and Referral
    const MockBHT = await ethers.getContractFactory('MockBHT');
    const mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

    const Referral = await ethers.getContractFactory('BashoodReferral');
    const referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

    const Presale = await ethers.getContractFactory('BashoodPresaleFinal');
    const now = Math.floor(Date.now() / 1000);
    const presale = await Presale.deploy(
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      await owner.getAddress(),
      1,
      1,
      now - 1000,
      now + 1000,
      100
    );
    await presale.waitForDeployment();

  // Deploy a random contract that does NOT implement the interface
  const NotRescue = await ethers.getContractFactory('NotRescue');
  const notRescue = await NotRescue.deploy();
  await notRescue.waitForDeployment();

  // Attempt to set to an address lacking the interface
  await expect(presale.connect(owner).setRescueContract(await notRescue.getAddress())).to.be.revertedWith('Rescue ABI mismatch');

    // Now deploy real Rescue and set it
    const Rescue = await ethers.getContractFactory('BashoodRescue');
    const rescue = await Rescue.deploy(await admin.getAddress(), await emergency.getAddress());
    await rescue.waitForDeployment();

    await presale.connect(owner).setRescueContract(await rescue.getAddress());
    const rc = await presale.rescueContract();
    expect(rc).to.equal(await rescue.getAddress());
  });
});
