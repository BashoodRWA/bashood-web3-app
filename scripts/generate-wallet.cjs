// Script para generar wallet testnet con Hardhat
const { ethers } = require('hardhat');

async function main() {
  console.log('\n🔐 GENERANDO WALLET TESTNET...\n');
  
  // Generar wallet aleatoria
  const wallet = ethers.Wallet.createRandom();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ WALLET GENERADA (SOLO PARA TESTNET BASE SEPOLIA)');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  console.log('📍 Address:');
  console.log(wallet.address);
  console.log('');
  
  console.log('🔑 Private Key:');
  console.log(wallet.privateKey);
  console.log('');
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('⚠️  IMPORTANTE:');
  console.log('   1. GUARDA la private key en lugar seguro');
  console.log('   2. SOLO usar para testnet (NO mainnet)');
  console.log('   3. Esta wallet NO tiene fondos aún');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  console.log('📋 PRÓXIMOS PASOS:');
  console.log('   1. Copiar la Private Key de arriba');
  console.log('   2. Ir a: https://www.alchemy.com/faucets/base-sepolia');
  console.log('   3. Pegar tu Address y solicitar ETH testnet');
  console.log('   4. Esperar 1-2 minutos');
  console.log('   5. Pegar Private Key aquí en el chat\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
