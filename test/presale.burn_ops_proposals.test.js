const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale burn/ops combinations and proposals', function () {
  it('payServiceWithBHT reverts when burnBps > 1500', async function () {
    const [owner, projectWallet, buyer] = await ethers.getSigners();
    const helpers = getPresaleHelpers();
    const d = await helpers.deployPresale();
    const presale = d.presale;
    // deploy a MockBHTWithBurn and set scenario
    const MockBHTWithBurn = await ethers.getContractFactory('contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn');
    const bht = await MockBHTWithBurn.deploy(); await bht.waitForDeployment();
  // mint/approve so the call reaches the burn cap check instead of 'Allowance'
  await bht.mint(buyer.address, ethers.parseUnits('1000', 18));
  await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits('1000', 18));
  await presale.connect(d.owner).setOperationsWallet(d.owner.address);
  await presale.connect(d.owner).setBurnBps(1600);
    const zero32 = '0x' + '0'.repeat(64);
    await expect(
      presale.connect(buyer)['payServiceWithBHT(bytes32,uint256)'](zero32, ethers.parseUnits('1', 18))
    ).to.be.revertedWith('Burn cap');
  });

  it('setBurnBps enforces burn cap (<=1500)', async function () {
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
    // ensure submitter has funds and approved so burn cap check is reached
    await bht.mint(owner.address, ethers.parseUnits('1000', 18));
    await bht.connect(owner).approve(await presale.getAddress(), ethers.parseUnits('1000', 18));
    await presale.connect(projectWallet).setBurnBps(1600);
    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);
    await expect(
      presale.connect(owner).submitProposal('0xdead', ethers.parseUnits('10', 18))
    ).to.be.revertedWith('Burn cap');
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






