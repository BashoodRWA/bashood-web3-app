if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('BashoodPresaleFinal coverage - step5', function () {
  it('purchaseWithBHT uses burnFrom when BHT exposes burnFrom', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale({
      bhtFactory: 'contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn'
    });

    // setup presale config
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setPriceFeed(price.target);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await setPriceFresh(price, ethers.parseUnits('1', 8));
    await presale.connect(owner).setSigner(owner.address);
    await presale.connect(owner).startPresale();

  // mint some NFTs into the presale contract so transfer will succeed
  await nft.mint(presale.target, 1, 10);

    // prepare buyer funds and allowance
    const nonce = 1;
    const signature = signNonce(owner, buyer.address, nonce);

    // price and amounts are high precision; mint a generous balance
    const discountedCost = ethers.parseUnits('10', 18);
    await bht.mint(buyer.address, discountedCost);
    await bht.connect(buyer).approve(presale.target, discountedCost);

    // call purchaseWithBHT as buyer (should use burnFrom provided by mock)
    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature))
      .to.emit(presale, 'AssetPurchased');
  }).timeout(20000);

  it('purchaseWithBHT falls back to transferFrom when burnFrom not available', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price } = await deployPresale();

    // setup
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setPriceFeed(price.target);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await setPriceFresh(price, ethers.parseUnits('1', 8));
    await presale.connect(owner).setSigner(owner.address);
    // set a non-zero burn rate so burn path is taken then falls back
    await presale.connect(owner).setBurnBps(1000);
    await presale.connect(owner).startPresale();

  // mint NFTs into presale
  await nft.mint(presale.target, 1, 10);

    const nonce = 2;
    const signature = signNonce(owner, buyer.address, nonce);

    // compute approximate cost and mint/approve
    const discountedCost = ethers.parseUnits('10', 18);
    await bht.mint(buyer.address, discountedCost);
    await bht.connect(buyer).approve(presale.target, discountedCost);

    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature))
      .to.emit(presale, 'AssetPurchased');
  }).timeout(20000);

  it('payServiceWithBHT executes full flow emitting ServicePaid', async function () {
    const { owner, projectWallet, buyer, presale, bht, price } = await deployPresale();

    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setPriceFeed(price.target);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await setPriceFresh(price, ethers.parseUnits('1', 8));
    // set a burn rate to exercise burn branch
    await presale.connect(owner).setBurnBps(500);
    await presale.connect(owner).setDiscountBps(100);

    // prepare buyer funds and allowance
    const fiatQuoteUsd = ethers.parseUnits('1', 18);
    const bhtAmount = ethers.parseUnits('10', 18);
    await bht.mint(buyer.address, bhtAmount);
    await bht.connect(buyer).approve(presale.target, bhtAmount);

  // use numeric overload (convenience) to avoid needing formatBytes32String helper
  await expect(presale.connect(buyer)["payServiceWithBHT(uint256,uint256)"](1, fiatQuoteUsd))
      .to.emit(presale, 'ServicePaid');
  }).timeout(20000);
});
