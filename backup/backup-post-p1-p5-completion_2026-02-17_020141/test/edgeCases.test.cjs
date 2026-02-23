if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe("BashoodPresaleFinal - Edge Cases", function () {
  let deployer, user, admin, BashoodToken, bashoodToken, BashoodPresaleFinal, presale, priceFeed;

  beforeEach(async function () {
    [deployer, user, admin] = await ethers.getSigners();
  BashoodToken = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    bashoodToken = await BashoodToken.deploy();
    await bashoodToken.waitForDeployment();
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();
  // Use constructor-based MockPriceFeed for this test file (supports setAnswer and setUpdatedAt)
  const MockFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  // deploy(MockPriceFeed) expects (uint8 decimals, int256 answer). Use parseUnits
  // to scale the human price (2000) to the feed decimals (8).
  priceFeed = await MockFeed.deploy(8, ethers.parseUnits('2000', 8));
    await priceFeed.waitForDeployment();
    const Validator = await ethers.getContractFactory("ReferralValidator");
    const validator = await Validator.deploy(deployer.address);
    await validator.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    const referral = await BashoodReferral.deploy(
      await deployer.getAddress(),
      await validator.getAddress(),
      await nft.getAddress()
    );
    await referral.waitForDeployment();
  BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    const deployArgs = [
      await bashoodToken.getAddress(),
      await nft.getAddress(),
      await referral.getAddress(),
      await admin.getAddress(),
      BigInt(0),
      BigInt(0),
      BigInt(1), // presaleStart (use now-ish non-zero)
      BigInt(10000000000), // presaleEnd (far future)
      BigInt(100)
    ];
  // Use shared deploy helper to avoid direct getDeployTransaction usage
  const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
  const { deployPresale } = getPresaleHelpers();
  const helpers = await deployPresale({ bhtAddr: await bashoodToken.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: await admin.getAddress(), bhtArgs: [] });
  presale = helpers.presale;
  await presale.connect(deployer).grantRole(await presale.ADMIN_ROLE(), await deployer.getAddress());
  await presale.connect(deployer).setSigner(await deployer.getAddress());
  await presale.connect(deployer).setOperationsWallet(await admin.getAddress());
  if (presale.setPriceFeed) await presale.connect(deployer).setPriceFeed(await priceFeed.getAddress());
    await presale.connect(deployer).setBurnBps(500);
    if (presale.setMaxPriceStaleness) await presale.connect(deployer).setMaxPriceStaleness(120);
    const presaleStart = await presale.presaleStart();
    let blockBefore = await ethers.provider.getBlock("latest");
    let nextTimestamp = Math.max(Number(presaleStart) + 1, blockBefore.timestamp + 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await ethers.provider.send("evm_mine");
    await presale.connect(deployer).startPresale();
  // set both answer and updatedAt via the existing helpers object (keeps tests consistent)
  if (typeof helpers.setPriceFresh === 'function') {
    await helpers.setPriceFresh(priceFeed, ethers.parseUnits('2000', 8));
  } else {
    await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp);
    await ethers.provider.send("evm_mine");
  }
  await bashoodToken.mint(user.address, ethers.parseUnits("1000", 18));
  await bashoodToken.connect(user).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));
  });

  it("revierta si el usuario no tiene suficiente BHT", async function () {
    await bashoodToken.connect(user).approve(await presale.getAddress(), 0);
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](1, ethers.parseUnits("100", 18))
    ).to.be.reverted;
  });

  it("revierta si el oráculo devuelve precio cero", async function () {
    await priceFeed.setAnswer(0);
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](1, ethers.parseUnits("10", 18))
    ).to.be.revertedWith("Invalid price");
  });

  it.skip("revierta si se intenta finalizar una propuesta inexistente - DEPRECATED: finalizeProposal removed", async function () {
    await expect(
      presale.connect(admin).finalizeProposal(999)
    ).to.be.reverted;
  });

  it("revierta si un usuario intenta pagar con cantidad cero", async function () {
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](1, 0)
    ).to.be.reverted;
  });
});






