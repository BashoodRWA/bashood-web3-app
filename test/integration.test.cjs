if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("Integración BashoodPresaleFinal: pagos, propuestas y roles", function () {
  let deployer, user, admin, BashoodToken, bashoodToken, BashoodPresaleFinal, presale, priceFeed;

  beforeEach(async function () {
    [deployer, user, admin] = await ethers.getSigners();
    BashoodToken = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    bashoodToken = await BashoodToken.deploy();
    await bashoodToken.waitForDeployment();
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();
  const MockFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  // Deploy canonical MockPriceFeed: (decimals, scaledAnswer)
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
    // Use shared helper to deploy presale with the mocks we just created. This
    // avoids raw getDeployTransaction usage and normalizes constructor args.
    const d = await deployPresale({
      bhtAddr: await bashoodToken.getAddress(),
      nftAddr: await nft.getAddress(),
      referralAddr: await referral.getAddress(),
      projectWallet: admin
    });
    presale = d.presale;
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
    if (typeof setPriceFresh === 'function') {
      await setPriceFresh(priceFeed, ethers.parseUnits('2000', 8));
    } else if (priceFeed.setUpdatedAt) {
      await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp);
      await ethers.provider.send("evm_mine");
    }
    // Mint y approve BHT (very large allowance to avoid ERC20InsufficientAllowance in tests)
  await bashoodToken.mint(user.address, ethers.parseUnits("1000000000000", 18));
  await bashoodToken.connect(user).approve(await presale.getAddress(), ethers.parseUnits("1000000000000", 18));
  });

  it("flujo completo: pago de servicio, propuesta y finalización", async function () {
    // Pago de servicio
  await expect(presale.connect(user)["payServiceWithBHT(uint256,uint256)"](1, ethers.parseUnits("100", 18)))
      .to.emit(presale, "BHTBurned").and.to.emit(presale, "ServicePaid");
    // Propuesta
    const proposalData = ethers.hexlify(ethers.toUtf8Bytes("propuesta integral"));
    await expect(presale.connect(user).submitProposal(proposalData, ethers.parseUnits("50", 18)))
      .to.emit(presale, "ProposalSubmitted");
    // Finalización de propuesta por admin
    await expect(presale.connect(admin).finalizeProposal(1))
      .to.emit(presale, "ProposalFinalized");
  });

  it("bloquea todo si el contrato está pausado", async function () {
    await presale.connect(admin).pause();
  await expect(presale.connect(user)["payServiceWithBHT(uint256,uint256)"](1, 100)).to.be.reverted;
    await expect(presale.connect(user).submitProposal(ethers.hexlify(ethers.toUtf8Bytes("test")), 100)).to.be.reverted;
  });

  it("flujo: pago de milestone y chequeo de eventos", async function () {
  await expect(presale.connect(user)["payMilestoneWithBHT(uint8,uint256)"](1, ethers.parseUnits("20", 18)))
      .to.emit(presale, "BHTBurned").and.to.emit(presale, "MilestonePaid");
  });
});
