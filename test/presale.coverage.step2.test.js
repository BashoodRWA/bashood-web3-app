if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('BashoodPresaleFinal — extra coverage step2', function () {
  this.timeout(200000);

  it('submitProposal: reverts when deposit is zero', async () => {
    const { presale, owner } = await deployPresale();
    // submitProposal(bytes data, uint256 depositBHT)
    await expect(presale.connect(owner).submitProposal('0x', 0)).to.be.revertedWith('Deposit req');
  });

  it('submitProposal: reverts when oracle stale', async () => {
    const { presale, price, owner, bht, projectWallet } = await deployPresale();
    // configure admin-required deps
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setPriceFeed(price.target);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    // ensure price updatedAt is stale
    await price.setUpdatedAt(1);
    // mint and approve so allowance check passes
    const deposit = ethers.parseUnits('1', 18);
    await bht.mint(owner.address, deposit);
    await bht.connect(owner).approve(presale.target, deposit);
    await expect(presale.connect(owner).submitProposal('0x', deposit)).to.be.revertedWith('Price too stale');
  });

  it('assignRoles: rejects zero addresses and accepts valid set', async () => {
    const { presale, owner, projectWallet } = await deployPresale();
    await expect(presale.connect(owner).assignRoles(ethers.ZeroAddress, projectWallet.address, projectWallet.address)).to.be.revertedWith('E1');
    await expect(presale.connect(owner).assignRoles(projectWallet.address, ethers.ZeroAddress, projectWallet.address)).to.be.revertedWith('E2');
    await expect(presale.connect(owner).assignRoles(projectWallet.address, projectWallet.address, projectWallet.address)).to.not.be.reverted;
  });

  it('payServiceWithBHT: operations wallet unset -> revert', async () => {
    const { presale, owner, price, bht } = await deployPresale();
    // configure price so _bhtFromFiat will run until ops wallet check
    await presale.connect(owner).setPriceFeed(price.target);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await setPriceFresh(price, ethers.parseUnits('1', 8));
    // call numeric overload to avoid bytes32 issues
  await expect(presale.connect(owner)['payServiceWithBHT(uint256,uint256)'](1, 1)).to.be.revertedWith('Ops wallet req');
  });

  it('payServiceWithBHT: fiat zero -> revert', async () => {
    const { presale, owner, projectWallet, price } = await deployPresale();
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setPriceFeed(price.target);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await setPriceFresh(price, ethers.parseUnits('1', 8));
  await expect(presale.connect(owner)['payServiceWithBHT(uint256,uint256)'](1, 0)).to.be.revertedWith('E21');
  });

  it('payServiceWithBHT: transferFrom reverting mock -> bubbled revert', async () => {
    // deploy presale with rejecting BHT mock; set rejectTo after deploy
    const { owner, projectWallet, presale, bht, price } = await deployPresale({ bhtFactory: 'contracts/mocks/MockBHTRejecting.sol:MockBHTRejecting', bhtArgs: ['Reject','RJT', ethers.ZeroAddress] });
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).setPriceFeed(price.target);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await setPriceFresh(price, ethers.parseUnits('1', 8));
    // configure token to reject ops wallet
    await bht.setRejectTo(projectWallet.address);
    // mint and approve for owner so transferFrom will attempt to send to ops wallet which rejects
    await bht.mint(owner.address, ethers.parseUnits('100', 18));
    await bht.connect(owner).approve(presale.target, ethers.parseUnits('100', 18));
  await expect(presale.connect(owner)['payServiceWithBHT(uint256,uint256)'](1, 1)).to.be.revertedWith('recipient rejects');
  });

  it('rescue wrapper: revert-with-reason caught path', async () => {
    const { presale, owner } = await deployPresale();
    const MockRescue = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const mr = await MockRescue.deploy();
    await mr.waitForDeployment();
    await presale.connect(owner).setRescueContract(mr.target);
    // delegateRescueUnsoldNfts(uint256 nftId, address to, uint256 amount)
    await expect(presale.connect(owner).delegateRescueUnsoldNfts(1, owner.address, 1)).to.be.revertedWith('Delegate rescue NFT failed: boom');
  });

  it('rescue wrapper: revert-without-reason caught path', async () => {
    const { presale, owner } = await deployPresale();
    const MockRescue = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const mr = await MockRescue.deploy();
    await mr.waitForDeployment();
    await presale.connect(owner).setRescueContract(mr.target);
  // use a real token address so the function proceeds to call the rescue contract
  const MockERC20 = await ethers.getContractFactory('contracts/MockERC20.sol:MockERC20');
  const token = await MockERC20.deploy();
  await token.waitForDeployment();
  // delegateRescueErc20(address tokenAddress, address to, uint256 amount)
  await expect(presale.connect(owner).delegateRescueErc20(token.target, owner.address, 1)).to.be.revertedWith('Delegate rescue ERC20 failed');
  });

});
