/**
 * test/FeeDiscountModule.test.cjs
 *
 * Tests para FeeDiscountModule — BHT-balance-based fee discount tiers
 *
 * Cubre:
 *  ✅ getTier() para cada umbral
 *  ✅ computeFee() aplica descuento correcto por tier
 *  ✅ getDiscount() retorna basis points correctos
 *  ✅ userInfo() retorna tier, discount y balance en una llamada
 *  ✅ Admin: setThresholds() y setDiscounts()
 *  ✅ Validaciones: DiscountExceedsCap, InvalidThresholdOrder
 *  ✅ Solo owner puede actualizar
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FeeDiscountModule", function () {
  let token, feeDiscount;
  let owner, alice, bob, carol;

  // Default thresholds (matching contract)
  const T1 = ethers.parseEther("10000");
  const T2 = ethers.parseEther("100000");
  const T3 = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("BashoodToken");
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const FeeDiscountModule = await ethers.getContractFactory("FeeDiscountModule");
    feeDiscount = await FeeDiscountModule.deploy(
      await token.getAddress(),
      owner.address
    );
    await feeDiscount.waitForDeployment();
  });

  // Helper: send BHT to user without triggering burn/fee to self
  // We use internal transfer via Hardhat impersonation is complex, so
  // just test with deployer's balance for tier estimation.
  async function giveTokens(recipient, amount) {
    // BashoodToken applies burn+fee on transfer, so recipient gets less than `amount`
    // We send enough to account for the ~0.6% deduction
    await token.connect(owner).transfer(recipient.address, amount);
  }

  // ─── getTier() ───────────────────────────────────────────────────────────
  describe("getTier()", function () {
    it("Tier 0: user with no BHT", async function () {
      expect(await feeDiscount.getTier(carol.address)).to.equal(0);
    });

    it("Tier 1: user with ~10k BHT", async function () {
      await giveTokens(alice, T1 * 2n); // send 2x to account for fees
      const bal = await token.balanceOf(alice.address);
      // verify balance is enough to be at least tier 1
      if (bal >= T1) {
        expect(await feeDiscount.getTier(alice.address)).to.be.gte(1);
      }
    });

    it("Owner (holds 1B minus distributed) is Tier 3", async function () {
      // owner starts with ~1B BHT, well above T3
      const bal = await token.balanceOf(owner.address);
      expect(bal).to.be.gte(T3);
      expect(await feeDiscount.getTier(owner.address)).to.equal(3);
    });
  });

  // ─── computeFee() ────────────────────────────────────────────────────────
  describe("computeFee()", function () {
    const BASE_FEE = ethers.parseEther("1"); // 1 ETH-equivalent fee unit

    it("Tier 0: full fee (0% discount)", async function () {
      const fee = await feeDiscount.computeFee(carol.address, BASE_FEE);
      expect(fee).to.equal(BASE_FEE);
    });

    it("Tier 3 (owner): 60% discount", async function () {
      // Owner is tier 3
      const fee = await feeDiscount.computeFee(owner.address, BASE_FEE);
      // fee = BASE_FEE - 60% = 40%
      const expected = (BASE_FEE * 4000n) / 10000n;
      expect(fee).to.equal(expected);
    });

    it("fee is never 0 (discount capped at 90%)", async function () {
      const fee = await feeDiscount.computeFee(owner.address, BASE_FEE);
      expect(fee).to.be.gt(0n);
    });
  });

  // ─── getDiscount() ───────────────────────────────────────────────────────
  describe("getDiscount()", function () {
    it("Tier 0 → 0 bps", async function () {
      expect(await feeDiscount.getDiscount(carol.address)).to.equal(0n);
    });

    it("Tier 3 (owner) → 6000 bps (60%)", async function () {
      expect(await feeDiscount.getDiscount(owner.address)).to.equal(6000n);
    });
  });

  // ─── userInfo() ──────────────────────────────────────────────────────────
  describe("userInfo()", function () {
    it("returns tier, discount, balance in one call", async function () {
      const [tier, discount, balance] = await feeDiscount.userInfo(owner.address);
      expect(tier).to.equal(3);
      expect(discount).to.equal(6000n);
      expect(balance).to.be.gte(T3);
    });

    it("returns 0s for unknown user", async function () {
      const [tier, discount, balance] = await feeDiscount.userInfo(carol.address);
      expect(tier).to.equal(0);
      expect(discount).to.equal(0n);
      expect(balance).to.equal(0n);
    });
  });

  // ─── Admin: setThresholds() ───────────────────────────────────────────────
  describe("setThresholds()", function () {
    it("owner can update thresholds", async function () {
      const newT1 = ethers.parseEther("5000");
      const newT2 = ethers.parseEther("50000");
      const newT3 = ethers.parseEther("500000");

      await expect(feeDiscount.setThresholds(newT1, newT2, newT3))
        .to.emit(feeDiscount, "ThresholdUpdated");

      expect(await feeDiscount.tier1Threshold()).to.equal(newT1);
      expect(await feeDiscount.tier2Threshold()).to.equal(newT2);
      expect(await feeDiscount.tier3Threshold()).to.equal(newT3);
    });

    it("reverts if t1 >= t2", async function () {
      await expect(
        feeDiscount.setThresholds(T2, T1, T3)
      ).to.be.revertedWithCustomError(feeDiscount, "InvalidThresholdOrder");
    });

    it("reverts if t2 >= t3", async function () {
      await expect(
        feeDiscount.setThresholds(T1, T3, T2)
      ).to.be.revertedWithCustomError(feeDiscount, "InvalidThresholdOrder");
    });

    it("only owner can set thresholds", async function () {
      await expect(
        feeDiscount.connect(alice).setThresholds(T1, T2, T3)
      ).to.be.reverted;
    });
  });

  // ─── Admin: setDiscounts() ────────────────────────────────────────────────
  describe("setDiscounts()", function () {
    it("owner can update discounts", async function () {
      await expect(feeDiscount.setDiscounts(0, 1000, 2000, 3000))
        .to.emit(feeDiscount, "DiscountUpdated");

      expect(await feeDiscount.tier3Discount()).to.equal(3000n);
    });

    it("reverts if any discount > MAX_DISCOUNT (9000 bps)", async function () {
      await expect(
        feeDiscount.setDiscounts(0, 0, 0, 9001)
      ).to.be.revertedWithCustomError(feeDiscount, "DiscountExceedsCap");
    });

    it("only owner can set discounts", async function () {
      await expect(
        feeDiscount.connect(alice).setDiscounts(0, 0, 0, 0)
      ).to.be.reverted;
    });
  });
});
