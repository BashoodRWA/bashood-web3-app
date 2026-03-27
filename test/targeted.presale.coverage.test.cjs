if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const ZERO_BYTES32 = '0x' + '00'.repeat(32);

// simple integer-only parseUnits replacement for coverage runtime
function parseUnitsDecimal(numStr, decimals = 18) {
  return BigInt(numStr) * (10n ** BigInt(decimals));
}

// load shared presale helpers (test-only)
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const helpers = getPresaleHelpers();

describe('Presale focused coverage', function () {
  let owner, projectWallet, alice;

  beforeEach(async () => {
    [owner, projectWallet, alice] = await ethers.getSigners();
  });

  it('should exercise _bhtFromFiat and burn fallback when burnFrom is missing', async function () {
    const MockBashood = await ethers.getContractFactory('contracts/mocks/MockBashoodToken.sol:MockBashoodToken');
    const bht = await MockBashood.deploy();
    await bht.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();

  // Use the mocks implementation and set price via helper for compatibility
  const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
  await price.waitForDeployment();

    const Ref = await ethers.getContractFactory('ReferralValidator');
    const ref = await Ref.deploy(await owner.getAddress(), ethers.ZeroAddress, 0, 0);
    await ref.waitForDeployment();

    const bhtAddr = (typeof bht.getAddress === 'function') ? await bht.getAddress() : bht.address;
    const nftAddr = (typeof nft.getAddress === 'function') ? await nft.getAddress() : nft.address;
    const refAddr = (typeof ref.getAddress === 'function') ? await ref.getAddress() : ref.address;
    const projectAddr = (typeof projectWallet.getAddress === 'function') ? await projectWallet.getAddress() : projectWallet.address;

    const d = await helpers.deployPresale({ bhtAddr, nftAddr, referralAddr: refAddr, projectWallet: projectAddr });
    const presale = d.presale;
    const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target || null);
    if (!presaleAddr) throw new Error('presale address unavailable');

    await presale.connect(owner).setOperationsWallet(projectAddr);
    await presale.connect(owner).setMaxPriceStaleness(60);

    const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : price.address;
    await presale.connect(owner).setPriceFeed(priceAddr);

    const block = await ethers.provider.getBlock('latest');
    const nowTs = block.timestamp || Math.floor(Date.now() / 1000);
  // Use centralized helper to set both price and updatedAt reliably
  const { setPriceFresh } = getPresaleHelpers();
  await setPriceFresh(price, ethers.parseUnits('1', 8));

    // mint and approve large BHT balance for alice
    await bht.mint(await alice.getAddress(), parseUnitsDecimal('1000000000', 18));
    await bht.connect(alice).approve(presaleAddr, parseUnitsDecimal('1000000000', 18));

    // Call payServiceWithBHT to exercise burn fallback
    const data = presale.interface.encodeFunctionData('payServiceWithBHT(bytes32,uint256)', [ZERO_BYTES32, parseUnitsDecimal('1', 18)]);
    const tx = await alice.sendTransaction({ to: presaleAddr, data });
    await tx.wait();
  });

  it('should revert when price is stale', async function () {
    const MockBashood = await ethers.getContractFactory('contracts/MockBashoodToken.sol:MockBashoodToken');
    const bht = await MockBashood.deploy();
    await bht.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();

  const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  // decimals-first constructor: (uint8 decimals, int256 initialAnswer)
  const price = await MockPrice.deploy(8, ethers.parseUnits('2000', 8));
    await price.waitForDeployment();

    const Ref = await ethers.getContractFactory('ReferralValidator');
    const ref = await Ref.deploy(await owner.getAddress(), ethers.ZeroAddress, 0, 0);
    await ref.waitForDeployment();

    const bhtAddr = (typeof bht.getAddress === 'function') ? await bht.getAddress() : bht.address;
    const nftAddr = (typeof nft.getAddress === 'function') ? await nft.getAddress() : nft.address;
    const refAddr = (typeof ref.getAddress === 'function') ? await ref.getAddress() : ref.address;
    const projectAddr = (typeof projectWallet.getAddress === 'function') ? await projectWallet.getAddress() : projectWallet.address;

    const d2 = await helpers.deployPresale({ bhtAddr, nftAddr, referralAddr: refAddr, projectWallet: projectAddr });
    const presale2 = d2.presale;
    const presaleAddr = (typeof presale2.getAddress === 'function') ? await presale2.getAddress() : (presale2.address || presale2.target || null);
    if (!presaleAddr) throw new Error('presale address unavailable');

    await presale2.connect(owner).setOperationsWallet(projectAddr);
    await presale2.connect(owner).setMaxPriceStaleness(1);
    const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : price.address;
    await presale2.connect(owner).setPriceFeed(priceAddr);

  // artificially stale the price: set answer/timestamp via helper, then zero the updatedAt
  const { setPriceFresh } = getPresaleHelpers();
  await setPriceFresh(price, ethers.parseUnits('2000', 8));
  await price.setUpdatedAt(0);

    await bht.mint(await alice.getAddress(), parseUnitsDecimal('1000000000', 18));
    await bht.connect(alice).approve(presaleAddr, parseUnitsDecimal('1000000000', 18));

    const data2 = presale2.interface.encodeFunctionData('payServiceWithBHT(bytes32,uint256)', [ZERO_BYTES32, parseUnitsDecimal('1', 18)]);
    try {
      const tx2 = await alice.sendTransaction({ to: presaleAddr, data: data2 });
      await tx2.wait();
      throw new Error('expected revert');
    } catch (e) {
      expect(e.message).to.include('Price too stale');
    }
  });
});








