if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const presaleHelpers = globalThis._presaleHelpers;

describe('Presale: ETH transfer failure and rescue delegation', function () {
  it('reverts when project wallet rejects ETH', async function () {
    const [deployer] = await ethers.getSigners();
    // Deploy a RejectingWallet and use it as projectWallet in a fresh presale deploy
    const RejectingWallet = await ethers.getContractFactory('contracts/mocks/RejectingWallet.sol:RejectingWallet');
    const rejecting = await RejectingWallet.deploy();
    await rejecting.waitForDeployment();

    const MockBashoodToken = await ethers.getContractFactory('contracts/MockBashoodToken.sol:MockBashoodToken');
    const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const MockPriceFeed = await ethers.getContractFactory('contracts/MockPriceFeed.sol:MockPriceFeed');
    const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');
    const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');

    const bht = await MockBashoodToken.deploy(); await bht.waitForDeployment();
    const nft = await MockNFT.deploy(); await nft.waitForDeployment();
    const price = await MockPriceFeed.deploy(ethers.parseUnits('1', 8), 8); await price.waitForDeployment();
    const referral = await BashoodReferral.deploy(deployer.address, deployer.address, nft.target); await referral.waitForDeployment();

    // Deploy presale with rejecting projectWallet
    const presale = await BashoodPresaleFinal.deploy(
      bht.target,
      nft.target,
      referral.target,
      rejecting.target,
      ethers.parseEther('0.01'),
      ethers.parseUnits('1', 18),
      0,0,100
    );
    await presale.waitForDeployment();

    // Configure presale
    await presale.setSigner(deployer.address);
    await presale.setOperationsWallet(deployer.address);
    await presale.setPriceFeed(price.target);
    await presale.setMaxPriceStaleness(3600);
    await presale.startPresale();

    // Fund contract with an NFT
    await nft.mint(presale.target, 1, 1);

    // Sign and attempt purchaseWithETH
    const buyer = (await ethers.getSigners())[1];
    const sig = signNonce(deployer, buyer.address, 1);

    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 1, sig, { value: ethers.parseEther('0.01') })
    ).to.be.revertedWith('ETH transfer failed');
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
    await presale.setRescueContract(withMock.target);

    // Try rescueUnsoldNFTs -> should revert with concatenated message
    await expect(presale.rescueUnsoldNFTs(1, owner.address, 1)).to.be.revertedWith('Rescue NFT failed: boom');

    // set no-reason mock and expect generic revert
    await presale.setRescueContract(noMock.target);
    await expect(presale.rescueERC20(bht.target, owner.address, 1)).to.be.revertedWith('Rescue ERC20 failed');

    // emergency withdraw with both mocks
    await presale.setRescueContract(withMock.target);
    await expect(presale.emergencyWithdrawETH()).to.be.revertedWith('Rescue ETH failed: eth-boom');

    await presale.setRescueContract(noMock.target);
    await expect(presale.emergencyWithdrawETH()).to.be.revertedWith('Rescue ETH failed');
  });
});
