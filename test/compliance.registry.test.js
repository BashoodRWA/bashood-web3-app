const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ComplianceRegistry + TokenWrapper POC', function () {
  let owner, user, issuer;
  let registry, legacy, wrapper;

  beforeEach(async function () {
    [owner, user, issuer] = await ethers.getSigners();
  const ERC20Mock = await ethers.getContractFactory('contracts/mocks/MockERC20.sol:MockERC20');
  legacy = await ERC20Mock.deploy();
    await legacy.waitForDeployment();

    const Registry = await ethers.getContractFactory('ComplianceRegistry');
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Wrapper = await ethers.getContractFactory('TokenWrapperERC20');
    wrapper = await Wrapper.deploy(legacy.target, registry.target, issuer.address, 'Wrapped', 'W');
    await wrapper.waitForDeployment();

    // mint legacy to user and approve wrapper
    await legacy.mint(user.address, ethers.parseUnits('100', 18));
    await legacy.connect(user).approve(wrapper.target, ethers.MaxUint256);
  });

  it('denies wrap if no root set', async function () {
    const leaf = ethers.keccak256(ethers.toUtf8Bytes(user.address));
    await expect(wrapper.connect(user).wrap(ethers.parseUnits('1',18), leaf, [])).to.be.revertedWith('Not compliant');
  });

  it('allows wrap when merkle root matches', async function () {
    // For POC we will set root equal to leaf (single element tree)
    const leaf = ethers.keccak256(ethers.toUtf8Bytes(user.address));
    await registry.connect(owner).setRoot(issuer.address, leaf, 0);
    await wrapper.connect(user).wrap(ethers.parseUnits('1',18), leaf, []);
    expect(await wrapper.balanceOf(user.address)).to.equal(ethers.parseUnits('1',18));
  });
});
