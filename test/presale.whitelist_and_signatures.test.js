if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const _ph = globalThis._presaleHelpers;
const deployPresale = _ph.deployPresale;
const setPriceFresh = _ph.setPriceFresh;
const signNonce = _ph.signNonce;

describe('Presale: whitelist and signature/nonce edge cases', function () {
  it('blocks purchases when whitelist enabled and buyer not whitelisted, allows after grant', async function () {
    const { owner, buyer, presale, nft, price } = await deployPresale();

    // configure
    await presale.connect(owner).setSigner(owner.address);
    await presale.connect(owner).setOperationsWallet(owner.address);
    await presale.connect(owner).setPriceFeed(price.target);
    await presale.connect(owner).setMaxPriceStaleness(3600);
    await presale.connect(owner).startPresale();

    // enable whitelist
    await presale.connect(owner).setWhitelistEnabled(true);

    // mint stock
    await nft.mint(presale.target, 1, 1);

    const sig = signNonce(owner, buyer.address, 42);

    // should revert as buyer not whitelisted
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 42, sig, { value: ethers.parseEther('0.1') })
    ).to.be.revertedWith('Not whitelisted');

    // grant whitelist role and attempt again
    const wlRole = await presale.WHITELIST_ROLE();
    await presale.connect(owner).grantRole(wlRole, buyer.address);

    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 42, sig, { value: ethers.parseEther('0.1') })
    ).to.emit(presale, 'AssetPurchased');
  });

  it('reverts if signer not set (E31) when verifying signature', async function () {
    const { buyer, presale, nft, price } = await deployPresale();

    // do NOT set signer
    await presale.setOperationsWallet((await ethers.getSigners())[0].address);
    await presale.setPriceFeed(price.target);
    await presale.setMaxPriceStaleness(3600);
    await presale.startPresale();

    await nft.mint(presale.target, 1, 1);

    // signature is irrelevant, signer isn't set so _verifySignature should revert E31
    const sig = '0x';
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 7, sig, { value: ethers.parseEther('0.1') })
    ).to.be.revertedWith('E31');
  });

  it('prevents nonce reuse across ETH -> BHT and BHT -> ETH', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price } = await deployPresale();

  // common setup
  await presale.connect(owner).setSigner(owner.address);
  await presale.connect(owner).setOperationsWallet(owner.address);
  await presale.connect(owner).setPriceFeed(price.target);
  await presale.connect(owner).setMaxPriceStaleness(3600);
  // Allow each user to buy up to 2 NFTs for this test so we can exercise nonce reuse across flows
  await presale.connect(owner).setMaxPerUser(2);
  await presale.connect(owner).startPresale();

    // mint NFT to presale
    await nft.mint(presale.target, 1, 2);

    // Prepare BHT for buyer
    await bht.mint(buyer.address, ethers.parseUnits('100', 18));
    await bht.connect(buyer).approve(presale.target, ethers.parseUnits('100', 18));

    // ETH purchase first
    const nonce = 1337;
    const sig = signNonce(owner, buyer.address, nonce);
    await presale.connect(buyer).purchaseWithETH(1, 1, nonce, sig, { value: ethers.parseEther('0.1') });

    // Attempt BHT purchase with same nonce -> should revert E25
    const sig2 = signNonce(owner, buyer.address, nonce);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig2)
    ).to.be.revertedWith('E25');

    // Now do BHT first then ETH
    // mint another NFT and use new buyer2
    const buyer2 = (await ethers.getSigners())[2];
    await nft.mint(presale.target, 1, 1);
    // fund buyer2 with BHT
    await bht.mint(buyer2.address, ethers.parseUnits('100', 18));
    await bht.connect(buyer2).approve(presale.target, ethers.parseUnits('100', 18));

    const nonce2 = 4242;
    const sigB = signNonce(owner, buyer2.address, nonce2);
    await presale.connect(buyer2).purchaseWithBHT(1, 1, nonce2, sigB);

    const sigE = signNonce(owner, buyer2.address, nonce2);
    await expect(
      presale.connect(buyer2).purchaseWithETH(1, 1, nonce2, sigE, { value: ethers.parseEther('0.1') })
    ).to.be.revertedWith('E13');
  });
});
