const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Coverage: AttackerBatch", function () {
  it("covers setTarget, attack revert, hooks, supportsInterface", async function () {
    const [deployer, other] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    const Att = await ethers.getContractFactory("AttackerBatch");
    const att = await Att.deploy();
    await att.waitForDeployment();

    // attack should revert if target not set
    await expect(att.attack()).to.be.revertedWith("target not set");

    // only deployer can set target
    await expect(att.connect(other).setTarget(multi.target)).to.be.reverted;

    // set target correctly from deployer
    await att.connect(deployer).setTarget(await multi.getAddress ? await multi.getAddress() : multi.address);

    // call supportsInterface to cover that path
    const ok = await att.supportsInterface('0x01ffc9a7');
    expect(ok).to.equal(false);

    // simulate ERC1155 batch hook directly (operator, from, ids, values, data)
    await att.onERC1155BatchReceived(deployer.address, deployer.address, [1,2], [1,1], '0x');

    const attempted = await att.withdrawAttempted();
    const succeeded = await att.withdrawSucceeded();

    expect(attempted).to.equal(true);
    // withdraw should not succeed because ReentrancyGuard prevents it
    expect(succeeded).to.equal(false);
  });
});






