if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe("BashoodRescue - claim edge cases (reentrancy / revert / duplicate)", function () {
  let owner, alice, bob;
  let Rescue, rescue;
  let Reentrant, reentrant;
  let ClaimCaller, claimCaller;
  let RevertMock, revertMock;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    Rescue = await ethers.getContractFactory("BashoodRescue");
    rescue = await Rescue.deploy(owner.address, alice.address);
    await rescue.waitForDeployment();

    Reentrant = await ethers.getContractFactory("contracts/mocks/MockProjectWalletReentrant.sol:MockProjectWalletReentrant");
    ClaimCaller = await ethers.getContractFactory("contracts/mocks/MockProjectWalletClaimCaller.sol:MockProjectWalletClaimCaller");
    RevertMock = await ethers.getContractFactory("contracts/mocks/MockProjectWalletRevert.sol:MockProjectWalletRevert");
  });

  it("claim resists reentrancy: reentrant contract attempt fails and leaves pending intact", async function () {
    // fund rescue contract
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('1') });

    // deploy reentrant project wallet and set it
    reentrant = await Reentrant.deploy(rescueAddr);
    await reentrant.waitForDeployment();

    // set project wallet (owner has ADMIN_ROLE)
    await rescue.connect(owner).setProjectWallet(await reentrant.getAddress());

    // schedule emergency withdrawal by alice (EMERGENCY_ROLE)
    await rescue.connect(alice).emergencyWithdrawETH();

    // attempt to claim from the reentrant contract; current behavior is that
    // the inner reentry causes the receive to revert and the outer call fails
    await expect(reentrant.doClaim()).to.be.revertedWith("Rescue: ETH transfer failed");

    // because the claim reverted, state is rolled back and the pending withdrawal remains
    const pending = await rescue.pendingWithdrawals(await reentrant.getAddress());
    expect(pending).to.be.gt(0);
  });

  it("claim reverts when project wallet rejects ETH", async function () {
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    // fund rescue
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.5') });

    // deploy a new mock that calls claim and reverts on receive
    const RevertCallerFactory = await ethers.getContractFactory("contracts/mocks/MockProjectWalletRevertCaller.sol:MockProjectWalletRevertCaller");
    const revertCaller = await RevertCallerFactory.deploy();
    await revertCaller.waitForDeployment();

    // set project wallet to our revert-caller contract
    await rescue.connect(owner).setProjectWallet(await revertCaller.getAddress());

    // schedule withdrawal
    await rescue.connect(alice).emergencyWithdrawETH();

    // attempt to call claim from the revert-caller; should revert due to transfer failing
    await expect(revertCaller.doClaim(await rescue.getAddress())).to.be.revertedWith("Rescue: ETH transfer failed");
  });

  it("duplicate claims are prevented: second claim fails with no pending", async function () {
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.2') });

    // deploy a simple claim-caller
    claimCaller = await ClaimCaller.deploy();
    await claimCaller.waitForDeployment();

    await rescue.connect(owner).setProjectWallet(await claimCaller.getAddress());
    await rescue.connect(alice).emergencyWithdrawETH();

    // first claim should succeed
    await claimCaller.doClaim(await rescue.getAddress());

    // second claim should revert because pending is zero
    await expect(claimCaller.doClaim(await rescue.getAddress())).to.be.revertedWith("Rescue: no pending withdrawal");
  });
});






