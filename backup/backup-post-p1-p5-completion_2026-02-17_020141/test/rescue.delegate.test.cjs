if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe('Rescue delegation and authorization', function () {
  let owner, admin, emergency, presaleAdmin, buyer;
  let mock1155, rescue, presale;

  beforeEach(async function () {
    [owner, admin, emergency, presaleAdmin, buyer] = await ethers.getSigners();

    // Deploy mock ERC1155 (use contracts variant exposing mint(address,uint256,uint256,bytes))
    const MockNFT = await ethers.getContractFactory('contracts/MockNFT1155.sol:MockNFT1155');
  mock1155 = await MockNFT.deploy();
  await mock1155.waitForDeployment();

  // Deploy Rescue with admin and emergency
  const Rescue = await ethers.getContractFactory('BashoodRescue');
  rescue = await Rescue.deploy(await admin.getAddress(), await emergency.getAddress());
  await rescue.waitForDeployment();

    // Deploy a simple ERC20 mock for BHT to satisfy presale constructor
    const MockERC20 = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
  const mockBHT = await MockERC20.deploy();
  await mockBHT.waitForDeployment();

    // Deploy Referral (use owner as placeholder params)
    const Referral = await ethers.getContractFactory('BashoodReferral');
  const referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mock1155.getAddress());
  await referral.waitForDeployment();

  // Deploy a minimal MockPresale to call rescue methods (fully-qualified to avoid HH701)
  const MockPresale = await ethers.getContractFactory('contracts/mocks/MockPresale.sol:MockPresale');
  presale = await MockPresale.deploy();
  await presale.waitForDeployment();

  // authorize presale in rescue via admin
  await rescue.connect(admin).authorizeCaller(await presale.getAddress());
  });

  it.skip('authorized presale can call rescue functions - DEPRECATED: delegateRescueUnsoldNfts removed', async function () {
  // mint some NFT to rescue contract to allow transfer
  // The 'contracts/MockNFT1155.sol' exposes mintTo(owner, id, amount) or mint(..., bytes)
  if (mock1155.mint) {
    // fallback for mint(address,uint256,uint256,bytes)
    try { await mock1155.mint(await rescue.getAddress(), 1, 10, '0x'); } catch { await mock1155.mintTo(await rescue.getAddress(), 1, 10); }
  } else {
    await mock1155.mintTo(await rescue.getAddress(), 1, 10);
  }

  // set rescue on presale and call delegate
  await presale.connect(owner).setRescueContract(await rescue.getAddress());
  await presale.connect(owner).delegateRescueUnsoldNfts(await mock1155.getAddress(), 1, await buyer.getAddress(), 5);

  const bal = await mock1155.balanceOf(await buyer.getAddress(), 1);
  expect(bal).to.equal(5);
  });

  it.skip('unauthorized caller cannot invoke rescue direct methods - DEPRECATED: delegateRescueUnsoldNfts removed', async function () {
    // revoke presale
    await rescue.connect(admin).revokeCaller(await presale.getAddress());
    await presale.connect(owner).setRescueContract(await rescue.getAddress());
    await expect(
      presale.connect(owner).delegateRescueUnsoldNfts(await mock1155.getAddress(), 1, await buyer.getAddress(), 1)
    ).to.be.revertedWith('Rescue: not authorized');
  });
});






