const hre = require('hardhat');

async function main() {
  const { ethers } = hre;
  const name = 'contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal';
  const Factory = await ethers.getContractFactory(name);
  const deployInputs = (Factory.interface && Factory.interface.deploy && Factory.interface.deploy.inputs) || [];
  console.log('Factory deploy inputs length:', deployInputs.length);
  console.log('Factory deploy inputs:', deployInputs.map(i => i.type + ' ' + i.name));

  const dummyArgs = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000003',
    '0x0000000000000000000000000000000000000004',
    1,
    2,
    3,
    4,
    5
  ];
  console.log('dummy args length', dummyArgs.length);
  try {
    const contract = await Factory.deploy(...dummyArgs);
    console.log('deploy tx prepared', contract);
  } catch (err) {
    console.error('Deploy call error:', err && err.stack || err);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
