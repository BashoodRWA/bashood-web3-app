const hre = require('hardhat');

async function main() {
  const ethers = hre.ethers;
  const names = [
    'contracts/mocks/MockBHT.sol:MockBHT',
    'contracts/mocks/MockBHTRejecting.sol:MockBHTRejecting'
  ];

  for (const n of names) {
    try {
      const F = await ethers.getContractFactory(n);
      console.log('Factory for', n);
      console.log('  contractName:', F.contractName || '(none)');
      console.log('  deploy inputs:', (F.interface.deploy ? F.interface.deploy.inputs : []).map(i => `${i.type} ${i.name}`));
      console.log('  deployFragment:', F.interface.deploy ? F.interface.deploy.format() : 'none');
    } catch (e) {
      console.error('Error loading', n, e);
    }
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
