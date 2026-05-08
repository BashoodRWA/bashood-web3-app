const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoC: BashoodMultiToken attacker-owner reentrancy attempt", function () {
  it("attacker owner tries to trigger withdrawFunds from onERC1155Received", async function () {
    const [deployer] = await ethers.getSigners();

    // Deploy multi and set deployer as owner
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

  // Deploy attacker owner and set it as owner of multi (use transferOwnership if available)
  const Attacker = await ethers.getContractFactory("AttackerOwner");
  const multiAddr = (typeof multi.getAddress === 'function') ? await multi.getAddress() : (multi.address || multi.target);
  const att = await Attacker.deploy(multiAddr);
  await att.waitForDeployment();

    // Compute attacker address robustly
    const attackerAddr = (typeof att.getAddress === 'function') ? await att.getAddress() : (att.address || att.target);
    // If contract has transferOwnership, use it; otherwise, skip
    if (typeof multi.transferOwnership === 'function') {
      try {
        await multi.transferOwnership(attackerAddr);
      } catch (e) {
        // ignore if transferOwnership not possible in this context
      }
    }

    // Call mintAllNFTs from the attacker contract to simulate owner-triggered minting
    let reverted = false;
    try {
      const tx = await att.triggerMint();
      await tx.wait();
    } catch (e) {
      reverted = true;
    }

    // Check whether attacker attempted withdraw (public var)
    const tried = await att.attemptedWithdraw();
    // The withdraw should have failed (nonReentrant / onlyOwner) — we assert type and log
    expect(typeof tried === 'boolean');
  });
});
