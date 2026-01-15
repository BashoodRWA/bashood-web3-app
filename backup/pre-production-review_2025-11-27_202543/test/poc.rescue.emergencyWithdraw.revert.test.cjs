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
  // Set project wallet on rescue to the reverting wallet
  await rescue.connect(deployer).setProjectWallet(revAddr);
    // With pull-payment the withdrawal is scheduled instead of sent immediately
    await expect(rescueWithEmergency.emergencyWithdrawETH()).to.emit(rescue, 'EmergencyEthWithdrawalScheduled');
    const pending = await rescue.pendingWithdrawals(revAddr);
    expect(pending).to.equal(ethers.parseEther("0.5"));
  });
});






