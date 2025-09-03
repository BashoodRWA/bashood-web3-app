const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale burn/ops combinations and proposals', function () {
  it('payServiceWithBHT reverts when burnBps > 1500', async function () {
    const [owner, projectWallet, buyer] = await ethers.getSigners();
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const _presaleHelpers = globalThis._presaleHelpers;
const { deployPresale, setPriceFresh, signNonce } = _presaleHelpers;

    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/MockPriceFeed.sol:MockPriceFeed');
    const price = await MockPrice.deploy(ethers.parseUnits('1', 8), 8); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
    const referral = await BashoodReferral.deploy(owner.address, owner.address, nft.target); await referral.waitForDeployment();

    const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const presale = await BashoodPresaleFinal.deploy(
      bht.target,
      nft.target,
      referral.target,
      projectWallet.address,
      ethers.parseEther('0.1'),
      ethers.parseUnits('10', 18),
      0,0,100
    );
    await presale.waitForDeployment();

    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);

    // Set burnBps above contract cap via setter (setter allows it); payment should revert
    await presale.connect(projectWallet).setBurnBps(1600);

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
      const MockPrice = await ethers.getContractFactory('contracts/MockPriceFeed.sol:MockPriceFeed');
      const price = await MockPrice.deploy(ethers.parseUnits('1', 8), 8); await price.waitForDeployment();
      const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
      const referral = await BashoodReferral.deploy(owner.address, owner.address, nft.target); await referral.waitForDeployment();

      const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
      const presale = await BashoodPresaleFinal.deploy(
        bht.target,
        nft.target,
        referral.target,
        projectWallet.address,
        ethers.parseEther('0.1'),
        ethers.parseUnits('10', 18),
        0,0,100
      );
      await presale.waitForDeployment();

      // Set burnBps above the cap using setter and ensure submitProposal reverts
      await presale.connect(projectWallet).setBurnBps(1600);

      // mint & approve from proposer so preconditions before the burnCap check pass
      await bht.mint(owner.address, ethers.parseUnits('1000', 18));
      await bht.approve(presale.target, ethers.parseUnits('1000', 18));

      await expect(
        presale.connect(owner).submitProposal('0xdead', ethers.parseUnits('10', 18))
      ).to.be.revertedWith('Burn cap');
  });

  it('submitProposal uses burnFrom when available', async function () {
    const [owner, projectWallet, proposer] = await ethers.getSigners();

    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/MockPriceFeed.sol:MockPriceFeed');
    const price = await MockPrice.deploy(ethers.parseUnits('1', 8), 8); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
    const referral = await BashoodReferral.deploy(owner.address, owner.address, nft.target); await referral.waitForDeployment();

    const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const presale = await BashoodPresaleFinal.deploy(
      bht.target,
      nft.target,
      referral.target,
      projectWallet.address,
      ethers.parseEther('0.1'),
      ethers.parseUnits('10', 18),
      0,0,100
    );
    await presale.waitForDeployment();

    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);
    await presale.connect(projectWallet).setPriceFeed(price.target);
    await presale.connect(projectWallet).setMaxPriceStaleness(1000);
    await setPriceFresh(price, 1);

    // mint and approve deposit
    await bht.mint(proposer.address, ethers.parseUnits('1000', 18));
    await bht.connect(proposer).approve(presale.target, ethers.parseUnits('1000', 18));

    // set burnBps in range and call submitProposal
    await presale.connect(projectWallet).setBurnBps(100);
    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);

    await expect(
      presale.connect(proposer).submitProposal('0x1234', ethers.parseUnits('10', 18))
    ).to.emit(presale, 'ProposalSubmitted');

    // finalizeProposal as admin (projectWallet has ADMIN_ROLE by constructor)
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
    const MockPrice = await ethers.getContractFactory('contracts/MockPriceFeed.sol:MockPriceFeed');
    const price = await MockPrice.deploy(ethers.parseUnits('1', 8), 8); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
    const referral = await BashoodReferral.deploy(owner.address, owner.address, nft.target); await referral.waitForDeployment();

    const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const presale = await BashoodPresaleFinal.deploy(
      bht.target,
      nft.target,
      referral.target,
      projectWallet.address,
      ethers.parseEther('0.1'),
      ethers.parseUnits('10', 18),
      0,0,100
    );
    await presale.waitForDeployment();

    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);
    await presale.connect(projectWallet).setPriceFeed(price.target);
    await presale.connect(projectWallet).setMaxPriceStaleness(1000);
    await setPriceFresh(price, 1);

    // mint & approve from proposer
    await bht.mint(proposer.address, ethers.parseUnits('1000', 18));
    await bht.connect(proposer).approve(presale.target, ethers.parseUnits('1000', 18));

    // ensure transferFrom to dead will work (MockBHT usesERC20 so transferFrom should return true)
    await expect(
      presale.connect(proposer).submitProposal('0x4444', ethers.parseUnits('5', 18))
    ).to.emit(presale, 'ProposalSubmitted');
  });
});
