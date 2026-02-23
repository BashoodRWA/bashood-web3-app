const hre = require("hardhat");

async function main() {
  console.log(`\n✅ Verificando nueva configuración...\n`);
  
  // Obtener signer de la nueva private key
  const [signer] = await hre.ethers.getSigners();
  const address = await signer.getAddress();
  
  console.log(`🔐 PRIVATE_KEY corresponde a:`);
  console.log(`   📍 ${address}\n`);
  
  // Verificar si coincide con la dirección esperada
  const expected = "0x0370C18DD149355057CDDD3E636CcF5C97Bf098e";
  
  if (address.toLowerCase() === expected.toLowerCase()) {
    console.log(`✅ CORRECTO: Coincide con la wallet personal segura\n`);
  } else {
    console.log(`❌ ERROR: No coincide con la wallet esperada`);
    console.log(`   Esperada: ${expected}`);
    console.log(`   Obtenida: ${address}\n`);
    process.exit(1);
  }
  
  // Verificar balance
  const balance = await hre.ethers.provider.getBalance(address);
  const balanceETH = hre.ethers.formatEther(balance);
  
  console.log(`💰 Balance en Base Sepolia: ${balanceETH} ETH`);
  
  if (parseFloat(balanceETH) < 0.01) {
    console.log(`\n⚠️  NECESITAS OBTENER ETH DEL FAUCET:`);
    console.log(`   https://faucet.quicknode.com/base/sepolia`);
    console.log(`   Pegar dirección: ${address}\n`);
  } else {
    console.log(`\n✅ Balance suficiente para deployment!\n`);
  }
  
  // Verificar DEVELOPMENT_WALLET
  const devWallet = process.env.DEVELOPMENT_WALLET;
  console.log(`🏦 DEVELOPMENT_WALLET configurada: ${devWallet}`);
  
  if (devWallet?.toLowerCase() === address.toLowerCase()) {
    console.log(`✅ DEVELOPMENT_WALLET coincide con deployer\n`);
  } else {
    console.log(`⚠️  DEVELOPMENT_WALLET no coincide (revisar .env)\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
