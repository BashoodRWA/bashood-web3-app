const hre = require('hardhat');

async function main() {
  const BPF = await hre.ethers.getContractFactory('BashoodPresaleFinal');
  const inputs = BPF.interface.deploy.inputs;
  console.log('BashoodPresaleFinal (simple) constructor expects', inputs.length, 'args');
  inputs.forEach((i, idx) => console.log(idx, i.name, i.type));
}

main().catch((e) => { console.error(e); process.exit(1); });
