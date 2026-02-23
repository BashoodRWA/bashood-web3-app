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

  // Deploy a MockProjectWalletRevertCaller that will call claim and revert on receive()
  const MockRevertCaller = await ethers.getContractFactory('contracts/mocks/MockProjectWalletRevertCaller.sol:MockProjectWalletRevertCaller');
  const rejecting = await MockRevertCaller.deploy();
  await rejecting.waitForDeployment();

    // fund the rescue contract with some ETH
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.1') });

    // The emergency signer has EMERGENCY_ROLE per constructor - schedule the withdrawal to the rejecting contract
  await rescue.connect(admin).setProjectWallet(await rejecting.getAddress());
  await expect(rescue.connect(emergency).emergencyWithdrawETH()).to.emit(rescue, 'EmergencyEthWithdrawalScheduled');

  // attempt to claim from the rejecting contract: this will call claimEmergencyWithdrawal() from that contract
  await expect(rejecting.doClaim(await rescue.getAddress ? await rescue.getAddress() : rescue.address))
      .to.be.revertedWith('Rescue: ETH transfer failed');
  });
});






