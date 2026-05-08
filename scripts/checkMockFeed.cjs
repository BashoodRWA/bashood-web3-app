const hre = require('hardhat');

async function main(){
  const ethers = hre.ethers;
  try{
    const f = await ethers.getContractFactory('MockPriceFeed');
    console.log('Factory found:', f.interface.deploy.inputs.length);
  }catch(e){
    console.error('Factory error:', e);
  }
}

main().catch(e=>{console.error(e); process.exit(1);});
