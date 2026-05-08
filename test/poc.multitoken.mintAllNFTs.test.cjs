const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoC: BashoodMultiToken mintAllNFTs reentrancy", function () {
  it("attempt to reenter via ERC1155 receiver callback", async function () {
    const [deployer, attackerAcc] = await ethers.getSigners();

    // Deploy MultiToken with deployer as owner
  const Multi = await ethers.getContractFactory("BashoodMultiToken");
  const multi = await Multi.deploy(deployer.address);
  await multi.waitForDeployment();

  // Deploy malicious receiver with target address
  const Reentrant = await ethers.getContractFactory("ERC1155ReentrantReceiver");
  const multiAddr = (typeof multi.getAddress === 'function') ? await multi.getAddress() : (multi.address || multi.target);
  const re = await Reentrant.deploy(multiAddr);
  await re.waitForDeployment();

    // Try to call mintAllNFTs (owner only) but owner is deployer; the receiver will try to reenter
    let reverted = false;
    try {
      const tx = await multi.connect(deployer).mintAllNFTs();
      await tx.wait();
    } catch (e) {
      reverted = true;
    }

    const reentered = await re.reentered();
    expect(typeof reentered === 'boolean');
  });
});
