const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Coverage: BashoodToken branch tests", function () {
  let token, owner, treasury, alice, bob;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const PAUSE_DELAY = 86400; // 24h

  beforeEach(async function () {
    [owner, treasury, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("BashoodToken");
    token = await Token.deploy(treasury.address);
    await token.waitForDeployment();
  });

  // --- L82, L106: transfer/transferFrom with burnRate = 0 (burnAmount == 0 branch) ---
  it("transfer with burnRate=0 skips burn branch", async function () {
    await token.setBurnRate(0);
    const amount = ethers.parseEther("100");
    await token.transfer(alice.address, amount);
    // No burn should happen — only fee + send
    const aliceBalance = await token.balanceOf(alice.address);
    expect(aliceBalance).to.be.gt(0);
  });

  it("transferFrom with burnRate=0 skips burn branch", async function () {
    await token.setBurnRate(0);
    const amount = ethers.parseEther("100");
    await token.approve(alice.address, amount);
    await token.connect(alice).transferFrom(owner.address, bob.address, amount);
    expect(await token.balanceOf(bob.address)).to.be.gt(0);
  });

  // --- L115, L117: transfer/transferFrom with treasuryFee = 0 (feeAmount == 0 branch) ---
  it("transfer with treasuryFee=0 skips fee branch", async function () {
    await token.setTreasuryFee(0);
    const amount = ethers.parseEther("100");
    await token.transfer(alice.address, amount);
    expect(await token.balanceOf(alice.address)).to.be.gt(0);
  });

  it("transferFrom with treasuryFee=0 skips fee branch", async function () {
    await token.setTreasuryFee(0);
    const amount = ethers.parseEther("100");
    await token.approve(alice.address, amount);
    await token.connect(alice).transferFrom(owner.address, bob.address, amount);
    expect(await token.balanceOf(bob.address)).to.be.gt(0);
  });

  // --- L123: sendToStaking — staking contract not set ---
  it("sendToStaking reverts when staking contract not set", async function () {
    await expect(token.sendToStaking(ethers.parseEther("1")))
      .to.be.revertedWithCustomError(token, "InvalidStakingContract");
  });

  // --- L135: sendToStaking — not enough tokens ---
  it("sendToStaking reverts when contract has insufficient balance", async function () {
    await token.setStakingContract(alice.address);
    // Contract has 0 balance
    await expect(token.sendToStaking(ethers.parseEther("1")))
      .to.be.revertedWith("Not enough tokens");
  });

  // --- L152: setBurnRate — exceeds max ---
  it("setBurnRate reverts when exceeding max", async function () {
    await expect(token.setBurnRate(101))
      .to.be.revertedWith("Max 1% burn");
  });

  // --- L161: setTreasuryFee — exceeds max ---
  it("setTreasuryFee reverts when exceeding max", async function () {
    await expect(token.setTreasuryFee(201))
      .to.be.revertedWith("Max 2% fee");
  });

  // --- L168: setTreasuryWallet — zero address ---
  it("setTreasuryWallet reverts with zero address", async function () {
    await expect(token.setTreasuryWallet(ethers.ZeroAddress))
      .to.be.revertedWith("Invalid address");
  });

  // --- L221: executePause — no pause requested ---
  it("executePause reverts when no pause requested", async function () {
    await expect(token.executePause())
      .to.be.revertedWith("No pause requested");
  });

  // --- L221: executePause — timelock not expired ---
  it("executePause reverts when timelock still active", async function () {
    await token.requestPause();
    await expect(token.executePause())
      .to.be.revertedWith("Timelock active");
  });

  // --- L231: cancelPauseRequest — no pending request ---
  it("cancelPauseRequest reverts when no pending request", async function () {
    await expect(token.cancelPauseRequest())
      .to.be.revertedWith("No pause requested");
  });

  // --- L240: executeUnpause — no unpause requested ---
  it("executeUnpause reverts when no unpause requested", async function () {
    // First pause the contract
    await token.requestPause();
    await time.increase(PAUSE_DELAY + 1);
    await token.executePause();
    // Now try executeUnpause without requesting
    await expect(token.executeUnpause())
      .to.be.revertedWith("No unpause requested");
  });

  // --- L248: executeUnpause — timelock still active ---
  it("executeUnpause reverts when timelock still active", async function () {
    await token.requestPause();
    await time.increase(PAUSE_DELAY + 1);
    await token.executePause();
    await token.requestUnpause();
    await expect(token.executeUnpause())
      .to.be.revertedWith("Timelock active");
  });

  // --- L249: successful executeUnpause path ---
  it("executeUnpause succeeds after timelock expires", async function () {
    await token.requestPause();
    await time.increase(PAUSE_DELAY + 1);
    await token.executePause();
    await token.requestUnpause();
    await time.increase(PAUSE_DELAY + 1);
    await token.executeUnpause();
    expect(await token.paused()).to.equal(false);
  });

  // --- L258, L259: cancelUnpauseRequest — no pending request ---
  it("cancelUnpauseRequest reverts when no pending request", async function () {
    await token.requestPause();
    await time.increase(PAUSE_DELAY + 1);
    await token.executePause();
    await expect(token.cancelUnpauseRequest())
      .to.be.revertedWith("No unpause requested");
  });

  // --- cancelPauseRequest success path ---
  it("cancelPauseRequest succeeds when request pending", async function () {
    await token.requestPause();
    await token.cancelPauseRequest();
    expect(await token.pauseRequestTime()).to.equal(0);
  });

  // --- cancelUnpauseRequest success path ---
  it("cancelUnpauseRequest succeeds when request pending", async function () {
    await token.requestPause();
    await time.increase(PAUSE_DELAY + 1);
    await token.executePause();
    await token.requestUnpause();
    await token.cancelUnpauseRequest();
    expect(await token.unpauseRequestTime()).to.equal(0);
  });

  // --- periodicBurn with insufficient balance ---
  it("periodicBurn reverts when contract has insufficient balance", async function () {
    await expect(token.periodicBurn(ethers.parseEther("1")))
      .to.be.revertedWith("Not enough tokens to burn");
  });

  // --- sendToTreasury with insufficient balance ---
  it("sendToTreasury reverts when contract has insufficient balance", async function () {
    await expect(token.sendToTreasury(ethers.parseEther("1")))
      .to.be.revertedWith("Not enough tokens");
  });

  // --- setStakingContract zero address ---
  it("setStakingContract reverts with zero address", async function () {
    await expect(token.setStakingContract(ethers.ZeroAddress))
      .to.be.revertedWith("Invalid address");
  });

  // --- Non-owner access reverts ---
  it("non-owner cannot call owner functions", async function () {
    await expect(token.connect(alice).setBurnRate(0)).to.be.reverted;
    await expect(token.connect(alice).setTreasuryFee(0)).to.be.reverted;
    await expect(token.connect(alice).setTreasuryWallet(alice.address)).to.be.reverted;
    await expect(token.connect(alice).requestPause()).to.be.reverted;
  });
});
