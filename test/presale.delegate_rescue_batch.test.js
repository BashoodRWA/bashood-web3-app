const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const _ph = getPresaleHelpers();
const deployPresale = _ph.deployPresale;

describe('BashoodPresaleFinal - delegate rescue and ERC1155 selectors', function () {
  it('delegateRescueErc20 wraps revert reason and generic when no reason', async function () {
    const { owner, presale } = await deployPresale();

    const MockRescueWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const MockRescueNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const withMock = await MockRescueWith.deploy();
    await withMock.waitForDeployment();
    const noMock = await MockRescueNo.deploy();
    await noMock.waitForDeployment();

    const withAddr = (typeof withMock.getAddress === 'function') ? await withMock.getAddress() : (withMock.address || withMock.target);
    const noAddr = (typeof noMock.getAddress === 'function') ? await noMock.getAddress() : (noMock.address || noMock.target);
    await presale.connect(owner).setRescueContract(withAddr);
    await expect(
      presale.connect(owner).delegateRescueErc20(owner.address, owner.address, 1)
    ).to.be.revertedWith('Delegate rescue ERC20 failed: erc20-boom');

    await presale.connect(owner).setRescueContract(noAddr);
    await expect(
      presale.connect(owner).delegateRescueErc20(owner.address, owner.address, 1)
    ).to.be.revertedWith('Delegate rescue ERC20 failed');
  });

  it('delegateRescueUnsoldNfts wraps reason and generic', async function () {
    const { owner, presale } = await deployPresale();

    const MockRescueWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const MockRescueNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const withMock = await MockRescueWith.deploy();
    await withMock.waitForDeployment();
    const noMock = await MockRescueNo.deploy();
    await noMock.waitForDeployment();

    const withAddr = (typeof withMock.getAddress === 'function') ? await withMock.getAddress() : (withMock.address || withMock.target);
    const noAddr = (typeof noMock.getAddress === 'function') ? await noMock.getAddress() : (noMock.address || noMock.target);
    await presale.connect(owner).setRescueContract(withAddr);
    await expect(
      presale.connect(owner).delegateRescueUnsoldNfts(1, owner.address, 1)
    ).to.be.revertedWith('Delegate rescue NFT failed: boom');

    await presale.connect(owner).setRescueContract(noAddr);
    await expect(
      presale.connect(owner).delegateRescueUnsoldNfts(1, owner.address, 1)
    ).to.be.revertedWith('Delegate rescue NFT failed');
  });

  it('delegateEmergencyWithdrawEth wraps reason and generic', async function () {
    const { owner, presale } = await deployPresale();

    const MockRescueWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const MockRescueNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const withMock = await MockRescueWith.deploy();
    await withMock.waitForDeployment();
    const noMock = await MockRescueNo.deploy();
    await noMock.waitForDeployment();

    const withAddr = (typeof withMock.getAddress === 'function') ? await withMock.getAddress() : (withMock.address || withMock.target);
    const noAddr = (typeof noMock.getAddress === 'function') ? await noMock.getAddress() : (noMock.address || noMock.target);
    await presale.connect(owner).setRescueContract(withAddr);
    await expect(presale.connect(owner).delegateEmergencyWithdrawEth()).to.be.revertedWith('Delegate rescue ETH failed: eth-boom');

  await presale.connect(owner).setRescueContract(noAddr);
    await expect(presale.connect(owner).delegateEmergencyWithdrawEth()).to.be.revertedWith('Delegate rescue ETH failed');
  });

  it('onERC1155Received and batch return selectors', async function () {
    const { owner, presale } = await deployPresale();

  const sel1 = ethers.keccak256(ethers.toUtf8Bytes('onERC1155Received(address,address,uint256,uint256,bytes)')).slice(0, 10);
  const sel2 = ethers.keccak256(ethers.toUtf8Bytes('onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)')).slice(0, 10);

  const res1 = await presale.onERC1155Received(owner.address, owner.address, 1, 1, '0x');
  expect(res1).to.equal(sel1);

  const res2 = await presale.onERC1155BatchReceived(owner.address, owner.address, [1], [1], '0x');
  expect(res2).to.equal(sel2);
  });
});
