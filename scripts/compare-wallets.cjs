const hre = require("hardhat");

async function main() {
  const addresses = [
    { name: "ACTUAL DEPLOYER", addr: "0x51023F043EAB1F4784128278cEA5a57ed98F5a68" },
    { name: "WALLET PERSONAL SEGURA", addr: "0x0370C18DD149355057CDDD3E636CcF5C97Bf098e" }
  ];
  
  console.log(`\n🔍 Verificando balances en Base Sepolia...\n`);
  
  for (const wallet of addresses) {
    try {
      const balance = await hre.ethers.provider.getBalance(wallet.addr);
      const balanceETH = hre.ethers.formatEther(balance);
      
      console.log(`${wallet.name}:`);
      console.log(`   📍 ${wallet.addr}`);
      console.log(`   💰 ${balanceETH} ETH`);
      
      if (parseFloat(balanceETH) >= 0.1) {
        console.log(`   ✅ Suficiente para deployment\n`);
      } else if (parseFloat(balanceETH) >= 0.01) {
        console.log(`   ⚠️  Puede ser suficiente\n`);
      } else {
        console.log(`   ❌ Insuficiente\n`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
