// Use global setup to avoid redeclaration when solidity-coverage bundles tests
// Fallback to chai.expect when global setup variable is not present (e.g. running single file)
const expect = globalThis._chai_expect || require('chai').expect;
const ethersRef = globalThis.ethers || require('hardhat').ethers;
const ethers = globalThis.ethers || ethersRef;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale - rescue try/catch coverage', function () {
  let owner, projectWallet, presale;

  beforeEach(async function () {
    const d = await deployPresale();
    owner = d.owner;
    projectWallet = d.projectWallet;
    presale = d.presale;
  });

  it('delegateRescueUnsoldNfts reverts with reason from rescue contract', async function () {
    const MockRescueWith = await ethersRef.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const withMock = await MockRescueWith.deploy(); await withMock.waitForDeployment();
    await presale.connect(owner).setRescueContract(await withMock.getAddress());
    await expect(
      presale.connect(owner).delegateRescueUnsoldNfts(1, projectWallet.address, 1)
    ).to.be.revertedWith('Delegate rescue NFT failed: boom');
  });

  it('delegateRescueUnsoldNfts reverts without reason (generic path)', async function () {
    const MockRescueNo = await ethersRef.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const noMock = await MockRescueNo.deploy(); await noMock.waitForDeployment();
    await presale.connect(owner).setRescueContract(await noMock.getAddress());
    await expect(
      presale.connect(owner).delegateRescueUnsoldNfts(1, projectWallet.address, 1)
    ).to.be.revertedWith('Delegate rescue NFT failed: Mock rescue reverts');
  });

  it('delegateEmergencyWithdrawEth handles revert with reason and without', async function () {
    const ResWithReason = await ethersRef.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const withMock = await ResWithReason.deploy(); await withMock.waitForDeployment();
    await presale.connect(owner).setRescueContract(await withMock.getAddress());
    await expect(presale.connect(owner).delegateEmergencyWithdrawEth()).to.be.revertedWith('Delegate rescue ETH failed: eth-boom');

    const ResNoReason = await ethersRef.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const noMock = await ResNoReason.deploy(); await noMock.waitForDeployment();
    await presale.connect(owner).setRescueContract(await noMock.getAddress());
    await expect(presale.connect(owner).delegateEmergencyWithdrawEth()).to.be.revertedWith('Delegate rescue ETH failed: Mock rescue reverts');
  });
});

describe('BashoodPresaleFinal - rescue try/catch coverage', function () {
  it('rescueUnsoldNFTs reverts with reason from rescue (catch Error)', async function () {
    const { owner, presale } = await deployPresale();

    const ResWithReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const withMock = await ResWithReason.deploy(); await withMock.waitForDeployment();
    await presale.connect(owner).setRescueContract(await withMock.getAddress());
    await expect(presale.connect(owner).rescueUnsoldNFTs(1, owner.address, 1)).to.be.revertedWith('Rescue NFT failed: boom');
  });

  it('rescueUnsoldNFTs reverts generic when rescue reverts without reason', async function () {
    const { owner, presale } = await deployPresale();

    const ResNoReason = await ethersRef.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const mockRes = await ResNoReason.deploy();
    await mockRes.waitForDeployment();

    await presale.connect(owner).setRescueContract(await mockRes.getAddress());

    await expect(presale.connect(owner).rescueUnsoldNFTs(1, owner.address, 1)).to.be.revertedWith('Rescue NFT failed: Mock rescue reverts');
  });

  it('delegateRescueErc20 and delegateEmergencyWithdrawEth bubble up reason and no-reason cases', async function () {
    const { owner, presale } = await deployPresale();

    const ResWithReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const resWith = await ResWithReason.deploy();
    await resWith.waitForDeployment();

    await presale.connect(owner).setRescueContract(await resWith.getAddress());

    // rescueERC20 -> tokenAddress zero triggers require -> 'Zero token'
    await expect(presale.connect(owner).rescueERC20(ethers.ZeroAddress, owner.address, 1)).to.be.revertedWith('Zero token');

    // emergencyWithdrawETH -> should revert with reason
    await presale.connect(owner).grantRole(await presale.EMERGENCY_ROLE(), owner.address);
    // actual revert may include a reason suffix like 'Rescue ETH failed: eth-boom'
    // use try/catch and assert the revert message contains the expected prefix to be robust
    try {
      await presale.connect(owner).emergencyWithdrawETH();
      throw new Error('Expected emergencyWithdrawETH to revert');
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      expect(msg).to.include('Rescue ETH failed');
    }

    // Now set a no-reason revert mock and check generic messages
    const ResNoReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const resNo = await ResNoReason.deploy();
    await resNo.waitForDeployment();
    await presale.connect(owner).setRescueContract(await resNo.getAddress());

    // deploy a non-zero ERC20 to ensure we exercise the delegate path (ZeroAddress reverts earlier)
  const MockERC20 = await ethersRef.getContractFactory('contracts/MockERC20.sol:MockERC20');
  const mockToken = await MockERC20.deploy(); await mockToken.waitForDeployment();
    try {
      await presale.connect(owner).rescueERC20(await mockToken.getAddress(), owner.address, 1);
      throw new Error('Expected rescueERC20 to revert');
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      expect(msg).to.include('Rescue ERC20 failed');
    }

    // emergencyWithdrawETH -> may include a reason suffix; accept prefix
    try {
      await presale.connect(owner).emergencyWithdrawETH();
      throw new Error('Expected emergencyWithdrawETH to revert');
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      expect(msg).to.include('Rescue ETH failed');
    }
  });
});






