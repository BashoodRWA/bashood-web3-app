const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const presaleHelpers = require('./helpers/presaleHelpers');

/**
 * Edge Case Tests for Branch Coverage Improvement
 * Target: Increase branch coverage from 47% to 60%+
 * Focus: Boundary conditions, error paths, edge cases
 * Strategy: Simple, focused tests that hit uncovered branches
 */
describe("BashoodPresaleFinal - Edge Cases & Branch Coverage", function () {
  let presale, nft, token, referral, priceFeed, signer;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Use helper to deploy presale system
    const deployed = await presaleHelpers.deployPresale();
    presale = deployed.presale;
    nft = deployed.nft;
    token = deployed.bht;
    referral = deployed.referral;
    priceFeed = deployed.price;
    signer = deployed.owner;

    // Configure presale
    await presale.setSigner(signer.address);
    await presale.setMaxPerUser(100);
    await presale.setMaxPriceStaleness(3600);
    
    // Mint NFTs to presale contract
    await nft.mint(await presale.getAddress(), 1, 1000);
  });

  describe("Edge Cases - Purchase Limits", function () {
    it("should handle purchase at exact maxPerUser limit", async function () {
      await presale.setMaxPerUser(5);
      await presale.startPresale();

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      const nftPrice = await presale.nftPriceETH();
      
      await presale.connect(user1).purchaseWithETH(1, 5, nonce, sig, { value: nftPrice * 5n });
      expect(await presale.userPurchases(user1.address)).to.equal(5);

      // Next purchase should fail
      const nonce2 = 2;
      const sig2 = await presaleHelpers.signNonce(signer, user1.address, nonce2);
      await expect(
        presale.connect(user1).purchaseWithETH(1, 1, nonce2, sig2, { value: nftPrice })
      ).to.be.revertedWith("E17");
    });


  });

  describe("Edge Cases - Admin Function Boundaries", function () {
    it("should accept setBurnBps at exact limit (1500)", async function () {
      await presale.setBurnBps(1500);
      expect(await presale.burnBps()).to.equal(1500);
    });

    it("should revert setBurnBps above limit (1501)", async function () {
      await expect(presale.setBurnBps(1501)).to.be.revertedWith("Burn cap exceeded");
    });

    it("should accept setDiscountBps at exact limit (2000)", async function () {
      await presale.setDiscountBps(2000);
      expect(await presale.bhtDiscountBps()).to.equal(2000);
    });

    it("should revert setDiscountBps above limit (2001)", async function () {
      await expect(presale.setDiscountBps(2001)).to.be.revertedWith("Discount cap exceeded");
    });

    it("should accept setMaxPriceStaleness at lower boundary (1)", async function () {
      await presale.setMaxPriceStaleness(1);
      expect(await presale.maxPriceStaleness()).to.equal(1);
    });

    it("should accept setMaxPriceStaleness at upper boundary (86400)", async function () {
      await presale.setMaxPriceStaleness(86400);
      expect(await presale.maxPriceStaleness()).to.equal(86400);
    });

    it("should revert setMaxPriceStaleness with 0", async function () {
      await expect(presale.setMaxPriceStaleness(0)).to.be.revertedWith("Invalid staleness: 1s-24h");
    });

    it("should revert setMaxPriceStaleness above 86400", async function () {
      await expect(presale.setMaxPriceStaleness(86401)).to.be.revertedWith("Invalid staleness: 1s-24h");
    });
  });

  describe("Edge Cases - Zero Address Validations", function () {
    it("should revert setOperationsWallet with zero address", async function () {
      await expect(presale.setOperationsWallet(ethers.ZeroAddress)).to.be.revertedWith("Zero address");
    });

    it("should revert setPriceFeed with zero address", async function () {
      await expect(presale.setPriceFeed(ethers.ZeroAddress)).to.be.revertedWith("Zero address");
    });

    it("should revert setRescueContract with zero address", async function () {
      await expect(presale.setRescueContract(ethers.ZeroAddress)).to.be.revertedWith("Rescue required");
    });
  });

  describe("Edge Cases - Whitelist", function () {
    it("should block non-whitelisted user when enabled", async function () {
      await presale.setWhitelistEnabled(true);
      await presale.startPresale();

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      const price = await presale.nftPriceETH();

      await expect(
        presale.connect(user1).purchaseWithETH(1, 1, nonce, sig, { value: price })
      ).to.be.revertedWith("Not whitelisted");
    });

    it("should allow whitelisted user", async function () {
      const WHITELIST_ROLE = await presale.WHITELIST_ROLE();
      await presale.grantRole(WHITELIST_ROLE, user1.address);
      await presale.setWhitelistEnabled(true);
      await presale.startPresale();

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      const price = await presale.nftPriceETH();

      await presale.connect(user1).purchaseWithETH(1, 1, nonce, sig, { value: price });
      expect(await presale.userPurchases(user1.address)).to.equal(1);
    });
  });

  describe("Edge Cases - Pause/Unpause", function () {

    it("should allow purchases after unpause", async function () {
      await presale.startPresale();
      const EMERGENCY_ROLE = await presale.EMERGENCY_ROLE();
      await presale.grantRole(EMERGENCY_ROLE, owner.address);
      await presale.pause();
      await presale.unpause();

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      const price = await presale.nftPriceETH();

      await presale.connect(user1).purchaseWithETH(1, 1, nonce, sig, { value: price });
      expect(await presale.userPurchases(user1.address)).to.equal(1);
    });
  });

  describe("Edge Cases - Invalid NFT IDs", function () {
    it("should revert purchase with non-allowed NFT ID", async function () {
      await presale.startPresale();

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      const price = await presale.nftPriceETH();

      await expect(
        presale.connect(user1).purchaseWithETH(999, 1, nonce, sig, { value: price })
      ).to.be.revertedWith("E14");
    });
  });

  describe("Edge Cases - BHT Purchase", function () {
    it("should succeed with exact BHT balance and allowance", async function () {
      await presale.setOperationsWallet(owner.address);
      await presale.setPriceFeed(await priceFeed.getAddress());
      await presale.startPresale();
      
      const bhtPrice = await presale.nftPriceBHT();
      await token.mint(user1.address, bhtPrice);
      await token.connect(user1).approve(await presale.getAddress(), bhtPrice);

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);

      await presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig);
      expect(await presale.userPurchases(user1.address)).to.equal(1);
    });

    it("should revert with insufficient BHT balance", async function () {
      await presale.startPresale();
      
      const bhtPrice = await presale.nftPriceBHT();
      // Give approval but no balance
      await token.connect(user1).approve(await presale.getAddress(), bhtPrice);

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);

      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.be.reverted;
    });
  });

  describe("Edge Cases - Timestamps", function () {
    it("should revert when presale ended", async function () {
      await presale.startPresale();
      await presale.endPresale();

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      const price = await presale.nftPriceETH();

      await expect(
        presale.connect(user1).purchaseWithETH(1, 1, nonce, sig, { value: price })
      ).to.be.revertedWith("Presale not active");
    });
  });

  describe("Edge Cases - ETH Values", function () {
    it("should revert on insufficient ETH (off by 1 wei)", async function () {
      await presale.startPresale();

      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      const price = await presale.nftPriceETH();

      await expect(
        presale.connect(user1).purchaseWithETH(1, 1, nonce, sig, { value: price - 1n })
      ).to.be.revertedWith("E18");
    });


  });
});
