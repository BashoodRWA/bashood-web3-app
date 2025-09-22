const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoC: BashoodRescue emergencyWithdrawETH revert path", function () {
  it("should revert when projectWallet rejects ETH", async function () {
    const [deployer, emergency] = await ethers.getSigners();

    const Rescue = await ethers.getContractFactory("BashoodRescue");
    const rescue = await Rescue.deploy(deployer.address, emergency.address);
    await rescue.waitForDeployment();

    // Fund rescue
    const rescueAddr = (typeof rescue.getAddress === 'function') ? await rescue.getAddress() : (rescue.address || rescue.target);
    await deployer.sendTransaction({ to: rescueAddr, value: ethers.parseEther("0.5") });

    // Deploy wallet that reverts on receive
    const RevertWallet = await ethers.getContractFactory("MockProjectWalletRevert");
    const rev = await RevertWallet.deploy();
    await rev.waitForDeployment();

    // Call emergencyWithdrawETH and expect revert
    const rescueWithEmergency = rescue.connect(emergency);
    const revAddr = (typeof rev.getAddress === 'function') ? await rev.getAddress() : (rev.address || rev.target);
  await expect(rescueWithEmergency.emergencyWithdrawETH()).to.be.revertedWith("Rescue: ETH transfer failed");
  });
});
