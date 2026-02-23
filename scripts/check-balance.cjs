const { ethers } = require('hardhat');

async function main() {
  const address = '0x51023F043EAB1F4784128278cEA5a57ed98F5a68';
  const balance = await ethers.provider.getBalance(address);
  
  console.log('\n💰 BALANCE ACTUAL\n');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Address:', address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  console.log('Balance Wei:', balance.toString());
  console.log('════════════════════════════════════════════════════════════════\n');
  
  const balanceNum = parseFloat(ethers.formatEther(balance));
  
  if (balanceNum < 0.01) {
    console.log('⚠️  INSUFICIENTE para deploy + 5 NFTs');
    console.log('   Necesitas: 0.01 ETH mínimo');
    console.log('   Te faltan:', (0.01 - balanceNum).toFixed(4), 'ETH\n');
    console.log('📋 SOLICITA MÁS ETH EN:');
    console.log('   https://faucet.quicknode.com/base/sepolia');
    console.log('   https://cloud.google.com/application/web3/faucet/base-sepolia\n');
  } else {
    console.log('✅ SUFICIENTE para proceder con deploy\n');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
