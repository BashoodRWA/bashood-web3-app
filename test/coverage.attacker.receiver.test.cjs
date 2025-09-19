const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Coverage: AttackerReceiver", function () {
  it("covers attack and hook withdraw attempt", async function () {
    const [deployer] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    const Att = await ethers.getContractFactory("AttackerReceiver");
    const att = await Att.deploy();
    await att.waitForDeployment();
    const multiAddr = (typeof multi.getAddress === 'function') ? await multi.getAddress() : multi.address;
    const attAddr = (typeof att.getAddress === 'function') ? await att.getAddress() : att.address;

    // set target on attacker and make attacker the owner so attack() calls mintAllNFTs as this contract
    await att.connect(deployer).setTarget(multiAddr);
    await multi.transferOwnership(attAddr);

    // run attack: will call mintAllNFTs and trigger onERC1155Received
    await att.attack();

    const attempted = await att.withdrawAttempted();
    const succeeded = await att.withdrawSucceeded();
    expect(attempted).to.equal(true);
    expect(succeeded).to.equal(false);
  });
});
