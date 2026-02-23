const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("💰 BashoodPaymentSplitter - Complete Coverage", function () {
  let splitter;
  let owner, dev, ops, marketing, treasury, alice, bob;
  let devAddr, opsAddr, marketingAddr, treasuryAddr;

  beforeEach(async function () {
    [owner, dev, ops, marketing, treasury, alice, bob] = await ethers.getSigners();
    devAddr = await dev.getAddress();
    opsAddr = await ops.getAddress();
    marketingAddr = await marketing.getAddress();
    treasuryAddr = await treasury.getAddress();
  });

  describe("🏗️ Constructor & Initialization", function () {
    it("Should deploy with correct 4-wallet distribution (45/25/20/10)", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      
      const payees = [devAddr, opsAddr, marketingAddr, treasuryAddr];
      const shares = [4500, 2500, 2000, 1000]; // Total: 10,000 = 100%

      splitter = await Splitter.deploy(payees, shares);
      await splitter.waitForDeployment();

      expect(await splitter.totalShares()).to.equal(10000);
      expect(await splitter.shares(devAddr)).to.equal(4500);
      expect(await splitter.shares(opsAddr)).to.equal(2500);
      expect(await splitter.shares(marketingAddr)).to.equal(2000);
      expect(await splitter.shares(treasuryAddr)).to.equal(1000);
    });

    it("Should emit PayeeAdded events for all payees", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      const payees = [devAddr, opsAddr];
      const shares = [7000, 3000];

      const tx = await Splitter.deploy(payees, shares);
      const receipt = await tx.deploymentTransaction().wait();

      // Check events in receipt logs
      const iface = Splitter.interface;
      const events = receipt.logs
        .map(log => {
          try {
            return iface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .filter(e => e !== null && e.name === "PayeeAdded");

      expect(events.length).to.equal(2);
      expect(events[0].args.account).to.equal(devAddr);
      expect(events[0].args.shares).to.equal(7000);
    });

    it("Should revert if payees and shares length mismatch", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      const payees = [devAddr, opsAddr];
      const shares = [5000]; // Only 1 share for 2 payees

      await expect(
        Splitter.deploy(payees, shares)
      ).to.be.revertedWith("PaymentSplitter: payees and shares length mismatch");
    });

    it("Should revert if no payees provided", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      await expect(
        Splitter.deploy([], [])
      ).to.be.revertedWith("PaymentSplitter: no payees");
    });

    it("Should revert if payee is zero address", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      await expect(
        Splitter.deploy([ethers.ZeroAddress, devAddr], [5000, 5000])
      ).to.be.revertedWith("PaymentSplitter: account is the zero address");
    });

    it("Should revert if shares are 0", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      await expect(
        Splitter.deploy([devAddr, opsAddr], [5000, 0])
      ).to.be.revertedWith("PaymentSplitter: shares are 0");
    });

    it("Should revert if account already has shares", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      // Trying to add devAddr twice
      await expect(
        Splitter.deploy([devAddr, devAddr], [5000, 5000])
      ).to.be.revertedWith("PaymentSplitter: account already has shares");
    });
  });

  describe("💸 Receive & Release Functions", function () {
    beforeEach(async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      const payees = [devAddr, opsAddr, marketingAddr, treasuryAddr];
      const shares = [4500, 2500, 2000, 1000];
      splitter = await Splitter.deploy(payees, shares);
      await splitter.waitForDeployment();
    });

    it("Should receive ETH and emit FundsReceived event", async function () {
      const amount = ethers.parseEther("10.0");
      await expect(
        owner.sendTransaction({
          to: await splitter.getAddress(),
          value: amount
        })
      ).to.emit(splitter, "FundsReceived")
        .withArgs(await owner.getAddress(), amount);
    });

    it("Should calculate correct releasable amounts (45/25/20/10 split)", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      const devReleasable = await splitter.releasable(devAddr);
      const opsReleasable = await splitter.releasable(opsAddr);
      const marketingReleasable = await splitter.releasable(marketingAddr);
      const treasuryReleasable = await splitter.releasable(treasuryAddr);

      expect(devReleasable).to.equal(ethers.parseEther("45")); // 45%
      expect(opsReleasable).to.equal(ethers.parseEther("25")); // 25%
      expect(marketingReleasable).to.equal(ethers.parseEther("20")); // 20%
      expect(treasuryReleasable).to.equal(ethers.parseEther("10")); // 10%
    });

    it("Should release funds to development wallet", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      const devBalanceBefore = await ethers.provider.getBalance(devAddr);
      await splitter.release(devAddr);
      const devBalanceAfter = await ethers.provider.getBalance(devAddr);

      expect(devBalanceAfter - devBalanceBefore).to.equal(ethers.parseEther("45"));
    });

    it("Should emit PaymentReleased and FundsDistributed events", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      await expect(splitter.release(devAddr))
        .to.emit(splitter, "PaymentReleased")
        .withArgs(devAddr, ethers.parseEther("45"))
        .and.to.emit(splitter, "FundsDistributed")
        .withArgs(devAddr, ethers.parseEther("45"));
    });

    it("Should update _released and _totalReleased after release", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      await splitter.release(devAddr);

      expect(await splitter.released(devAddr)).to.equal(ethers.parseEther("45"));
      expect(await splitter.totalReleased()).to.equal(ethers.parseEther("45"));
    });

    it("Should revert if account has no shares", async function () {
      const aliceAddr = await alice.getAddress();
      await expect(
        splitter.release(aliceAddr)
      ).to.be.revertedWith("PaymentSplitter: account has no shares");
    });

    it("Should revert if account is not due payment", async function () {
      // Try to release without sending any ETH first
      await expect(
        splitter.release(devAddr)
      ).to.be.revertedWith("PaymentSplitter: account is not due payment");
    });

    it("Should revert if trying to release twice without new funds", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      await splitter.release(devAddr);
      
      // Second release should fail
      await expect(
        splitter.release(devAddr)
      ).to.be.revertedWith("PaymentSplitter: account is not due payment");
    });
  });

  describe("🔄 releaseAll Function", function () {
    beforeEach(async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      const payees = [devAddr, opsAddr, marketingAddr, treasuryAddr];
      const shares = [4500, 2500, 2000, 1000];
      splitter = await Splitter.deploy(payees, shares);
      await splitter.waitForDeployment();
    });

    it("Should release to all 4 wallets at once", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      const devBalanceBefore = await ethers.provider.getBalance(devAddr);
      const opsBalanceBefore = await ethers.provider.getBalance(opsAddr);
      const marketingBalanceBefore = await ethers.provider.getBalance(marketingAddr);
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasuryAddr);

      await splitter.releaseAll();

      expect(await ethers.provider.getBalance(devAddr) - devBalanceBefore).to.equal(ethers.parseEther("45"));
      expect(await ethers.provider.getBalance(opsAddr) - opsBalanceBefore).to.equal(ethers.parseEther("25"));
      expect(await ethers.provider.getBalance(marketingAddr) - marketingBalanceBefore).to.equal(ethers.parseEther("20"));
      expect(await ethers.provider.getBalance(treasuryAddr) - treasuryBalanceBefore).to.equal(ethers.parseEther("10"));
    });

    it("Should emit events for each wallet during releaseAll", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      const tx = await splitter.releaseAll();
      const receipt = await tx.wait();

      const paymentEvents = receipt.logs.filter(log => {
        try {
          const parsed = splitter.interface.parseLog(log);
          return parsed.name === "PaymentReleased";
        } catch (e) {
          return false;
        }
      });

      expect(paymentEvents.length).to.equal(4);
    });

    it("Should skip wallets with 0 pending payment", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      // First releaseAll
      await splitter.releaseAll();

      // Second releaseAll should succeed but do nothing (no new funds)
      await expect(splitter.releaseAll()).to.not.be.reverted;
    });

    it("Should handle multiple funding rounds correctly", async function () {
      // First round
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("100.0")
      });
      await splitter.releaseAll();

      // Second round
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("50.0")
      });

      const devReleasable = await splitter.releasable(devAddr);
      expect(devReleasable).to.equal(ethers.parseEther("22.5")); // 45% of 50 ETH
    });
  });

  describe("📊 Getter Functions & Info", function () {
    beforeEach(async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      const payees = [devAddr, opsAddr, marketingAddr, treasuryAddr];
      const shares = [4500, 2500, 2000, 1000];
      splitter = await Splitter.deploy(payees, shares);
      await splitter.waitForDeployment();
    });

    it("Should return correct shares for each account", async function () {
      expect(await splitter.shares(devAddr)).to.equal(4500);
      expect(await splitter.shares(opsAddr)).to.equal(2500);
      expect(await splitter.shares(marketingAddr)).to.equal(2000);
      expect(await splitter.shares(treasuryAddr)).to.equal(1000);
    });

    it("Should return totalShares = 10000", async function () {
      expect(await splitter.totalShares()).to.equal(10000);
    });

    it("Should return payee by index", async function () {
      expect(await splitter.payee(0)).to.equal(devAddr);
      expect(await splitter.payee(1)).to.equal(opsAddr);
      expect(await splitter.payee(2)).to.equal(marketingAddr);
      expect(await splitter.payee(3)).to.equal(treasuryAddr);
    });

    it("Should return getDistributionInfo with all details", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      const info = await splitter.getDistributionInfo();
      
      expect(info.wallets.length).to.equal(4);
      expect(info.wallets[0]).to.equal(devAddr);
      expect(info.percentages[0]).to.equal(4500);
      expect(info.pending[0]).to.equal(ethers.parseEther("45"));
      expect(info.released_[0]).to.equal(0);
    });

    it("Should show updated released amounts after distribution", async function () {
      const amount = ethers.parseEther("100.0");
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: amount
      });

      await splitter.release(devAddr);

      expect(await splitter.released(devAddr)).to.equal(ethers.parseEther("45"));
      expect(await splitter.totalReleased()).to.equal(ethers.parseEther("45"));

      const info = await splitter.getDistributionInfo();
      expect(info.released_[0]).to.equal(ethers.parseEther("45"));
      expect(info.pending[0]).to.equal(0); // No more pending after release
    });
  });

  describe("🚫 Edge Cases & Security", function () {
    beforeEach(async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      const payees = [devAddr, opsAddr];
      const shares = [7000, 3000];
      splitter = await Splitter.deploy(payees, shares);
      await splitter.waitForDeployment();
    });

    it("Should handle very small amounts (1 wei)", async function () {
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: 1n
      });

      // 1 wei * 7000 / 10000 = 0 (rounds down)
      expect(await splitter.releasable(devAddr)).to.equal(0n);
    });

    it("Should handle maximum ETH amounts", async function () {
      const largeAmount = ethers.parseEther("1000"); // 1K ETH (realistic amount)
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: largeAmount
      });

      const devReleasable = await splitter.releasable(devAddr);
      expect(devReleasable).to.equal(ethers.parseEther("700")); // 70%
    });

    it("Should maintain accuracy with multiple small releases", async function () {
      // Send 10 small amounts
      for (let i = 0; i < 10; i++) {
        await owner.sendTransaction({
          to: await splitter.getAddress(),
          value: ethers.parseEther("1.0")
        });
      }

      const devReleasable = await splitter.releasable(devAddr);
      expect(devReleasable).to.equal(ethers.parseEther("7.0")); // 70% of 10 ETH
    });

    it("Should not allow arbitrary address to claim funds", async function () {
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("100.0")
      });

      const bobAddr = await bob.getAddress();
      await expect(
        splitter.release(bobAddr)
      ).to.be.revertedWith("PaymentSplitter: account has no shares");
    });
  });

  describe("💡 Real-World Scenarios", function () {
    it("Should simulate presale distribution scenario", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      const payees = [devAddr, opsAddr, marketingAddr, treasuryAddr];
      const shares = [4500, 2500, 2000, 1000];
      splitter = await Splitter.deploy(payees, shares);
      await splitter.waitForDeployment();

      // Simulate presale raising 500 ETH over time
      const presaleAmounts = [
        ethers.parseEther("100"),
        ethers.parseEther("150"),
        ethers.parseEther("200"),
        ethers.parseEther("50")
      ];

      for (const amount of presaleAmounts) {
        await owner.sendTransaction({
          to: await splitter.getAddress(),
          value: amount
        });
      }

      // Total: 500 ETH
      // Dev should get 225 ETH (45%)
      // Ops should get 125 ETH (25%)
      // Marketing should get 100 ETH (20%)
      // Treasury should get 50 ETH (10%)

      await splitter.releaseAll();

      expect(await splitter.released(devAddr)).to.equal(ethers.parseEther("225"));
      expect(await splitter.released(opsAddr)).to.equal(ethers.parseEther("125"));
      expect(await splitter.released(marketingAddr)).to.equal(ethers.parseEther("100"));
      expect(await splitter.released(treasuryAddr)).to.equal(ethers.parseEther("50"));
    });

    it("Should handle partial releases correctly", async function () {
      const Splitter = await ethers.getContractFactory("BashoodPaymentSplitter");
      const payees = [devAddr, opsAddr];
      const shares = [6000, 4000];
      splitter = await Splitter.deploy(payees, shares);
      await splitter.waitForDeployment();

      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("100")
      });

      // Release only dev wallet
      await splitter.release(devAddr);
      expect(await splitter.released(devAddr)).to.equal(ethers.parseEther("60"));
      
      // Ops not released yet
      expect(await splitter.released(opsAddr)).to.equal(0);
      
      // Ops can still claim later
      await splitter.release(opsAddr);
      expect(await splitter.released(opsAddr)).to.equal(ethers.parseEther("40"));
    });
  });
});
