const { expect } = require("chai");
const { ethers } = require("hardhat");
const presaleHelpers = require("./helpers/presaleHelpers");

describe("BashoodPresaleFinal - Oracle & Price Feed Edge Cases", function () {
  let presale, nft, token, priceFeed, signer, owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    
    const deployed = await presaleHelpers.deployPresale();
    presale = deployed.presale;
    nft = deployed.nft;
    token = deployed.bht;
    priceFeed = deployed.price;
    signer = deployed.owner;
    
    // Configuración básica
    await presale.setSigner(signer.address);
    await presale.setMaxPriceStaleness(3600);
    await presale.setMaxPerUser(100);
    await presale.setPriceFeed(await priceFeed.getAddress());
    await presale.setOperationsWallet(owner.address);
    await nft.mint(await presale.getAddress(), 1, 1000);
    await presale.startPresale();
  });

  describe("Price Feed Edge Cases", function () {
    it("should reject zero price from oracle in BHT purchase", async function () {
      await priceFeed.setPrice(0);
      
      const bhtAmount = ethers.parseEther("100");
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.be.revertedWith("Invalid price");
    });

    it("should reject stale price (updatedAt too old) in BHT purchase", async function () {
      // Set price staleness to 1 hour
      await presale.setMaxPriceStaleness(3600);
      
      // Set updatedAt to 2 hours ago
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
      await priceFeed.setUpdatedAt(twoHoursAgo);
      
      const bhtAmount = ethers.parseEther("100");
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 3;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.be.revertedWith("Price too stale");
    });

    it("should reject when updatedAt is 0 in BHT purchase", async function () {
      await priceFeed.setUpdatedAt(0);
      
      const bhtAmount = ethers.parseEther("100");
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 4;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.be.revertedWith("Price too stale");
    });

    it("should accept fresh price within staleness window for BHT purchase", async function () {
      // Use setPriceFresh to ensure timestamp is current
      await presaleHelpers.setPriceFresh(priceFeed, 2000_00000000); // $2000 ETH
      
      const bhtAmount = ethers.parseEther("100");
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 5;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.not.be.reverted;
    });
  });

  describe("BHT Price Calculation Edge Cases", function () {
    it("should handle very high BHT price (approaching fiat value)", async function () {
      // Set BHT price to $0.50 (half of $1 NFT price)
      await presaleHelpers.setPriceFresh(priceFeed, 50_00000000);
      
      const bhtAmount = ethers.parseEther("100"); // 100 BHT
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 6;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      // Should require ~2 BHT for $1 NFT at $0.50/BHT
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.not.be.reverted;
    });

    it("should handle very low BHT price (requires many tokens)", async function () {
      // Set BHT price to $0.001 (1000 BHT = $1)
      await presaleHelpers.setPriceFresh(priceFeed, 1_000000);
      
      const bhtAmount = ethers.parseEther("10000"); // 10,000 BHT
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 7;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      // Should require ~1000 BHT for $1 NFT at $0.001/BHT
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.not.be.reverted;
    });

    it("should reject when BHT price is zero", async function () {
      await priceFeed.setPrice(0);
      
      const bhtAmount = ethers.parseEther("100");
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 8;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.be.revertedWith("Invalid price");
    });

    it("should handle ETH price volatility ($10,000/ETH)", async function () {
      await presaleHelpers.setPriceFresh(priceFeed, 10000_00000000);
      
      const bhtAmount = ethers.parseEther("100");
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 9;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.not.be.reverted;
    });

    it("should handle ETH price volatility ($100/ETH)", async function () {
      await presaleHelpers.setPriceFresh(priceFeed, 100_00000000);
      
      const bhtAmount = ethers.parseEther("100");
      await token.mint(user1.address, bhtAmount);
      await token.connect(user1).approve(await presale.getAddress(), bhtAmount);
      
      const nonce = 10;
      const sig = await presaleHelpers.signNonce(signer, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.not.be.reverted;
    });
  });
});
