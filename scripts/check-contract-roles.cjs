require('dotenv').config();
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x25e686Ccd10846C1Da16e204D1334640F07d4d96";
  const compromisedAddress = "0x6d0E714Ae688a5545A814952Bb54DbfFD9F2f217";

  console.log("\n🔍 VERIFICANDO ROLES DEL CONTRATO\n");
  console.log("Contrato:", contractAddress);
  console.log("Wallet comprometida:", compromisedAddress);
  console.log("");

  const BashoodRWA = await hre.ethers.getContractAt("BashoodRWAReference", contractAddress);

  // Verificar roles
  const DEFAULT_ADMIN_ROLE = await BashoodRWA.DEFAULT_ADMIN_ROLE();
  const ASSET_MANAGER_ROLE = await BashoodRWA.ASSET_MANAGER_ROLE();
  const UPGRADER_ROLE = await BashoodRWA.UPGRADER_ROLE();

  console.log("🔐 Roles de la wallet comprometida:\n");
  
  const hasAdminRole = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, compromisedAddress);
  console.log(`DEFAULT_ADMIN_ROLE: ${hasAdminRole ? '✅ SÍ (CRÍTICO)' : '❌ No'}`);
  
  const hasAssetManager = await BashoodRWA.hasRole(ASSET_MANAGER_ROLE, compromisedAddress);
  console.log(`ASSET_MANAGER_ROLE: ${hasAssetManager ? '✅ SÍ' : '❌ No'}`);
  
  const hasUpgrader = await BashoodRWA.hasRole(UPGRADER_ROLE, compromisedAddress);
  console.log(`UPGRADER_ROLE: ${hasUpgrader ? '✅ SÍ (CRÍTICO)' : '❌ No'}`);

  // Verificar balance
  const balance = await hre.ethers.provider.getBalance(compromisedAddress);
  console.log(`\n💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);

  console.log("\n⚠️ RECOMENDACIONES:\n");
  if (hasAdminRole || hasUpgrader) {
    console.log("🚨 URGENTE: La wallet tiene roles críticos");
    console.log("   → Transfiere roles de admin a una nueva wallet");
    console.log("   → Revoca UPGRADER_ROLE de esta wallet");
  }
  if (parseFloat(hre.ethers.formatEther(balance)) > 0) {
    console.log("💸 Transfiere el ETH restante a una nueva wallet");
  }
  console.log("🔒 NUNCA uses esta private key para mainnet");
  console.log("📝 Elimina la clave del archivo .env.template en GitHub");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
