const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Rescue delegation and authorization', function () {
  let owner, admin, emergency, presaleAdmin, buyer;
  let mock1155, rescue, presale;

  beforeEach(async function () {
    [owner, admin, emergency, presaleAdmin, buyer] = await ethers.getSigners();

    // Deploy mock ERC1155
    const MockNFT = await ethers.getContractFactory('MockNFT1155');
  mock1155 = await MockNFT.deploy();
  await mock1155.waitForDeployment();

  // Deploy Rescue with admin and emergency
  const Rescue = await ethers.getContractFactory('BashoodRescue');
  rescue = await Rescue.deploy(await admin.getAddress(), await emergency.getAddress());
  await rescue.waitForDeployment();

    // Deploy a simple ERC20 mock for BHT to satisfy presale constructor
    const MockERC20 = await ethers.getContractFactory('MockBHT');
  const mockBHT = await MockERC20.deploy();
  await mockBHT.waitForDeployment();

    // Deploy Referral (use owner as placeholder params)
    const Referral = await ethers.getContractFactory('BashoodReferral');
  const referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mock1155.getAddress());
  await referral.waitForDeployment();

  // Deploy a minimal MockPresale to call rescue methods
  const MockPresale = await ethers.getContractFactory('MockPresale');
  presale = await MockPresale.deploy();
  await presale.waitForDeployment();

  // authorize presale in rescue via admin
  await rescue.connect(admin).authorizeCaller(await presale.getAddress());
  });

  it('authorized presale can call rescue functions', async function () {
  // mint some NFT to rescue contract to allow transfer
  await mock1155.mint(await rescue.getAddress(), 1, 10, '0x');

  // set rescue on presale and call delegate
  await presale.connect(owner).setRescueContract(await rescue.getAddress());
  await presale.connect(owner).delegateRescueUnsoldNfts(await mock1155.getAddress(), 1, await buyer.getAddress(), 5);

  const bal = await mock1155.balanceOf(await buyer.getAddress(), 1);
  expect(bal).to.equal(5);
  });

  it('unauthorized caller cannot invoke rescue direct methods', async function () {
    // revoke presale
    await rescue.connect(admin).revokeCaller(await presale.getAddress());
    await presale.connect(owner).setRescueContract(await rescue.getAddress());
    await expect(
      presale.connect(owner).delegateRescueUnsoldNfts(await mock1155.getAddress(), 1, await buyer.getAddress(), 1)
    ).to.be.revertedWith('Rescue: not authorized');
  });
});
