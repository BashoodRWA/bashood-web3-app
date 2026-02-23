/**
 * Verificar estado de transferencia de roles
 */

const hre = require("hardhat");

async function main() {
  const contractAddress = "0x25e686Ccd10846C1Da16e204D1334640F07d4d96";
  const oldWallet = "0x6d0E714Ae688a5545A814952Bb54DbfFD9F2f217";
  const newWallet = "0x0370C18DD149355057CDDD3E636CcF5C97Bf098e";

  console.log("\n🔍 Verificando estado de roles...\n");

  const BashoodRWA = await hre.ethers.getContractAt("BashoodRWAReference", contractAddress);

  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const ASSET_MANAGER_ROLE = await BashoodRWA.ASSET_MANAGER_ROLE();
  const UPGRADER_ROLE = await BashoodRWA.UPGRADER_ROLE();

  // Check new wallet
  const newHasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, newWallet);
  const newHasAssetManager = await BashoodRWA.hasRole(ASSET_MANAGER_ROLE, newWallet);
  const newHasUpgrader = await BashoodRWA.hasRole(UPGRADER_ROLE, newWallet);

  // Check old wallet
  const oldHasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, oldWallet);
  const oldHasAssetManager = await BashoodRWA.hasRole(ASSET_MANAGER_ROLE, oldWallet);
  const oldHasUpgrader = await BashoodRWA.hasRole(UPGRADER_ROLE, oldWallet);

  console.log("✅ NUEVA Wallet (0x0370...):");
  console.log(`   DEFAULT_ADMIN_ROLE: ${newHasAdmin ? "✅ SÍ" : "❌ NO"}`);
  console.log(`   ASSET_MANAGER_ROLE: ${newHasAssetManager ? "✅ SÍ" : "❌ NO"}`);
  console.log(`   UPGRADER_ROLE: ${newHasUpgrader ? "✅ SÍ" : "❌ NO"}\n`);

  console.log("⚠️  VIEJA Wallet (0x6d0E...):");
  console.log(`   DEFAULT_ADMIN_ROLE: ${oldHasAdmin ? "⚠️  TODAVÍA TIENE" : "✅ REVOCADO"}`);
  console.log(`   ASSET_MANAGER_ROLE: ${oldHasAssetManager ? "⚠️  TODAVÍA TIENE" : "✅ REVOCADO"}`);
  console.log(`   UPGRADER_ROLE: ${oldHasUpgrader ? "⚠️  TODAVÍA TIENE" : "✅ REVOCADO"}\n`);

  if (newHasAdmin && newHasAssetManager && newHasUpgrader) {
    console.log("✅ La nueva wallet tiene TODOS los roles correctamente");
  }

  if (oldHasAdmin || oldHasAssetManager || oldHasUpgrader) {
    console.log("⚠️  ADVERTENCIA: La wallet comprometida AÚN tiene roles");
    console.log("   Necesitas revocarlos manualmente\n");
  } else {
    console.log("✅ Transferencia completada al 100%\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
