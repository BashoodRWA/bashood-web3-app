const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const _ph = getPresaleHelpers();
const deployPresale = _ph.deployPresale;
const setPriceFresh = _ph.setPriceFresh;
const signNonce = _ph.signNonce;

describe('Presale targeted branches', function () {
  let owner, projectWallet, buyer;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [owner, projectWallet, buyer] = signers;
  });

  it('reverts when operations transferFrom returns false (payServiceWithBHT)', async function () {

    // Deploy MockBHTReturnFalse as BHT and set rejectTo = operationsWallet later
    const MockBHTReturnFalse = await ethers.getContractFactory('contracts/mocks/MockBHTReturnFalse.sol:MockBHTReturnFalse');
    const bht = await MockBHTReturnFalse.deploy('MockBHT', 'MBHT', ethers.ZeroAddress);
    await bht.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
  const referral = await BashoodReferral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();

  // Use centralized helper to deploy presale (normalizes addresses and avoids constructor-arg mistakes)
  const helpers = require('./helpers/presaleHelpers');
  const d = await helpers.deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: projectWallet.address });
  const presale = d.presale;

    // Configure presale params
    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);
  await presale.connect(projectWallet).setPriceFeed(await price.getAddress());
    await presale.connect(projectWallet).setMaxPriceStaleness(1000);

  // Make price fresh (1 with 8 decimals)
  await setPriceFresh(price, ethers.parseUnits('1', 8));

    // mint BHT to buyer and approve presale
    await bht.mint(buyer.address, ethers.parseUnits('1000', 18));
  await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits('1000', 18));

    // Set rejectTo to operationsWallet so transferFrom to ops will return false
    await bht.setRejectTo(projectWallet.address);

    // Set burn/discount so opsAmount > 0 and burnAmount == 0
    await presale.connect(projectWallet).setDiscountBps(0); // no discount
    await presale.connect(projectWallet).setBurnBps(0); // burn 0 -> opsAmount = full amount

    // Attempt to pay service, expecting revert due to ops transfer false
  const svcId = '0x' + Buffer.from('svc1').toString('hex').padEnd(64, '0');
    await expect(
      presale.connect(buyer)['payServiceWithBHT(bytes32,uint256)'](svcId, ethers.parseUnits('10', 18))
    ).to.be.revertedWith('Ops transfer failed');
  });

  it('purchaseWithBHT reverts when ops transfer returns false in _transferAndBurnBHT', async function () {

    // Deploy MockBHTReturnFalse, price, nft and referral
    const MockBHTReturnFalse = await ethers.getContractFactory('contracts/mocks/MockBHTReturnFalse.sol:MockBHTReturnFalse');
    const bht = await MockBHTReturnFalse.deploy('MockBHT', 'MBHT', ethers.ZeroAddress);
    await bht.waitForDeployment();
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
  const referral = await BashoodReferral.deploy(owner.address, owner.address, await nft.getAddress()); await referral.waitForDeployment();

  // Use helper to deploy presale reliably
  const helpers2 = require('./helpers/presaleHelpers');
  const d2 = await helpers2.deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: projectWallet.address });
  const presale2 = d2.presale;

    // configure
    await presale2.connect(projectWallet).setOperationsWallet(projectWallet.address);
  await presale2.connect(projectWallet).setPriceFeed(await price.getAddress());
    await presale2.connect(projectWallet).setMaxPriceStaleness(1000);
  await setPriceFresh(price, ethers.parseUnits('1', 8));

    // fund buyer and approve
    await bht.mint(buyer.address, ethers.parseUnits('1000', 18));
  await bht.connect(buyer).approve(await presale2.getAddress(), ethers.parseUnits('1000', 18));

    // Put the ops rejection on projectWallet to make transferFrom return false
    await bht.setRejectTo(projectWallet.address);

    // Ensure allowed nft and presale active
  await nft.mint(await presale2.getAddress(), 1, 10);
  await presale2.connect(projectWallet).startPresale();
    // set signer and sign nonce
    await presale2.connect(projectWallet).setSigner(projectWallet.address);
    const nonce = 1;
    const sig = await signNonce(projectWallet, buyer.address, nonce);

  // set discount 0 and burn 0 so opsAmount > 0
  await presale2.connect(projectWallet).setDiscountBps(0);
  await presale2.connect(projectWallet).setBurnBps(0);

    // attempt purchaseWithBHT -> should revert due to ops transfer false
    await expect(
      presale2.connect(buyer).purchaseWithBHT(1, 1, nonce, sig)
    ).to.be.revertedWith('Ops transfer failed');
  });
});






