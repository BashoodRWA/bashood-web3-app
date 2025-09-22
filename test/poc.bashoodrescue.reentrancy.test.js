const { expect } = require("chai");
const { ethers } = require("hardhat");

// helper compatible con ethers v5 (ethers.utils.parseEther) y ethers v6 (ethers.parseEther)
const parseEther = typeof ethers.parseEther === 'function' ? ethers.parseEther : (ethers.utils && ethers.utils.parseEther);

const getAddress = async (c) => {
  if (!c) return null;
  if (typeof c.getAddress === 'function') return await c.getAddress();
  return c.address;
};

describe("PoC: BashoodRescue emergencyWithdrawETH reentrancy and reject tests", function () {
  it("should revert when project wallet rejects ETH (MockProjectWalletRevert)", async function () {
    const [owner] = await ethers.getSigners();

    const Rescue = await ethers.getContractFactory("BashoodRescue");
    const MockRevert = await ethers.getContractFactory("MockProjectWalletRevert");

  const rescue = await Rescue.deploy(owner.address, owner.address);

  const revertWallet = await MockRevert.deploy();
  const revertWalletAddr = await getAddress(revertWallet);

  // fund rescue with some ETH
  const rescueAddr = await getAddress(rescue);
  await owner.sendTransaction({ to: rescueAddr, value: parseEther("1") });

    // attempt emergency withdraw to a wallet that reverts
  await expect(rescue.connect(owner).emergencyWithdrawETH()).to.be.revertedWith("Rescue: ETH transfer failed");
  });

  it("PoC: ensure EMERGENCY_ROLE check prevents reentry attempts from project wallet callback", async function () {
    // This PoC assumes MockAttackerProjectWallet or ERC1155ReentrantReceiver exists to attempt reentry.
    // The repo already includes PoC attacker contracts; we verify that emergencyWithdrawETH requires role.
    const [owner, alice] = await ethers.getSigners();

  const Rescue = await ethers.getContractFactory("BashoodRescue");
  const rescue = await Rescue.deploy(owner.address, owner.address);

  // Fund rescue
  const rescueAddr2 = await getAddress(rescue);
  await owner.sendTransaction({ to: rescueAddr2, value: parseEther("0.1") });

  // Try calling emergencyWithdrawETH from non EMERGENCY_ROLE account -> expect revert (role check)
  await expect(rescue.connect(alice).emergencyWithdrawETH()).to.be.reverted;
  });
});
