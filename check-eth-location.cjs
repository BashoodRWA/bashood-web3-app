const ethers = require('ethers');

console.log('=== BUSCANDO TU ETH ===\n');
console.log('Wallet: 0x51023F043EAB1F4784128278cEA5a57ed98F5a68\n');

async function checkBalances() {
  const providers = {
    'Base Sepolia (CORRECTO para desplegar)': new ethers.JsonRpcProvider('https://sepolia.base.org'),
    'Ethereum Sepolia (INCORRECTO - red diferente)': new ethers.JsonRpcProvider('https://rpc.sepolia.org')
  };

  for (const [name, provider] of Object.entries(providers)) {
    try {
      const balance = await provider.getBalance('0x51023F043EAB1F4784128278cEA5a57ed98F5a68');
      const balanceETH = ethers.formatEther(balance);
      console.log(`${name}:`);
      console.log(`  Balance: ${balanceETH} ETH`);
      if (parseFloat(balanceETH) > 0) {
        console.log('  ✅ ENCONTRADO AQUI!\n');
      } else {
        console.log('  ❌ Sin fondos\n');
      }
    } catch(e) {
      console.log(`${name}: Error al verificar\n`);
    }
  }
}

checkBalances();
