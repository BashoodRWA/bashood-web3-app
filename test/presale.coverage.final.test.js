if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('BashoodPresaleFinal - targeted coverage', function () {
  this.timeout(200000);

  it('submitProposal: reverts when price is stale and when deposit is zero', async () => {
    const [owner, projectWallet] = await ethers.getSigners();
    const { presale, bht, nft, price, referral } = await deployPresale();

    // configure price feed and staleness
  await presale.setPriceFeed(await price.getAddress());
    await presale.setMaxPriceStaleness(1);
    // make price stale by setting updatedAt in the past (use helper then stale it)
  await setPriceFresh(price, ethers.parseUnits('1', 8));
    const block = await ethers.provider.getBlock('latest');
    await price.setUpdatedAt(block.timestamp - 1000);

  // approve enough allowance
  await bht.approve(await presale.getAddress(), ethers.parseUnits('1', 18));

    // deposit zero should revert early
    await expect(presale.submitProposal('0x', 0)).to.be.revertedWith('Deposit req');

    // operationsWallet required; set it so we reach oracle stale check
    await presale.setOperationsWallet(projectWallet.address);

    // now stale price should revert
    await expect(presale.submitProposal('0x', ethers.parseUnits('1', 18))).to.be.revertedWith('Oracle: Invalid/stale');
  });

  it('assignRoles rejects zero addresses and grants roles on success', async () => {
    const { owner, projectWallet, presale } = await deployPresale();

    // E1: admin zero
    await expect(presale.assignRoles(ethers.ZeroAddress, projectWallet.address, owner.address)).to.be.revertedWith('E1');
    // E2: emergency zero
    await expect(presale.assignRoles(owner.address, ethers.ZeroAddress, owner.address)).to.be.revertedWith('E2');
    // E3: whitelist zero
    await expect(presale.assignRoles(owner.address, projectWallet.address, ethers.ZeroAddress)).to.be.revertedWith('E3');

    // success path: grant roles
    await presale.assignRoles(owner.address, projectWallet.address, owner.address);
    // now projectWallet should be able to do admin tasks if it has ADMIN_ROLE
    // setOperationsWallet call from owner (already admin) as sanity
    await presale.setOperationsWallet(projectWallet.address);
  });

  it('pause/unpause and finalizePresale emit expected behavior', async () => {
    const { owner, presale } = await deployPresale();

    // pause then unpause
    await presale.pause();
    await presale.unpause();

    // finalize presale emits event
    await expect(presale.finalizePresale()).to.emit(presale, 'PresaleFinalized');
  });

  it('payServiceWithBHT: fails on ops wallet unset and on zero fiat; and payMilestone burn fallback', async () => {
    const [owner, projectWallet] = await ethers.getSigners();
    // deploy presale with a rejecting BHT mock to test burn fallback + ops transfer behavior
    const { presale, bht, nft, price, referral } = await deployPresale({
      bhtFactory: 'contracts/mocks/MockBHTRejecting.sol:MockBHTRejecting',
      bhtArgs: ['MockBHTRejecting', 'mBHTR', owner.address]
    });

    // With operationsWallet unset, this should revert on Ops wallet req
    await expect(
      presale['payServiceWithBHT(bytes32,uint256)'](ethers.hexlify(ethers.randomBytes(32)), ethers.parseUnits('1', 18))
    ).to.be.revertedWith('Ops wallet req');

    // set operations wallet and price feed, staleness
    await presale.setOperationsWallet(projectWallet.address);
  await presale.setPriceFeed(await price.getAddress());
    await presale.setMaxPriceStaleness(10000);
    await setPriceFresh(price, ethers.parseUnits('1', 8));

    // zero fiat -> E21
    await expect(
      presale['payServiceWithBHT(bytes32,uint256)'](ethers.hexlify(ethers.randomBytes(32)), 0)
    ).to.be.revertedWith('E21');

    // payMilestone with burn fallback: configure bht so burnFrom will revert, but transferFrom will work
    // approve sufficient allowance
    await bht.mint(owner.address, ethers.parseUnits('100', 18));
  await bht.approve(await presale.getAddress(), ethers.parseUnits('100', 18));
    // execute milestone payment (should attempt burn and fallback)
    await presale.payMilestoneWithBHT(1, ethers.parseUnits('1', 18));
  });

  it('rescue functions bubble reason and generic catch', async () => {
    const { owner, presale } = await deployPresale();
    const MockRescueWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const MockRescueNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');

    const mrw = await MockRescueWith.deploy();
    await mrw.waitForDeployment();
    const mrn = await MockRescueNo.deploy();
    await mrn.waitForDeployment();

    // set rescue to one that reverts with reason
  await presale.setRescueContract(await mrw.getAddress());
  await expect(presale.rescueUnsoldNFTs(1, owner.address, 1)).to.be.revertedWith('Rescue NFT failed: boom');
  await expect(presale.rescueERC20(owner.address, owner.address, 1)).to.be.revertedWith('Rescue ERC20 failed: erc20-boom');

    // set rescue to one that reverts without reason
  await presale.setRescueContract(await mrn.getAddress());
    await expect(presale.rescueUnsoldNFTs(1, owner.address, 1)).to.be.revertedWith('Rescue NFT failed: Mock rescue reverts');
    await expect(presale.rescueERC20(owner.address, owner.address, 1)).to.be.revertedWith('Rescue ERC20 failed: Mock rescue reverts');
  });
});








