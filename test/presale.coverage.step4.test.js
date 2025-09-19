if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale coverage step4 (caller & rescue branches)', function () {
  it('purchaseWithBHT should revert when called from contract (tx.origin check)', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();
    // set signer and price
    await presale.connect(owner).setSigner(owner.address);
    await presale.connect(owner).setOperationsWallet(owner.address);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setBurnBps(100);
    await presale.connect(owner).setDiscountBps(0);
  const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target);
  await presale.connect(owner).setPriceFeed(priceAddr);
    await setPriceFresh(price, ethers.parseUnits('1', 8));
    // approve and mint BHT
    await bht.mint(buyer.address, ethers.parseUnits('1000', 18));
  const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target);
  await bht.connect(buyer).approve(presaleAddr, ethers.parseUnits('1000', 18));

  // prepare signature
  const nonce = 1;
  const sig = signNonce(owner, buyer.address, nonce);

  // start presale (owner has ADMIN_ROLE by default)
  await presale.connect(owner).startPresale();

  // deploy a Caller contract and call purchaseWithBHT through it
    const Caller = await ethers.getContractFactory('contracts/mocks/Caller.sol:Caller');
    const caller = await Caller.deploy();
    await caller.waitForDeployment();

  // mint and approve BHT to the caller contract so allowance checks can pass if executed
  const callerAddr = (typeof caller.getAddress === 'function') ? await caller.getAddress() : (caller.address || caller.target);
  const bhtAddr = (typeof bht.getAddress === 'function') ? await bht.getAddress() : (bht.address || bht.target);
  await bht.mint(callerAddr, ethers.parseUnits('1000', 18));
    await caller.approveToken(bhtAddr, presaleAddr, ethers.parseUnits('1000', 18));

    await expect(
      caller.callPurchaseWithBHT(presaleAddr, 1, 1, nonce, sig)
    ).to.be.revertedWith('E19'); // msg.sender == tx.origin check
  });

  it('purchaseWithBHT should revert when msg.sender == signerAddress (E22)', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();
    // set signer to buyer so the require(msg.sender != signerAddress) fails
  await presale.connect(owner).setSigner(buyer.address);
    await presale.connect(owner).setOperationsWallet(owner.address);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setBurnBps(100);
    await presale.connect(owner).setDiscountBps(0);
  const priceAddr2 = (typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target);
  await presale.connect(owner).setPriceFeed(priceAddr2);
    await setPriceFresh(price, ethers.parseUnits('1', 8));

    const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target);
    await bht.mint(buyer.address, ethers.parseUnits('1000', 18));
  await bht.connect(buyer).approve(presaleAddr, ethers.parseUnits('1000', 18));

    const nonce = 2;
    const sig = signNonce(owner, buyer.address, nonce);

    // start presale and mint/approve funds
    await presale.connect(owner).startPresale();
  await bht.mint(buyer.address, ethers.parseUnits('1000', 18));
  await bht.connect(buyer).approve(presaleAddr, ethers.parseUnits('1000', 18));

    await expect(
      presale.connect(buyer).purchaseWithBHT(1,1,nonce,sig)
    ).to.be.revertedWith('E22');
  });

  it('rescueUnsoldNFTs should bubble Error(reason) from rescue (with reason)', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price } = await deployPresale();
    const MockWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const mockWith = await MockWith.deploy();
    await mockWith.waitForDeployment();

    // set rescue contract and attempt rescue
  const mockWithAddr = (typeof mockWith.getAddress === 'function') ? await mockWith.getAddress() : (mockWith.address || mockWith.target);
  await presale.connect(owner).setRescueContract(mockWithAddr);

    await expect(
      presale.connect(owner).rescueUnsoldNFTs(1, owner.address, 1)
    ).to.be.revertedWith('Rescue NFT failed: boom');

    await expect(
      presale.connect(owner).rescueERC20(bht.target, owner.address, 1)
    ).to.be.revertedWith('Rescue ERC20 failed: erc20-boom');

    await expect(
      presale.connect(owner).emergencyWithdrawETH()
    ).to.be.revertedWith('Rescue ETH failed: eth-boom');
  });

  it('rescueUnsoldNFTs should bubble no-reason revert from rescue (no reason)', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price } = await deployPresale();
    const MockNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const mockNo = await MockNo.deploy();
    await mockNo.waitForDeployment();

  const mockNoAddr = (typeof mockNo.getAddress === 'function') ? await mockNo.getAddress() : (mockNo.address || mockNo.target);
  await presale.connect(owner).setRescueContract(mockNoAddr);

    await expect(
      presale.connect(owner).rescueUnsoldNFTs(1, owner.address, 1)
    ).to.be.revertedWith('Rescue NFT failed');

    await expect(
      presale.connect(owner).rescueERC20(bht.target, owner.address, 1)
    ).to.be.revertedWith('Rescue ERC20 failed');

    await expect(
      presale.connect(owner).emergencyWithdrawETH()
    ).to.be.revertedWith('Rescue ETH failed');
  });
});
