const hre = require('hardhat');

async function main() {
  const { ethers } = hre;
  const name = "contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal";
  try {
    const Factory = await ethers.getContractFactory(name);
    const deployInputs = (Factory.interface && Factory.interface.deploy && Factory.interface.deploy.inputs) || [];
    console.log('Factory for', name);
    console.log('deploy inputs length:', deployInputs.length);
    console.log('deploy inputs:', deployInputs.map(i => i.type + ' ' + i.name));
  } catch (err) {
    console.error('Error getting factory for', name, err && err.stack || err);
    process.exit(1);
  }
}

main();
