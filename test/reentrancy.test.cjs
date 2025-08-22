const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy demo: vulnerable vs protected", function () {
  it("attacker can drain vulnerable contract but not protected one", async function () {
    const [deployer, attacker] = await ethers.getSigners();

    // Deploy vulnerable contract
    const Vulnerable = await ethers.getContractFactory("LibraVulnerable");
    const vulnerable = await Vulnerable.deploy();
    await vulnerable.waitForDeployment();

    // Deploy attacker
    const Attacker = await ethers.getContractFactory("AttackerReentrancy");
    const attackerContract = await Attacker.deploy(await vulnerable.getAddress());
    await attackerContract.waitForDeployment();

  // Deposit some funds from deployer (single deposit)
  const seed = ethers.parseEther("2");
  await vulnerable.connect(deployer).deposit({ value: seed });

  // Attacker funds and starts attack
  const send = ethers.parseEther("1");
  await attackerContract.connect(attacker).attack({ value: send });

  // After attack, vulnerable contract should have less balance (some drained)
  const vulnBal = await vulnerable.contractBalance();
  expect(vulnBal).to.be.lt(seed);

  // The attacker contract should have increased its balance (drained funds)
  const attackerContractBal = await ethers.provider.getBalance(await attackerContract.getAddress());
  expect(attackerContractBal).to.be.gt(send);
    // Now deploy protected Libra (nonReentrant)
    const Libra = await ethers.getContractFactory("Libra");
    const libra = await Libra.deploy();
    await libra.waitForDeployment();

    // Deploy attacker pointed at protected contract
    const attacker2 = await Attacker.deploy(await libra.getAddress());
    await attacker2.waitForDeployment();

  // Seed protected contract
  await libra.connect(deployer).deposit({ value: seed });

  // Attempting attack should revert and not drain the protected contract
  await expect(attacker2.connect(attacker).attack({ value: send })).to.be.reverted;
  const libBal = await libra.contractBalance();
  expect(libBal).to.equal(seed);
  });
});
