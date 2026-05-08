if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('BashoodPresaleFinal - cover remaining branches', function () {
  it('payServiceWithBHT: successful burn branch (emit Burned/BHTBurned)', async function () {
    const { owner, projectWallet, buyer, presale, bht, price } = await deployPresale({
      bhtFactory: 'contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn'
    });

    const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target);

  // Configure oracle and ops wallet
  const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target);
  await presale.connect(owner).setPriceFeed(priceAddr);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setBurnBps(100); // small burn to trigger try-branch

    // price = 1 USD (8 decimals)
    await setPriceFresh(price, ethers.parseUnits('1', 8));

    const fiat = ethers.parseUnits('1', 18); // $1 with 18 decimals

    // Fund buyer and approve
    await bht.mint(await buyer.getAddress(), ethers.parseUnits('100', 18));
  await bht.connect(buyer).approve(presaleAddr, ethers.parseUnits('100', 18));

    await expect(
      presale.connect(buyer)['payServiceWithBHT(uint256,uint256)'](1, fiat)
    ).to.emit(presale, 'BHTBurned');
  });

  it('payMilestoneWithBHT: successful burn branch (emit BHTBurned and MilestonePaid)', async function () {
    const { owner, projectWallet, buyer, presale, bht, price } = await deployPresale({
      bhtFactory: 'contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn'
    });

    const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target);

  const priceAddr2 = (typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target);
  await presale.connect(owner).setPriceFeed(priceAddr2);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setBurnBps(200);

    await setPriceFresh(price, ethers.parseUnits('1', 8));

    const fiat = ethers.parseUnits('1', 18);
    await bht.mint(await buyer.getAddress(), ethers.parseUnits('100', 18));
  await bht.connect(buyer).approve(presaleAddr, ethers.parseUnits('100', 18));

    await expect(
      presale.connect(buyer)['payMilestoneWithBHT(uint8,uint256)'](1, fiat)
    ).to.emit(presale, 'MilestonePaid');
  });

  it('purchaseWithETH: calls referral.rewardReferrer when referrer exists', async function () {
  const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale({ referralFactory: 'contracts/mocks/MockReferral.sol:MockReferral' });

  // Mint an NFT to the presale contract and enable sale
  await nft.mint(await presale.getAddress(), 1, 1);
    await presale.connect(owner).startPresale();

  const presaleAddr3 = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target);

    // Set signer and price feed (purchaseWithETH verifies signature)
    await presale.connect(owner).setSigner(await owner.getAddress());
  const priceAddr3 = (typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target);
  await presale.connect(owner).setPriceFeed(priceAddr3);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await setPriceFresh(price, ethers.parseUnits('1', 8));

  // Using MockReferral: pre-set a referrer for buyer so rewardReferrer won't revert
  const signers = await ethers.getSigners();
  const referrer = signers[3];
  await referral.setReferrer(await buyer.getAddress(), await referrer.getAddress());

    // Build signature for buyer (nonce = 1)
    const nonce = 1;
    const sig = await signNonce(owner, await buyer.getAddress(), nonce);

  // Perform purchaseWithETH (use contract price to avoid magic-number mismatch)
  const nftPrice = await presale.nftPriceETH();
  const tx = await presale.connect(buyer).purchaseWithETH(1, 1, nonce, sig, { value: nftPrice });
  await tx.wait();

    // After purchase, referral.rewarded(buyer) should be true (rewardReferrer invoked)
    expect(await referral.rewarded(await buyer.getAddress())).to.equal(true);
  });

  it('endPresale: sets presaleActive false and presaleEnded true', async function () {
    const { owner, presale } = await deployPresale();
    await presale.connect(owner).startPresale();
    await presale.connect(owner).endPresale();
    expect(await presale.presaleActive()).to.equal(false);
    expect(await presale.presaleEnded()).to.equal(true);
  });

  it('purchaseWithBHT: successful burn branch and referral.rewardReferrer invoked', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale({
      bhtFactory: 'contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn',
      referralFactory: 'contracts/mocks/MockReferral.sol:MockReferral'
    });

    // Mint NFT to presale and start
    await nft.mint(await presale.getAddress(), 1, 1);
    await presale.connect(owner).startPresale();

    const presaleAddr4 = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target);

    // Configure signer, oracle and ops wallet
    await presale.connect(owner).setSigner(await owner.getAddress());
  const priceAddr4 = (typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target);
  await presale.connect(owner).setPriceFeed(priceAddr4);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setBurnBps(1000); // 10% burn to ensure burnAmount > 0

    await setPriceFresh(price, ethers.parseUnits('1', 8));

    // Pre-set a referrer so rewardReferrer won't revert
    const signers = await ethers.getSigners();
    const referrer = signers[3];
    await referral.setReferrer(await buyer.getAddress(), await referrer.getAddress());

    // Fund buyer and approve discounted cost (nftPriceBHT is 10 BHT in helper)
    const discountedCost = ethers.parseUnits('10', 18);
    await bht.mint(await buyer.getAddress(), ethers.parseUnits('100', 18));
  await bht.connect(buyer).approve(presaleAddr4, discountedCost);

    // Build signature and perform purchaseWithBHT
    const nonce = 1;
    const sig = await signNonce(owner, await buyer.getAddress(), nonce);

    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);

    // referral mock records reward
    expect(await referral.isRewarded(await buyer.getAddress())).to.equal(true);
  });
});
