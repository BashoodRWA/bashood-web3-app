if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const presaleHelpers = getPresaleHelpers();

describe('Presale: ETH transfer failure and rescue delegation', function () {
  it('reverts when project wallet rejects ETH', async function () {
    const [deployer] = await ethers.getSigners();
  // Deploy a MockProjectWalletRevertCaller and use it as projectWallet in a fresh presale deploy
  const MockRevertCaller = await ethers.getContractFactory('contracts/mocks/MockProjectWalletRevertCallerPresale.sol:MockProjectWalletRevertCallerPresale');
  const rejecting = await MockRevertCaller.deploy();
  await rejecting.waitForDeployment();

    const MockBashoodToken = await ethers.getContractFactory('contracts/MockBashoodToken.sol:MockBashoodToken');
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
  const MockPriceFeed = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
    const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');

    const bht = await MockBashoodToken.deploy(); await bht.waitForDeployment();
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
  // constructor(initialAnswer, decimals)
  const price = await MockPriceFeed.deploy(8, ethers.parseUnits('1', 8)); await price.waitForDeployment();
  const referral = await BashoodReferral.deploy(deployer.address, deployer.address, await nft.getAddress()); await referral.waitForDeployment();

  // Deploy presale via helper with rejecting projectWallet address to avoid
  // passing artifact `.target` fields into the constructor directly.
  const d = await presaleHelpers.deployPresale({ bhtAddr: await bht.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: await rejecting.getAddress() });
  const presale = d.presale;

    // Configure presale
  await presale.setSigner(deployer.address);
  await presale.setOperationsWallet(deployer.address);
  await presale.setPriceFeed(await price.getAddress());
    await presale.setMaxPriceStaleness(3600);
    await presale.startPresale();

  // Fund contract with an NFT (defensivo)
  const presaleAddr = await presale.getAddress();
  try { await nft.mint(presaleAddr, 1, 1); } catch (e) { /* ignore if already minted */ }

    // Sign and attempt purchaseWithETH
    const buyer = (await ethers.getSigners())[1];
  const sig = await presaleHelpers.signNonce(deployer, buyer.address, 1);

    const nftPrice = await presale.nftPriceETH();
    // With pull-payment the purchase should succeed (funds are scheduled). Verify pendingWithdrawals recorded.
    await presale.connect(buyer).purchaseWithETH(1, 1, 1, sig, { value: nftPrice });
    const pending = await presale.pendingWithdrawals(await rejecting.getAddress());
    expect(pending).to.be.gt(0);

    // attempt to claim via the rejecting contract: this should revert with transfer-failed
    await expect(rejecting.doClaim(await presale.getAddress()))
      .to.be.revertedWith('Claim transfer failed');
  });

  it('rescue delegates bubble Error(reason) and generic revert appropriately', async function () {
  const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await presaleHelpers.deployPresale();

    // Deploy both rescue mocks
    const MockRescueWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const MockRescueNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const withMock = await MockRescueWith.deploy(); await withMock.waitForDeployment();
    const noMock = await MockRescueNo.deploy(); await noMock.waitForDeployment();

    // Assign rescue contract that reverts with reason
  await presale.grantRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address);
  await presale.setRescueContract(await withMock.getAddress());

    // Try rescueUnsoldNFTs -> should revert with concatenated message
  await expect(presale.rescueUnsoldNFTs(1, owner.address, 1)).to.be.revertedWith('Rescue NFT failed: boom');

    // set no-reason mock and expect generic revert
  await presale.setRescueContract(await noMock.getAddress());
  await expect(presale.rescueERC20(await bht.getAddress(), owner.address, 1)).to.be.revertedWith('Rescue ERC20 failed: Mock rescue reverts');

    // emergency withdraw with both mocks
  await presale.setRescueContract(await withMock.getAddress());
  await expect(presale.emergencyWithdrawETH()).to.be.revertedWith('Rescue ETH failed: eth-boom');

  await presale.setRescueContract(await noMock.getAddress());
    await expect(presale.emergencyWithdrawETH()).to.be.revertedWith('Rescue ETH failed: Mock rescue reverts');
  });
});






