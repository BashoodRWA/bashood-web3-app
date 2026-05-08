const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MockERC20 basic behaviors', function () {
  it('mint, transfer and approve work', async function () {
    const [owner, alice, bob] = await ethers.getSigners();
  const MockERC = await ethers.getContractFactory('contracts/mocks/MockERC20.sol:MockERC20');
    const erc = await MockERC.deploy();
    await erc.waitForDeployment();

    await erc.mint(await owner.getAddress(), ethers.parseUnits('1000', 18));
    expect(await erc.balanceOf(await owner.getAddress())).to.equal(ethers.parseUnits('1000', 18));

    await erc.connect(owner).transfer(await alice.getAddress(), ethers.parseUnits('100', 18));
    expect(await erc.balanceOf(await alice.getAddress())).to.equal(ethers.parseUnits('100', 18));

    await erc.connect(alice).approve(await bob.getAddress(), ethers.parseUnits('10', 18));
    expect(await erc.allowance(await alice.getAddress(), await bob.getAddress())).to.equal(ethers.parseUnits('10', 18));
  });
});
