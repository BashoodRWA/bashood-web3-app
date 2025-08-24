const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('BashoodRescue interface checks', function () {
  it('supportsInterface for IBashoodRescue should be true', async function () {
    const [owner, admin, emergency] = await ethers.getSigners();
    const Rescue = await ethers.getContractFactory('BashoodRescue');
    const rescue = await Rescue.deploy(admin.address, emergency.address);
    await rescue.waitForDeployment();

  const Resolver = await ethers.getContractFactory('InterfaceIdResolver');
  const resolver = await Resolver.deploy();
  await resolver.waitForDeployment();
  const iface = await resolver.getIBashoodRescueId();
  const supports = await rescue.supportsInterface(iface);
  expect(supports).to.equal(true);
  });
});
