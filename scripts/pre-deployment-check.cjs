/**
 * Pre-Deployment Check Script
 * Verifica que todo esté listo para deployment en Base Sepolia
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 PRE-DEPLOYMENT CHECKLIST - BASE SEPOLIA");
  console.log("=".repeat(80));
  
  let errors = 0;
  let warnings = 0;
  
  // ============================================================================
  // 1. Check Network Configuration
  // ============================================================================
  console.log("\n[1] Network Configuration");
  
  try {
    const network = hre.network.name;
    console.log(`   ✅ Network: ${network}`);
    
    if (network === "hardhat") {
      console.log(`   ⚠️  WARNING: Usando network local, cambia a --network baseSepolia`);
      warnings++;
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    errors++;
  }
  
  // ============================================================================
  // 2. Check Deployer Account
  // ============================================================================
  console.log("\n[2] Deployer Account");
  
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`   ✅ Address: ${deployer.address}`);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    const balanceETH = hre.ethers.formatEther(balance);
    console.log(`   💰 Balance: ${balanceETH} ETH`);
    
    if (parseFloat(balanceETH) < 0.1) {
      console.log(`   ⚠️  WARNING: Balance bajo, necesitas ~0.5 ETH para deployment`);
      console.log(`   📌 Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet`);
      warnings++;
    } else {
      console.log(`   ✅ Balance suficiente`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    errors++;
  }
  
  // ============================================================================
  // 3. Check Environment Variables
  // ============================================================================
  console.log("\n[3] Environment Variables (.env.sepolia)");
  
  const requiredVars = [
    'PRIVATE_KEY',
    'TREASURY_WALLET',
    'DEVELOPMENT_WALLET',
    'OPERATIONS_WALLET',
    'MARKETING_WALLET',
    'TREASURY_PS_WALLET'
  ];
  
  let envComplete = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      if (process.env[varName].startsWith('0x0000000000000000000000000000000000000000')) {
        console.log(`   ⚠️  ${varName}: ADDRESS MOCK - reemplazar con wallet real`);
        warnings++;
      } else {
        console.log(`   ✅ ${varName}: Configurado`);
      }
    } else {
      console.log(`   ❌ ${varName}: NO configurado`);
      errors++;
      envComplete = false;
    }
  }
  
  if (!envComplete) {
    console.log(`\n   📝 Crear .env.sepolia basándote en .env.sepolia.example`);
  }
  
  // ============================================================================
  // 4. Check Wallets Are Different
  // ============================================================================
  console.log("\n[4] Wallet Uniqueness");
  
  if (envComplete) {
    const wallets = [
      process.env.DEVELOPMENT_WALLET,
      process.env.OPERATIONS_WALLET,
      process.env.MARKETING_WALLET,
      process.env.TREASURY_PS_WALLET
    ];
    
    const uniqueWallets = new Set(wallets.filter(w => w));
    
    if (uniqueWallets.size === 4) {
      console.log(`   ✅ Las 4 wallets del PaymentSplitter son diferentes`);
    } else {
      console.log(`   ❌ ERROR: Las 4 wallets deben ser DIFERENTES`);
      console.log(`   📌 Wallets únicas: ${uniqueWallets.size}/4`);
      errors++;
    }
    
    // Check treasury !== treasuryPS
    if (process.env.TREASURY_WALLET === process.env.TREASURY_PS_WALLET) {
      console.log(`   ⚠️  WARNING: TREASURY_WALLET === TREASURY_PS_WALLET`);
      console.log(`   📌 Son propósitos diferentes, considera wallets separadas`);
      warnings++;
    }
  } else {
    console.log(`   ⏭️  Skipped (falta configuración)`);
  }
  
  // ============================================================================
  // 5. Check Contract Compilation
  // ============================================================================
  console.log("\n[5] Contract Compilation");
  
  const contracts = [
    "BashoodToken",
    "MockNFT1155",
    "BashoodReferral",
    "BashoodPaymentSplitter",
    "BashoodRescue",
    "BashoodPresaleFinal"
  ];
  
  let allCompiled = true;
  
  for (const contractName of contracts) {
    try {
      await hre.artifacts.readArtifact(contractName);
      console.log(`   ✅ ${contractName}`);
    } catch (e) {
      console.log(`   ❌ ${contractName}: No compilado`);
      allCompiled = false;
      errors++;
    }
  }
  
  if (!allCompiled) {
    console.log(`\n   📝 Ejecutar: npx hardhat compile`);
  }
  
  // ============================================================================
  // 6. Check Contract Sizes
  // ============================================================================
  console.log("\n[6] Contract Sizes (EIP-170: 24 KB limit)");
  
  for (const contractName of contracts) {
    try {
      const artifact = await hre.artifacts.readArtifact(contractName);
      const bytecode = artifact.deployedBytecode || artifact.bytecode;
      const sizeKB = (bytecode.length / 2 / 1024).toFixed(2);
      const percentage = ((bytecode.length / 2 / 24576) * 100).toFixed(1);
      
      if (bytecode.length / 2 > 24576) {
        console.log(`   ❌ ${contractName}: ${sizeKB} KB (${percentage}%) - EXCEDE LÍMITE`);
        errors++;
      } else if (bytecode.length / 2 > 22000) {
        console.log(`   ⚠️  ${contractName}: ${sizeKB} KB (${percentage}%) - Cerca del límite`);
        warnings++;
      } else {
        console.log(`   ✅ ${contractName}: ${sizeKB} KB (${percentage}%)`);
      }
    } catch (e) {
      console.log(`   ⏭️  ${contractName}: Skipped`);
    }
  }
  
  // ============================================================================
  // 7. Check Deployment Directory
  // ============================================================================
  console.log("\n[7] Deployment Directory");
  
  if (!fs.existsSync("deployments")) {
    console.log(`   ⚠️  Directorio 'deployments/' no existe, se creará en deployment`);
    warnings++;
  } else {
    console.log(`   ✅ Directorio 'deployments/' existe`);
  }
  
  // ============================================================================
  // 8. Check Basescan API Key (for verification)
  // ============================================================================
  console.log("\n[8] Basescan API Key");
  
  if (process.env.BASESCAN_API_KEY) {
    console.log(`   ✅ BASESCAN_API_KEY configurado`);
  } else {
    console.log(`   ⚠️  BASESCAN_API_KEY no configurado`);
    console.log(`   📌 Obtener en: https://basescan.org/myapikey`);
    warnings++;
  }
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN");
  console.log("=".repeat(80));
  
  if (errors === 0 && warnings === 0) {
    console.log("\n✅ ¡TODO LISTO PARA DEPLOYMENT!");
    console.log("\n🚀 Próximo comando:");
    console.log("   npx hardhat run scripts/deploy-complete.js --network baseSepolia");
  } else {
    if (errors > 0) {
      console.log(`\n❌ ${errors} error(es) crítico(s) - FIX REQUIRED`);
    }
    if (warnings > 0) {
      console.log(`\n⚠️  ${warnings} advertencia(s) - REVIEW RECOMMENDED`);
    }
    
    console.log("\n📝 ACCIONES NECESARIAS:");
    
    if (errors > 0) {
      console.log("\n1. Crear .env.sepolia con 5 wallets diferentes");
      console.log("2. Compilar contratos: npx hardhat compile");
      console.log("3. Obtener Base Sepolia ETH del faucet");
    }
    
    if (warnings > 0) {
      console.log("\n4. Verificar balance suficiente (~0.5 ETH)");
      console.log("5. Obtener Basescan API key para verificación");
    }
  }
  
  console.log("\n" + "=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
