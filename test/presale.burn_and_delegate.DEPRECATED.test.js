const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const deployPresale = (...args) => getPresaleHelpers().deployPresale(...args);
const setPriceFresh = (...args) => getPresaleHelpers().setPriceFresh(...args);

describe('Presale burn fallback and delegate rescue branches', function () {
  it('reverts when burnFrom reverts and transfer to dead returns false', async function () {
    const [owner, projectWallet, buyer] = await ethers.getSigners();

    // Deploy MockBHTReturnFalse and configure rejectTo = dead address
    const MockBHTReturnFalse = await ethers.getContractFactory('contracts/mocks/MockBHTReturnFalse.sol:MockBHTReturnFalse');
    const bht = await MockBHTReturnFalse.deploy('MockBHT', 'MBHT', ethers.ZeroAddress);
    await bht.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  const price = await MockPrice.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
  const referral = await BashoodReferral.deploy(owner.address, owner.address, (typeof nft.getAddress === 'function') ? await nft.getAddress() : (nft.address || nft.target)); await referral.waitForDeployment();

  const d = await deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet });
  const presale = d.presale;

    // configure required params
    await presale.connect(projectWallet).setOperationsWallet(projectWallet.address);
  await presale.connect(projectWallet).setPriceFeed((typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target));
    await presale.connect(projectWallet).setMaxPriceStaleness(1000);
  await setPriceFresh(price, ethers.parseUnits('1', 8));

    // mint & approve
    await bht.mint(buyer.address, ethers.parseUnits('1000', 18));
  await bht.connect(buyer).approve((typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target), ethers.parseUnits('1000', 18));

    // set rejectTo to dead address to make burn fallback transfer fail
    await bht.setRejectTo('0x000000000000000000000000000000000000dEaD');

    // set discount 0 and burnBps > 0 so burnAmount > 0
    await presale.connect(projectWallet).setDiscountBps(0);
    await presale.connect(projectWallet).setBurnBps(100); // 1% burn to ensure burnAmount > 0

    // Try payServiceWithBHT which will attempt burnFrom -> revert -> transferTo dead (returns false) -> expect revert
    const zero32 = '0x' + '0'.repeat(64);
    await expect(
      presale.connect(buyer)['payServiceWithBHT(bytes32,uint256)'](zero32, ethers.parseUnits('10', 18))
    ).to.be.revertedWith('Burn transfer failed');
  });

  it('delegateRescueUnsoldNfts reverts with reason from rescue', async function () {
    const { owner, projectWallet, presale } = await deployPresale();

    const MockRescueWithReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const r = await MockRescueWithReason.deploy(); await r.waitForDeployment();

    // set rescue contract
  await presale.connect(projectWallet).setRescueContract((typeof r.getAddress === 'function') ? await r.getAddress() : (r.address || r.target));

    // attempt delegate -> should bubble reason
    await expect(
      presale.connect(projectWallet).delegateRescueUnsoldNfts(1, owner.address, 1)
    ).to.be.revertedWith('Delegate rescue NFT failed: boom');
  });

  it('delegateEmergencyWithdrawEth reverts with generic message when rescue reverts without reason', async function () {
    const { owner, projectWallet, presale } = await deployPresale();

    const MockRescueNoReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const r = await MockRescueNoReason.deploy(); await r.waitForDeployment();

  await presale.connect(projectWallet).setRescueContract((typeof r.getAddress === 'function') ? await r.getAddress() : (r.address || r.target));

    // grant EMERGENCY_ROLE using the deployer (DEFAULT_ADMIN_ROLE)
    await presale.connect(owner).grantRole(await presale.EMERGENCY_ROLE(), projectWallet.address);

    await expect(
      presale.connect(projectWallet).delegateEmergencyWithdrawEth()
    ).to.be.revertedWith('Delegate rescue ETH failed: Mock rescue reverts');
  });
});






