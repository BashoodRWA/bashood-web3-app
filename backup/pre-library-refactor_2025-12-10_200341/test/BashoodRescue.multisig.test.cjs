if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe("BashoodRescue - multisig project wallet flow", function () {
  let owner, alice, bob;
  let Rescue, rescue;
  let MultiSig, multisig;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    Rescue = await ethers.getContractFactory("BashoodRescue");
    rescue = await Rescue.deploy(owner.address, alice.address);
    await rescue.waitForDeployment();
  });

  it("multisig requires approvals then can execute claim and withdraw", async function () {
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    // fund rescue
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('1') });

    // deploy multisig with owners [owner, bob], threshold 2
    MultiSig = await ethers.getContractFactory("contracts/mocks/MockProjectWalletMultiSig.sol:MockProjectWalletMultiSig");
    multisig = await MultiSig.deploy([await owner.getAddress(), await bob.getAddress()], 2);
    await multisig.waitForDeployment();

    // set project wallet to multisig
    await rescue.connect(owner).setProjectWallet(await multisig.getAddress());

    // schedule withdrawal
    await rescue.connect(alice).emergencyWithdrawETH();

    // trying to execute before approvals should revert
    await expect(multisig.executeClaim(await rescue.getAddress())).to.be.revertedWith("Multisig: insufficient approvals");

    // owners approve
    await multisig.connect(owner).approve();
    await multisig.connect(bob).approve();

    // execute claim now
    await multisig.executeClaim(await rescue.getAddress());

    // pending must be zero now
    const pending = await rescue.pendingWithdrawals(await multisig.getAddress());
    expect(pending).to.equal(0);

    // multisig balance should have increased
    const msBal = await ethers.provider.getBalance(await multisig.getAddress());
    expect(msBal).to.be.gt(0);

    // multisig owner can withdraw to EOA
    const beforeOwnerBal = await ethers.provider.getBalance(await owner.getAddress());
    // withdraw a tiny amount
    await multisig.connect(owner).withdrawTo(await owner.getAddress(), ethers.parseEther('0.5'));
    const afterOwnerBal = await ethers.provider.getBalance(await owner.getAddress());
    expect(afterOwnerBal).to.be.gt(beforeOwnerBal);
  });
});






