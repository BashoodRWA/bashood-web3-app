if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale burn fallback and ops transfer failure', function () {
  it('falls back to transfer to dead when burnFrom reverts and ops transfer succeeds', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();

    // Use rejecting mock that reverts only when recipient is dead address for burning
    const MockBHTRejecting = await ethers.getContractFactory('contracts/mocks/MockBHTRejecting.sol:MockBHTRejecting');
    const rejecting = await MockBHTRejecting.deploy('rBHT','rBHT', ethers.ZeroAddress);
    await rejecting.waitForDeployment();

  // replace bht in presale by deploying a new presale with rejecting token
  const d2 = await deployPresale({ bhtAddr: await rejecting.getAddress() });
  const presale2 = d2.presale;

  // set price, signer, and staleness on the new presale instance (use d2.price/d2.nft)
  const priceAddr2 = (typeof d2.price.getAddress === 'function') ? await d2.price.getAddress() : (d2.price.address || d2.price.target);
  await presale2.setPriceFeed(priceAddr2);
  await presale2.setMaxPriceStaleness(1000);
  await presale2.setSigner(owner.address);
  await presale2.startPresale();
  await setPriceFresh(d2.price, ethers.parseUnits('1', 8));

    // Mint bht and approve
    await rejecting.mint(buyer.address, ethers.parseUnits('100',18));
  await rejecting.connect(buyer).approve(await presale2.getAddress(), ethers.MaxUint256);

    // Set operations wallet and burn/discount bps
    await presale2.setOperationsWallet(projectWallet.address);
    await presale2.setDiscountBps(0);
    await presale2.setBurnBps(500); // 5%

  // Ensure NFT minted to presale2 (use d2.nft if available)
  const nft2 = d2.nft || nft;
  try {
    await nft2.mint(await presale2.getAddress(), 1, 10);
  } catch (e) {
    try {
      await nft2.mint(await presale2.getAddress(), 1, 10, '0x');
    } catch (e2) {
      await nft2.mint(owner.address, 1, 10);
      await nft2.connect(owner).safeTransferFrom(owner.address, await presale2.getAddress(), 1, 10, '0x');
    }
  }

    // Sign
    const nonce = 1;
    const sig = await signNonce(owner, buyer.address, nonce);

    // Execute purchaseWithBHT; since burnFrom will revert (rejecting to dead), it should fallback to transfer
    await expect(presale2.connect(buyer).purchaseWithBHT(1, 1, nonce, sig)).to.not.be.reverted;
  });

  it('reverts when ops transfer fails', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();

    // Use rejecting mock but set it to reject when recipient is ops wallet
  const MockBHTReturnFalse = await ethers.getContractFactory('contracts/mocks/MockBHTReturnFalse.sol:MockBHTReturnFalse');
  const rejecting = await MockBHTReturnFalse.deploy('rBHT','rBHT', projectWallet.address);
    await rejecting.waitForDeployment();

  // deploy presale with rejecting token (ops wallet rejection scenario)
  const d3 = await deployPresale({ bhtAddr: await rejecting.getAddress() });
  const presale2 = d3.presale;

  const priceAddr3 = (typeof d3.price.getAddress === 'function') ? await d3.price.getAddress() : (d3.price.address || d3.price.target);
  await presale2.setPriceFeed(priceAddr3);
  await presale2.setMaxPriceStaleness(1000);
  await presale2.setSigner(owner.address);
  await presale2.startPresale();
  await setPriceFresh(d3.price, ethers.parseUnits('1', 8));

    // Mint bht and approve
    await rejecting.mint(buyer.address, ethers.parseUnits('100',18));
  await rejecting.connect(buyer).approve(await presale2.getAddress(), ethers.MaxUint256);

    // Ops wallet currently set to projectWallet which rejects
  await presale2.setOperationsWallet(projectWallet.address);
    await presale2.setDiscountBps(0);
    await presale2.setBurnBps(0);

    // Ensure NFT minted to presale2 (use d3.nft if available)
    const nft3 = d3.nft || nft;
    try {
      await nft3.mint(await presale2.getAddress(), 1, 10);
    } catch (e) {
      try {
        await nft3.mint(await presale2.getAddress(), 1, 10, '0x');
      } catch (e2) {
        await nft3.mint(owner.address, 1, 10);
        await nft3.connect(owner).safeTransferFrom(owner.address, await presale2.getAddress(), 1, 10, '0x');
      }
    }

    const nonce = 2;
    const sig = await signNonce(owner, buyer.address, nonce);

  // ops transfer fails and should revert with Ops transfer failed (contract requires ops transfer success)
  await expect(presale2.connect(buyer).purchaseWithBHT(1, 1, nonce, sig)).to.be.revertedWith('Ops transfer failed');
  });
});
