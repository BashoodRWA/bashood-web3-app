// scripts/getProxyInfo.js
// Usage: npx hardhat run scripts/getProxyInfo.js --network <network> --proxy <PROXY_ADDRESS>
const hre = require('hardhat');
const { ethers } = hre;

function eip1967Slot(label) {
  // returns hex slot for keccak256(label) - 1
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(label));
  return ethers.BigNumber.from(hash).sub(1).toHexString();
}

async function main() {
  const argv = process.argv.slice(2);
  const proxyArgIndex = argv.findIndex(a => a === '--proxy');
  const proxy = proxyArgIndex >= 0 ? argv[proxyArgIndex + 1] : process.env.PROXY_ADDRESS;
  if (!proxy) throw new Error('Provide proxy address with --proxy <address> or set PROXY_ADDRESS env var');

  const adminSlot = eip1967Slot('eip1967.proxy.admin');
  const implSlot = eip1967Slot('eip1967.proxy.implementation');

  console.log('Proxy:', proxy);
  console.log('Admin slot:', adminSlot);
  console.log('Impl slot:', implSlot);

  const adminStorage = await ethers.provider.getStorageAt(proxy, adminSlot);
  const implStorage = await ethers.provider.getStorageAt(proxy, implSlot);

  // storage is 32 bytes hex; address is last 20 bytes
  const admin = '0x' + adminStorage.slice(-40);
  const implementation = '0x' + implStorage.slice(-40);

  console.log('Admin address (from storage):', admin);
  console.log('Implementation address (from storage):', implementation);

  // Optionally resolve code at those addresses
  const adminCode = await ethers.provider.getCode(admin);
  const implCode = await ethers.provider.getCode(implementation);
  console.log('Admin code size (bytes):', adminCode.length / 2 - 1);
  console.log('Implementation code size (bytes):', implCode.length / 2 - 1);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
