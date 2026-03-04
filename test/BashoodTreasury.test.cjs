/**
 * test/BashoodTreasury.test.cjs
 *
 * Tests para BashoodTreasury — governance-gated protocol treasury
 *
 * Cubre:
 *  ✅ Deployment y roles correctos
 *  ✅ receive() acepta ETH
 *  ✅ spendBHT() solo SPENDER_ROLE
 *  ✅ spendETH() solo SPENDER_ROLE
 *  ✅ Account sin SPENDER_ROLE no puede gastar
 *  ✅ Validaciones: InvalidRecipient, InvalidAmount, InsufficientBHT/ETH
 *  ✅ bhtBalance() y ethBalance() views
 *  ✅ Admin puede grant/revoke SPENDER_ROLE
 */

"use strict";

const { expect }   = require("chai");
const { ethers }   = require("hardhat");

describe("BashoodTreasury", function () {
  let token, treasury;
  let owner, admin, spender, alice, attacker;

  const SPENDER_ROLE = ethers.id("SPENDER_ROLE");

  beforeEach(async function () {
    [owner, admin, spender, alice, attacker] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("BashoodToken");
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const BashoodTreasury = await ethers.getContractFactory("BashoodTreasury");
    treasury = await BashoodTreasury.deploy(
      await token.getAddress(),
      admin.address,    // DEFAULT_ADMIN_ROLE → Gnosis Safe (here: admin signer)
      spender.address   // SPENDER_ROLE       → BashoodTimelock (here: spender signer)
    );
    await treasury.waitForDeployment();
  });

  // ─── Deployment ───────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("admin has DEFAULT_ADMIN_ROLE", async function () {
      const DEFAULT_ADMIN = await treasury.DEFAULT_ADMIN_ROLE();
      expect(await treasury.hasRole(DEFAULT_ADMIN, admin.address)).to.equal(true);
    });

    it("spender has SPENDER_ROLE", async function () {
      expect(await treasury.hasRole(SPENDER_ROLE, spender.address)).to.equal(true);
    });

    it("deployer does NOT have SPENDER_ROLE", async function () {
      expect(await treasury.hasRole(SPENDER_ROLE, owner.address)).to.equal(false);
    });

    it("bht address is set correctly", async function () {
      expect(await treasury.bht()).to.equal(await token.getAddress());
    });
  });

  // ─── Receive ETH ──────────────────────────────────────────────────────────
  describe("receive() ETH", function () {
    it("accepts ETH transfers", async function () {
      const amount = ethers.parseEther("1");
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: amount,
      });
      expect(await treasury.ethBalance()).to.equal(amount);
    });
  });

  // ─── spendBHT() ───────────────────────────────────────────────────────────
  describe("spendBHT()", function () {
    const BHT_AMOUNT = ethers.parseEther("100");

    beforeEach(async function () {
      // Fund treasury with BHT (owner has 1B BHT)
      await token.connect(owner).transfer(await treasury.getAddress(), BHT_AMOUNT * 2n);
    });

    it("SPENDER_ROLE can spend BHT", async function () {
      const bal = await token.balanceOf(await treasury.getAddress());
      expect(bal).to.be.gt(0n);

      const before = await token.balanceOf(alice.address);
      await treasury.connect(spender).spendBHT(alice.address, bal / 2n, "Test payment");
      const after = await token.balanceOf(alice.address);
      expect(after).to.be.gt(before);
    });

    it("emits BHTSpent event", async function () {
      const bal = await token.balanceOf(await treasury.getAddress());
      await expect(
        treasury.connect(spender).spendBHT(alice.address, 1n, "Test")
      ).to.emit(treasury, "BHTSpent");
    });

    it("reverts if caller has no SPENDER_ROLE", async function () {
      const bal = await token.balanceOf(await treasury.getAddress());
      await expect(
        treasury.connect(attacker).spendBHT(attacker.address, bal, "steal")
      ).to.be.reverted;
    });

    it("reverts if recipient is address(0)", async function () {
      await expect(
        treasury.connect(spender).spendBHT(ethers.ZeroAddress, 1n, "x")
      ).to.be.revertedWithCustomError(treasury, "InvalidRecipient");
    });

    it("reverts if amount is 0", async function () {
      await expect(
        treasury.connect(spender).spendBHT(alice.address, 0n, "x")
      ).to.be.revertedWithCustomError(treasury, "InvalidAmount");
    });

    it("reverts if insufficient BHT balance", async function () {
      const bal = await token.balanceOf(await treasury.getAddress());
      await expect(
        treasury.connect(spender).spendBHT(alice.address, bal + 1n, "too much")
      ).to.be.revertedWithCustomError(treasury, "InsufficientBHT");
    });
  });

  // ─── spendETH() ───────────────────────────────────────────────────────────
  describe("spendETH()", function () {
    const ETH_AMOUNT = ethers.parseEther("1");

    beforeEach(async function () {
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ETH_AMOUNT * 2n,
      });
    });

    it("SPENDER_ROLE can spend ETH", async function () {
      const before = await ethers.provider.getBalance(alice.address);
      await treasury.connect(spender).spendETH(alice.address, ETH_AMOUNT, "grant");
      const after  = await ethers.provider.getBalance(alice.address);
      expect(after).to.be.gt(before);
    });

    it("emits ETHSpent event", async function () {
      await expect(
        treasury.connect(spender).spendETH(alice.address, ETH_AMOUNT, "grant")
      ).to.emit(treasury, "ETHSpent");
    });

    it("reverts if caller has no SPENDER_ROLE", async function () {
      await expect(
        treasury.connect(attacker).spendETH(attacker.address, ETH_AMOUNT, "steal")
      ).to.be.reverted;
    });

    it("reverts if recipient is address(0)", async function () {
      await expect(
        treasury.connect(spender).spendETH(ethers.ZeroAddress, 1n, "x")
      ).to.be.revertedWithCustomError(treasury, "InvalidRecipient");
    });

    it("reverts if insufficient ETH balance", async function () {
      const bal = await treasury.ethBalance();
      await expect(
        treasury.connect(spender).spendETH(alice.address, bal + 1n, "too much")
      ).to.be.revertedWithCustomError(treasury, "InsufficientETH");
    });
  });

  // ─── Views ────────────────────────────────────────────────────────────────
  describe("Views", function () {
    it("bhtBalance() returns token balance", async function () {
      expect(await treasury.bhtBalance()).to.equal(0n);
      await token.connect(owner).transfer(
        await treasury.getAddress(),
        ethers.parseEther("50")
      );
      expect(await treasury.bhtBalance()).to.be.gt(0n);
    });

    it("ethBalance() returns ETH balance", async function () {
      expect(await treasury.ethBalance()).to.equal(0n);
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1"),
      });
      expect(await treasury.ethBalance()).to.equal(ethers.parseEther("1"));
    });
  });

  // ─── Role management ──────────────────────────────────────────────────────
  describe("Role management", function () {
    it("admin can grant SPENDER_ROLE to new address", async function () {
      expect(await treasury.hasRole(SPENDER_ROLE, alice.address)).to.equal(false);
      await treasury.connect(admin).grantRole(SPENDER_ROLE, alice.address);
      expect(await treasury.hasRole(SPENDER_ROLE, alice.address)).to.equal(true);
    });

    it("admin can revoke SPENDER_ROLE", async function () {
      await treasury.connect(admin).revokeRole(SPENDER_ROLE, spender.address);
      expect(await treasury.hasRole(SPENDER_ROLE, spender.address)).to.equal(false);
    });

    it("non-admin cannot grant roles", async function () {
      await expect(
        treasury.connect(attacker).grantRole(SPENDER_ROLE, attacker.address)
      ).to.be.reverted;
    });
  });
});
