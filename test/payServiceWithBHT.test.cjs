const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BashoodPresaleFinal - payServiceWithBHT", function () {
  let deployer, user, admin, priceFeed, BashoodToken, bashoodToken, BashoodPresaleFinal, presale;
  const serviceId = ethers.id("service-001");
  const fiatQuoteUsd = ethers.parseUnits("100", 18); // $100

  beforeEach(async function () {
    [deployer, user, admin] = await ethers.getSigners();
    BashoodToken = await ethers.getContractFactory("MockBashoodToken");
    bashoodToken = await BashoodToken.deploy();
    await bashoodToken.waitForDeployment();
    const MockNFT = await ethers.getContractFactory("MockNFT1155");
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();
    // Mock price feed
  const MockFeed = await ethers.getContractFactory("MockPriceFeed");
  priceFeed = await MockFeed.deploy(ethers.parseUnits("1", 8), 8); // 1 USD, 8 decimals
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
    // Grant ADMIN_ROLE first, then call admin-only setters in predictable order
  await presale.connect(deployer).grantRole(await presale.ADMIN_ROLE(), await deployer.getAddress());
  await presale.connect(deployer).setSigner(await deployer.getAddress());
  await presale.connect(deployer).setOperationsWallet(await admin.getAddress());
  if (presale.setPriceFeed) await presale.connect(deployer).setPriceFeed(await priceFeed.getAddress());
    await presale.connect(deployer).setDiscountBps(1000);
    await presale.connect(deployer).setBurnBps(500);
    if (presale.setMaxPriceStaleness) await presale.connect(deployer).setMaxPriceStaleness(120);
    // align block timestamp to presale window then start
    const presaleStart = await presale.presaleStart();
    let blockBefore = await ethers.provider.getBlock("latest");
    let nextTimestamp = Math.max(Number(presaleStart) + 1, blockBefore.timestamp + 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await ethers.provider.send("evm_mine");
    await presale.connect(deployer).startPresale();
    // Ensure price feed shows a fresh updatedAt so BHT calculations don't revert
    if (priceFeed.setUpdatedAt) {
      await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp);
      await ethers.provider.send("evm_mine");
    }
    // Mint and approve BHT
    await bashoodToken.mint(user.address, ethers.parseUnits("1000", 18));
  await bashoodToken.connect(user).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));
  });

  it("permite pagar un servicio con BHT y emite BHTBurned", async function () {
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](serviceId, fiatQuoteUsd)
    ).to.emit(presale, "BHTBurned");
  });

  it("revierta si el oráculo está stale", async function () {
    await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp - 1000);
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](serviceId, fiatQuoteUsd)
    ).to.be.revertedWith("Price too stale");
  });

  it("revierta si el descuento supera el cap", async function () {
    await presale.connect(deployer).setDiscountBps(3000); // >20%
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](serviceId, fiatQuoteUsd)
    ).to.be.revertedWith("Discount cap");
  });

  it("revierta si la quema supera el cap", async function () {
    await presale.connect(deployer).setBurnBps(2000); // >15%
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](serviceId, fiatQuoteUsd)
    ).to.be.revertedWith("Burn cap");
  });
});
 
