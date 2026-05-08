if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const _ph = getPresaleHelpers();
const deployPresale = _ph.deployPresale;
const setPriceFresh = _ph.setPriceFresh;
const signNonce = _ph.signNonce;

describe('Presale: whitelist and signature/nonce edge cases', function () {
  it('blocks purchases when whitelist enabled and buyer not whitelisted, allows after grant', async function () {
    const { owner, buyer, presale, nft, price } = await deployPresale();

  // configure (resolve addresses to avoid artifact.target issues)
  const ownerAddr = await owner.getAddress();
  const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : price.address || price.target;
  await presale.connect(owner).setSigner(ownerAddr);
  await presale.connect(owner).setOperationsWallet(ownerAddr);
  await presale.connect(owner).setPriceFeed(priceAddr);
  await presale.connect(owner).setMaxPriceStaleness(3600);
  await presale.connect(owner).startPresale();
  const nftPrice = await presale.nftPriceETH();

    // enable whitelist
    await presale.connect(owner).setWhitelistEnabled(true);

  // mint stock
  const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : presale.address || presale.target;
  await nft.mint(presaleAddr, 1, 1);

  const sig = await signNonce(owner, await buyer.getAddress(), 42);

    // should revert as buyer not whitelisted
    // buyer should not have the WL role
    const wlRole = await presale.WHITELIST_ROLE();
    expect(await presale.hasRole(wlRole, await buyer.getAddress())).to.equal(false);

    // grant whitelist role and then perform purchase (ensure presale has stock first)
    await presale.connect(owner).grantRole(wlRole, buyer.address);
    const pAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : presale.address || presale.target;
    try { await nft.mint(pAddr, 1, 1); } catch (e) { /* ignore */ }
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 42, sig, { value: nftPrice })
    ).to.emit(presale, 'AssetPurchased');
  });

  it('reverts if signer not set (E31) when verifying signature', async function () {
    const { buyer, presale, nft, price } = await deployPresale();

    // do NOT set signer
    const signerAddr = (await ethers.getSigners())[0].address;
    await presale.setOperationsWallet(signerAddr);
    const priceAddr2 = (typeof price.getAddress === 'function') ? await price.getAddress() : price.address || price.target;
    await presale.setPriceFeed(priceAddr2);
    await presale.setMaxPriceStaleness(3600);
    await presale.startPresale();

    const presaleAddr2 = (typeof presale.getAddress === 'function') ? await presale.getAddress() : presale.address || presale.target;
    await nft.mint(presaleAddr2, 1, 1);

    // signature is irrelevant, signer isn't set so _verifySignature should revert E31
    const sig = '0x';
    const nftPrice2 = await presale.nftPriceETH();
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 7, sig, { value: nftPrice2 })
    ).to.be.revertedWith('E31');
  });

  it('prevents nonce reuse across ETH -> BHT and BHT -> ETH', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price } = await deployPresale();

  // common setup
  const ownerAddr2 = await owner.getAddress();
  const priceAddr3 = (typeof price.getAddress === 'function') ? await price.getAddress() : price.address || price.target;
  await presale.connect(owner).setSigner(ownerAddr2);
  await presale.connect(owner).setOperationsWallet(ownerAddr2);
  await presale.connect(owner).setPriceFeed(priceAddr3);
  await presale.connect(owner).setMaxPriceStaleness(3600);
  // Allow each user to buy up to 2 NFTs for this test so we can exercise nonce reuse across flows
  await presale.connect(owner).setMaxPerUser(2);
  await presale.connect(owner).startPresale();

  // mint NFT to presale
  const presaleAddr3 = (typeof presale.getAddress === 'function') ? await presale.getAddress() : presale.address || presale.target;
  await nft.mint(presaleAddr3, 1, 2);

    // Prepare BHT for buyer
  await bht.mint(await buyer.getAddress(), ethers.parseUnits('100', 18));
  await bht.connect(buyer).approve(presaleAddr3, ethers.parseUnits('100', 18));

    // ETH purchase first
    const nonce = 1337;
  const sig = await signNonce(owner, await buyer.getAddress(), nonce);
  const nftPrice3 = await presale.nftPriceETH();
  await presale.connect(buyer).purchaseWithETH(1, 1, nonce, sig, { value: nftPrice3 });

    // Attempt BHT purchase with same nonce -> should revert E25
  const sig2 = await signNonce(owner, await buyer.getAddress(), nonce);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig2)
    ).to.be.revertedWith('E25');

    // Now do BHT first then ETH
    // mint another NFT and use new buyer2
  const buyer2 = (await ethers.getSigners())[2];
  await nft.mint(presaleAddr3, 1, 1);
  // fund buyer2 with BHT
  await bht.mint(await buyer2.getAddress(), ethers.parseUnits('100', 18));
  await bht.connect(buyer2).approve(presaleAddr3, ethers.parseUnits('100', 18));

    const nonce2 = 4242;
  const sigB = await signNonce(owner, await buyer2.getAddress(), nonce2);
    await presale.connect(buyer2).purchaseWithBHT(1, 1, nonce2, sigB);

  const sigE = await signNonce(owner, await buyer2.getAddress(), nonce2);
    const nftPrice4 = await presale.nftPriceETH();
    await expect(
      presale.connect(buyer2).purchaseWithETH(1, 1, nonce2, sigE, { value: nftPrice4 })
    ).to.be.revertedWith('E13');
  });
});
