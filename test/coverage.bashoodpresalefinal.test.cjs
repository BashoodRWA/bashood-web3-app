const { expect } = require('chai');
const hh = require('hardhat');
const ethers = hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh } = getPresaleHelpers();

describe('Coverage: BashoodPresaleFinal extra focused tests', function () {
  it('submitProposal: burns via fallback transferFrom when burnFrom not available', async function () {
    const [owner, alice, project] = await ethers.getSigners();

    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();

    const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    const priceFeed = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await priceFeed.waitForDeployment();

    const Referral = await ethers.getContractFactory('BashoodReferral');
    const referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();

    const helpers = await deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: project.address });
    const presale = helpers.presale;

    // configure minimal prerequisites
    await presale.setPriceFeed(await priceFeed.getAddress());
    await presale.setMaxPriceStaleness(1000);
    await presale.setOperationsWallet(project.address);
    await presale.setBurnBps(0);
    await presale.setDiscountBps(0);
    await presale.setSigner(owner.address);
    await presale.startPresale();

    // prepare alice funds and allowance for fallback transferFrom
    const deposit = ethers.parseEther('1');
    await bht.mint(alice.address, deposit);
    await bht.connect(alice).approve(await presale.getAddress(), deposit);

    // ensure priceFeed fresh
    await setPriceFresh(priceFeed, ethers.parseUnits('1', 8));

    await expect(presale.connect(alice).submitProposal('0x1234', deposit))
      .to.emit(presale, 'ProposalSubmitted');
  });

  it('submitProposal: reverts when price is stale', async function () {
    const [owner, alice, project] = await ethers.getSigners();
    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    // create a price feed with an old timestamp
    const oldAnswer = ethers.parseUnits('1', 8);
    const priceFeed = await MockPrice.deploy(8, oldAnswer); await priceFeed.waitForDeployment();

    const Referral = await ethers.getContractFactory('BashoodReferral');
    const referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();

    const helpers = await deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: project.address });
    const presale = helpers.presale;

    // set tiny staleness so price is considered stale
    await presale.setPriceFeed(await priceFeed.getAddress());
    await presale.setMaxPriceStaleness(1);
    await presale.setOperationsWallet(project.address);
    await presale.setSigner(owner.address);
    await presale.startPresale();

    // mint and approve alice
    await bht.mint(alice.address, ethers.parseEther('1'));
    await bht.connect(alice).approve(await presale.getAddress(), ethers.parseEther('1'));

    await expect(presale.connect(alice).submitProposal('0x1234', ethers.parseEther('1'))).to.be.revertedWith('Oracle: Invalid/stale');
  });

  it('payServiceWithBHT: handles burn and ops transfers (fallback burn path)', async function () {
    const [owner, alice, project] = await ethers.getSigners();
    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    const priceFeed = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await priceFeed.waitForDeployment();
    const Referral = await ethers.getContractFactory('BashoodReferral');
    const referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();

    const helpers = await deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: project.address });
    const presale = helpers.presale;

    await presale.setPriceFeed(await priceFeed.getAddress());
    await presale.setMaxPriceStaleness(1000);
    await presale.setOperationsWallet(project.address);
    // set some burn and discount so burnAmount > 0
    await presale.setDiscountBps(1000); // 10% discount
    await presale.setBurnBps(500); // 5% burn
    await presale.setSigner(owner.address);

    // mint and approve alice sufficient BHT
    await bht.mint(alice.address, ethers.parseEther('10'));
    await bht.connect(alice).approve(await presale.getAddress(), ethers.parseEther('10'));

    // call payServiceWithBHT numeric overload (disambiguate overloaded methods)
    await expect(presale.connect(alice)["payServiceWithBHT(uint256,uint256)"](1, ethers.parseEther('1')))
      .to.emit(presale, 'ServicePaid');
  });

  it('delegate rescue: handles success and revert-with-reason and revert-without-reason', async function () {
    const [owner, alice, project] = await ethers.getSigners();
    const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    const bht = await MockBHT.deploy(); await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();

  const MockRescueRecorder = await ethers.getContractFactory('contracts/mocks/MockRescueRecorder.sol:MockRescueRecorder');
  const mockRescue = await MockRescueRecorder.deploy(); await mockRescue.waitForDeployment();
  const MockRescueWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
  const mockRescueWith = await MockRescueWith.deploy(); await mockRescueWith.waitForDeployment();
  const MockRescueNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
  const mockRescueNo = await MockRescueNo.deploy(); await mockRescueNo.waitForDeployment();

    const Referral = await ethers.getContractFactory('BashoodReferral');
    const referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();
    const helpers = await deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: project.address });
    const presale = helpers.presale;

  // set rescue to happy mock (recorder) and call delegate (should succeed)
  await presale.setRescueContract(await mockRescue.getAddress());
  await expect(presale.delegateRescueUnsoldNfts(1, alice.address, 1)).to.not.be.reverted;

    // set rescue to one that reverts with reason
  await presale.setRescueContract(await mockRescueWith.getAddress());
  await expect(presale.delegateRescueUnsoldNfts(1, alice.address, 1)).to.be.revertedWith('Delegate rescue NFT failed: boom');

    // set rescue to one that reverts without reason
    await presale.setRescueContract(await mockRescueNo.getAddress());
    await expect(presale.delegateRescueUnsoldNfts(1, alice.address, 1)).to.be.revertedWith('Delegate rescue NFT failed: Mock rescue reverts');
  });
});








