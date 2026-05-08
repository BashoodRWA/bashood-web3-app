const hre = require('hardhat');

async function main() {
  const ethers = hre.ethers;
  const names = [
    'MockBashoodToken',
    'MockNFT1155',
    'MockPriceFeed',
    'contracts/BashoodReferral.sol:BashoodReferral',
    'contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal'
  ];
  for (const name of names) {
    try {
      const f = await ethers.getContractFactory(name);
      console.log(name, 'deploy inputs count', f.interface.deploy.inputs.length, f.interface.deploy.inputs.map(i=>i.type));
    } catch (e) {
      console.error('Factory error for', name, e);
    }
  }
}

main().catch(e=>{console.error(e); process.exit(1);});
