const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Libra - ReentrancyGuard example", function () {
  it("allows deposit and withdraw normally", async function () {
    const [deployer, user] = await ethers.getSigners();
    const Libra = await ethers.getContractFactory("Libra");
    const libra = await Libra.deploy();
    await libra.waitForDeployment();
    const depositAmount = ethers.parseEther("1.0");

    // Deposits via the contract's deposit() function
    await expect(() => libra.connect(deployer).deposit({ value: depositAmount }))
      .to.changeEtherBalances([deployer, libra], [ -depositAmount, depositAmount ]);

    await expect(() => libra.connect(user).deposit({ value: depositAmount }))
      .to.changeEtherBalances([user, libra], [ -depositAmount, depositAmount ]);

    // Check internal ledger for user
    expect(await libra.balanceOf(user.address)).to.equal(depositAmount);

    const prevContractBal = await libra.contractBalance();
    await expect(() => libra.connect(user).withdraw(depositAmount))
      .to.changeEtherBalances([user, libra], [ depositAmount, -depositAmount ]);

    expect(await libra.contractBalance()).to.equal(prevContractBal - depositAmount);
  });
});
