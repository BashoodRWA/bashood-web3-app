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
    const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const txData = await BashoodPresaleFinal.getDeployTransaction(
      rejecting.target,
      nft.target,
      referral.target,
      projectWallet.address,
      ethers.parseEther('0.1'),
      ethers.parseUnits('10', 18),
      0,0,100
    );
    const tx = await owner.sendTransaction({ data: txData.data });
    const r = await tx.wait();
    const presale2 = await ethers.getContractAt('BashoodPresaleFinal', r.contractAddress);

  // set price, signer, and staleness
  await presale2.setPriceFeed(price.target);
  await presale2.setMaxPriceStaleness(1000);
  await presale2.setSigner(owner.address);
  await presale2.startPresale();
    await setPriceFresh(price, 1);

    // Mint bht and approve
    await rejecting.mint(buyer.address, ethers.parseUnits('100',18));
    await rejecting.connect(buyer).approve(presale2.target, ethers.MaxUint256);

    // Set operations wallet and burn/discount bps
    await presale2.setOperationsWallet(projectWallet.address);
    await presale2.setDiscountBps(0);
    await presale2.setBurnBps(500); // 5%

    // Ensure NFT minted to presale
    await nft.mint(presale2.target, 1, 10);

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

    // deploy presale with rejecting token
    const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const txData = await BashoodPresaleFinal.getDeployTransaction(
      rejecting.target,
      nft.target,
      referral.target,
      projectWallet.address,
      ethers.parseEther('0.1'),
      ethers.parseUnits('10', 18),
      0,0,100
    );
    const tx = await owner.sendTransaction({ data: txData.data });
    const r = await tx.wait();
    const presale2 = await ethers.getContractAt('BashoodPresaleFinal', r.contractAddress);

  await presale2.setPriceFeed(price.target);
  await presale2.setMaxPriceStaleness(1000);
  await presale2.setSigner(owner.address);
  await presale2.startPresale();
    await setPriceFresh(price, 1);

    // Mint bht and approve
    await rejecting.mint(buyer.address, ethers.parseUnits('100',18));
    await rejecting.connect(buyer).approve(presale2.target, ethers.MaxUint256);

    // Ops wallet currently set to projectWallet which rejects
  await presale2.setOperationsWallet(projectWallet.address);
    await presale2.setDiscountBps(0);
    await presale2.setBurnBps(0);

    // Ensure NFT minted to presale
    await nft.mint(presale2.target, 1, 10);

    const nonce = 2;
    const sig = await signNonce(owner, buyer.address, nonce);

    // ops transfer fails and should revert
    await expect(presale2.connect(buyer).purchaseWithBHT(1, 1, nonce, sig)).to.be.revertedWith('Ops transfer failed');
  });
});
