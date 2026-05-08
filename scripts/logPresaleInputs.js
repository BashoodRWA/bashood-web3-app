const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
  console.log('Presale ctor inputs count:', BashoodPresaleFinal.interface.deploy.inputs.length);
}

main().catch(err => { console.error(err); process.exit(1); });
