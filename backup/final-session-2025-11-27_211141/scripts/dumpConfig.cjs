const hre = require('hardhat');
(async ()=>{
  console.log('hardhat network config:', hre.config.networks && hre.config.networks.hardhat);
})();
