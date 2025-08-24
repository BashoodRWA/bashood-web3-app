const { expect } = require('chai');
const { ethers } = require('hardhat');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 = '0x' + '00'.repeat(32);

// simple integer-only parseUnits replacement for coverage runtime
function parseUnitsDecimal(numStr, decimals = 18) {
  // numStr must be an integer string like '1' or '1000'
  return BigInt(numStr) * (10n ** BigInt(decimals));
}

// This file adds focused tests to hit Presale branches: _bhtFromFiat checks, burn fallback, ops transfer, and price staleness

describe('Presale focused coverage', function () {
  let owner, projectWallet, alice;

  beforeEach(async () => {
    [owner, projectWallet, alice] = await ethers.getSigners();
  });

  it('should exercise _bhtFromFiat and burn fallback when burnFrom is missing', async function () {
    // Deploy mocks: MockBashoodToken (no burnFrom), MockNFT1155, MockPriceFeed
    const MockBashood = await ethers.getContractFactory('MockBashoodToken');
    const bht = await MockBashood.deploy();
    await bht.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('MockNFT1155');
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();

    const MockPrice = await ethers.getContractFactory('MockPriceFeed');
    // set a positive price with 8 decimals
    const price = await MockPrice.deploy(2000, 8);
    await price.waitForDeployment();

    const Ref = await ethers.getContractFactory('ReferralValidator');
    const ref = await Ref.deploy(owner.address);
    await ref.waitForDeployment();

    const bhtAddr = (typeof bht.getAddress === 'function') ? await bht.getAddress() : bht.address;
    const nftAddr = (typeof nft.getAddress === 'function') ? await nft.getAddress() : nft.address;
    const refAddr = (typeof ref.getAddress === 'function') ? await ref.getAddress() : ref.address;
    const projectAddr = (typeof projectWallet.getAddress === 'function') ? await projectWallet.getAddress() : projectWallet.address;

    const Presale = await ethers.getContractFactory('BashoodPresaleFinal');
  const presale = await Presale.deploy(
      bhtAddr,
      nftAddr,
      refAddr,
      projectAddr,
      1, // nftPriceETH
      1, // nftPriceBHT
      0,
      0,
      100
    );
  await presale.waitForDeployment();
  // robustly resolve deployed contract address
  const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target || null);
  if (!presaleAddr) throw new Error('presale address unavailable');

    // set required state: operationsWallet, maxPriceStaleness, priceFeed
    await presale.connect(owner).setOperationsWallet(projectAddr);
    await presale.connect(owner).setMaxPriceStaleness(60);
  const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : price.address;
  await presale.connect(owner).setPriceFeed(priceAddr);

    // mint some BHT to alice and approve presale
  // mint a very large balance so ops transfer and burn fallback can be covered
  await bht.mint(alice.address, parseUnitsDecimal('1000000000', 18));
  // approve a very large allowance to satisfy any computed cost under test
  await bht.connect(alice).approve(presaleAddr, parseUnitsDecimal('1000000000', 18));

  // Call payServiceWithBHT to exercise _bhtFromFiat -> burn path where burnFrom does NOT exist
  // Encode and send raw tx to avoid ethers' overloaded resolution issues
  const data = presale.interface.encodeFunctionData('payServiceWithBHT(bytes32,uint256)', [ZERO_BYTES32, parseUnitsDecimal('1', 18)]);
  const tx = await alice.sendTransaction({ to: presaleAddr, data });
  await tx.wait();
  });

  it('should revert when price is stale', async function () {
    const MockBashood = await ethers.getContractFactory('MockBashoodToken');
    const bht = await MockBashood.deploy();
    await bht.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('MockNFT1155');
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();

    const MockPrice = await ethers.getContractFactory('MockPriceFeed');
    const price = await MockPrice.deploy(2000, 8);
    await price.waitForDeployment();

    const Ref = await ethers.getContractFactory('ReferralValidator');
    const ref = await Ref.deploy(owner.address);
    await ref.waitForDeployment();

  const bhtAddr = (typeof bht.getAddress === 'function') ? await bht.getAddress() : bht.address;
  const nftAddr = (typeof nft.getAddress === 'function') ? await nft.getAddress() : nft.address;
  const refAddr = (typeof ref.getAddress === 'function') ? await ref.getAddress() : ref.address;
  const projectAddr = (typeof projectWallet.getAddress === 'function') ? await projectWallet.getAddress() : projectWallet.address;

    const Presale = await ethers.getContractFactory('BashoodPresaleFinal');
  const presale = await Presale.deploy(
      bhtAddr,
      nftAddr,
      refAddr,
      projectAddr,
      1, // nftPriceETH
      1, // nftPriceBHT
      0,
      0,
      100
    );
    await presale.waitForDeployment();
  const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target || null);
  if (!presaleAddr) throw new Error('presale address unavailable');

    // set required state
    console.log('DBG before setters:', { projectAddr, typeof_projectAddr: typeof projectAddr });
    await presale.connect(owner).setOperationsWallet(projectAddr);
    await presale.connect(owner).setMaxPriceStaleness(1);
  const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : price.address;
  console.log('DBG priceAddr:', priceAddr, typeof priceAddr);
  await presale.connect(owner).setPriceFeed(priceAddr);

    // artificially stale the price
    await price.setUpdatedAt(0);

  await bht.mint(alice.address, parseUnitsDecimal('1000000000', 18));
  await bht.connect(alice).approve(presaleAddr, parseUnitsDecimal('1000000000', 18));

  console.log('DBG:', { presaleAddr, priceAddr, bhtAddr, projectAddr });

  const data2 = presale.interface.encodeFunctionData('payServiceWithBHT(bytes32,uint256)', [ZERO_BYTES32, parseUnitsDecimal('1', 18)]);
  try {
    const tx2 = await alice.sendTransaction({ to: presaleAddr, data: data2 });
    await tx2.wait();
    throw new Error('expected revert');
  } catch (e) {
    expect(e.message).to.include('Price too stale');
  }
  });
});
