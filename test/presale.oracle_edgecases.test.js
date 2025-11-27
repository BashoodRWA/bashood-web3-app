// rely on test/setup.js singletons
const expect = globalThis._chai_expect;
const ethers = globalThis.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale oracle edge cases', function () {
  it('reverts when oracle price is zero', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();

    // resolve addresses robustly
  const priceAddr = await price.getAddress();
  const presaleAddr = await presale.getAddress();

    // deploy presale normally
    await presale.setPriceFeed(priceAddr);
    await presale.setMaxPriceStaleness(1000);
    const projectAddr = (typeof projectWallet.getAddress === 'function') ? await projectWallet.getAddress() : projectWallet.address;
    await presale.setOperationsWallet(projectAddr);
    await presale.setSigner(await owner.getAddress());
    await presale.startPresale();

    // Set price to zero using helper so both price and updatedAt are set
  await setPriceFresh(price, ethers.parseUnits('0', 8));

    // Mint bht and approve
  await bht.mint(await buyer.getAddress(), ethers.parseUnits('100',18));
  await bht.connect(buyer).approve(presaleAddr, ethers.MaxUint256);

  // Ensure NFT minted to presale
  await nft.mint(presaleAddr, 1, 10);

    const nonce = 3;
  const sig = await signNonce(owner, await buyer.getAddress(), nonce);

    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig)).to.be.revertedWith('Invalid price');
  });

  it('reverts when oracle price is stale', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();

  await presale.setPriceFeed(await price.getAddress());
  await presale.setMaxPriceStaleness(1); // 1 second
  await presale.setOperationsWallet(projectWallet.address);
  await presale.setSigner(owner.address);
  await presale.startPresale();

  // Set fresh price then advance time beyond staleness
  await setPriceFresh(price, ethers.parseUnits('1', 8));
    // advance time
    await ethers.provider.send('evm_increaseTime', [10]);
    await ethers.provider.send('evm_mine');

    // Mint bht and approve
    await bht.mint(buyer.address, ethers.parseUnits('100',18));
  await bht.connect(buyer).approve(await presale.getAddress(), ethers.MaxUint256);

    // Ensure NFT minted to presale
  await nft.mint(await presale.getAddress(), 1, 10);

    const nonce = 4;
    const sig = await signNonce(owner, buyer.address, nonce);

    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig)).to.be.revertedWith('Oracle: Invalid/stale');
  });
});








