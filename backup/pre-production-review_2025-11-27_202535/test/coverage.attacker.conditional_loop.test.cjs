const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Coverage: AttackerConditional & AttackerLoop", function () {
  it("AttackerConditional acts only on data flag", async function () {
    const [deployer] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    const AttCond = await ethers.getContractFactory("AttackerConditional");
    const att = await AttCond.deploy();
    await att.waitForDeployment();

    await att.connect(deployer).setTarget(await multi.getAddress ? await multi.getAddress() : multi.address);

    // Call hook with non-flag data -> no withdraw attempt
    await att.onERC1155Received(deployer.address, deployer.address, 1, 1, '0x00');
    let withdrew = await att.withdrew();
    expect(withdrew).to.equal(false);

    // Call hook with flag data -> attempts withdraw but should fail
    await att.onERC1155Received(deployer.address, deployer.address, 1, 1, '0x01');
    withdrew = await att.withdrew();
    expect(withdrew).to.equal(false);
  });

  it("AttackerLoop attempts multiple withdraws but none succeed", async function () {
    const [deployer] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    const AttLoop = await ethers.getContractFactory("AttackerLoop");
    const att = await AttLoop.deploy();
    await att.waitForDeployment();

    await att.connect(deployer).setTarget(await multi.getAddress ? await multi.getAddress() : multi.address);

    // Simulate single onERC1155Received call which loops 5 times
    await att.onERC1155Received(deployer.address, deployer.address, 1, 1, '0x');

    const attempts = await att.attempts();
    const successes = await att.successes();
    expect(attempts).to.equal(5);
    expect(successes).to.equal(0);
  });
});






