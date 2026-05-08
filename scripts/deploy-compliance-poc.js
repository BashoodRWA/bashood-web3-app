// scripts/deploy-compliance-poc.js
// Usage: npx hardhat run scripts/deploy-compliance-poc.js --network <network>
const hre = require('hardhat');
async function main() {
  const [deployer, issuer] = await hre.ethers.getSigners();
  console.log('Deploying from', deployer.address);

  const ERC20Mock = await hre.ethers.getContractFactory('contracts/mocks/MockERC20.sol:MockERC20');
  const legacy = await ERC20Mock.deploy();
  await legacy.waitForDeployment();
  console.log('Legacy token:', legacy.target);

  const Registry = await hre.ethers.getContractFactory('ComplianceRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log('Registry:', registry.target);

  const Wrapper = await hre.ethers.getContractFactory('TokenWrapperERC20');
  const wrapper = await Wrapper.deploy(legacy.target, registry.target, issuer.address, 'Wrapped', 'W');
  await wrapper.waitForDeployment();
  console.log('Wrapper:', wrapper.target);

  console.log('Done. Remember to set root for issuer in registry before testing wrap/unwrap. Keep PR in DRAFT until addresses/snaphots verified.');
}

main().catch(e => { console.error(e); process.exitCode = 1; });
