const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { setPriceFresh } = getPresaleHelpers();

describe('Presale coverage edge branches', function () {
  it('submitProposal reverts when operationsWallet not set (Ops wallet req)', async function () {
    const [owner, projectWallet, proposer] = await ethers.getSigners();

    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
  const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    // MockPriceFeed constructor expects (int256 initialAnswer, uint8 decimals_)
  const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
  const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
  const referral = await BashoodReferral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();

  // Use shared deploy helper for presale to avoid passing artifact.target objects
  const helpers = require('./helpers/presaleHelpers');
  const d = await helpers.deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: projectWallet.address });
  const presale = d.presale;

    // Configure oracle so submitProposal reaches Ops wallet check
  await presale.connect(projectWallet).setPriceFeed((typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target));
    await presale.connect(projectWallet).setMaxPriceStaleness(1000);
  await setPriceFresh(price, ethers.parseUnits('1', 8));

    // Ensure proposer has tokens & allowance
    await bht.mint(proposer.address, ethers.parseUnits('1000', 18));
  await bht.connect(proposer).approve((typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target), ethers.parseUnits('1000', 18));

    // Ensure burnBps within cap so ops wallet check is reached
    await presale.connect(projectWallet).setBurnBps(100);

    await expect(
      presale.connect(proposer).submitProposal('0xfeed', ethers.parseUnits('10', 18))
    ).to.be.revertedWith('Ops wallet req');
  });

  it('delegateRescueErc20 bubbles revert reason and generic when rescue reverts without reason', async function () {
    const [owner, projectWallet] = await ethers.getSigners();

    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
  const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    // MockPriceFeed constructor expects (int256 initialAnswer, uint8 decimals_)
  const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
  const referral = await BashoodReferral.deploy(owner.address, owner.address, (typeof nft.getAddress === 'function') ? await nft.getAddress() : (nft.address || nft.target)); await referral.waitForDeployment();

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

    // Deploy a rescue mock that reverts with reason
    const MockRescueWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const rescueWith = await MockRescueWith.deploy(); await rescueWith.waitForDeployment();
    // Deploy a rescue mock that reverts with no reason
    const MockRescueNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const rescueNo = await MockRescueNo.deploy(); await rescueNo.waitForDeployment();

    // Both mocks implement supportsInterface in the mock; set them and expect delegation failures bubble
  await presale.connect(projectWallet).setRescueContract((typeof rescueWith.getAddress === 'function') ? await rescueWith.getAddress() : (rescueWith.address || rescueWith.target));
    await expect(
      presale.connect(projectWallet).delegateRescueErc20(bht.target, projectWallet.address, 1)
    ).to.be.revertedWith('Delegate rescue ERC20 failed: erc20-boom');

    // Now set no-reason revert mock
  await presale.connect(projectWallet).setRescueContract((typeof rescueNo.getAddress === 'function') ? await rescueNo.getAddress() : (rescueNo.address || rescueNo.target));
    await expect(
      presale.connect(projectWallet).delegateRescueErc20(bht.target, projectWallet.address, 1)
    ).to.be.reverted; // generic revert expected
  });
});






