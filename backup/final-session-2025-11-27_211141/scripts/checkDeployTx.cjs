const hre = require('hardhat');

async function main() {
  const { ethers } = hre;
  const Factory = await ethers.getContractFactory('BashoodPresaleFinal');
  const deployInputs = (Factory.interface && Factory.interface.deploy && Factory.interface.deploy.inputs) || [];
  console.log('Factory deploy inputs length:', deployInputs.length);
  console.log('Factory deploy inputs:', deployInputs.map(i => i.type + ' ' + i.name));
  const dummy = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000003',
    '0x0000000000000000000000000000000000000004',
    1n,
    2n,
    3n,
    4n,
    5n
  ];
  console.log('dummy length', dummy.length);
  try {
    const tx = await Factory.getDeployTransaction(...dummy);
    console.log('getDeployTransaction succeeded, data length', tx.data ? tx.data.length : 0);
  } catch (err) {
    console.error('getDeployTransaction error', err && err.stack || err);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
