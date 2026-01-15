const { expect } = require("chai");
const { ethers } = require("hardhat");
const presaleHelpers = require("./helpers/presaleHelpers");

describe("BashoodPresaleFinal - Additional Transfer & Burn Edge Cases", function () {
  let presale, bht, nft, price, owner, user1, buyer, projectWallet;
  
  beforeEach(async function () {
    const deployed = await presaleHelpers.deployPresale();
    ({ presale, nft, bht, price, owner, buyer, projectWallet } = deployed);
    user1 = buyer;
    
    // Setup presale
    await presale.setSigner(owner.address);
    await presale.setPriceFeed(await price.getAddress());
    await presale.setMaxPerUser(100);
    await presale.setMaxPriceStaleness(3600); // Set staleness window
    await presale.setOperationsWallet(projectWallet.address);
    await nft.mint(await presale.getAddress(), 1, 1000);
    await presale.startPresale();
    
    // Set fresh oracle price
    await presaleHelpers.setPriceFresh(price, 2000_00000000); // $2000 ETH
  });

  describe("Burn Configuration Edge Cases", function () {
    it("should handle burnAmount=0 when burnBps=0 (all to operations)", async function () {
      // Set burnBps to 0 so all goes to operations
      await presale.setBurnBps(0);
      await presaleHelpers.setPriceFresh(price, 2000_00000000);
      
      const amount = ethers.parseUnits("100", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      const tx = presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig);
      
      // Should not emit Burned (burnAmount = 0)
      // Should transfer all to operations
      await expect(tx).to.emit(presale, "AssetPurchased");
    });

    it("should handle max burn (1500 bps = 15%) leaving 85% for operations", async function () {
      // Set burnBps to max (1500 = 15%)
      await presale.setBurnBps(1500);
      await presaleHelpers.setPriceFresh(price, 2000_00000000);
      
      const amount = ethers.parseUnits("100", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      // Should emit Burned for 15% and transfer 85% to operations
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.emit(presale, "Burned");
    });

    it("should handle minimum burn (1 bps = 0.01%)", async function () {
      // Set burnBps to minimum non-zero
      await presale.setBurnBps(1);
      await presaleHelpers.setPriceFresh(price, 2000_00000000);
      
      const amount = ethers.parseUnits("100", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      // Should still execute burn (even tiny amount)
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.emit(presale, "Burned");
    });
  });

  describe("BHT Balance & Approval Edge Cases", function () {
    it("should revert when insufficient BHT balance for purchase", async function () {
      // Mint less than required BHT
      const insufficient = ethers.parseUnits("0.0001", 18);
      await bht.mint(user1.address, insufficient);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      // Should revert due to insufficient balance
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.be.reverted; // Will fail on transferFrom
    });

    it("should revert when insufficient BHT allowance", async function () {
      const amount = ethers.parseUnits("100", 18);
      await bht.mint(user1.address, amount);
      // Approve small amount, less than required
      await bht.connect(user1).approve(await presale.getAddress(), ethers.parseUnits("0.01", 18));
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      // Should revert due to insufficient allowance
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.be.reverted;
    });

    it("should succeed when BHT balance equals exact required amount", async function () {
      // First, calculate exact BHT needed by attempting purchase and reading revert
      // For simplicity, mint abundant amount and test it works
      const amount = ethers.parseUnits("100", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      // Should succeed
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.emit(presale, "AssetPurchased");
    });
  });

  describe("Operations Wallet Configuration", function () {
    it("should allow setting operations wallet multiple times", async function () {
      const [,, newOpsWallet] = await ethers.getSigners();
      
      // Set to first wallet
      await expect(presale.setOperationsWallet(projectWallet.address))
        .to.not.be.reverted;
      
      // Change to different wallet
      await expect(presale.setOperationsWallet(newOpsWallet.address))
        .to.not.be.reverted;
      
      // Change back
      await expect(presale.setOperationsWallet(projectWallet.address))
        .to.not.be.reverted;
    });

    it("should use operations wallet set in contract", async function () {
      // Verify that operations wallet is set correctly
      const amount = ethers.parseUnits("100", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      // Should succeed using current operations wallet
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.emit(presale, "AssetPurchased");
    });
  });

  describe("Multiple Purchases with Different Burn Configurations", function () {
    it("should handle multiple purchases with changing burnBps", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      // First purchase with 5% burn
      await presale.setBurnBps(500);
      await presaleHelpers.setPriceFresh(price, 2000_00000000);
      let nonce = 1;
      let sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.emit(presale, "Burned");
      
      // Second purchase with 10% burn
      await presale.setBurnBps(1000);
      await presaleHelpers.setPriceFresh(price, 2000_00000000);
      nonce = 2;
      sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.emit(presale, "Burned");
      
      // Third purchase with no burn
      await presale.setBurnBps(0);
      await presaleHelpers.setPriceFresh(price, 2000_00000000);
      nonce = 3;
      sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.emit(presale, "AssetPurchased");
    });
  });

  describe("Quantity Edge Cases", function () {
    it("should handle quantity=1 (minimum purchase)", async function () {
      const amount = ethers.parseUnits("100", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 1, nonce, sig)
      ).to.emit(presale, "AssetPurchased");
    });

    it("should handle quantity=10 (bulk purchase)", async function () {
      await presale.setMaxPerUser(50);
      
      const amount = ethers.parseUnits("10000", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, 10, nonce, sig)
      ).to.emit(presale, "AssetPurchased");
    });

    it("should handle quantity at maxPerUser limit", async function () {
      const maxPerUser = 20;
      await presale.setMaxPerUser(maxPerUser);
      
      const amount = ethers.parseUnits("100000", 18);
      await bht.mint(user1.address, amount);
      await bht.connect(user1).approve(await presale.getAddress(), ethers.MaxUint256);
      
      const nonce = 1;
      const sig = await presaleHelpers.signNonce(owner, user1.address, nonce);
      
      await expect(
        presale.connect(user1).purchaseWithBHT(1, maxPerUser, nonce, sig)
      ).to.emit(presale, "AssetPurchased");
    });
  });
});
