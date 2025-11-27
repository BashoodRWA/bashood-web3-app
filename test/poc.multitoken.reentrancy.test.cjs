const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoC: BashoodMultiToken mintAllNFTs reentrancy attempt", function () {
  it("should NOT allow withdrawFunds to succeed during mintAllNFTs (ReentrancyGuard)", async function () {
    const [deployer] = await ethers.getSigners();

    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
  await multi.waitForDeployment();

  const multiAddr = (typeof multi.getAddress === 'function') ? await multi.getAddress() : multi.address;
  console.log('multi.address', multi.address);
  console.log('multiAddr', multiAddr);

  // Fund the contract with some ETH so withdrawFunds has something to send
  // Use the payable buyTokens function which accepts ETH
  await multi.buyTokens({ value: ethers.parseEther("1") });

    // Deploy attacker and set it as owner by transferring ownership (Ownable initialOwner was set to deployer)
    const Att = await ethers.getContractFactory("AttackerReceiver");
    const att = await Att.deploy();
    await att.waitForDeployment();

  const attAddr = (typeof att.getAddress === 'function') ? await att.getAddress() : att.address;
  console.log('att.address', att.address);
  console.log('attAddr', attAddr);

  // Transfer ownership of multi to attacker contract (attAddr)
  await multi.transferOwnership(attAddr);

  // Attach target address on attacker
  await att.setTarget(multiAddr);

  // Sanity checks
  expect(await multi.owner()).to.equal(attAddr);

    // Run the attack: attacker.attack() will call mintAllNFTs, and in the ERC1155 receiver hook
    // try to call withdrawFunds. The withdraw should revert due to ReentrancyGuard and not succeed.
    await att.attack();

    // Read flags
    const withdrawAttempted = await att.withdrawAttempted();
    const withdrawSucceeded = await att.withdrawSucceeded();

    // The attacker should have attempted the withdraw, but it should not have succeeded
    expect(withdrawAttempted).to.equal(true);
    expect(withdrawSucceeded).to.equal(false);
  });
});






