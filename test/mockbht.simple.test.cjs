const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MockBHT basic behaviors', function () {
  it('mint and approve behave as expected', async function () {
  const [owner, alice, bob] = await ethers.getSigners();
  const MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    const bht = await MockBHT.deploy();
    await bht.waitForDeployment();

    await bht.mint(await alice.getAddress(), ethers.parseUnits('100', 18));
    const bal = await bht.balanceOf(await alice.getAddress());
    expect(bal).to.equal(ethers.parseUnits('100', 18));

    await bht.connect(alice).approve(await bob.getAddress(), ethers.parseUnits('50', 18));
    const allowance = await bht.allowance(await alice.getAddress(), await bob.getAddress());
    expect(allowance).to.equal(ethers.parseUnits('50', 18));
  });
});
