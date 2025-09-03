// rely on test/setup.js singletons
const expect = globalThis._chai_expect;
const ethers = globalThis.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale oracle edge cases', function () {
  it('reverts when oracle price is zero', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();

  // deploy presale normally
  await presale.setPriceFeed(price.target);
  await presale.setMaxPriceStaleness(1000);
  await presale.setOperationsWallet(projectWallet.address);
  await presale.setSigner(owner.address);
  await presale.startPresale();

    // Set price to zero
    await price.setPrice(0);
    const block = await ethers.provider.getBlock('latest');
    await price.setUpdatedAt(block.timestamp);
    await ethers.provider.send('evm_mine');

    // Mint bht and approve
    await bht.mint(buyer.address, ethers.parseUnits('100',18));
    await bht.connect(buyer).approve(presale.target, ethers.MaxUint256);

    // Ensure NFT minted to presale
    await nft.mint(presale.target, 1, 10);

    const nonce = 3;
    const sig = await signNonce(owner, buyer.address, nonce);

    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig)).to.be.revertedWith('Invalid price');
  });

  it('reverts when oracle price is stale', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();

  await presale.setPriceFeed(price.target);
  await presale.setMaxPriceStaleness(1); // 1 second
  await presale.setOperationsWallet(projectWallet.address);
  await presale.setSigner(owner.address);
  await presale.startPresale();

    // Set fresh price then advance time beyond staleness
    await setPriceFresh(price, 1);
    // advance time
    await ethers.provider.send('evm_increaseTime', [10]);
    await ethers.provider.send('evm_mine');

    // Mint bht and approve
    await bht.mint(buyer.address, ethers.parseUnits('100',18));
    await bht.connect(buyer).approve(presale.target, ethers.MaxUint256);

    // Ensure NFT minted to presale
    await nft.mint(presale.target, 1, 10);

    const nonce = 4;
    const sig = await signNonce(owner, buyer.address, nonce);

    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig)).to.be.revertedWith('Price too stale');
  });
});
