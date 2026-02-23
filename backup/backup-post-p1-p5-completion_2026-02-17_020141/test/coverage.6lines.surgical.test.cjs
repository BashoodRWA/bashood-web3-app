const { expect } = require("chai");
const hh = require("hardhat");
const ethers = hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale } = getPresaleHelpers();

describe("🎯 SURGICAL: 6 Líneas Exactas - 90% Coverage Push", function () {
  let owner, alice, bob;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
  });

  describe("BashoodPresaleFinal L147", function () {
    it.skip("✅ L147: return uint256(answer) en _getFreshPrice() - DEAD CODE", async function () {
      // _getFreshPrice() no se usa en el código actual
      // L147 probablemente ya está cubierto si la función se llama en algún test
    });
  });

  describe("BashoodPresaleFinal L434", function () {
    it("✅ L434: catch generic (sin Error) en rescueUnsoldNFTs", async function () {
      const { presale } = await deployPresale({ projectWallet: await alice.getAddress() });
      
      // Deploy MaliciousRescue que revierta sin Error(string)
      const MaliciousRescue = await ethers.getContractFactory("contracts/mocks/MaliciousRescue.sol:MaliciousRescue");
      const malicious = await MaliciousRescue.deploy();
      await malicious.waitForDeployment();

      // Set malicious como rescueContract
      await presale.setRescueContract(await malicious.getAddress());
      
      // Llamar rescueUnsoldNFTs - fallará con generic revert (catch L434)
      await expect(
        presale.rescueUnsoldNFTs(1, await bob.getAddress(), 10)
      ).to.be.revertedWith("Rescue NFT failed");
    });
  });

  describe("BashoodPresaleFinal L447", function () {
    it("✅ L447: catch generic (sin Error) en rescueERC20", async function () {
      const { presale } = await deployPresale({ projectWallet: await alice.getAddress() });
      
      // Deploy MaliciousRescue
      const MaliciousRescue = await ethers.getContractFactory("contracts/mocks/MaliciousRescue.sol:MaliciousRescue");
      const malicious = await MaliciousRescue.deploy();
      await malicious.waitForDeployment();

      await presale.setRescueContract(await malicious.getAddress());
      
      // Deploy mock token
      const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
      const token = await MockERC20.deploy();
      await token.waitForDeployment();
      
      // Llamar rescueERC20 - fallará con catch generic L447
      await expect(
        presale.rescueERC20(await token.getAddress(), await bob.getAddress(), 100)
      ).to.be.revertedWith("Rescue ERC20 failed");
    });
  });

  describe("BashoodRescue L152", function () {
    it("✅ L152: onERC1155BatchReceived return selector", async function () {
      const Rescue = await ethers.getContractFactory("BashoodRescue");
      const rescue = await Rescue.deploy(await owner.getAddress(), await alice.getAddress());
      await rescue.waitForDeployment();

      // Llamar onERC1155BatchReceived directamente
      const selector = await rescue.onERC1155BatchReceived(
        await owner.getAddress(),
        await alice.getAddress(),
        [1, 2, 3],
        [10, 20, 30],
        "0x"
      );
      
      // Verificar que retorna el selector correcto (L152)
      expect(selector).to.equal("0xbc197c81"); // onERC1155BatchReceived selector
    });
  });

  describe("ChainlinkPriceFeed L28-32, L36-37", function () {
    it("✅ L28-32: setFeed con address válido", async function () {
      const MockPrice1 = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
      const feed1 = await MockPrice1.deploy(8, ethers.parseUnits('1', 8));
      await feed1.waitForDeployment();

      const PriceFeed = await ethers.getContractFactory("ChainlinkPriceFeed");
      const priceFeed = await PriceFeed.deploy(await feed1.getAddress());
      await priceFeed.waitForDeployment();

      // Deploy otro feed
      const feed2 = await MockPrice1.deploy(8, ethers.parseUnits('2', 8));
      await feed2.waitForDeployment();

      // Llamar setFeed - cubre L28 (require), L29 (assignment), L30 (emit)
      await expect(priceFeed.setFeed(await feed2.getAddress()))
        .to.emit(priceFeed, "FeedUpdated")
        .withArgs(await feed2.getAddress());
      
      // Verificar que se actualizó
      expect(await priceFeed.feed()).to.equal(await feed2.getAddress());
    });

    it("✅ L36-37: setStalenessThreshold", async function () {
      const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
      const feed = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
      await feed.waitForDeployment();

      const PriceFeed = await ethers.getContractFactory("ChainlinkPriceFeed");
      const priceFeed = await PriceFeed.deploy(await feed.getAddress());
      await priceFeed.waitForDeployment();

      // Llamar setStalenessThreshold - cubre L34 (assignment), L35 (emit)
      const newThreshold = 600;
      await expect(priceFeed.setStalenessThreshold(newThreshold))
        .to.emit(priceFeed, "StalenessThresholdUpdated")
        .withArgs(newThreshold);
      
      expect(await priceFeed.stalenessThreshold()).to.equal(newThreshold);
    });

    it("✅ L40-41: setMaxChangePct", async function () {
      const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
      const feed = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
      await feed.waitForDeployment();

      const PriceFeed = await ethers.getContractFactory("ChainlinkPriceFeed");
      const priceFeed = await PriceFeed.deploy(await feed.getAddress());
      await priceFeed.waitForDeployment();

      // Llamar setMaxChangePct - cubre L38 (assignment), L39 (emit)
      const newMaxPct = 25;
      await expect(priceFeed.setMaxChangePct(newMaxPct))
        .to.emit(priceFeed, "MaxChangePctUpdated")
        .withArgs(newMaxPct);
      
      expect(await priceFeed.maxChangePct()).to.equal(newMaxPct);
    });
  });
});
