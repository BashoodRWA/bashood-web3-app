const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Mock: RejectingWallet helper and receive/fallback behavior', function () {
  it('reverts on plain ether receive', async function () {
    const Reject = await ethers.getContractFactory('RejectingWallet');
    const reject = await Reject.deploy();
    await reject.waitForDeployment();

    // sending ETH to the contract should revert (use a signer to send tx)
    const [sender] = await ethers.getSigners();
    await expect(
      sender.sendTransaction({
        to: await reject.getAddress(),
        value: ethers.parseEther('0.001')
      })
    ).to.be.rejected;
  });

  it('callWithdraw bubbles revert reason from target', async function () {
    const [deployer] = await ethers.getSigners();
    // deploy a simple contract that has withdrawFunds which reverts with 'Transfer failed'
    const Multi = await ethers.getContractFactory('BashoodMultiToken');
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    // fund contract so withdrawFunds will attempt transfer
    await multi.connect(deployer).buyTokens({ value: ethers.parseEther('0.01') });

    const Reject = await ethers.getContractFactory('RejectingWallet');
    const reject = await Reject.deploy();
    await reject.waitForDeployment();

    // transfer ownership of multi to rejecting wallet address
    const rAddr = await reject.getAddress();
    await multi.connect(deployer).transferOwnership(rAddr);

    // now callWithdraw should call multi.withdrawFunds() from the rejecting contract and bubble the revert
    await expect(reject.callWithdraw(await multi.getAddress())).to.be.rejected;
  });
});
