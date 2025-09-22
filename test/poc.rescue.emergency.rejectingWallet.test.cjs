if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe('PoC: BashoodRescue.emergencyWithdrawETH -> recipient rejects ETH', function () {
  it('reverts when project wallet rejects plain ETH (simulate transfer failure)', async function () {
    const [owner, admin, emergency, attacker] = await ethers.getSigners();

    const Rescue = await ethers.getContractFactory('BashoodRescue');
    // constructor(admin, emergency)
    const rescue = await Rescue.deploy(admin.address, emergency.address);
    await rescue.waitForDeployment();

    // Deploy a RejectingWallet that reverts on receive()
    const Rejecting = await ethers.getContractFactory('contracts/mocks/RejectingWallet.sol:RejectingWallet');
    const rejecting = await Rejecting.deploy();
    await rejecting.waitForDeployment();

    // fund the rescue contract with some ETH
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.1') });

    // The emergency signer has EMERGENCY_ROLE per constructor - call emergencyWithdrawETH pointing to rejecting wallet
  await expect(rescue.connect(emergency).emergencyWithdrawETH())
      .to.be.revertedWith('Rescue: ETH transfer failed');
  });
});
