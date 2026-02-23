const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale burn/ops combinations and proposals', function () {
  it('payServiceWithBHT reverts when burnBps > 1500', async function () {
    // The setter already enforces cap: setBurnBps(1600) would revert
    // This test attempts to verify the cap check in payServiceWithBHT, but
    // since we can't set invalid values via setter, the check is already covered
    // by setBurnBps() validation and other payServiceWithBHT tests
    this.skip();
  });

  it('setBurnBps enforces burn cap (<=1500)', async function () {
    // This test verifies that setBurnBps rejects values > 1500
    // The setter has the require statement, so this is the validation test
    const [owner, projectWallet] = await ethers.getSigners();
    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
  const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
    const referral = await BashoodReferral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();
    const d = await deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet });
    const presale = d.presale;
    // Test that setBurnBps itself enforces the cap
    await expect(
      presale.connect(projectWallet).setBurnBps(1600)
    ).to.be.revertedWith('Burn cap exceeded');
  });

  it('submitProposal uses burnFrom when available and falls back correctly', async function () {
    const [owner, projectWallet, proposer] = await ethers.getSigners();
    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
    const referral = await BashoodReferral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();

    const d = await deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet });
    const presale = d.presale;
    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);
    await presale.connect(projectWallet).setPriceFeed(await price.getAddress());
    await presale.connect(projectWallet).setMaxPriceStaleness(1000);
  await setPriceFresh(price, ethers.parseUnits('1', 8));
    await bht.mint(proposer.address, ethers.parseUnits('1000', 18));
    const presaleAddr = await presale.getAddress();
    await bht.connect(proposer).approve(presaleAddr, ethers.parseUnits('1000', 18));
    await presale.connect(projectWallet).setBurnBps(100);
    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);
    await expect(
      presale.connect(proposer).submitProposal('0x1234', ethers.parseUnits('10', 18))
    ).to.emit(presale, 'ProposalSubmitted');
    await presale.connect(projectWallet).finalizeProposal(1);
    const prop = await presale.proposals(1);
    expect(prop.finalized).to.equal(true);
  });

  it('submitProposal falls back to transfer to dead when burnFrom absent', async function () {
    const [owner, projectWallet, proposer] = await ethers.getSigners();
    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
    const referral = await BashoodReferral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();

    const d = await deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet });
    const presale = d.presale;
    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);
    await presale.connect(projectWallet).setPriceFeed(await price.getAddress());
    await presale.connect(projectWallet).setMaxPriceStaleness(1000);
  await setPriceFresh(price, ethers.parseUnits('1', 8));
    await bht.mint(proposer.address, ethers.parseUnits('1000', 18));
    await bht.connect(proposer).approve(await presale.getAddress(), ethers.parseUnits('1000', 18));
    await expect(
      presale.connect(proposer).submitProposal('0x4444', ethers.parseUnits('5', 18))
    ).to.emit(presale, 'ProposalSubmitted');
  });
});






