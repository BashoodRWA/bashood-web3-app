// Use global setup to avoid redeclaration when solidity-coverage bundles tests
const expect = globalThis._chai_expect;
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
    await presale.connect(owner).setRescueContract(withMock.target || withMock.address);
    await globalThis._chai_expect(
      presale.connect(owner).delegateRescueUnsoldNfts(1, projectWallet.address, 1)
    ).to.be.revertedWith('Delegate rescue NFT failed: boom');
  });

  it('delegateRescueUnsoldNfts reverts without reason (generic path)', async function () {
    const MockRescueNo = await ethersRef.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const noMock = await MockRescueNo.deploy(); await noMock.waitForDeployment();
    await presale.connect(owner).setRescueContract(noMock.target || noMock.address);
    await globalThis._chai_expect(
      presale.connect(owner).delegateRescueUnsoldNfts(1, projectWallet.address, 1)
    ).to.be.revertedWith('Delegate rescue NFT failed');
  });

  it('delegateEmergencyWithdrawEth handles revert with reason and without', async function () {
  const MockRescueWith = await ethersRef.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
  const withMock = await MockRescueWith.deploy(); await withMock.waitForDeployment();
  await presale.connect(owner).setRescueContract(withMock.target || withMock.address);
  await globalThis._chai_expect(presale.connect(owner).delegateEmergencyWithdrawEth()).to.be.revertedWith('Delegate rescue ETH failed: eth-boom');

  const MockRescueNo = await ethersRef.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
  const noMock = await MockRescueNo.deploy(); await noMock.waitForDeployment();
  await presale.connect(owner).setRescueContract(noMock.target || noMock.address);
  await globalThis._chai_expect(presale.connect(owner).delegateEmergencyWithdrawEth()).to.be.revertedWith('Delegate rescue ETH failed');
  });
});
// rely on test/setup.js singletons (no further declarations)

describe('BashoodPresaleFinal - rescue try/catch coverage', function () {
  it('rescueUnsoldNFTs reverts with reason from rescue (catch Error)', async function () {
    const { owner, presale, nft } = await deployPresale();

    // deploy a mock rescue that reverts with reason
    const ResWithReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const mockRes = await ResWithReason.deploy();
    await mockRes.waitForDeployment();

    // set as rescue contract via admin role
    await presale.connect(owner).setRescueContract(mockRes.target);

    // call rescueUnsoldNFTs and expect the wrapped revert message
    await expect(presale.connect(owner).rescueUnsoldNFTs(1, owner.address, 1)).to.be.revertedWith('Rescue NFT failed:');
  });

  it('rescueUnsoldNFTs reverts generic when rescue reverts without reason', async function () {
    const { owner, presale } = await deployPresale();

    const ResNoReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const mockRes = await ResNoReason.deploy();
    await mockRes.waitForDeployment();

    await presale.connect(owner).setRescueContract(mockRes.target);

    await expect(presale.connect(owner).rescueUnsoldNFTs(1, owner.address, 1)).to.be.revertedWith('Rescue NFT failed');
  });

  it('delegateRescueErc20 and delegateEmergencyWithdrawEth bubble up reason and no-reason cases', async function () {
    const { owner, presale, projectWallet } = await deployPresale();

    const ResWithReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const resWith = await ResWithReason.deploy();
    await resWith.waitForDeployment();

    await presale.connect(owner).setRescueContract(resWith.target);

    // rescueERC20 -> should revert with reason
    await expect(presale.connect(owner).rescueERC20(ethers.ZeroAddress, owner.address, 1)).to.be.revertedWith('Rescue ERC20 failed:');

    // emergencyWithdrawETH -> should revert with reason
    // grant EMERGENCY_ROLE to owner so call is allowed
    await presale.connect(owner).grantRole(await presale.EMERGENCY_ROLE(), owner.address);
    await expect(presale.connect(owner).emergencyWithdrawETH()).to.be.revertedWith('Rescue ETH failed:');

    // Now set a no-reason revert mock and check generic messages
    const ResNoReason = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const resNo = await ResNoReason.deploy();
    await resNo.waitForDeployment();
    await presale.connect(owner).setRescueContract(resNo.target);

    await expect(presale.connect(owner).rescueERC20(ethers.ZeroAddress, owner.address, 1)).to.be.revertedWith('Rescue ERC20 failed');
    await expect(presale.connect(owner).emergencyWithdrawETH()).to.be.revertedWith('Rescue ETH failed');
  });
});
