const hre = require('hardhat');

async function main() {
  const ethers = hre.ethers;
  const factory = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
  const dummyArgs = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000003',
    '0x0000000000000000000000000000000000000004',
    0n,
    0n,
    1n,
    10000000000n,
    100n
  ];
  console.log('Calling getDeployTransaction with args length', dummyArgs.length);
  const tx = await factory.getDeployTransaction(...dummyArgs);
  console.log('getDeployTransaction OK, data length:', tx.data ? tx.data.length : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
