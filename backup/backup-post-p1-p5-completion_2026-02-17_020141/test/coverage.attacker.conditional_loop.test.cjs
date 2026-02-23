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

  it("AttackerConditional: covers onERC1155BatchReceived", async function () {
    const [deployer] = await ethers.getSigners();
    const AttCond = await ethers.getContractFactory("AttackerConditional");
    const att = await AttCond.deploy();
    await att.waitForDeployment();

    // Call batch received hook - should return selector
    const result = await att.onERC1155BatchReceived(
      deployer.address,
      deployer.address,
      [1, 2],
      [1, 1],
      '0x'
    );
    
    const expectedSelector = att.interface.getFunction("onERC1155BatchReceived").selector;
    expect(result).to.equal(expectedSelector);
  });

  it("AttackerConditional: covers supportsInterface returning false", async function () {
    const AttCond = await ethers.getContractFactory("AttackerConditional");
    const att = await AttCond.deploy();
    await att.waitForDeployment();

    // Should return false for any interface
    const supports = await att.supportsInterface('0x01ffc9a7'); // ERC165 interface ID
    expect(supports).to.equal(false);
  });

  it("AttackerConditional: attack() reverts when target not set", async function () {
    const AttCond = await ethers.getContractFactory("AttackerConditional");
    const att = await AttCond.deploy();
    await att.waitForDeployment();

    // Should revert with "target not set"
    await expect(att.attack()).to.be.revertedWith("target not set");
  });

  it("AttackerConditional: attack() calls mintAllNFTs when target set", async function () {
    const [deployer] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    const AttCond = await ethers.getContractFactory("AttackerConditional");
    const att = await AttCond.deploy();
    await att.waitForDeployment();

    await att.connect(deployer).setTarget(await multi.getAddress ? await multi.getAddress() : multi.address);

    // attack() calls mintAllNFTs which has onlyOwner modifier, so it will revert
    // But the attack() function itself executes, covering line 59
    await expect(att.attack()).to.be.reverted;
  });

  it("AttackerConditional: setTarget only by deployer", async function () {
    const [deployer, alice] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    const AttCond = await ethers.getContractFactory("AttackerConditional");
    const att = await AttCond.deploy();
    await att.waitForDeployment();

    // Non-deployer should fail
    await expect(
      att.connect(alice).setTarget(await multi.getAddress ? await multi.getAddress() : multi.address)
    ).to.be.revertedWith("only deployer");
    
    // Deployer should succeed
    await expect(
      att.connect(deployer).setTarget(await multi.getAddress ? await multi.getAddress() : multi.address)
    ).to.not.be.reverted;
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






