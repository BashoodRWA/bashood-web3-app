const hre = require('hardhat');
console.log('hre keys:', Object.keys(hre));
console.log('hre.ethers exists:', !!hre.ethers);
if (hre.ethers) {
  console.log('ethers keys:', Object.keys(hre.ethers));
  console.log('ethers.utils:', !!hre.ethers.utils);
}
