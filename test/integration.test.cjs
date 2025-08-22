const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integración BashoodPresaleFinal: pagos, propuestas y roles", function () {
  let deployer, user, admin, BashoodToken, bashoodToken, BashoodPresaleFinal, presale, priceFeed;

  beforeEach(async function () {
    [deployer, user, admin] = await ethers.getSigners();
    BashoodToken = await ethers.getContractFactory("MockBashoodToken");
    bashoodToken = await BashoodToken.deploy();
    await bashoodToken.waitForDeployment();
    const MockNFT = await ethers.getContractFactory("MockNFT1155");
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();
  const MockFeed = await ethers.getContractFactory("MockPriceFeed");
  priceFeed = await MockFeed.deploy(ethers.parseUnits("1", 8), 8);
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
      BigInt(1),
      BigInt(10000000000),
      BigInt(100)
    ];
    try {
      const txData = await BashoodPresaleFinal.getDeployTransaction(...deployArgs);
      console.log('getDeployTransaction succeeded, tx data length:', txData.data ? txData.data.length : 0);
      presale = await BashoodPresaleFinal.deploy(...deployArgs);
    } catch (err) {
      console.error('Deploy failed. deployArgs:', deployArgs.map(a => (a && a.toString ? a.toString() : String(a))));
      console.error('Ctor inputs:', BashoodPresaleFinal.interface.deploy.inputs);
      throw err;
    }
    await presale.waitForDeployment();
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
    if (priceFeed.setUpdatedAt) {
      await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp);
      await ethers.provider.send("evm_mine");
    }
    // Mint y approve BHT
  await bashoodToken.mint(user.address, ethers.parseUnits("1000", 18));
  await bashoodToken.connect(user).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));
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
